// Parent approves or rejects a pending teen payment request.
// On approve, this function does NOT auto-execute the transfer — it only
// marks the row as 'approved' and notifies the teen. The teen's client then
// re-invokes p2p-transfer with `approval_id` to actually move the money.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { approval_id, decision, decision_note } = await req.json();
    if (!approval_id || !["approved", "rejected"].includes(decision)) {
      return json({ error: "approval_id and decision (approved|rejected) required" }, 400);
    }

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: appr } = await admin.from("pending_payment_approvals").select("*").eq("id", approval_id).maybeSingle();
    if (!appr) return json({ error: "Approval not found" }, 404);
    if (appr.parent_id !== user.id) return json({ error: "Not your approval to decide" }, 403);
    if (appr.status !== "pending") return json({ error: `Already ${appr.status}` }, 400);
    if (new Date(appr.expires_at) < new Date()) {
      await admin.from("pending_payment_approvals").update({ status: "expired" }).eq("id", approval_id);
      return json({ error: "This approval has expired" }, 410);
    }

    await admin.from("pending_payment_approvals")
      .update({ status: decision, decided_at: new Date().toISOString(), decision_note: decision_note || null })
      .eq("id", approval_id);

    await admin.from("notifications").insert({
      user_id: appr.teen_id,
      title: decision === "approved" ? "✅ Payment approved" : "❌ Payment declined",
      body: decision === "approved"
        ? `Your parent approved ₹${(appr.amount / 100).toFixed(2)}. You can complete the payment now.`
        : `Your parent declined ₹${(appr.amount / 100).toFixed(2)}.${decision_note ? " — " + decision_note : ""}`,
      type: "parent_approval",
    });

    return json({ success: true });
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
