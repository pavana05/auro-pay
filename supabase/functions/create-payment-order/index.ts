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

    const { amount, currency = "INR", description } = await req.json();
    if (!amount || amount <= 0) return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const amountPaise = Math.round(amount * 100);

    // Get or create wallet
    let { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
    if (!wallet) {
      const { data: newWallet } = await supabase.from("wallets").insert({ user_id: user.id }).select().single();
      wallet = newWallet;
    }

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (razorpayKeyId && razorpaySecret) {
      // Create real Razorpay order
      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpaySecret}`),
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt: `auropay_${Date.now()}`,
          notes: { user_id: user.id, wallet_id: wallet!.id },
        }),
      });
      const order = await orderRes.json();

      // Create pending transaction
      await supabase.from("transactions").insert({
        wallet_id: wallet!.id,
        type: "credit",
        amount: amountPaise,
        status: "pending",
        razorpay_order_id: order.id,
        description: description || "Add money to wallet",
      });

      return new Response(JSON.stringify({
        order_id: order.id,
        amount: amountPaise,
        currency,
        key_id: razorpayKeyId,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sandbox mode — simulate order creation
    const mockOrderId = `order_sim_${Date.now()}`;
    await supabase.from("transactions").insert({
      wallet_id: wallet!.id,
      type: "credit",
      amount: amountPaise,
      status: "pending",
      razorpay_order_id: mockOrderId,
      description: description || "Add money to wallet",
    });

    return new Response(JSON.stringify({
      order_id: mockOrderId,
      amount: amountPaise,
      currency,
      sandbox: true,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
