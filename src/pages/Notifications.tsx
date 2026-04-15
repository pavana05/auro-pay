import { useEffect, useState, useRef, useCallback } from "react";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, Settings, X, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

const SWIPE_THRESHOLD = 80;

const SwipeableNotification = ({
  n,
  onDismiss,
}: {
  n: Notification;
  onDismiss: (id: string) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const typeIcons: Record<string, string> = {
    payment: "💳", credit: "💰", alert: "⚠️", kyc: "🪪", system: "🔔",
  };

  const relativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.touches[0].clientX - startX.current;
    setOffset(currentX.current);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (Math.abs(offset) > SWIPE_THRESHOLD) {
      haptic.light();
      setDismissed(true);
      setTimeout(() => onDismiss(n.id), 300);
    } else {
      setOffset(0);
    }
  };

  const swipeProgress = Math.min(Math.abs(offset) / SWIPE_THRESHOLD, 1);

  return (
    <div className={`relative overflow-hidden rounded-xl transition-all duration-300 ${dismissed ? (offset > 0 ? "animate-swipe-out-right" : "animate-swipe-out-left") : ""}`}>
      {/* Background reveal on swipe */}
      <div className={`absolute inset-0 rounded-xl flex items-center transition-opacity duration-200 ${offset < 0 ? "justify-end pr-5" : "justify-start pl-5"}`}
        style={{ opacity: swipeProgress, background: `hsl(0 72% 51% / ${swipeProgress * 0.15})` }}>
        <Trash2 className="w-5 h-5 text-destructive" style={{ transform: `scale(${0.5 + swipeProgress * 0.5})` }} />
      </div>

      <div
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative p-4 border card-glow cursor-grab active:cursor-grabbing transition-colors ${n.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging.current ? "none" : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">{typeIcons[n.type || "system"] || "🔔"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{n.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
            <p className="text-[10px] text-muted-foreground mt-2">{relativeTime(n.created_at)}</p>
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
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setNotifications((data || []) as Notification[]);
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      setLoading(false);
    };
    fetch();
  }, []);

  const togglePref = (key: keyof typeof prefs) => {
    haptic.selection();
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const dismissNotification = useCallback(async (id: string) => {
    haptic.light();
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }, []);

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6 animate-slide-up">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-semibold">Notifications</h1>
        </div>
        <button onClick={() => { haptic.light(); setShowSettings(!showSettings); }} className="w-10 h-10 rounded-full bg-input flex items-center justify-center active:scale-90 transition-transform">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="rounded-xl bg-card border border-border card-glow p-4 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Notification Settings</h3>
            <button onClick={() => setShowSettings(false)} className="active:scale-90 transition-transform"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          {[
            { key: "payments" as const, label: "Payment Alerts", icon: "💳" },
            { key: "credits" as const, label: "Money Received", icon: "💰" },
            { key: "alerts" as const, label: "Security Alerts", icon: "⚠️" },
            { key: "kyc" as const, label: "KYC Updates", icon: "🪪" },
            { key: "system" as const, label: "System Notifications", icon: "🔔" },
          ].map(item => (
            <button key={item.key} onClick={() => togglePref(item.key)} className="w-full flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors duration-300 flex items-center px-0.5 ${prefs[item.key] ? "bg-primary" : "bg-muted"}`}>
                <div className={`w-5 h-5 rounded-full bg-background shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${prefs[item.key] ? "translate-x-4 scale-110" : "translate-x-0 scale-100"}`} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Swipe hint */}
      {!loading && notifications.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center mb-3 animate-slide-up-delay-1">← Swipe to dismiss →</p>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">We'll notify you about important updates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <div key={n.id} style={{ animationDelay: `${i * 0.05}s` }} className="animate-slide-up">
              <SwipeableNotification n={n} onDismiss={dismissNotification} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
