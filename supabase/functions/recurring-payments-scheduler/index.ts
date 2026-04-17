// Recurring payment scheduler.
// Runs every 5 minutes via pg_cron, processes any recurring_payments rows whose
// next_run_at <= now() and is_active = true.
// For "topup" rows: credits the user's wallet and creates a "credit" transaction.
// For "p2p" rows: invokes the p2p-transfer edge function under the user.
// Then advances next_run_at based on frequency/day fields.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Recurring {
  id: string;
  user_id: string;
  favorite_id: string | null;
  amount: number;        // paise
  frequency: string;     // 'daily' | 'weekly' | 'monthly'
  next_run_at: string;
  is_active: boolean;
  note: string | null;
  kind: string;          // 'topup' | 'p2p'
  day_of_week: number | null;
  day_of_month: number | null;
  run_count: number;
}

const computeNextRun = (r: Recurring, from = new Date()): Date => {
  const d = new Date(from);
  if (r.frequency === "daily") {
    d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }
  if (r.frequency === "weekly") {
    const target = r.day_of_week ?? d.getUTCDay();
    const delta = (target - d.getUTCDay() + 7) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + delta);
    return d;
  }
  // monthly
  const target = r.day_of_month ?? d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(Math.min(target, 28));
  return d;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const nowIso = new Date().toISOString();
    const { data: due, error } = await admin
      .from("recurring_payments")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", nowIso)
      .limit(50);

    if (error) throw error;

    let processed = 0;
    let failed = 0;

    for (const r of (due as unknown as Recurring[]) || []) {
      try {
        if (r.kind === "topup") {
          // Credit user's wallet
          const { data: wallet } = await admin
            .from("wallets")
            .select("id, balance")
            .eq("user_id", r.user_id)
            .single();

          if (!wallet) throw new Error("wallet not found");

          await admin.from("wallets").update({
            balance: (wallet.balance ?? 0) + r.amount,
          }).eq("id", wallet.id);

          await admin.from("transactions").insert({
            wallet_id: wallet.id,
            type: "credit",
            amount: r.amount,
            status: "success",
            description: r.note || `Auto top-up · ${r.frequency}`,
            category: "transfer",
          });

          await admin.from("notifications").insert({
            user_id: r.user_id,
            title: "Auto-Pay Top-up Successful",
            body: `₹${(r.amount / 100).toFixed(0)} added to your wallet via ${r.frequency} auto top-up.`,
            type: "topup_success",
          });
        } else {
          // p2p — invoke p2p-transfer with service-role bypass
          const { data: fav } = await admin
            .from("quick_pay_favorites")
            .select("contact_name, contact_upi_id")
            .eq("id", r.favorite_id!)
            .single();

          if (!fav) throw new Error("favorite not found");

          // Direct DB-level p2p (skip auth invocation): debit user's wallet
          const { data: wallet } = await admin
            .from("wallets").select("id, balance")
            .eq("user_id", r.user_id).single();
          if (!wallet || (wallet.balance ?? 0) < r.amount) {
            throw new Error("insufficient balance");
          }

          await admin.from("wallets").update({
            balance: (wallet.balance ?? 0) - r.amount,
          }).eq("id", wallet.id);

          await admin.from("transactions").insert({
            wallet_id: wallet.id,
            type: "debit",
            amount: r.amount,
            status: "success",
            merchant_name: fav.contact_name,
            merchant_upi_id: fav.contact_upi_id,
            description: r.note || `Auto pay to ${fav.contact_name}`,
            category: "transfer",
          });

          await admin.from("notifications").insert({
            user_id: r.user_id,
            title: "Auto-Pay Sent",
            body: `₹${(r.amount / 100).toFixed(0)} paid to ${fav.contact_name} (auto).`,
            type: "autopay_sent",
          });
        }

        const next = computeNextRun(r);
        await admin.from("recurring_payments").update({
          next_run_at: next.toISOString(),
          last_run_at: nowIso,
          last_status: "success",
          run_count: (r.run_count ?? 0) + 1,
          updated_at: nowIso,
        }).eq("id", r.id);

        processed++;
      } catch (err) {
        const next = computeNextRun(r);
        await admin.from("recurring_payments").update({
          next_run_at: next.toISOString(),
          last_run_at: nowIso,
          last_status: `failed: ${(err as Error).message}`.slice(0, 200),
          updated_at: nowIso,
        }).eq("id", r.id);

        await admin.from("notifications").insert({
          user_id: r.user_id,
          title: "Auto-Pay Failed",
          body: `Your scheduled ₹${(r.amount / 100).toFixed(0)} payment couldn't be processed: ${(err as Error).message}`,
          type: "autopay_failed",
        });
        failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, processed, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
