import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const callerId = userData?.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const { wallet_id, user_id, reason, flag_id } = body as {
      wallet_id?: string; user_id?: string; reason?: string; flag_id?: string;
    };
    if (!wallet_id) {
      return new Response(JSON.stringify({ error: "wallet_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Freeze the wallet
    const { error: freezeErr } = await supabase
      .from("wallets")
      .update({ is_frozen: true })
      .eq("id", wallet_id);
    if (freezeErr) throw freezeErr;

    // 2. Resolve any open flags for this wallet (or just the specified one)
    let resolvedCount = 0;
    if (flag_id) {
      const { error, count } = await supabase
        .from("flagged_transactions")
        .update({
          status: "resolved",
          resolved_by: callerId,
          resolved_at: new Date().toISOString(),
          resolution_note: `Wallet frozen by admin · ${reason || "fraud detection action"}`,
        }, { count: "exact" })
        .eq("id", flag_id);
      if (!error) resolvedCount = count || 0;
    } else {
      const { error, count } = await supabase
        .from("flagged_transactions")
        .update({
          status: "resolved",
          resolved_by: callerId,
          resolved_at: new Date().toISOString(),
          resolution_note: `Wallet frozen by admin · ${reason || "fraud detection action"}`,
        }, { count: "exact" })
        .eq("wallet_id", wallet_id)
        .eq("status", "open");
      if (!error) resolvedCount = count || 0;
    }

    // 3. Audit log
    await supabase.from("audit_logs").insert({
      admin_user_id: callerId,
      action: "freeze_wallet",
      target_type: "wallet",
      target_id: wallet_id,
      details: {
        user_id,
        reason: reason || "Manual fraud-detection action",
        flag_id,
        flags_resolved: resolvedCount,
      },
    });

    // 4. In-app notification to the affected user (best-effort)
    if (user_id) {
      await supabase.from("notifications").insert({
        user_id,
        title: "🛡️ Wallet temporarily frozen",
        body: "Your wallet was frozen by AuroPay safety team after detecting unusual activity. Contact support to review.",
        type: "security",
      });
    }

    return new Response(JSON.stringify({
      success: true, wallet_id, flags_resolved: resolvedCount,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("admin-freeze-wallet error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
