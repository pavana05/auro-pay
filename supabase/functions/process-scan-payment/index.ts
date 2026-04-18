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

    // ── Centralised admin-flag checks ────────────────────────────────
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", ["freeze_all_transactions", "kyc_required", "pin_required", "min_transaction_amount", "max_transaction_amount", "parent_approval"]);
    const flags: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { flags[r.key] = r.value; });

    if (flags.freeze_all_transactions === "true") {
      return new Response(JSON.stringify({ error: "Transactions are temporarily paused by administrators. Please try again shortly." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { upi_id, payee_name, amount, category, note, pin, approval_id } = await req.json();

    if (!upi_id || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payment details" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const amountPaise = Math.round(amount * 100);
    const minAmt = Number(flags.min_transaction_amount ?? "100");
    const maxAmt = Number(flags.max_transaction_amount ?? "5000000");
    if (amountPaise < minAmt) return new Response(JSON.stringify({ error: `Minimum transaction is ₹${(minAmt / 100).toLocaleString("en-IN")}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (amountPaise > maxAmt) return new Response(JSON.stringify({ error: `Maximum transaction is ₹${(maxAmt / 100).toLocaleString("en-IN")}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // PIN required policy (default ON)
    const pinRequired = flags.pin_required !== "false";
    if (pinRequired) {
      if (!pin || !/^\d{4}$/.test(String(pin))) {
        return new Response(JSON.stringify({ error: "PIN required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // KYC + parent_approval gate (single profile fetch)
    const { data: prof } = await supabase.from("profiles").select("kyc_status, role").eq("id", user.id).maybeSingle();
    if (flags.kyc_required !== "false") {
      if (prof?.kyc_status !== "verified") {
        return new Response(JSON.stringify({ error: "KYC verification required before paying." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Parent approval gate: teens spending > ₹2,000 must wait for parent OK
    const PARENT_APPROVAL_THRESHOLD = 200000;
    if (
      flags.parent_approval !== "false" &&
      prof?.role === "teen" &&
      amountPaise > PARENT_APPROVAL_THRESHOLD &&
      !approval_id
    ) {
      const { data: link } = await supabase
        .from("parent_teen_links")
        .select("parent_id")
        .eq("teen_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!link?.parent_id) {
        return new Response(JSON.stringify({ error: "Payments over ₹2,000 require a linked parent. Ask a parent to link with you first." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: pending, error: pErr } = await supabase
        .from("pending_payment_approvals")
        .insert({
          teen_id: user.id,
          parent_id: link.parent_id,
          amount: amountPaise,
          note: note || `Payment to ${payee_name || upi_id}`,
          status: "pending",
        })
        .select("id")
        .single();
      if (pErr) return new Response(JSON.stringify({ error: "Could not request parent approval" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({
        success: false,
        requires_parent_approval: true,
        approval_id: pending.id,
        message: "Your parent has been asked to approve this payment.",
      }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (approval_id) {
      const { data: appr } = await supabase
        .from("pending_payment_approvals")
        .select("status, teen_id, amount")
        .eq("id", approval_id)
        .maybeSingle();
      if (!appr || appr.teen_id !== user.id || appr.amount !== amountPaise || appr.status !== "approved") {
        return new Response(JSON.stringify({ error: "Approval invalid or not yet granted." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Verify PIN against stored hash (only when pin_required)
    if (pinRequired) {
      const { data: profile } = await supabase.from("profiles").select("pin_hash").eq("id", user.id).single();
      if (!profile?.pin_hash) {
        return new Response(JSON.stringify({ success: false, code: "PIN_NOT_SET", error: "Payment PIN not set" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const pinData = new TextEncoder().encode(`${user.id}:${pin}`);
      const pinHashBuf = await crypto.subtle.digest("SHA-256", pinData);
      const pinHash = Array.from(new Uint8Array(pinHashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (pinHash !== profile.pin_hash) {
        return new Response(JSON.stringify({ error: "Incorrect PIN" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

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

    await supabase.from("wallets").update({
      balance: (wallet.balance || 0) - amountPaise,
      spent_today: (wallet.spent_today || 0) + amountPaise,
      spent_this_month: (wallet.spent_this_month || 0) + amountPaise,
    }).eq("id", wallet.id);

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
