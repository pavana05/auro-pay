import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Must be an admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password) {
      return new Response(JSON.stringify({ error: "Password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 5 failed attempts per user in the last 15 minutes
    const rlClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: failed } = await rlClient
      .from("audit_logs")
      .select("created_at")
      .eq("admin_user_id", userId)
      .eq("action", "admin_unlock_failed")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: true });

    if ((failed?.length ?? 0) >= 5) {
      const oldest = failed![0].created_at;
      const cooldownEndsAt = new Date(new Date(oldest).getTime() + 15 * 60 * 1000);
      const retryAfter = Math.max(1, Math.ceil((cooldownEndsAt.getTime() - Date.now()) / 1000));
      // Audit the rate-limit hit so admins can spot brute-force attempts
      await rlClient.from("audit_logs").insert({
        admin_user_id: userId,
        action: "admin_unlock_rate_limited",
        target_type: "admin_panel",
        target_id: userId,
        ip_address:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("cf-connecting-ip") ||
          req.headers.get("x-real-ip") ||
          null,
        details: {
          user_agent: req.headers.get("user-agent") || null,
          failed_attempts: failed!.length,
          retry_after_seconds: retryAfter,
        },
      });
      return new Response(
        JSON.stringify({
          error: "Too many failed attempts. Try again later.",
          retry_after_seconds: retryAfter,
          cooldown_ends_at: cooldownEndsAt.toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    const expected = Deno.env.get("ADMIN_PANEL_PASSWORD") ?? "";
    if (!expected) {
      return new Response(JSON.stringify({ error: "Admin password not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Constant-time comparison
    const enc = new TextEncoder();
    const a = enc.encode(password);
    const b = enc.encode(expected);
    const len = Math.max(a.length, b.length);
    let diff = a.length ^ b.length;
    for (let i = 0; i < len; i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    const ok = diff === 0;

    // Audit log (use service role to bypass RLS check on admin_user_id)
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
      admin_user_id: userId,
      action: ok ? "admin_unlock_success" : "admin_unlock_failed",
      target_type: "admin_panel",
      target_id: userId,
      ip_address: ip,
      details: { user_agent: userAgent },
    });

    return new Response(JSON.stringify({ ok }), {
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
