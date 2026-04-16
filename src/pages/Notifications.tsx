import { useEffect, useState, useRef, useCallback } from "react";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, Settings, X, Trash2, CheckCheck, BellOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

const SWIPE_THRESHOLD = 90;

const typeConfig: Record<string, { icon: string; color: string }> = {
  payment: { icon: "💳", color: "42 78% 55%" },
  credit: { icon: "💰", color: "152 60% 45%" },
  alert: { icon: "⚠️", color: "38 92% 50%" },
  budget_alert: { icon: "📊", color: "38 92% 50%" },
  budget_exceeded: { icon: "🚨", color: "0 72% 51%" },
  kyc: { icon: "🪪", color: "210 80% 55%" },
  system: { icon: "🔔", color: "270 60% 55%" },
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

const SwipeableNotification = ({
  n,
  index,
  onDismiss,
}: {
  n: Notification;
  index: number;
  onDismiss: (id: string) => void;
}) => {
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);
  const [offset, setOffset] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const cfg = typeConfig[n.type || "system"] || typeConfig.system;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    isHorizontal.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine direction on first significant move
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
        if (!isHorizontal.current) {
          isDragging.current = false;
          return;
        }
      } else {
        return;
      }
    }

    if (isHorizontal.current) {
      e.preventDefault();
      // Add resistance when pulling in positive direction (less common)
      const resistance = dx > 0 ? 0.4 : 0.8;
      setOffset(dx * resistance);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    isHorizontal.current = null;

    if (Math.abs(offset) > SWIPE_THRESHOLD) {
      haptic.medium();
      // Measure height before collapsing
      if (containerRef.current) {
        setHeight(containerRef.current.offsetHeight);
      }
      setDismissed(true);
      // Wait for slide-out animation, then collapse height, then remove
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.height = "0px";
          containerRef.current.style.marginBottom = "0px";
          containerRef.current.style.opacity = "0";
        }
        setTimeout(() => onDismiss(n.id), 300);
      }, 250);
    } else {
      setOffset(0);
    }
  }, [offset, n.id, onDismiss]);

  const swipeProgress = Math.min(Math.abs(offset) / SWIPE_THRESHOLD, 1);
  const isLeftSwipe = offset < 0;

  return (
    <div
      ref={containerRef}
      className="transition-[height,margin,opacity] duration-300 ease-out overflow-hidden mb-2.5"
      style={{ height: height !== undefined && dismissed ? height : undefined }}
    >
      <div className={`relative rounded-[18px] overflow-hidden ${dismissed ? "pointer-events-none" : ""}`}>
        {/* Delete background */}
        <div
          className="absolute inset-0 rounded-[18px] flex items-center transition-all duration-200"
          style={{
            background: `linear-gradient(${isLeftSwipe ? "90deg" : "270deg"}, hsl(0 72% 51% / ${swipeProgress * 0.12}), transparent)`,
            justifyContent: isLeftSwipe ? "flex-end" : "flex-start",
            padding: isLeftSwipe ? "0 20px 0 0" : "0 0 0 20px",
          }}
        >
          <div className="flex items-center gap-2 transition-all duration-200" style={{
            transform: `scale(${0.6 + swipeProgress * 0.4})`,
            opacity: swipeProgress,
          }}>
            <Trash2 className="w-5 h-5 text-destructive" />
            {swipeProgress > 0.7 && (
              <span className="text-[10px] font-bold text-destructive/70 tracking-wider uppercase"
                style={{ animation: "fade-in 0.2s ease-out" }}>Delete</span>
            )}
          </div>
        </div>

        {/* Notification card */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative rounded-[18px] border border-white/[0.04] backdrop-blur-sm touch-pan-y"
          style={{
            transform: dismissed
              ? `translateX(${offset < 0 ? "-120%" : "120%"})`
              : `translateX(${offset}px)`,
            transition: isDragging.current && !dismissed ? "none" : "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
            background: n.is_read
              ? "linear-gradient(135deg, hsl(220 15% 8%), hsl(220 18% 6%))"
              : `linear-gradient(135deg, hsl(${cfg.color} / 0.04), hsl(220 18% 6%))`,
            borderColor: n.is_read ? "hsl(220 15% 12%)" : `hsl(${cfg.color} / 0.1)`,
            animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.04}s both`,
          }}
        >
          {/* Top accent line for unread */}
          {!n.is_read && (
            <div className="absolute top-0 left-4 right-4 h-[1px]"
              style={{ background: `linear-gradient(90deg, transparent, hsl(${cfg.color} / 0.25), transparent)` }} />
          )}

          <div className="relative p-4 flex items-start gap-3.5">
            {/* Icon */}
            <div className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center shrink-0 relative"
              style={{
                background: `linear-gradient(135deg, hsl(${cfg.color} / 0.1), hsl(${cfg.color} / 0.03))`,
                boxShadow: n.is_read ? "none" : `0 4px 12px hsl(${cfg.color} / 0.08)`,
              }}>
              <span className="text-[20px]">{cfg.icon}</span>
              {/* Unread dot */}
              {!n.is_read && (
                <div className="absolute -top-1 -right-1 w-[8px] h-[8px] rounded-full bg-primary"
                  style={{ boxShadow: "0 0 8px hsl(42 78% 55% / 0.5)", animation: "glow-pulse 2s ease-in-out infinite" }} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-semibold leading-snug ${n.is_read ? "text-white/60" : "text-foreground"}`}>{n.title}</p>
              <p className={`text-[11px] mt-1 leading-relaxed ${n.is_read ? "text-white/25" : "text-white/40"}`}>{n.body}</p>
              <p className="text-[9px] text-white/15 mt-2 font-medium">{relativeTime(n.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState({ payments: true, credits: true, alerts: true, kyc: true, system: true });
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setNotifications((data || []) as Notification[]);
      // Mark all as read
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      setLoading(false);
    };
    load();
  }, []);

  const togglePref = (key: keyof typeof prefs) => {
    haptic.selection();
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const dismissNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }, []);

  const clearAll = useCallback(async () => {
    haptic.medium();
    setNotifications([]);
    toast.success("All cleared");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full opacity-[0.035] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute bottom-[30%] -left-20 w-[200px] h-[200px] rounded-full opacity-[0.02] blur-[70px]" style={{ background: "hsl(270 60% 55%)" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <div className="pt-4 pb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-[40px] h-[40px] rounded-[13px] bg-white/[0.025] backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]">
                <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
              </button>
              <div>
                <h1 className="text-[19px] font-bold tracking-[-0.5px]">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-[10px] text-primary/70 font-medium">{unreadCount} unread</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button onClick={clearAll}
                  className="w-[40px] h-[40px] rounded-[13px] bg-white/[0.025] backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]">
                  <CheckCheck className="w-[17px] h-[17px] text-white/40" />
                </button>
              )}
              <button onClick={() => { haptic.light(); setShowSettings(!showSettings); }}
                className="w-[40px] h-[40px] rounded-[13px] bg-white/[0.025] backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]">
                <Settings className="w-[17px] h-[17px] text-white/40" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="rounded-[20px] overflow-hidden border border-white/[0.04] mb-5 backdrop-blur-sm"
            style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))", animation: "slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.1), transparent)" }} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold">Notification Settings</h3>
                <button onClick={() => setShowSettings(false)} className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center active:scale-90 transition-transform">
                  <X className="w-3.5 h-3.5 text-white/30" />
                </button>
              </div>
              {[
                { key: "payments" as const, label: "Payment Alerts", icon: "💳" },
                { key: "credits" as const, label: "Money Received", icon: "💰" },
                { key: "alerts" as const, label: "Security Alerts", icon: "⚠️" },
                { key: "kyc" as const, label: "KYC Updates", icon: "🪪" },
                { key: "system" as const, label: "System", icon: "🔔" },
              ].map(item => (
                <button key={item.key} onClick={() => togglePref(item.key)}
                  className="w-full flex items-center justify-between py-3.5 px-3 -mx-3 rounded-2xl border-b border-white/[0.02] last:border-0 group transition-all duration-300 active:scale-[0.98]"
                  style={{
                    background: prefs[item.key] ? "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--primary) / 0.02))" : "transparent",
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
                      style={{
                        background: prefs[item.key]
                          ? "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))"
                          : "hsl(220 15% 10%)",
                        boxShadow: prefs[item.key] ? "0 2px 8px hsl(var(--primary) / 0.1)" : "none",
                      }}>
                      <span className="text-[15px]">{item.icon}</span>
                    </div>
                    <div>
                      <span className={`text-[12px] font-semibold tracking-wide transition-colors duration-300 ${prefs[item.key] ? "text-white/80" : "text-white/40"}`}>{item.label}</span>
                      <p className={`text-[9px] mt-0.5 transition-colors duration-300 ${prefs[item.key] ? "text-primary/50" : "text-white/15"}`}>
                        {prefs[item.key] ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </div>
                  {/* Premium toggle */}
                  <div className={`w-[46px] h-[26px] rounded-full transition-all duration-500 flex items-center px-[3px] relative overflow-hidden ${prefs[item.key] ? "" : ""}`}
                    style={{
                      background: prefs[item.key]
                        ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))"
                        : "hsl(220 12% 12%)",
                      boxShadow: prefs[item.key]
                        ? "0 0 16px hsl(var(--primary) / 0.3), inset 0 1px 1px hsl(var(--primary) / 0.2)"
                        : "inset 0 1px 3px rgba(0,0,0,0.3)",
                    }}>
                    {prefs[item.key] && (
                      <div className="absolute inset-0 opacity-30"
                        style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.15), transparent)", animation: "skeleton-shimmer 3s ease-in-out infinite" }} />
                    )}
                    <div className={`w-[20px] h-[20px] rounded-full shadow-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative ${prefs[item.key] ? "translate-x-[20px]" : "translate-x-0"}`}
                      style={{
                        background: prefs[item.key]
                          ? "linear-gradient(135deg, #fff, #f0e6d0)"
                          : "linear-gradient(135deg, hsl(220 10% 30%), hsl(220 10% 22%))",
                        boxShadow: prefs[item.key]
                          ? "0 2px 6px rgba(0,0,0,0.2)"
                          : "0 1px 3px rgba(0,0,0,0.3)",
                      }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Swipe hint */}
        {!loading && notifications.length > 0 && (
          <p className="text-[9px] text-white/15 text-center mb-3 font-medium tracking-wider uppercase"
            style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both" }}>
            ← swipe to dismiss →
          </p>
        )}

        {/* Loading shimmer */}
        {loading ? (
          <div className="space-y-2.5">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-[80px] rounded-[18px] overflow-hidden relative">
                <div className="absolute inset-0" style={{ background: "hsl(220 15% 8%)" }} />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(220 15% 12%) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-shimmer 1.8s ease-in-out infinite",
                }} />
              </div>
            ))}
            <style>{`
              @keyframes skeleton-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mx-auto mb-4 border border-white/[0.04]"
              style={{ background: "linear-gradient(135deg, hsl(220 15% 9%), hsl(220 18% 6%))" }}>
              <BellOff className="w-8 h-8 text-white/8" />
            </div>
            <p className="text-[14px] font-semibold text-white/20 mb-1">All caught up</p>
            <p className="text-[11px] text-white/10">No notifications right now</p>
          </div>
        ) : (
          <div>
            {notifications.map((n, i) => (
              <SwipeableNotification key={n.id} n={n} index={i} onDismiss={dismissNotification} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
