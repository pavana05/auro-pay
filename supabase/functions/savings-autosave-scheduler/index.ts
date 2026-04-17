// Scheduled function: silently moves money from each user's wallet into their
// savings goals according to per-goal auto-save rules. Designed to be invoked
// every ~15 minutes by pg_cron; only goals whose autosave_next_run_at is in
// the past will execute.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const advance = (from: Date, frequency: string): Date => {
  const next = new Date(from);
  if (frequency === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else if (frequency === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else next.setUTCDate(next.getUTCDate() + 7); // weekly default
  return next;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Emergency freeze check — skip the entire run while frozen
  const { data: freezeRow } = await supabase.from("app_settings").select("value").eq("key", "freeze_all_transactions").maybeSingle();
  if (freezeRow?.value === "true") {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "freeze_all_transactions" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("savings_goals")
    .select("id, teen_id, title, target_amount, current_amount, autosave_amount, autosave_frequency, autosave_next_run_at, is_completed")
    .eq("autosave_enabled", true)
    .eq("is_completed", false)
    .lte("autosave_next_run_at", now);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let processed = 0, skippedNoBalance = 0, completed = 0;

  for (const g of (due || [])) {
    const amountPaise = (g.autosave_amount || 0) * 100;
    if (amountPaise <= 0) continue;

    // Fetch wallet
    const { data: wallet } = await supabase.from("wallets").select("id, balance, is_frozen").eq("user_id", g.teen_id).maybeSingle();
    const nextRun = advance(new Date(), g.autosave_frequency || "weekly").toISOString();

    if (!wallet || wallet.is_frozen || (wallet.balance || 0) < amountPaise) {
      skippedNoBalance++;
      // Still advance the schedule; notify user we couldn't auto-save this cycle.
      await supabase.from("savings_goals")
        .update({ autosave_next_run_at: nextRun, autosave_last_run_at: now })
        .eq("id", g.id);
      await supabase.from("notifications").insert({
        user_id: g.teen_id,
        title: `Auto-save skipped: ${g.title}`,
        body: `We couldn't move ₹${g.autosave_amount} into ${g.title} — wallet balance was too low. We'll try again next cycle.`,
        type: "alert",
      });
      continue;
    }

    const newBalance = (wallet.balance || 0) - amountPaise;
    const newGoalAmount = (g.current_amount || 0) + amountPaise;
    const isComplete = newGoalAmount >= g.target_amount;

    const ops = await Promise.all([
      supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id),
      supabase.from("savings_goals").update({
        current_amount: newGoalAmount,
        is_completed: isComplete,
        autosave_next_run_at: isComplete ? null : nextRun,
        autosave_last_run_at: now,
        autosave_enabled: !isComplete,
      }).eq("id", g.id),
      supabase.from("transactions").insert({
        wallet_id: wallet.id, type: "debit", amount: amountPaise,
        category: "savings", description: `Auto-save → ${g.title}`,
        merchant_name: g.title, status: "success",
      }),
      supabase.from("notifications").insert({
        user_id: g.teen_id,
        title: isComplete ? `🎉 Goal Achieved: ${g.title}` : `Auto-saved ₹${g.autosave_amount}`,
        body: isComplete
          ? `Your auto-save just pushed ${g.title} across the finish line!`
          : `₹${g.autosave_amount} moved from your wallet into ${g.title}.`,
        type: isComplete ? "credit" : "credit",
      }),
    ]);

    if (ops.some(r => r.error)) continue;
    processed++;
    if (isComplete) completed++;
  }

  return new Response(
    JSON.stringify({ ok: true, considered: due?.length || 0, processed, skippedNoBalance, completed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
