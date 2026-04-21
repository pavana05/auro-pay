// Pay your share of a bill split. Debits the caller's wallet, marks them paid,
// auto-settles the split when everyone has paid, notifies the creator.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { resolvePaymentLocation, withLocation } from "../_shared/payment-location.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { split_id, client_location } = await req.json();
    if (!split_id || typeof split_id !== "string") return json({ error: "split_id required" }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Centralised admin-flag checks
    const { data: settingsRows } = await admin
      .from("app_settings")
      .select("key,value")
      .in("key", ["freeze_all_transactions", "feature_bill_split"]);
    const flags: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { flags[r.key] = r.value; });
    if (flags.freeze_all_transactions === "true") return json({ error: "Transactions are temporarily paused by administrators. Please try again shortly." }, 503);
    if (flags.feature_bill_split === "false") return json({ error: "Bill Split is currently disabled by administrators." }, 403);

    // Find member row for this user in this split
    const { data: member, error: memberError } = await admin
      .from("bill_split_members")
      .select("*")
      .eq("split_id", split_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (memberError || !member) return json({ error: "Not part of this split" }, 404);
    if (member.is_paid) return json({ error: "You've already paid your share" }, 400);

    const amount = member.share_amount;
    if (!amount || amount <= 0) return json({ error: "Invalid share amount" }, 400);

    const { data: split, error: splitErr } = await admin
      .from("bill_splits").select("*").eq("id", split_id).maybeSingle();
    if (splitErr || !split) return json({ error: "Split not found" }, 404);

    // Sender wallet
    const { data: wallet, error: wErr } = await admin
      .from("wallets").select("*").eq("user_id", user.id).maybeSingle();
    if (wErr || !wallet) return json({ error: "Wallet not found" }, 404);
    if (wallet.is_frozen) return json({ error: "Your wallet is frozen" }, 403);
    if ((wallet.balance || 0) < amount) return json({ error: "Insufficient balance" }, 400);

    const newSpentToday = (wallet.spent_today || 0) + amount;
    if (wallet.daily_limit && newSpentToday > wallet.daily_limit) {
      return json({ error: "Daily spending limit exceeded" }, 400);
    }

    // Debit
    const { error: debitErr } = await admin.from("wallets").update({
      balance: (wallet.balance || 0) - amount,
      spent_today: newSpentToday,
      spent_this_month: (wallet.spent_this_month || 0) + amount,
    }).eq("id", wallet.id);
    if (debitErr) return json({ error: "Payment failed" }, 500);

    // Resolve location once for both legs of the split-pay
    const loc = await resolvePaymentLocation(req, client_location);

    // Credit creator wallet (if exists)
    const { data: creatorWallet } = await admin
      .from("wallets").select("*").eq("user_id", split.created_by).maybeSingle();
    if (creatorWallet) {
      await admin.from("wallets").update({
        balance: (creatorWallet.balance || 0) + amount,
      }).eq("id", creatorWallet.id);

      await admin.from("transactions").insert(withLocation({
        wallet_id: creatorWallet.id,
        type: "credit",
        amount,
        status: "success",
        category: "bill_split",
        merchant_name: `Split: ${split.title}`,
        description: `Share received for "${split.title}"`,
      }, loc));

      await admin.from("notifications").insert({
        user_id: split.created_by,
        title: "Split payment received 💸",
        body: `A friend paid ₹${(amount / 100).toFixed(2)} for "${split.title}"`,
        type: "bill_split",
      });
    }

    // Sender debit transaction
    await admin.from("transactions").insert(withLocation({
      wallet_id: wallet.id,
      type: "debit",
      amount,
      status: "success",
      category: "bill_split",
      merchant_name: `Split: ${split.title}`,
      description: `Your share of "${split.title}"`,
    }, loc));

    // Mark paid
    await admin.from("bill_split_members").update({
      is_paid: true,
      paid_at: new Date().toISOString(),
    }).eq("id", member.id);

    // Auto-settle if all paid
    const { data: remaining } = await admin
      .from("bill_split_members")
      .select("id")
      .eq("split_id", split_id)
      .eq("is_paid", false);

    let settled = false;
    if (!remaining || remaining.length === 0) {
      await admin.from("bill_splits").update({ status: "settled" }).eq("id", split_id);
      settled = true;
      await admin.from("notifications").insert({
        user_id: split.created_by,
        title: "Split settled ✅",
        body: `Everyone has paid their share for "${split.title}"`,
        type: "bill_split",
      });
    }

    return json({ success: true, settled });
  } catch (e) {
    console.error("bill-split-pay error", e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
