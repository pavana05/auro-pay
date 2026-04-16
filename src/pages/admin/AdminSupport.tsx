import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { MessageCircle, Clock, CheckCircle2, AlertCircle, Send, User, Search, X } from "lucide-react";
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
  in_progress: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
  closed: "bg-muted/10 text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  low: "text-muted-foreground", medium: "text-warning", high: "text-orange-400", urgent: "text-destructive",
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
    await supabase.from("ticket_messages").insert({ ticket_id: selected.id, sender_id: user.id, message: reply, is_admin: true });
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
      status, updated_at: new Date().toISOString(),
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

  const openCount = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "in_progress").length;

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-3.5rem)] relative">
        {/* Ambient */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-primary/[0.02] blur-[100px] pointer-events-none z-0" />

        {/* Ticket List */}
        <div className="w-80 border-r border-white/[0.04] flex flex-col bg-white/[0.01] relative z-10">
          <div className="p-4 border-b border-white/[0.04] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Support Tickets</h2>
              <div className="flex items-center gap-2">
                {openCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400">{openCount} open</span>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..."
                className="w-full h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-9 pr-3 text-xs focus:outline-none focus:border-primary/40 transition-all duration-200" />
            </div>
            <div className="flex gap-1 p-0.5 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              {["all", "open", "in_progress", "resolved"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-medium capitalize transition-all ${
                    filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {f === "all" ? "All" : f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filtered.map((t, i) => (
              <button key={t.id} onClick={() => selectTicket(t)}
                className={`w-full text-left p-3.5 border-b border-white/[0.03] transition-all duration-200 ${
                  selected?.id === t.id ? "bg-primary/[0.05] border-l-2 border-l-primary" : "hover:bg-white/[0.02]"
                }`}
                style={{ animation: `slide-up-spring 0.3s ease ${Math.min(i * 0.03, 0.2)}s both` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[t.status]} capitalize`}>
                    {t.status.replace("_", " ")}
                  </span>
                  <span className={`text-[10px] ${priorityColors[t.priority]} capitalize font-medium`}>{t.priority}</span>
                </div>
                <p className="text-sm font-medium truncate">{t.subject}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-4 h-4 rounded-full bg-white/[0.04] flex items-center justify-center">
                    <User className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{t.user_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col relative z-10">
          {selected ? (
            <>
              <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01] backdrop-blur-sm">
                <div>
                  <h3 className="text-sm font-bold">{selected.subject}</h3>
                  <p className="text-xs text-muted-foreground">{selected.user_name} · {selected.category}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateStatus("resolved")} className="px-3 py-1.5 rounded-xl bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-all active:scale-95">
                    Resolve
                  </button>
                  <button onClick={() => updateStatus("closed")} className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-muted-foreground text-xs font-medium hover:bg-white/[0.06] transition-all active:scale-95">
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-muted-foreground mb-1.5">{new Date(selected.created_at).toLocaleString()}</p>
                  <p className="text-sm">{selected.description}</p>
                </div>

                {messages.map((m, i) => (
                  <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}
                    style={{ animation: `slide-up-spring 0.3s ease ${i * 0.05}s both` }}>
                    <div className={`max-w-[70%] p-3.5 rounded-2xl ${
                      m.is_admin
                        ? "bg-primary/10 border border-primary/10 rounded-br-md"
                        : "bg-white/[0.02] border border-white/[0.04] rounded-bl-md"
                    }`}>
                      {m.is_admin && <p className="text-[10px] text-primary font-semibold mb-1">Admin</p>}
                      <p className="text-sm">{m.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-white/[0.04] bg-white/[0.01]">
                <div className="flex gap-2">
                  <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReply()}
                    placeholder="Type reply..."
                    className="flex-1 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm focus:outline-none focus:border-primary/40 transition-all duration-200" />
                  <button onClick={sendReply} disabled={!reply.trim()}
                    className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:shadow-[0_0_15px_hsl(42_78%_55%/0.2)] transition-all active:scale-90">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-muted-foreground/30" />
                </div>
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