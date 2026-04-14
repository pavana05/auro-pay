import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Send } from "lucide-react";

const AdminNotifications = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [specificPhone, setSpecificPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      setHistory(data || []);
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

    // Insert notifications for all targeted users
    const notifications = userIds.map((uid) => ({
      user_id: uid,
      title: title.trim(),
      body: body.trim(),
      type: "system",
    }));

    // Batch insert - Supabase allows bulk insert
    const { error } = await supabase.from("notifications").insert(notifications);
    if (error) { toast.error(error.message); }
    else { toast.success(`Notification sent to ${userIds.length} users`); }

    setTitle(""); setBody("");
    setSending(false);

    // Refresh history
    const { data: updated } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
    setHistory(updated || []);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-[22px] font-semibold mb-6">Broadcast Notifications</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send Form */}
          <div className="rounded-lg bg-card border border-border p-5 card-glow">
            <h3 className="text-sm font-semibold mb-4">Send Notification</h3>

            <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">TITLE</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" className="input-auro w-full mb-4" />

            <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">BODY</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification message..." className="input-auro w-full h-24 resize-none py-3 mb-4" />

            <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">TARGET</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="input-auro w-full mb-4">
              <option value="all">All Users</option>
              <option value="teens">All Teens</option>
              <option value="parents">All Parents</option>
              <option value="specific">Specific User</option>
            </select>

            {target === "specific" && (
              <input value={specificPhone} onChange={(e) => setSpecificPhone(e.target.value)} placeholder="Phone number" className="input-auro w-full mb-4" />
            )}

            {/* Preview */}
            {(title || body) && (
              <div className="p-4 rounded-lg bg-muted/20 border border-border mb-4">
                <p className="text-xs text-muted-foreground mb-1">Preview</p>
                <p className="text-sm font-medium">{title || "Title"}</p>
                <p className="text-xs text-muted-foreground mt-1">{body || "Body"}</p>
              </div>
            )}

            <button onClick={sendNotification} disabled={sending} className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
              <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Notification"}
            </button>
          </div>

          {/* History */}
          <div className="rounded-lg bg-card border border-border p-5 card-glow">
            <h3 className="text-sm font-semibold mb-4">Recent Notifications</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications sent yet</p>
              ) : (
                history.map((n: any) => (
                  <div key={n.id} className="p-3 rounded-lg bg-muted/10 border border-border/50">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {n.created_at ? new Date(n.created_at).toLocaleString("en-IN") : "—"}
                    </p>
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
