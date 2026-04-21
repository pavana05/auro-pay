import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Records an audit_logs entry whenever a signed-in NON-admin tries to
 * access an /admin/* URL. Audit_logs.INSERT is admin-only via RLS, so we
 * use the service role from this function to bypass that and record the
 * probe attempt for security review.
 *
 * After insert, if the same user has produced 3+ probes in the last 10
 * minutes, we fan out a `security` notification to every admin so the
 * incident shows up in the admin bell. A simple cooldown (30 minutes per
 * user) prevents alert spam from a refresh loop.
 *
 * Body: { path: string }
 * Auth: Bearer <user JWT>
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Defensive: if the caller actually IS an admin, don't log a probe.
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (isAdmin) {
      return new Response(JSON.stringify({ ok: true, skipped: "is_admin" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const path = typeof body?.path === "string" ? body.path.slice(0, 256) : "";

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await adminClient.from("audit_logs").insert({
      admin_user_id: userId, // the offending user; column is NOT NULL
      action: "admin_unauthorized_probe",
      target_type: "admin_panel",
      target_id: userId,
      ip_address: ip,
      details: { path, user_agent: userAgent },
    });

    /* ─── Alerting ───
       If 3+ probes in the last 10 minutes for this user, notify all admins.
       A 30-minute cooldown (tracked via prior `security` notification with
       the same target user in details) avoids spamming the bell on every
       refresh of a probing tab. */
    try {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: recentCount } = await adminClient
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("action", "admin_unauthorized_probe")
        .eq("admin_user_id", userId)
        .gte("created_at", tenMinAgo);

      if ((recentCount ?? 0) >= 3) {
        // Cooldown: was an admin alert for this user already sent in last 30 min?
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: recentAlert } = await adminClient
          .from("notifications")
          .select("id")
          .eq("type", "security")
          .gte("created_at", thirtyMinAgo)
          .like("body", `%${userId}%`)
          .limit(1)
          .maybeSingle();

        if (!recentAlert) {
          // Fetch a friendly identifier for the offender
          const { data: prof } = await adminClient
            .from("profiles")
            .select("full_name, phone")
            .eq("id", userId)
            .maybeSingle();
          const who =
            prof?.full_name ||
            prof?.phone ||
            userId.slice(0, 8) + "…";

          // Get admin user IDs via user_roles
          const { data: admins } = await adminClient
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (admins && admins.length > 0) {
            const rows = admins.map((a: { user_id: string }) => ({
              user_id: a.user_id,
              type: "security",
              title: "🚨 Active admin probing detected",
              body:
                `${who} attempted to access /admin/* ${recentCount} times in the ` +
                `last 10 min from IP ${ip || "unknown"}. ` +
                `User ID: ${userId}. Review at /admin/security.`,
            }));
            await adminClient.from("notifications").insert(rows);
          }
        }
      }
    } catch (alertErr) {
      // Alerting must never break the probe-logging response
      console.error("[admin-log-probe] alerting failed:", alertErr);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
