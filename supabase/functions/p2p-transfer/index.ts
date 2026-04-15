import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { favorite_id, amount, note } = body;

    if (!favorite_id || !amount || typeof amount !== "number" || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid request. Provide favorite_id and a positive amount (in paise)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount > 5000000) { // Max ₹50,000
      return new Response(JSON.stringify({ error: "Transfer amount exceeds ₹50,000 limit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the favorite belongs to this user
    const { data: fav, error: favError } = await adminClient
      .from("quick_pay_favorites")
      .select("*")
      .eq("id", favorite_id)
      .eq("user_id", user.id)
      .single();

    if (favError || !fav) {
      return new Response(JSON.stringify({ error: "Contact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender's wallet
    const { data: senderWallet, error: swError } = await adminClient
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (swError || !senderWallet) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (senderWallet.is_frozen) {
      return new Response(JSON.stringify({ error: "Your wallet is frozen" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((senderWallet.balance || 0) < amount) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check daily limit
    const newSpentToday = (senderWallet.spent_today || 0) + amount;
    if (senderWallet.daily_limit && newSpentToday > senderWallet.daily_limit) {
      return new Response(JSON.stringify({ error: "Daily spending limit exceeded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct from sender
    const { error: deductError } = await adminClient
      .from("wallets")
      .update({
        balance: (senderWallet.balance || 0) - amount,
        spent_today: newSpentToday,
        spent_this_month: (senderWallet.spent_this_month || 0) + amount,
      })
      .eq("id", senderWallet.id);

    if (deductError) {
      return new Response(JSON.stringify({ error: "Transfer failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to find recipient wallet by phone
    let recipientCredited = false;
    if (fav.contact_phone) {
      const { data: recipientProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("phone", fav.contact_phone)
        .single();

      if (recipientProfile) {
        const { data: recipientWallet } = await adminClient
          .from("wallets")
          .select("*")
          .eq("user_id", recipientProfile.id)
          .single();

        if (recipientWallet) {
          await adminClient
            .from("wallets")
            .update({ balance: (recipientWallet.balance || 0) + amount })
            .eq("id", recipientWallet.id);

          // Record credit transaction for recipient
          await adminClient.from("transactions").insert({
            wallet_id: recipientWallet.id,
            type: "credit",
            amount,
            status: "success",
            category: "transfer",
            merchant_name: `From ${user.email?.split("@")[0] || "User"}`,
            description: note || `Transfer from AuroPay user`,
          });

          // Notify recipient
          await adminClient.from("notifications").insert({
            user_id: recipientProfile.id,
            title: "Money Received! 💰",
            body: `You received ₹${(amount / 100).toFixed(2)} from an AuroPay user`,
            type: "transfer",
          });

          recipientCredited = true;
        }
      }
    }

    // Record debit transaction for sender
    await adminClient.from("transactions").insert({
      wallet_id: senderWallet.id,
      type: "debit",
      amount,
      status: "success",
      category: "transfer",
      merchant_name: `To ${fav.contact_name}`,
      description: note || `Transfer to ${fav.contact_name}`,
    });

    // Update last_paid_at
    await adminClient
      .from("quick_pay_favorites")
      .update({ last_paid_at: new Date().toISOString() })
      .eq("id", favorite_id);

    // Notify sender
    await adminClient.from("notifications").insert({
      user_id: user.id,
      title: "Money Sent! 🚀",
      body: `₹${(amount / 100).toFixed(2)} sent to ${fav.contact_name}`,
      type: "transfer",
    });

    return new Response(JSON.stringify({
      success: true,
      recipient_credited: recipientCredited,
      message: recipientCredited
        ? `₹${(amount / 100).toFixed(2)} sent to ${fav.contact_name}`
        : `₹${(amount / 100).toFixed(2)} sent to ${fav.contact_name} (external transfer)`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
