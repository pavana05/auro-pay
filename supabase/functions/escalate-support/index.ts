// Escalates the user's active AI support chat to a human admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j(401, { error: "Missing authorization" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!userData.user) return j(401, { error: "Invalid session" });
    const userId = userData.user.id;

    const { data: ticket } = await supabase
      .from("support_tickets").select("id, subject")
      .eq("user_id", userId).eq("category", "ai_chat")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!ticket) return j(404, { error: "No active chat to escalate" });

    await supabase.from("support_tickets").update({
      category: "general",
      priority: "high",
      status: "open",
      subject: ticket.subject?.startsWith("[Escalated]") ? ticket.subject : `[Escalated] ${ticket.subject}`,
      updated_at: new Date().toISOString(),
    }).eq("id", ticket.id);

    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: userId,
      message: "🙋 User requested a human agent. AI replies paused — an admin will respond shortly.",
      is_admin: true,
    });

    // Notify admins
    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await supabase.from("notifications").insert(admins.map((a: any) => ({
        user_id: a.user_id,
        title: "🆘 New escalation",
        body: "A user requested a human agent in support chat.",
        type: "support_escalation",
      })));
    }

    return j(200, { ok: true, ticket_id: ticket.id });
  } catch (e) {
    console.error("escalate error", e);
    return j(500, { error: e instanceof Error ? e.message : "Unknown" });
  }
});

function j(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
