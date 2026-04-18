// Daily job: marks pending_payment_approvals as 'expired' once expires_at has passed
// and notifies the teen so they know the request lapsed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();
    const { data: expired, error } = await admin
      .from("pending_payment_approvals")
      .update({ status: "expired", decided_at: nowIso })
      .eq("status", "pending")
      .lt("expires_at", nowIso)
      .select("id, teen_id, amount");

    if (error) {
      console.error("expire-pending-approvals error:", error);
      return json({ error: error.message }, 500);
    }

    const rows = expired || [];
    if (rows.length > 0) {
      const notifications = rows.map((r) => ({
        user_id: r.teen_id,
        title: "⌛ Payment request expired",
        body: `Your request for ₹${(r.amount / 100).toFixed(2)} expired before your parent responded. You can try again.`,
        type: "parent_approval",
      }));
      await admin.from("notifications").insert(notifications);
    }

    return json({ success: true, expired_count: rows.length });
  } catch (e) {
    console.error("expire-pending-approvals exception:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
