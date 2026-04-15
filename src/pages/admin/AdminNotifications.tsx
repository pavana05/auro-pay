import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Send, Bell, Clock, Users, User, Zap, Eye } from "lucide-react";

const AdminNotifications = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [specificPhone, setSpecificPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setHistoryLoading(true);
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      setHistory(data || []);
      setHistoryLoading(false);
    };
    fetchHistory();
  }, []);

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Fill title and body"); return; }
    setSending(true);

    let userIds: string[] = [];

    if (target === "specific") {
      const { data } = await supabase.from("profiles").select("id").eq("phone", specificPhone);
      userIds = (data || []).map((p) => p.id);
      if (userIds.length === 0) { toast.error("User not found"); setSending(false); return; }
    } else {
      let query = supabase.from("profiles").select("id");
      if (target === "teens") query = query.eq("role", "teen");
      if (target === "parents") query = query.eq("role", "parent");
      const { data } = await query;
      userIds = (data || []).map((p) => p.id);
    }

    const notifications = userIds.map((uid) => ({
      user_id: uid,
      title: title.trim(),
      body: body.trim(),
      type: "system",
    }));

    const { error } = await supabase.from("notifications").insert(notifications);
    if (error) { toast.error(error.message); }
    else { toast.success(`Notification sent to ${userIds.length} users`); }

    setTitle(""); setBody("");
    setSending(false);

    const { data: updated } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
    setHistory(updated || []);
  };

  const targetOptions = [
    { value: "all", label: "All Users", icon: Users, desc: "Every registered user" },
    { value: "teens", label: "All Teens", icon: User, desc: "Teen accounts only" },
    { value: "parents", label: "All Parents", icon: User, desc: "Parent accounts only" },
    { value: "specific", label: "Specific User", icon: Zap, desc: "By phone number" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-primary/[0.02] blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Broadcast Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Send notifications to users across the platform</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send Form */}
          <div className="space-y-5">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Compose Notification</h3>
                  <p className="text-[10px] text-muted-foreground">Create and send broadcast messages</p>
                </div>
              </div>

              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title"
                className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm focus:outline-none focus:border-primary/40 transition-all duration-200 mb-4" />

              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Message</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..."
                className="w-full h-28 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/40 transition-all duration-200 mb-4" />

              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Target Audience</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {targetOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTarget(opt.value)}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                      target === opt.value
                        ? "border-primary/30 bg-primary/5 shadow-[0_0_15px_hsl(42_78%_55%/0.06)]"
                        : "border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <opt.icon className={`w-3.5 h-3.5 ${target === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-medium">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {target === "specific" && (
                <input value={specificPhone} onChange={(e) => setSpecificPhone(e.target.value)} placeholder="Phone number"
                  className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm focus:outline-none focus:border-primary/40 transition-all duration-200 mb-4" />
              )}

              {/* Preview */}
              {(title || body) && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Preview</span>
                  </div>
                  <p className="text-sm font-semibold">{title || "Title"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{body || "Body"}</p>
                </div>
              )}

              <button onClick={sendNotification} disabled={sending || !title.trim() || !body.trim()}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_30px_hsl(42_78%_55%/0.2)] transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed">
                <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Notification"}
              </button>
            </div>
          </div>

          {/* History */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Recent History</h3>
                <p className="text-[10px] text-muted-foreground">{history.length} notifications sent</p>
              </div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {historyLoading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-white/[0.02] rounded-xl animate-pulse" />)
              ) : history.length === 0 ? (
                <div className="text-center py-16">
                  <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No notifications sent yet</p>
                </div>
              ) : (
                history.map((n: any) => (
                  <div key={n.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.06] transition-all duration-200">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {n.created_at ? new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${n.is_read ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {n.is_read ? "Read" : "Unread"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
