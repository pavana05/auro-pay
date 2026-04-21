// Update p2p-transfer to enforce all relevant admin app_settings server-side:
// - freeze_all_transactions  → 503
// - feature_quick_pay        → 403 (feature off)
// - kyc_required             → require profile.kyc_status === 'verified'
// - min/max_transaction_amount  → 400 (amount out of range)
// - parent_approval          → for teen wallets, large tx > ₹2,000 needs parent_approval flag respected (advisory tag in tx)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { resolvePaymentLocation, withLocation } from "../_shared/payment-location.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Read multiple app_settings in one round-trip and return them as a map with
// sensible defaults baked in.
async function loadSettings(admin: any, keys: string[]): Promise<Record<string, string>> {
  const { data } = await admin.from("app_settings").select("key,value").in("key", keys);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.key] = r.value; });
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { favorite_id, amount, note, client_location } = body;

    if (!favorite_id || !amount || typeof amount !== "number" || amount <= 0) {
      return json({ error: "Invalid request. Provide favorite_id and a positive amount (in paise)." }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ── Centralised admin-flag checks ───────────────────────────────────
    const flags = await loadSettings(adminClient, [
      "freeze_all_transactions",
      "feature_quick_pay",
      "kyc_required",
      "min_transaction_amount",
      "max_transaction_amount",
      "parent_approval",
    ]);

    if (flags.freeze_all_transactions === "true") {
      return json({ error: "Transactions are temporarily paused by administrators. Please try again shortly." }, 503);
    }
    if (flags.feature_quick_pay === "false") {
      return json({ error: "Quick Pay is currently disabled by administrators." }, 403);
    }
    const minAmt = Number(flags.min_transaction_amount ?? "100");
    const maxAmt = Number(flags.max_transaction_amount ?? "5000000");
    if (amount < minAmt) {
      return json({ error: `Minimum transaction is ₹${(minAmt / 100).toLocaleString("en-IN")}` }, 400);
    }
    if (amount > maxAmt) {
      return json({ error: `Maximum transaction is ₹${(maxAmt / 100).toLocaleString("en-IN")}` }, 400);
    }
    const { data: prof } = await adminClient.from("profiles").select("kyc_status, role").eq("id", user.id).maybeSingle();
    if (flags.kyc_required !== "false") {
      if (prof?.kyc_status !== "verified") {
        return json({ error: "KYC verification required before sending money." }, 403);
      }
    }
    // ────────────────────────────────────────────────────────────────────

    // Verify the favorite belongs to this user
    const { data: fav, error: favError } = await adminClient
      .from("quick_pay_favorites")
      .select("*")
      .eq("id", favorite_id)
      .eq("user_id", user.id)
      .single();

    if (favError || !fav) return json({ error: "Contact not found" }, 404);

    // Parent approval gate: teens sending > ₹2,000 must wait for parent OK.
    // Skip the bypass param `approval_id` (set when parent has approved).
    const approvalId: string | undefined = body.approval_id;
    const PARENT_APPROVAL_THRESHOLD = 200000; // ₹2,000 in paise
    if (
      flags.parent_approval !== "false" &&
      prof?.role === "teen" &&
      amount > PARENT_APPROVAL_THRESHOLD &&
      !approvalId
    ) {
      // Find an active parent link
      const { data: link } = await adminClient
        .from("parent_teen_links")
        .select("parent_id")
        .eq("teen_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!link?.parent_id) {
        return json({ error: "Payments over ₹2,000 require a linked parent. Ask a parent to link with you first." }, 403);
      }
      const { data: pending, error: pErr } = await adminClient
        .from("pending_payment_approvals")
        .insert({
          teen_id: user.id,
          parent_id: link.parent_id,
          favorite_id,
          amount,
          note: note || null,
          status: "pending",
        })
        .select("id")
        .single();
      if (pErr) return json({ error: "Could not request parent approval" }, 500);
      return json({
        success: false,
        requires_parent_approval: true,
        approval_id: pending.id,
        message: "Your parent has been asked to approve this payment.",
      }, 202);
    }

    // If approval_id was passed, verify it's approved & belongs to this teen+amount
    if (approvalId) {
      const { data: appr } = await adminClient
        .from("pending_payment_approvals")
        .select("status, teen_id, amount")
        .eq("id", approvalId)
        .maybeSingle();
      if (!appr || appr.teen_id !== user.id || appr.amount !== amount || appr.status !== "approved") {
        return json({ error: "Approval invalid or not yet granted." }, 403);
      }
    }

    // Get sender's wallet
    const { data: senderWallet, error: swError } = await adminClient
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (swError || !senderWallet) return json({ error: "Wallet not found" }, 404);
    if (senderWallet.is_frozen) return json({ error: "Your wallet is frozen" }, 403);
    if ((senderWallet.balance || 0) < amount) return json({ error: "Insufficient balance" }, 400);

    // Check daily limit
    const newSpentToday = (senderWallet.spent_today || 0) + amount;
    if (senderWallet.daily_limit && newSpentToday > senderWallet.daily_limit) {
      return json({ error: "Daily spending limit exceeded" }, 400);
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

    if (deductError) return json({ error: "Transfer failed" }, 500);

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

          // Resolve location once (used on both sender + recipient legs)
          const loc = await resolvePaymentLocation(req, client_location);

          await adminClient.from("transactions").insert(withLocation({
            wallet_id: recipientWallet.id,
            type: "credit",
            amount,
            status: "success",
            category: "transfer",
            merchant_name: `From ${user.email?.split("@")[0] || "User"}`,
            description: note || `Transfer from AuroPay user`,
          }, loc));

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

    const senderLoc = await resolvePaymentLocation(req, client_location);
    await adminClient.from("transactions").insert(withLocation({
      wallet_id: senderWallet.id,
      type: "debit",
      amount,
      status: "success",
      category: "transfer",
      merchant_name: `To ${fav.contact_name}`,
      description: note || `Transfer to ${fav.contact_name}`,
    }, senderLoc));

    await adminClient
      .from("quick_pay_favorites")
      .update({ last_paid_at: new Date().toISOString() })
      .eq("id", favorite_id);

    await adminClient.from("notifications").insert({
      user_id: user.id,
      title: "Money Sent! 🚀",
      body: `₹${(amount / 100).toFixed(2)} sent to ${fav.contact_name}`,
      type: "transfer",
    });

    return json({
      success: true,
      recipient_credited: recipientCredited,
      message: recipientCredited
        ? `₹${(amount / 100).toFixed(2)} sent to ${fav.contact_name}`
        : `₹${(amount / 100).toFixed(2)} sent to ${fav.contact_name} (external transfer)`,
    });
  } catch (err) {
    return json({ error: "Internal server error" }, 500);
  }
});
