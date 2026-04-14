import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { upi_id, payee_name, amount, category, note } = await req.json();

    if (!upi_id || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payment details" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const amountPaise = Math.round(amount * 100);

    // Get wallet
    const { data: wallet, error: walletErr } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
    if (walletErr || !wallet) return new Response(JSON.stringify({ error: "Wallet not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (wallet.is_frozen) return new Response(JSON.stringify({ error: "Wallet is frozen. Contact parent." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if ((wallet.balance || 0) < amountPaise) return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if ((wallet.spent_today || 0) + amountPaise > (wallet.daily_limit || 50000)) return new Response(JSON.stringify({ error: "Daily spending limit exceeded" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check category blocks
    if (category) {
      const { data: limits } = await supabase.from("spending_limits").select("*").eq("teen_wallet_id", wallet.id).eq("category", category);
      if (limits?.some((l) => l.is_blocked)) {
        return new Response(JSON.stringify({ error: `Spending in ${category} is blocked by parent` }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Create transaction
    const { data: tx, error: txErr } = await supabase.from("transactions").insert({
      wallet_id: wallet.id,
      type: "debit",
      amount: amountPaise,
      merchant_name: payee_name || upi_id,
      merchant_upi_id: upi_id,
      category: category || "other",
      status: "success",
      description: note || `Payment to ${payee_name || upi_id}`,
    }).select().single();

    if (txErr) throw txErr;

    // Update wallet balance
    await supabase.from("wallets").update({
      balance: (wallet.balance || 0) - amountPaise,
      spent_today: (wallet.spent_today || 0) + amountPaise,
      spent_this_month: (wallet.spent_this_month || 0) + amountPaise,
    }).eq("id", wallet.id);

    // Send notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Payment Successful",
      body: `₹${amount} paid to ${payee_name || upi_id}`,
      type: "payment",
    });

    return new Response(JSON.stringify({ success: true, transaction: tx }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Payment processing failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
