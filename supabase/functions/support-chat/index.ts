// AI-powered support chat — streams replies via Lovable AI Gateway.
// Persists user + assistant messages to ticket_messages under a single
// "AI Support" ticket per user (auto-created on first message).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are AuroPay's friendly support assistant. AuroPay is an Indian teen-focused payments app (UPI, wallet, parental controls, savings goals, rewards).

Rules:
- Keep replies short (2-4 sentences max), warm and clear.
- Use ₹ (rupees) for money. Never give legal/financial advice beyond product help.
- Common topics: payment failures (refund typically reaches in 5-7 working days), KYC (Aadhaar via Digio), card freeze/unfreeze in Card screen, PIN reset in Security, adding money via UPI/Razorpay, splitting bills, parent controls.
- If a user wants a human, tell them to tap the "Talk to human" button below the chat — an admin will take over the same conversation.
- Never invent transaction IDs, amounts, or user data.
- Use simple plain text. Avoid markdown headings.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return jsonError(401, "Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      auth.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) return jsonError(401, "Invalid session");
    const userId = userData.user.id;

    const body = await req.json();
    const message: string = (body?.message ?? "").toString().trim();
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body?.history) ? body.history : [];
    if (!message || message.length > 2000) return jsonError(400, "Invalid message");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonError(500, "AI not configured");

    // Get or create the user's open AI support ticket
    let { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, status")
      .eq("user_id", userId)
      .eq("category", "ai_chat")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ticket) {
      const { data: newTicket, error: tErr } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          subject: "AI Support Chat",
          description: message.slice(0, 200),
          category: "ai_chat",
          priority: "low",
          status: "open",
        })
        .select("id, status")
        .single();
      if (tErr) {
        console.error("ticket create failed", tErr);
        return jsonError(500, "Could not start chat");
      }
      ticket = newTicket;
    }

    // Persist user message
    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: userId,
      message,
      is_admin: false,
    });

    // Call Lovable AI Gateway (streaming)
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-10),
          { role: "user", content: message },
        ],
        stream: true,
      }),
    });

    if (!aiResp.ok || !aiResp.body) {
      if (aiResp.status === 429) return jsonError(429, "Too many requests, please slow down.");
      if (aiResp.status === 402) return jsonError(402, "AI credits exhausted. Please add credits.");
      const text = await aiResp.text();
      console.error("AI gateway error", aiResp.status, text);
      return jsonError(500, "AI gateway error");
    }

    // Tee the stream: forward to client, accumulate to persist on completion
    let fullReply = "";
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = aiResp.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let textBuffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
            textBuffer += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, nl);
              textBuffer = textBuffer.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const parsed = JSON.parse(json);
                const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
                if (delta) fullReply += delta;
              } catch { /* partial chunk */ }
            }
          }
        } catch (e) {
          console.error("stream error", e);
        } finally {
          // Persist assistant reply
          if (fullReply.trim()) {
            await supabase.from("ticket_messages").insert({
              ticket_id: ticket!.id,
              sender_id: userId, // sender_id required NOT NULL — use user as proxy for AI
              message: fullReply.trim(),
              is_admin: true,
            });
          }
          // Send sentinel with ticket id
          controller.enqueue(encoder.encode(`\ndata: ${JSON.stringify({ ticket_id: ticket!.id })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error", e);
    return jsonError(500, e instanceof Error ? e.message : "Unknown error");
  }
});

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
