import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.text();
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("x-razorpay-signature");
      if (signature) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", encoder.encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
        const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
        if (expectedSig !== signature) {
          return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
        }
      }
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    if (eventType === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      // Find and update transaction
      const { data: tx } = await supabase.from("transactions").select("*").eq("razorpay_order_id", orderId).eq("status", "pending").single();
      if (tx) {
        await supabase.from("transactions").update({ status: "success", razorpay_payment_id: payment.id }).eq("id", tx.id);

        const { data: wallet } = await supabase.from("wallets").select("*").eq("id", tx.wallet_id).single();
        if (wallet) {
          await supabase.from("wallets").update({ balance: (wallet.balance || 0) + tx.amount }).eq("id", wallet.id);
          await supabase.from("notifications").insert({
            user_id: wallet.user_id,
            title: "Money Added",
            body: `₹${(tx.amount / 100).toLocaleString("en-IN")} added to your wallet`,
            type: "credit",
          });
        }
      }
    } else if (eventType === "payment.failed") {
      const payment = event.payload.payment.entity;
      await supabase.from("transactions").update({ status: "failed" }).eq("razorpay_order_id", payment.order_id);
    }

    return new Response(JSON.stringify({ status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
