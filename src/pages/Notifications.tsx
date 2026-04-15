import { useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

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

  const relativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  const typeIcons: Record<string, string> = {
    payment: "💳", credit: "💰", alert: "⚠️", kyc: "🪪", system: "🔔",
  };

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-semibold">Notifications</h1>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="rounded-xl bg-card border border-border card-glow p-4 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Notification Settings</h3>
            <button onClick={() => setShowSettings(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
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

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">We'll notify you about important updates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`p-4 rounded-lg border card-glow ${n.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}>
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{typeIcons[n.type || "system"] || "🔔"}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{relativeTime(n.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
