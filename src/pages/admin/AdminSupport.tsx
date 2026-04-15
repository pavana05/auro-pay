import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { MessageCircle, Clock, CheckCircle2, AlertCircle, Send, User, Search } from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  user_name?: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-400/10 text-blue-400",
  in_progress: "bg-yellow-400/10 text-yellow-400",
  resolved: "bg-emerald-400/10 text-emerald-400",
  closed: "bg-muted/10 text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  low: "text-muted-foreground", medium: "text-yellow-400", high: "text-orange-400", urgent: "text-destructive",
};

const AdminSupport = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (data) {
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      setTickets(data.map(t => ({ ...t, user_name: nameMap[t.user_id] || "Unknown" })));
    }
  };

  const selectTicket = async (t: Ticket) => {
    setSelected(t);
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", t.id).order("created_at");
    setMessages((data as any) || []);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("ticket_messages").insert({
      ticket_id: selected.id,
      sender_id: user.id,
      message: reply,
      is_admin: true,
    });

    if (selected.status === "open") {
      await supabase.from("support_tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", selected.id);
    }

    setReply("");
    selectTicket(selected);
    fetchTickets();
    toast.success("Reply sent");
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    await supabase.from("support_tickets").update({
      status,
      updated_at: new Date().toISOString(),
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    }).eq("id", selected.id);
    setSelected({ ...selected, status });
    fetchTickets();
    toast.success(`Ticket ${status}`);
  };

  const filtered = tickets.filter(t => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.user_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Ticket List */}
        <div className="w-80 border-r border-border/30 flex flex-col">
          <div className="p-3 border-b border-border/30 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets..."
                className="w-full h-9 rounded-lg bg-background border border-border pl-9 pr-3 text-xs focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex gap-1">
              {["all", "open", "in_progress", "resolved"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-medium capitalize ${filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                >
                  {f === "all" ? "All" : f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => selectTicket(t)}
                className={`w-full text-left p-3 border-b border-border/20 transition-colors ${selected?.id === t.id ? "bg-primary/5" : "hover:bg-card/50"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[t.status]} capitalize`}>
                    {t.status.replace("_", " ")}
                  </span>
                  <span className={`text-[10px] ${priorityColors[t.priority]} capitalize`}>{t.priority}</span>
                </div>
                <p className="text-sm font-medium truncate">{t.subject}</p>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{t.user_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col">
          {selected ? (
            <>
              <div className="p-4 border-b border-border/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">{selected.subject}</h3>
                  <p className="text-xs text-muted-foreground">{selected.user_name} · {selected.category}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateStatus("resolved")} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    Resolve
                  </button>
                  <button onClick={() => updateStatus("closed")} className="px-3 py-1.5 rounded-lg bg-muted/20 text-muted-foreground text-xs font-medium">
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
                <div className="p-3 rounded-xl bg-card/50 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">{new Date(selected.created_at).toLocaleString()}</p>
                  <p className="text-sm">{selected.description}</p>
                </div>

                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] p-3 rounded-xl ${
                      m.is_admin ? "bg-primary/10 border border-primary/10 rounded-br-sm" : "bg-card/50 border border-border/30 rounded-bl-sm"
                    }`}>
                      {m.is_admin && <p className="text-[10px] text-primary font-semibold mb-1">Admin</p>}
                      <p className="text-sm">{m.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-border/30">
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendReply()}
                    placeholder="Type reply..."
                    className="flex-1 h-10 rounded-lg bg-background border border-border px-4 text-sm focus:outline-none focus:border-primary/50"
                  />
                  <button onClick={sendReply} disabled={!reply.trim()} className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a ticket to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;
