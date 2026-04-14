import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const today = new Date();
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay(); // 0=Sun

    // Fetch active links with pocket money configured
    const { data: links, error } = await supabase
      .from("parent_teen_links")
      .select("*, wallets!parent_teen_links_teen_id_fkey(id, user_id, balance)")
      .eq("is_active", true)
      .gt("pocket_money_amount", 0);

    if (error) throw error;

    let processed = 0;

    for (const link of links || []) {
      const freq = link.pocket_money_frequency || "monthly";
      const scheduledDay = link.pocket_money_day || 1;
      const amount = link.pocket_money_amount || 0;

      let shouldProcess = false;
      if (freq === "daily") shouldProcess = true;
      else if (freq === "weekly" && dayOfWeek === scheduledDay) shouldProcess = true;
      else if (freq === "monthly" && dayOfMonth === scheduledDay) shouldProcess = true;

      if (!shouldProcess || amount <= 0) continue;

      // Get parent wallet
      const { data: parentWallet } = await supabase.from("wallets").select("*").eq("user_id", link.parent_id).single();
      if (!parentWallet || (parentWallet.balance || 0) < amount) {
        // Notify parent about insufficient balance
        await supabase.from("notifications").insert({
          user_id: link.parent_id,
          title: "Pocket Money Failed",
          body: `Insufficient balance for automatic pocket money transfer`,
          type: "alert",
        });
        continue;
      }

      // Get teen wallet
      const { data: teenWallet } = await supabase.from("wallets").select("*").eq("user_id", link.teen_id).single();
      if (!teenWallet) continue;

      // Debit parent
      await supabase.from("wallets").update({ balance: (parentWallet.balance || 0) - amount }).eq("id", parentWallet.id);

      // Credit teen
      await supabase.from("wallets").update({ balance: (teenWallet.balance || 0) + amount }).eq("id", teenWallet.id);

      // Create transactions for both
      await supabase.from("transactions").insert([
        {
          wallet_id: parentWallet.id,
          type: "debit",
          amount,
          status: "success",
          description: `Pocket money to teen`,
          category: "transfer",
        },
        {
          wallet_id: teenWallet.id,
          type: "credit",
          amount,
          status: "success",
          description: `Pocket money from parent`,
          category: "transfer",
        },
      ]);

      // Notifications
      await supabase.from("notifications").insert([
        { user_id: link.parent_id, title: "Pocket Money Sent", body: `₹${(amount / 100).toLocaleString("en-IN")} sent automatically`, type: "transfer" },
        { user_id: link.teen_id, title: "Pocket Money Received! 🎉", body: `₹${(amount / 100).toLocaleString("en-IN")} added to your wallet`, type: "transfer" },
      ]);

      processed++;
    }

    return new Response(JSON.stringify({ success: true, processed }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
