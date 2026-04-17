// Sends an in-app notification to all unpaid members of a split.
// Only the creator may call this. Rate limited to once per 5 min per split.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const recentReminders = new Map<string, number>(); // split_id -> ts (best-effort, in-memory)

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

    const { split_id } = await req.json();
    if (!split_id || typeof split_id !== "string") return json({ error: "split_id required" }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: split } = await admin
      .from("bill_splits").select("*").eq("id", split_id).maybeSingle();
    if (!split) return json({ error: "Split not found" }, 404);
    if (split.created_by !== user.id) return json({ error: "Only the creator can remind" }, 403);

    const last = recentReminders.get(split_id) ?? 0;
    if (Date.now() - last < 5 * 60 * 1000) {
      return json({ error: "Please wait a few minutes before reminding again" }, 429);
    }

    const { data: unpaid } = await admin
      .from("bill_split_members")
      .select("user_id, share_amount")
      .eq("split_id", split_id)
      .eq("is_paid", false);

    if (!unpaid || unpaid.length === 0) {
      return json({ success: true, reminded: 0, message: "Everyone has paid!" });
    }

    const rows = unpaid.map((m) => ({
      user_id: m.user_id,
      title: "Reminder: Pay your share 🔔",
      body: `You owe ₹${(m.share_amount / 100).toFixed(2)} for "${split.title}"`,
      type: "bill_split",
    }));

    await admin.from("notifications").insert(rows);
    recentReminders.set(split_id, Date.now());

    return json({ success: true, reminded: rows.length });
  } catch (e) {
    console.error("bill-split-remind error", e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
