import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Admin-only: toggle the `is_blocked` flag on a target user's profile and
 * sign out their active sessions so they cannot continue using the app.
 *
 * Body: { target_user_id: string, block: boolean }
 * Auth: Bearer <admin user JWT>
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

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminId = claimsData.claims.sub;

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: adminId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = String(body?.target_user_id ?? "").trim();
    const block = Boolean(body?.block);
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "target_user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (targetUserId === adminId) {
      return new Response(
        JSON.stringify({ error: "You cannot block yourself." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Refuse to block another admin (defence in depth).
    if (block) {
      const { data: targetIsAdmin } = await adminClient.rpc("has_role", {
        _user_id: targetUserId,
        _role: "admin",
      });
      if (targetIsAdmin) {
        return new Response(
          JSON.stringify({ error: "Cannot block another admin." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const { error: upErr } = await adminClient
      .from("profiles")
      .update({
        is_blocked: block,
        blocked_at: block ? new Date().toISOString() : null,
        blocked_by: block ? adminId : null,
      })
      .eq("id", targetUserId);

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Kill the user's active sessions so they're forced to re-auth (and the
    // sign-in guard will refuse them).
    if (block) {
      try {
        await adminClient.auth.admin.signOut(targetUserId, "global");
      } catch (e) {
        console.error("[admin-block-user] signOut failed:", e);
      }
    }

    await adminClient.from("audit_logs").insert({
      admin_user_id: adminId,
      action: block ? "user_blocked" : "user_unblocked",
      target_type: "user",
      target_id: targetUserId,
      details: { source: "admin_security_page" },
    });

    return new Response(JSON.stringify({ ok: true, blocked: block }), {
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
