// Screen 15 — Notifications: tabs, dual-swipe, detail sheet, per-category empty states.
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCheck, Trash2, Archive, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

type TabKey = "all" | "money" | "security" | "offers" | "system";

const SWIPE_THRESHOLD = 80;
const LONG_PRESS_MS = 550;

// ── Type → category mapping ──
const categoryOf = (type: string | null): Exclude<TabKey, "all"> => {
  switch (type) {
    case "payment": case "credit": case "debit":
    case "limit_request": case "limit_decision":
    case "budget_alert": case "budget_exceeded":
      return "money";
    case "alert": case "kyc": case "security":
      return "security";
    case "offer": case "scratch": case "referral": case "reward":
      return "offers";
    default:
      return "system";
  }
};

const typeConfig: Record<string, { icon: string; hsl: string }> = {
  payment:         { icon: "💸", hsl: "0 70% 55%" },
  debit:           { icon: "💸", hsl: "0 70% 55%" },
  credit:          { icon: "💰", hsl: "152 65% 45%" },
  limit_request:   { icon: "📨", hsl: "42 78% 55%" },
  limit_decision:  { icon: "📊", hsl: "42 78% 55%" },
  budget_alert:    { icon: "📊", hsl: "38 92% 55%" },
  budget_exceeded: { icon: "🚨", hsl: "0 72% 51%" },
  alert:           { icon: "⚠️", hsl: "210 80% 55%" },
  kyc:             { icon: "🪪", hsl: "210 80% 55%" },
  security:        { icon: "🛡️", hsl: "210 80% 55%" },
  offer:           { icon: "🎁", hsl: "42 78% 55%" },
  scratch:         { icon: "🎟️", hsl: "42 78% 55%" },
  referral:        { icon: "🤝", hsl: "42 78% 55%" },
  reward:          { icon: "🏆", hsl: "42 78% 55%" },
  system:          { icon: "🔔", hsl: "270 60% 55%" },
};
const cfgFor = (n: Notification) => typeConfig[n.type || "system"] || typeConfig.system;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "money", label: "Money" },
  { key: "security", label: "Security" },
  { key: "offers", label: "Offers" },
  { key: "system", label: "System" },
];

const EMPTY_STATES: Record<TabKey, { emoji: string; title: string; sub: string }> = {
  all:      { emoji: "🌙", title: "All caught up",          sub: "Nothing new to read right now." },
  money:    { emoji: "💸", title: "No money moves yet",     sub: "Payments and credits will land here." },
  security: { emoji: "🛡️", title: "Your account is calm",   sub: "Security alerts and KYC updates appear here." },
  offers:   { emoji: "🎁", title: "No offers waiting",      sub: "Rewards and scratch cards will show up here." },
  system:   { emoji: "🔔", title: "Quiet on the wire",      sub: "App updates and tips will appear here." },
};

const relativeTime = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const d = Math.floor(hours / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// ─── Swipeable row ───
const Row = ({
  n, index, onArchive, onMarkRead, onDelete, onOpen,
}: {
  n: Notification;
  index: number;
  onArchive: (id: string) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (n: Notification) => void;
}) => {
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const moved = useRef(false);
  const [offset, setOffset] = useState(0);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const [flashRead, setFlashRead] = useState(false);

  const cfg = cfgFor(n);

  const clearLongPress = () => {
    if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    isHorizontal.current = null;
    moved.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      if (!moved.current) {
        haptic.heavy();
        if (window.confirm("Delete this notification permanently?")) onDelete(n.id);
      }
    }, LONG_PRESS_MS);
  }, [n.id, onDelete]);

  const handleMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) { moved.current = true; clearLongPress(); }
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
        if (!isHorizontal.current) { isDragging.current = false; return; }
      } else return;
    }
    if (isHorizontal.current) {
      e.preventDefault();
      setOffset(dx * 0.85);
    }
  }, []);

  const handleEnd = useCallback(() => {
    isDragging.current = false;
    isHorizontal.current = null;
    clearLongPress();

    if (offset <= -SWIPE_THRESHOLD) {
      // Left swipe → archive
      haptic.medium();
      setExiting("left");
      window.setTimeout(() => onArchive(n.id), 280);
    } else if (offset >= SWIPE_THRESHOLD) {
      // Right swipe → mark read with green flash
      haptic.success();
      setFlashRead(true);
      setOffset(0);
      window.setTimeout(() => {
        onMarkRead(n.id);
        setFlashRead(false);
      }, 400);
    } else {
      setOffset(0);
    }
  }, [offset, n.id, onArchive, onMarkRead]);

  const handleClick = () => {
    if (!moved.current) onOpen(n);
  };

  const swipeProgress = Math.min(Math.abs(offset) / SWIPE_THRESHOLD, 1);
  const isLeft = offset < 0;

  return (
    <div
      className="overflow-hidden mb-2"
      style={{
        animation: exiting
          ? `notif-exit-${exiting} 0.3s cubic-bezier(0.4, 0, 1, 1) forwards`
          : `notif-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.03}s both`,
      }}
    >
      <div className="relative rounded-[16px] overflow-hidden">
        {/* Action background */}
        <div
          className="absolute inset-0 rounded-[16px] flex items-center px-5 transition-colors"
          style={{
            background: isLeft
              ? `linear-gradient(90deg, transparent, hsl(0 70% 50% / ${swipeProgress * 0.18}))`
              : `linear-gradient(270deg, transparent, hsl(152 65% 40% / ${swipeProgress * 0.22}))`,
            justifyContent: isLeft ? "flex-end" : "flex-start",
          }}
        >
          <div className="flex items-center gap-1.5"
            style={{ transform: `scale(${0.7 + swipeProgress * 0.4})`, opacity: swipeProgress }}>
            {isLeft ? (
              <>
                <Archive className="w-4 h-4" style={{ color: "hsl(0 80% 70%)" }} />
                {swipeProgress > 0.7 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(0 80% 70%)" }}>
                    Archive
                  </span>
                )}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" style={{ color: "hsl(152 65% 60%)" }} />
                {swipeProgress > 0.7 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(152 65% 60%)" }}>
                    Mark read
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Card */}
        <div
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          onClick={handleClick}
          className="relative rounded-[16px] border touch-pan-y cursor-pointer active:scale-[0.995]"
          style={{
            transform: `translateX(${offset}px)`,
            transition: isDragging.current ? "none" : "transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
            background: flashRead
              ? "linear-gradient(135deg, hsl(152 65% 22% / 0.4), hsl(220 18% 6%))"
              : n.is_read
                ? "linear-gradient(135deg, hsl(220 15% 8%), hsl(220 18% 6%))"
                : `linear-gradient(135deg, hsl(${cfg.hsl} / 0.06), hsl(220 18% 7%))`,
            borderColor: flashRead
              ? "hsl(152 65% 45% / 0.4)"
              : n.is_read ? "hsl(220 15% 12%)" : `hsl(${cfg.hsl} / 0.15)`,
            borderLeftWidth: !n.is_read ? "3px" : "1px",
            borderLeftColor: !n.is_read ? `hsl(${cfg.hsl})` : "hsl(220 15% 12%)",
          }}
        >
          <div className="p-3.5 flex items-start gap-3">
            <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0 relative"
              style={{
                background: `linear-gradient(135deg, hsl(${cfg.hsl} / 0.12), hsl(${cfg.hsl} / 0.04))`,
                border: `1px solid hsl(${cfg.hsl} / 0.18)`,
              }}>
              <span className="text-[18px]">{cfg.icon}</span>
              {!n.is_read && (
                <div className="absolute -top-1 -right-1 w-[8px] h-[8px] rounded-full"
                  style={{ background: `hsl(${cfg.hsl})`, boxShadow: `0 0 8px hsl(${cfg.hsl} / 0.6)` }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-[12.5px] font-semibold leading-snug ${n.is_read ? "text-white/55" : "text-foreground"}`}>{n.title}</p>
                <p className="text-[9px] text-white/30 shrink-0 mt-[1px] font-medium">{relativeTime(n.created_at)}</p>
              </div>
              <p className={`text-[11px] mt-1 leading-relaxed line-clamp-2 ${n.is_read ? "text-white/25" : "text-white/45"}`}>{n.body}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Detail bottom sheet ───
const DetailSheet = ({ n, onClose, onDelete }: { n: Notification; onClose: () => void; onDelete: (id: string) => void }) => {
  const cfg = cfgFor(n);
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "notif-fade 0.2s ease-out" }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8 max-h-[85vh] overflow-y-auto"
        style={{
          background: "linear-gradient(180deg, hsl(220 20% 9%), hsl(220 22% 5%))",
          animation: "notif-sheet 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}>
        <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(${cfg.hsl} / 0.18), hsl(${cfg.hsl} / 0.05))`,
              border: `1px solid hsl(${cfg.hsl} / 0.3)`,
              boxShadow: `0 4px 20px hsl(${cfg.hsl} / 0.15)`,
            }}>
            <span className="text-[24px]">{cfg.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[1.5px] uppercase font-semibold mb-0.5"
              style={{ color: `hsl(${cfg.hsl})` }}>{(n.type || "system").replace(/_/g, " ")}</p>
            <p className="text-[10px] text-white/30">{new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center active:scale-90">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>
        <h2 className="text-[18px] font-bold tracking-[-0.3px] mb-2">{n.title}</h2>
        <p className="text-[13px] text-white/65 leading-relaxed mb-6">{n.body}</p>
        <button onClick={() => { onDelete(n.id); onClose(); }}
          className="w-full h-[48px] rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 border border-destructive/30 text-destructive active:scale-[0.98]"
          style={{ background: "hsl(0 70% 50% / 0.08)" }}>
          <Trash2 className="w-4 h-4" />
          Delete notification
        </button>
      </div>
    </div>
  );
};

// ─── Main page ───
const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [detail, setDetail] = useState<Notification | null>(null);
  const navigate = useNavigate();
  const back = useSafeBack();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("notifications")
        .select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(200);
      setNotifications((data || []) as Notification[]);
      setLoading(false);

      // Realtime: prepend new notifications & reflect updates/deletes live.
      channel = supabase
        .channel(`notifications-${user.id}`)
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as Notification;
            setNotifications(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev]);
            haptic.light();
          })
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as Notification;
            setNotifications(prev => prev.map(x => x.id === n.id ? n : x));
          })
        .on("postgres_changes",
          { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const id = (payload.old as { id: string }).id;
            setNotifications(prev => prev.filter(x => x.id !== id));
          })
        .subscribe();
    };
    load();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const visible = useMemo(
    () => notifications
      .filter(n => !archived.has(n.id))
      .filter(n => tab === "all" ? true : categoryOf(n.type) === tab),
    [notifications, archived, tab]
  );

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: 0, money: 0, security: 0, offers: 0, system: 0 };
    notifications.forEach(n => {
      if (archived.has(n.id) || n.is_read) return;
      c.all++;
      c[categoryOf(n.type)]++;
    });
    return c;
  }, [notifications, archived]);

  const archiveOne = useCallback((id: string) => {
    setArchived(prev => new Set(prev).add(id));
    // Soft archive: also mark read so it won't reappear in future load as unread
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    supabase.from("notifications").update({ is_read: true }).eq("id", id).then(() => {});
    toast.success("Archived");
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    supabase.from("notifications").update({ is_read: true }).eq("id", id).then(() => {});
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
    toast.success("Deleted");
  }, []);

  const markAllRead = useCallback(async () => {
    haptic.medium();
    const ids = visible.filter(n => !n.is_read).map(n => n.id);
    if (ids.length === 0) { toast("Already up to date"); return; }
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).in("id", ids);
    toast.success(`Marked ${ids.length} as read`);
  }, [visible]);

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full opacity-[0.04] blur-[100px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <div className="pt-4 pb-3" style={{ animation: "notif-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { haptic.light(); back(); }}
                className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 border border-white/[0.05]"
                style={{ background: "hsl(220 15% 8%)" }}>
                <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
              </button>
              <div>
                <h1 className="text-[19px] font-bold tracking-[-0.5px]">Notifications</h1>
                {counts.all > 0 && <p className="text-[10px] font-medium" style={{ color: "hsl(var(--primary) / 0.85)" }}>{counts.all} unread</p>}
              </div>
            </div>
            <button onClick={markAllRead}
              className="h-[36px] px-3.5 rounded-[12px] flex items-center gap-1.5 active:scale-95 border border-white/[0.06] text-[11px] font-semibold text-white/70"
              style={{ background: "hsl(220 15% 8%)" }}>
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 -mx-5 px-5 overflow-x-auto scrollbar-hide"
          style={{ animation: "notif-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both" }}>
          {TABS.map(t => {
            const active = tab === t.key;
            const badge = counts[t.key];
            return (
              <button key={t.key}
                onClick={() => { haptic.selection(); setTab(t.key); }}
                className="shrink-0 h-[34px] px-3.5 rounded-full flex items-center gap-1.5 transition-all active:scale-95 text-[11.5px] font-semibold border"
                style={{
                  background: active
                    ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))"
                    : "hsl(220 15% 8%)",
                  borderColor: active ? "hsl(var(--primary) / 0.4)" : "hsl(0 0% 100% / 0.05)",
                  color: active ? "hsl(220 20% 6%)" : "hsl(0 0% 100% / 0.55)",
                  boxShadow: active ? "0 4px 14px hsl(var(--primary) / 0.25)" : "none",
                }}>
                {t.label}
                {badge > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-px rounded-full min-w-[16px] text-center"
                    style={{
                      background: active ? "hsl(220 20% 6% / 0.2)" : "hsl(var(--primary) / 0.15)",
                      color: active ? "hsl(220 20% 6%)" : "hsl(var(--primary))",
                    }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hint */}
        {!loading && visible.length > 0 && (
          <p className="text-[9px] text-white/20 text-center mb-2 font-medium tracking-wider uppercase">
            ← archive · mark read → · long-press to delete
          </p>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-[72px] rounded-[16px] overflow-hidden relative">
                <div className="absolute inset-0" style={{ background: "hsl(220 15% 8%)" }} />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(220 15% 12%) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "notif-shimmer 1.8s ease-in-out infinite",
                }} />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16" style={{ animation: "notif-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="w-[88px] h-[88px] rounded-[26px] flex items-center justify-center mx-auto mb-4 border border-white/[0.05] relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(220 18% 10%), hsl(220 22% 5%))" }}>
              <div className="absolute inset-0 opacity-30"
                style={{ background: "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.15), transparent 60%)" }} />
              <span className="text-[40px] relative" style={{ filter: "saturate(0.85)" }}>{EMPTY_STATES[tab].emoji}</span>
            </div>
            <p className="text-[14px] font-semibold text-white/55 mb-1">{EMPTY_STATES[tab].title}</p>
            <p className="text-[11px] text-white/25 max-w-[240px] mx-auto leading-relaxed">{EMPTY_STATES[tab].sub}</p>
          </div>
        ) : (
          <div>
            {visible.map((n, i) => (
              <Row key={n.id} n={n} index={i}
                onArchive={archiveOne}
                onMarkRead={markRead}
                onDelete={deleteOne}
                onOpen={(notif) => { haptic.light(); setDetail(notif); markRead(notif.id); }}
              />
            ))}
          </div>
        )}
      </div>

      {detail && <DetailSheet n={detail} onClose={() => setDetail(null)} onDelete={deleteOne} />}

      <style>{`
        @keyframes notif-in       { 0% { opacity: 0; transform: translateY(14px) scale(0.98); } 100% { opacity: 1; transform: none; } }
        @keyframes notif-exit-left  { to { opacity: 0; transform: translateX(-110%); max-height: 0; margin-bottom: 0; padding-block: 0; } }
        @keyframes notif-exit-right { to { opacity: 0; transform: translateX(110%);  max-height: 0; margin-bottom: 0; padding-block: 0; } }
        @keyframes notif-fade   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes notif-sheet  { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes notif-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Notifications;
