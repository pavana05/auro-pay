// Screen 18 — In-App AI Support Chat.
// Streams replies via /functions/v1/support-chat, persists to ticket_messages,
// and offers "Talk to human" escalation that converts the chat into a high-priority ticket.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Sparkles, UserRound, Headphones, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Msg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pending?: boolean;
}

const QUICK_CHIPS = [
  "Payment failed — what now?",
  "Where is my refund?",
  "I have a KYC issue",
  "My card isn't working",
];

const WELCOME: Msg = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm AuroPay support 💛 Ask me anything about payments, refunds, KYC, or your card. I'll help right away.",
};

const SupportChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: tickets } = await supabase
      .from("support_tickets").select("id, status, category")
      .eq("user_id", user.id).eq("category", "ai_chat")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false }).limit(1);
    const t = tickets?.[0];
    if (!t) return;
    const { data: msgs } = await supabase
      .from("ticket_messages").select("*")
      .eq("ticket_id", t.id).order("created_at");
    if (msgs?.length) {
      setMessages([
        WELCOME,
        ...msgs.map((m: any) => ({
          id: m.id,
          role: (m.is_admin ? "assistant" : "user") as "user" | "assistant",
          content: m.message,
        })),
      ]);
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || streaming || escalated) return;
    haptic.light();
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: text.trim() };
    const assistantId = `a-${Date.now()}`;
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", pending: true }]);
    setInput("");
    setStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;
      const history = messages
        .filter(m => m.id !== "welcome" && (m.role === "user" || m.role === "assistant"))
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error("Slow down a bit — too many messages.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Please add credits in workspace settings.");
        else toast.error(errBody.error || "Could not reach assistant");
        setMessages(prev => prev.filter(m => m.id !== assistantId));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      // first token marks pending → false
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            // sentinel from our edge function
            if (parsed.ticket_id) continue;
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              acc += delta;
              if (firstToken) { firstToken = false; haptic.selection(); }
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: acc, pending: false } : m
              ));
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }

      // Drain remainder
      if (buf.trim()) {
        for (let raw of buf.split("\n")) {
          if (!raw.startsWith("data: ")) continue;
          const json = raw.slice(6).trim();
          if (json === "[DONE]" || !json) continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) acc += delta;
          } catch { /* ignore */ }
        }
        if (acc) setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc, pending: false } : m));
      }

      if (!acc) {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Sorry, I didn't catch that. Try again?", pending: false } : m));
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Something went wrong");
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "⚠️ Couldn't reach the assistant.", pending: false } : m));
    } finally {
      setStreaming(false);
    }
  };

  const escalate = async () => {
    if (escalating || escalated) return;
    setEscalating(true);
    haptic.medium();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/escalate-support`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Escalation failed");
      setEscalated(true);
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        role: "system",
        content: "🙋 An admin has been notified and will reply here soon. AI replies are paused.",
      }]);
      toast.success("Connected to a human agent");
    } catch (e: any) {
      toast.error(e.message || "Could not escalate");
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {/* Ambient gold glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-32 w-[420px] h-[420px] rounded-full opacity-[0.05] blur-[110px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/[0.04]"
        style={{ background: "hsl(220 22% 5% / 0.85)" }}>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <button onClick={() => { haptic.light(); navigate(-1); }}
            className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 border border-white/[0.05]"
            style={{ background: "hsl(220 15% 8%)" }}>
            <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center border border-primary/30 shrink-0"
              style={{ background: "hsl(var(--primary) / 0.12)" }}>
              <Sparkles className="w-[18px] h-[18px] text-primary" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                style={{
                  background: escalated ? "hsl(38 92% 55%)" : "hsl(152 65% 50%)",
                  borderColor: "hsl(220 22% 5%)",
                }} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold tracking-[-0.3px] truncate">
                {escalated ? "Human Agent" : "AuroPay Assistant"}
              </p>
              <p className="text-[10px] text-white/40 truncate">
                {streaming ? "Typing…" : escalated ? "Connected · admin replying" : "AI · usually instant"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3 relative z-10">
        {messages.map((m, i) => {
          if (m.role === "system") {
            return (
              <div key={m.id} className="flex justify-center my-2"
                style={{ animation: "msg-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                <div className="rounded-full px-3.5 py-1.5 text-[10.5px] font-medium text-white/55 border border-white/[0.06]"
                  style={{ background: "hsl(38 92% 50% / 0.06)" }}>
                  {m.content}
                </div>
              </div>
            );
          }
          const mine = m.role === "user";
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
              style={{ animation: `msg-in 0.4s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i * 0.02, 0.15)}s both` }}>
              {!mine && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-primary/25 mb-1"
                  style={{ background: "hsl(var(--primary) / 0.10)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[78%] px-3.5 py-2.5 text-[13.5px] leading-[1.5] ${
                mine ? "rounded-[18px] rounded-br-[6px] font-medium" : "rounded-[18px] rounded-bl-[6px]"
              }`}
                style={{
                  background: mine
                    ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))"
                    : "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                  color: mine ? "hsl(220 22% 6%)" : "hsl(0 0% 95%)",
                  border: mine ? "1px solid hsl(var(--primary) / 0.4)" : "1px solid hsl(0 0% 100% / 0.04)",
                  boxShadow: mine ? "0 6px 18px hsl(var(--primary) / 0.18)" : "none",
                }}>
                {m.pending && !m.content
                  ? <TypingDots />
                  : <span className="whitespace-pre-wrap">{m.content}</span>}
              </div>
              {mine && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-1 border border-white/[0.06]"
                  style={{ background: "hsl(220 15% 10%)" }}>
                  <UserRound className="w-3.5 h-3.5 text-white/60" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick chips + escalate */}
      <div className="relative z-10 px-4 pt-2 pb-2 space-y-2.5">
        {messages.length <= 1 && !streaming && (
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide"
            style={{ animation: "msg-in 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
            {QUICK_CHIPS.map(chip => (
              <button key={chip} onClick={() => send(chip)} disabled={streaming}
                className="shrink-0 h-[34px] px-3.5 rounded-full text-[11.5px] font-semibold border active:scale-95 transition-transform"
                style={{
                  background: "linear-gradient(160deg, hsl(var(--primary) / 0.08), hsl(220 18% 7%))",
                  borderColor: "hsl(var(--primary) / 0.18)",
                  color: "hsl(var(--primary))",
                }}>
                {chip}
              </button>
            ))}
          </div>
        )}

        {!escalated && (
          <button onClick={escalate} disabled={escalating || streaming}
            className="w-full h-[40px] rounded-2xl flex items-center justify-center gap-1.5 text-[12px] font-semibold border border-white/[0.05] active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ background: "hsl(220 15% 8%)", color: "hsl(0 0% 90%)" }}>
            {escalating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4 text-primary" />}
            {escalating ? "Connecting…" : "Talk to a human"}
          </button>
        )}
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 z-20 px-4 pb-4 pt-2 backdrop-blur-xl border-t border-white/[0.04]"
        style={{ background: "hsl(220 22% 5% / 0.9)" }}>
        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-[18px] border border-white/[0.06] px-4 py-2.5"
            style={{ background: "hsl(220 15% 8%)" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              placeholder={escalated ? "Wait for the agent…" : "Type your question…"}
              disabled={escalated}
              rows={1}
              className="w-full bg-transparent outline-none text-[13.5px] text-white placeholder:text-white/30 resize-none max-h-[100px] disabled:opacity-50"
              style={{ minHeight: "20px" }}
            />
          </div>
          <button onClick={() => send(input)} disabled={!input.trim() || streaming || escalated}
            className="w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
            style={{
              background: input.trim() && !streaming && !escalated
                ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))"
                : "hsl(220 15% 10%)",
              border: "1px solid hsl(var(--primary) / 0.3)",
              boxShadow: input.trim() && !streaming ? "0 6px 18px hsl(var(--primary) / 0.25)" : "none",
            }}>
            {streaming
              ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(220 22% 6%)" }} />
              : <Send className="w-4 h-4" style={{ color: input.trim() ? "hsl(220 22% 6%)" : "hsl(0 0% 100% / 0.4)" }} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes msg-in {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); }
          100% { opacity: 1; transform: none; }
        }
        @keyframes dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const TypingDots = () => (
  <span className="inline-flex items-center gap-1 py-1.5 px-1">
    {[0, 1, 2].map(i => (
      <span key={i} className="w-1.5 h-1.5 rounded-full"
        style={{
          background: "hsl(var(--primary))",
          animation: `dot-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
        }} />
    ))}
  </span>
);

export default SupportChat;
