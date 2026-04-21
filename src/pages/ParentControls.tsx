// Screen 14 — Parent Controls (teen-side trust & safety hub).
// Shows linked parent, current limits, category restrictions (read-only),
// timeline of parent actions, and a "Message Parent" shortcut into chat.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import {
  ArrowLeft, Shield, MessageCircle, Send, ShieldCheck, ShieldOff,
  TrendingUp, Calendar, Clock, Check, X as XIcon, Sparkles,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "@/lib/toast";
import { haptic } from "@/lib/haptics";
import { SkeletonRow } from "@/components/zen/SkeletonRow";

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: "food", label: "Food", emoji: "🍔" },
  { key: "transport", label: "Transport", emoji: "🚗" },
  { key: "shopping", label: "Shopping", emoji: "🛍️" },
  { key: "education", label: "Education", emoji: "📚" },
  { key: "entertainment", label: "Entertainment", emoji: "🎮" },
  { key: "gaming", label: "Gaming", emoji: "🎯" },
  { key: "other", label: "Other", emoji: "💸" },
];

const fmt = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const ParentControls = () => {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [parent, setParent] = useState<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [limits, setLimits] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Request increase modal
  const [reqOpen, setReqOpen] = useState<null | "daily" | "monthly">(null);
  const [reqAmount, setReqAmount] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqSubmitting, setReqSubmitting] = useState(false);

  // Send message
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    // Get linked parent (teen → parent direction)
    const { data: link } = await supabase
      .from("parent_teen_links")
      .select("parent_id")
      .eq("teen_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let parentProfile = null;
    if (link?.parent_id) {
      const { data: pProf } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", link.parent_id)
        .maybeSingle();
      parentProfile = pProf;
    }
    setParent(parentProfile);

    const [wRes, slRes, paRes, reqRes] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("spending_limits").select("*"),
      supabase.from("parent_actions").select("*").eq("teen_id", user.id).order("created_at", { ascending: false }).limit(15),
      supabase.from("limit_increase_requests").select("*").eq("teen_id", user.id).eq("status", "pending"),
    ]);
    setWallet(wRes.data);
    // filter spending_limits to this teen's wallet
    const w = wRes.data;
    setLimits((slRes.data || []).filter((sl: any) => sl.teen_wallet_id === w?.id));
    setActions(paRes.data || []);
    setPendingRequests(reqRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const dailySpent = wallet?.spent_today || 0;
  const dailyLimit = wallet?.daily_limit || 0;
  const monthlySpent = wallet?.spent_this_month || 0;
  const monthlyLimit = wallet?.monthly_limit || 0;
  const dailyPct = dailyLimit > 0 ? Math.min(100, (dailySpent / dailyLimit) * 100) : 0;
  const monthlyPct = monthlyLimit > 0 ? Math.min(100, (monthlySpent / monthlyLimit) * 100) : 0;

  const parentInitials = useMemo(
    () => parent?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "P",
    [parent]
  );

  const pendingFor = (type: "daily" | "monthly") => pendingRequests.find(r => r.limit_type === type);

  // ─── Request limit increase ───
  const submitRequest = async () => {
    if (!reqOpen || !parent || !userId || !wallet) return;
    const rupees = parseInt(reqAmount || "0", 10);
    const currentLimit = reqOpen === "daily" ? dailyLimit : monthlyLimit;
    const requested = rupees * 100;
    if (!rupees || requested <= currentLimit) {
      toast.warn("Enter a higher amount", { description: `Must be more than current limit (${fmt(currentLimit)})` });
      return;
    }
    if (requested > 10_000_000) {
      toast.warn("Amount too high", { description: "Limits are capped at ₹1,00,000" });
      return;
    }
    setReqSubmitting(true);
    const { error } = await supabase.from("limit_increase_requests").insert({
      teen_id: userId,
      parent_id: parent.id,
      limit_type: reqOpen,
      current_limit: currentLimit,
      requested_limit: requested,
      reason: reqReason.trim() || null,
    });
    if (error) { toast.fail("Couldn't send request", { description: error.message }); setReqSubmitting(false); return; }

    // Notify parent
    await supabase.from("notifications").insert({
      user_id: parent.id,
      title: `💰 Limit increase request`,
      body: `Your teen is asking to raise their ${reqOpen} limit from ${fmt(currentLimit)} to ${fmt(requested)}.`,
      type: "limit_request",
    });

    haptic.success();
    toast.ok("Request sent", { description: "Your parent will be notified" });
    setReqOpen(null); setReqAmount(""); setReqReason("");
    setReqSubmitting(false);
    fetchData();
  };

  // ─── Send message to parent (opens chat) ───
  const sendMessage = async () => {
    if (!msgText.trim() || !parent || !userId) return;
    setMsgSending(true);

    // Find existing direct conversation between teen + parent
    const { data: myConvs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);
    const myConvIds = (myConvs || []).map(c => c.conversation_id);

    let conversationId: string | null = null;
    if (myConvIds.length > 0) {
      const { data: shared } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", parent.id)
        .in("conversation_id", myConvIds);
      conversationId = shared?.[0]?.conversation_id || null;
    }

    // Create if missing
    if (!conversationId) {
      const { data: conv, error } = await supabase
        .from("conversations").insert({ type: "direct" }).select().single();
      if (error || !conv) { toast.fail("Couldn't start chat", { description: error?.message }); setMsgSending(false); return; }
      conversationId = conv.id;
      await supabase.from("conversation_members").insert([
        { conversation_id: conversationId, user_id: userId },
        { conversation_id: conversationId, user_id: parent.id },
      ]);
    }

    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: msgText.trim(),
      message_type: "text",
    });
    if (msgErr) { toast.fail("Couldn't send message", { description: msgErr.message }); setMsgSending(false); return; }

    haptic.success();
    toast.ok("Message sent");
    const text = msgText.trim();
    setMsgText("");
    setMsgSending(false);
    // Navigate into the chat room for follow-up
    navigate(`/chat/${conversationId}`);
    void text;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 px-5 pt-6" role="status" aria-busy="true" aria-label="Loading parent controls">
        <SkeletonRow className="w-40 mb-6" height={32} />
        <SkeletonRow className="mb-4" height={120} rounded="rounded-2xl" />
        <SkeletonRow className="mb-4" height={140} rounded="rounded-2xl" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[120px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <div className="pt-4 pb-4 flex items-center gap-3"
          style={{ animation: "pc-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <button onClick={() => { haptic.light(); back(); }}
            className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 border border-white/[0.05]"
            style={{ background: "hsl(220 15% 8%)" }}>
            <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[19px] font-bold tracking-[-0.5px]">Parent Controls</h1>
            <p className="text-[10px] text-white/30 font-medium">Trust &amp; safety hub</p>
          </div>
        </div>

        {/* No parent linked */}
        {!parent && (
          <div className="rounded-[22px] p-8 text-center border border-white/[0.05]"
            style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5%))" }}>
            <ShieldOff className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-white/60 mb-1">No parent linked</p>
            <p className="text-[11px] text-white/30 mb-5">Ask a parent to link your account to use this screen.</p>
            <button onClick={() => navigate("/linked-parents")}
              className="h-[44px] px-5 rounded-full text-[12px] font-bold mx-auto"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                color: "hsl(220 20% 6%)",
              }}>
              Link a parent
            </button>
            <BottomNav />
          </div>
        )}

        {parent && (
          <>
            {/* Overview card */}
            <div className="rounded-[22px] p-5 mb-5 border relative overflow-hidden"
              style={{
                background: "linear-gradient(160deg, hsl(152 50% 14% / 0.35), hsl(220 22% 5%))",
                borderColor: "hsl(152 60% 40% / 0.25)",
                animation: "pc-spring 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both",
              }}>
              <div className="absolute -top-16 -right-16 w-[180px] h-[180px] rounded-full opacity-[0.18] blur-[60px]"
                style={{ background: "hsl(152 65% 45%)" }} />
              <div className="relative flex items-center gap-3">
                <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white font-bold text-[16px] shrink-0"
                  style={{
                    background: "linear-gradient(135deg, hsl(152 65% 45%), hsl(152 65% 30%))",
                    boxShadow: "0 6px 20px hsl(152 65% 30% / 0.4)",
                  }}>
                  {parent.avatar_url
                    ? <img src={parent.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                    : parentInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] tracking-[1.5px] uppercase font-semibold mb-0.5"
                    style={{ color: "hsl(152 65% 60%)" }}>Managing your account</p>
                  <p className="text-[16px] font-bold tracking-[-0.3px] truncate">{parent.full_name || "Your parent"}</p>
                </div>
                <ShieldCheck className="w-6 h-6 shrink-0" style={{ color: "hsl(152 65% 55%)" }} />
              </div>
            </div>

            {/* Limits */}
            <SectionLabel>Spending limits</SectionLabel>
            <div className="space-y-3 mb-6">
              <LimitCard
                icon={<Calendar className="w-4 h-4" />}
                label="Daily limit"
                spent={dailySpent}
                limit={dailyLimit}
                pct={dailyPct}
                pending={pendingFor("daily")}
                onRequest={() => { setReqOpen("daily"); setReqAmount(""); setReqReason(""); }}
              />
              <LimitCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="Monthly limit"
                spent={monthlySpent}
                limit={monthlyLimit}
                pct={monthlyPct}
                pending={pendingFor("monthly")}
                onRequest={() => { setReqOpen("monthly"); setReqAmount(""); setReqReason(""); }}
              />
            </div>

            {/* Categories */}
            <SectionLabel>Category restrictions</SectionLabel>
            <div className="rounded-[18px] border border-white/[0.05] overflow-hidden mb-6"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5%))" }}>
              {CATEGORIES.map((cat, i) => {
                const blocked = limits.find(l => l.category === cat.key)?.is_blocked;
                return (
                  <div key={cat.key}
                    className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] shrink-0"
                      style={{
                        background: blocked ? "hsl(0 70% 50% / 0.12)" : "hsl(220 15% 11%)",
                        border: blocked ? "1px solid hsl(0 70% 50% / 0.2)" : "1px solid hsl(0 0% 100% / 0.04)",
                      }}>
                      {cat.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold">{cat.label}</p>
                      <p className="text-[10px] text-white/30">
                        {blocked ? "Blocked by parent" : "Allowed"}
                      </p>
                    </div>
                    <div className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase"
                      style={{
                        background: blocked ? "hsl(0 70% 50% / 0.15)" : "hsl(152 65% 45% / 0.12)",
                        color: blocked ? "hsl(0 80% 70%)" : "hsl(152 65% 60%)",
                      }}>
                      {blocked ? "Blocked" : "Allowed"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent parent actions */}
            <SectionLabel>Recent parent actions</SectionLabel>
            <div className="rounded-[18px] border border-white/[0.05] overflow-hidden mb-6"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5%))" }}>
              {actions.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Clock className="w-7 h-7 text-white/15 mx-auto mb-2" />
                  <p className="text-[12px] text-white/40">No actions yet</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline rail */}
                  <div className="absolute left-[26px] top-3 bottom-3 w-px"
                    style={{ background: "hsl(0 0% 100% / 0.06)" }} />
                  {actions.map((a) => (
                    <div key={a.id} className="relative flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0">
                      <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0 z-10"
                        style={{
                          background: actionColor(a.action_type, 0.15),
                          border: `1px solid ${actionColor(a.action_type, 0.35)}`,
                        }}>
                        <span className="text-[12px]">{actionEmoji(a.action_type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium leading-snug">{a.description}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message parent */}
            <SectionLabel>Message your parent</SectionLabel>
            <div className="rounded-[18px] border border-white/[0.05] p-3 mb-4"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5%))" }}>
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex items-center bg-black/30 rounded-[14px] border border-white/[0.06] px-3 min-h-[44px]">
                  <MessageCircle className="w-4 h-4 text-white/25 mr-2" />
                  <input
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
                    placeholder={`Message ${parent.full_name?.split(" ")[0] || "your parent"}…`}
                    aria-label="Message your parent"
                    maxLength={500}
                    className="flex-1 bg-transparent py-2.5 text-[13px] text-foreground placeholder:text-white/25 focus:outline-none"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!msgText.trim() || msgSending}
                  aria-label="Send message"
                  className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center active:scale-90 transition disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                    color: "hsl(220 20% 6%)",
                    boxShadow: "0 4px 16px hsl(var(--primary) / 0.3)",
                  }}>
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              <button onClick={() => navigate("/chats")}
                className="w-full mt-2 text-[11px] text-white/40 hover:text-white/60 transition py-1">
                Open full chat history →
              </button>
            </div>
          </>
        )}
      </div>

      <BottomNav />

      {/* Request increase modal */}
      {reqOpen && parent && (
        <Sheet onClose={() => setReqOpen(null)}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.3)" }}>
              <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold">Request {reqOpen} increase</h3>
              <p className="text-[11px] text-white/40">Sent to {parent.full_name?.split(" ")[0] || "your parent"} for approval</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-[14px] mb-4"
            style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 12%)" }}>
            <p className="text-[10px] tracking-widest uppercase text-white/30 mb-1">Current</p>
            <p className="text-[18px] font-mono font-bold text-white/80">
              {fmt(reqOpen === "daily" ? dailyLimit : monthlyLimit)}
            </p>
          </div>
          <p className="text-[10px] text-white/30 font-semibold tracking-wider uppercase mb-2">New limit</p>
          <div className="flex items-center mb-4 px-4 rounded-[14px] h-[56px]"
            style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 12%)" }}>
            <span className="text-[24px] font-bold mr-1" style={{ color: "hsl(var(--primary))" }}>₹</span>
            <input
              value={reqAmount}
              onChange={e => setReqAmount(e.target.value.replace(/\D/g, "").slice(0, 7))}
              inputMode="numeric"
              autoFocus
              placeholder="0"
              aria-label={`New ${reqOpen} limit in rupees`}
              className="bg-transparent outline-none text-[24px] font-mono font-bold text-white flex-1"
            />
          </div>
          <p className="text-[10px] text-white/30 font-semibold tracking-wider uppercase mb-2">Reason (optional)</p>
          <textarea
            value={reqReason}
            onChange={e => setReqReason(e.target.value.slice(0, 200))}
            placeholder="e.g., School trip this weekend"
            rows={3}
            className="w-full rounded-[14px] px-3 py-3 text-[13px] outline-none resize-none mb-4"
            style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 12%)", color: "white" }}
          />
          <div className="flex gap-2">
            <button onClick={() => setReqOpen(null)}
              className="h-[48px] px-4 rounded-2xl text-[13px] font-semibold border border-white/[0.06] text-white/70"
              style={{ background: "hsl(220 15% 8%)" }}>
              Cancel
            </button>
            <button onClick={submitRequest} disabled={reqSubmitting}
              className="flex-1 h-[48px] rounded-2xl text-[13px] font-bold disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                color: "hsl(220 20% 6%)",
                boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
              }}>
              {reqSubmitting ? "Sending…" : "Send request"}
            </button>
          </div>
        </Sheet>
      )}

      <style>{`
        @keyframes pc-spring { 0% { opacity: 0; transform: translateY(20px) scale(0.97); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pc-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes pc-sheet { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }
        @keyframes pc-fill { 0% { width: 0; } }
      `}</style>
    </div>
  );
};

// ─── Sub components ───
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] tracking-[2px] uppercase text-white/35 font-semibold mb-2 mt-1 px-1">
    {children}
  </p>
);

const LimitCard = ({
  icon, label, spent, limit, pct, pending, onRequest,
}: {
  icon: React.ReactNode; label: string; spent: number; limit: number; pct: number;
  pending: any; onRequest: () => void;
}) => {
  const danger = pct >= 90;
  const warn = pct >= 70 && pct < 90;
  const barColor = danger ? "hsl(0 75% 55%)" : warn ? "hsl(38 92% 55%)" : "hsl(var(--primary))";
  return (
    <div className="rounded-[18px] p-4 border border-white/[0.05]"
      style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5%))" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/70">
          {icon}
          <span className="text-[12px] font-semibold">{label}</span>
        </div>
        <p className="text-[11px] font-mono font-bold" style={{ color: barColor }}>{Math.round(pct)}%</p>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <p className="text-[18px] font-mono font-bold tracking-tight">{fmt(spent)}</p>
        <p className="text-[11px] text-white/30">of {fmt(limit)}</p>
      </div>
      <div className="h-[6px] rounded-full overflow-hidden mb-3"
        style={{ background: "hsl(0 0% 100% / 0.05)" }}>
        <div className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}, ${barColor})`,
            boxShadow: `0 0 8px ${barColor}`,
            animation: "pc-fill 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
          }} />
      </div>
      {pending ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "hsl(38 92% 55% / 0.1)", border: "1px solid hsl(38 92% 55% / 0.2)" }}>
          <Clock className="w-3.5 h-3.5" style={{ color: "hsl(38 92% 65%)" }} />
          <p className="text-[11px] font-semibold flex-1" style={{ color: "hsl(38 92% 70%)" }}>
            Request pending: {fmt(pending.requested_limit)}
          </p>
        </div>
      ) : (
        <button onClick={onRequest}
          className="text-[11px] font-semibold transition active:scale-95"
          style={{ color: "hsl(var(--primary))" }}>
          Request increase →
        </button>
      )}
    </div>
  );
};

const Sheet = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "pc-fade 0.2s ease-out" }}>
    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
    <div className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8 max-h-[88vh] overflow-y-auto"
      style={{
        background: "linear-gradient(180deg, hsl(220 20% 9%), hsl(220 22% 5%))",
        animation: "pc-sheet 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}>
      <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />
      {children}
    </div>
  </div>
);

// ─── Action visuals ───
function actionEmoji(type: string): string {
  switch (type) {
    case "set_daily_limit":   return "📊";
    case "set_monthly_limit": return "📈";
    case "add_money":         return "💰";
    case "freeze_card":       return "❄️";
    case "unfreeze_card":     return "🔓";
    case "block_category":    return "🚫";
    case "unblock_category":  return "✅";
    case "approve_request":   return "👍";
    case "reject_request":    return "👎";
    default:                  return "🔔";
  }
}
function actionColor(type: string, alpha: number): string {
  switch (type) {
    case "add_money":
    case "approve_request":
    case "unblock_category":
    case "unfreeze_card":     return `hsl(152 65% 45% / ${alpha})`;
    case "freeze_card":
    case "block_category":
    case "reject_request":    return `hsl(0 75% 55% / ${alpha})`;
    case "set_daily_limit":
    case "set_monthly_limit": return `hsl(38 92% 55% / ${alpha})`;
    default:                  return `hsl(var(--primary) / ${alpha})`;
  }
}

export default ParentControls;
