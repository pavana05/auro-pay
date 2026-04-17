import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Emergency freeze check
    const { data: freezeRow } = await supabase.from("app_settings").select("value").eq("key", "freeze_all_transactions").maybeSingle();
    if (freezeRow?.value === "true") {
      return new Response(JSON.stringify({ error: "Transactions are temporarily paused by administrators. Please try again shortly." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { order_id, payment_id, signature } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "Missing order_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Verify signature if Razorpay keys are configured
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (razorpaySecret && payment_id && signature) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(razorpaySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${order_id}|${payment_id}`));
      const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (expectedSig !== signature) {
        return new Response(JSON.stringify({ error: "Invalid payment signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Find pending transaction
    const { data: tx } = await supabase.from("transactions").select("*").eq("razorpay_order_id", order_id).eq("status", "pending").single();
    if (!tx) return new Response(JSON.stringify({ error: "Transaction not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get wallet
    const { data: wallet } = await supabase.from("wallets").select("*").eq("id", tx.wallet_id).single();
    if (!wallet) return new Response(JSON.stringify({ error: "Wallet not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Update transaction status
    await supabase.from("transactions").update({
      status: "success",
      razorpay_payment_id: payment_id || `sim_pay_${Date.now()}`,
    }).eq("id", tx.id);

    // Credit wallet
    await supabase.from("wallets").update({
      balance: (wallet.balance || 0) + tx.amount,
    }).eq("id", wallet.id);

    // Notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Money Added",
      body: `₹${(tx.amount / 100).toLocaleString("en-IN")} added to your wallet`,
      type: "credit",
    });

    return new Response(JSON.stringify({ success: true, new_balance: (wallet.balance || 0) + tx.amount }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
