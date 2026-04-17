// Admin-only refund: credits the wallet for the original transaction amount,
// inserts a refund transaction row, writes an audit log entry, and notifies the user.
//
// POST { transaction_id, reason } with Bearer admin JWT.
// Re-validates: original tx exists, status='success', not already refunded.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (authErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const admin = userData.user;

    const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: admin.id, _role: "admin" });
    if (!hasAdmin) return json({ error: "Admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const txId = String(body.transaction_id || "");
    const reason = String(body.reason || "").trim();

    if (!txId) return json({ error: "transaction_id required" }, 400);
    if (reason.length < 5) return json({ error: "Reason required (min 5 chars)" }, 400);

    // Load original transaction
    const { data: tx, error: txErr } = await supabase
      .from("transactions").select("*").eq("id", txId).maybeSingle();
    if (txErr || !tx) return json({ error: "Transaction not found" }, 404);
    if (tx.status !== "success") return json({ error: "Only successful transactions can be refunded" }, 400);

    // Idempotency: bail if a refund row already exists for this tx
    const refundDescTag = `Admin refund for ${txId}`;
    const { data: existingRefund } = await supabase
      .from("transactions")
      .select("id")
      .eq("wallet_id", tx.wallet_id)
      .eq("category", "refund")
      .eq("description", refundDescTag)
      .maybeSingle();
    if (existingRefund?.id) return json({ error: "This transaction has already been refunded" }, 409);

    // Load wallet (also gives us user_id for notification)
    const { data: wallet } = await supabase
      .from("wallets").select("id, user_id, balance").eq("id", tx.wallet_id).maybeSingle();
    if (!wallet) return json({ error: "Wallet not found" }, 404);

    const oldBalance = wallet.balance || 0;
    const newBalance = oldBalance + tx.amount;

    const { error: uErr } = await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
    if (uErr) return json({ error: uErr.message }, 500);

    const { data: refundTx, error: rErr } = await supabase.from("transactions").insert({
      wallet_id: wallet.id,
      type: "credit",
      amount: tx.amount,
      status: "success",
      category: "refund",
      description: refundDescTag,
      merchant_name: "AuroPay Refund",
    }).select("id").single();
    if (rErr) return json({ error: rErr.message }, 500);

    await supabase.from("audit_logs").insert({
      admin_user_id: admin.id,
      action: "transaction_refunded",
      target_type: "transaction",
      target_id: txId,
      details: {
        original_amount_paise: tx.amount,
        refund_transaction_id: refundTx?.id || null,
        wallet_id: wallet.id,
        target_user_id: wallet.user_id,
        old_balance: oldBalance,
        new_balance: newBalance,
        reason,
      },
    });

    await supabase.from("notifications").insert({
      user_id: wallet.user_id,
      title: "💸 Refund credited",
      body: `₹${(tx.amount / 100).toLocaleString("en-IN")} has been refunded to your wallet. Reason: ${reason.slice(0, 140)}`,
      type: "refund",
    });

    return json({ success: true, refund_transaction_id: refundTx?.id || null, new_balance: newBalance });
  } catch (e: any) {
    console.error("[admin-refund-transaction] error", e);
    return json({ error: e?.message || "Server error" }, 500);
  }
});
