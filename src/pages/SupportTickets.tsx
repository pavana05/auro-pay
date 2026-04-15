import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Plus, MessageCircle, Clock, CheckCircle2, AlertCircle, Send } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
  open: { color: "text-blue-400", bg: "bg-blue-400/10", icon: AlertCircle },
  in_progress: { color: "text-yellow-400", bg: "bg-yellow-400/10", icon: Clock },
  resolved: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  closed: { color: "text-muted-foreground", bg: "bg-muted/10", icon: CheckCircle2 },
};

const priorityColors: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-yellow-400",
  high: "text-orange-400",
  urgent: "text-destructive",
};

const SupportTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [newTicket, setNewTicket] = useState({ subject: "", description: "", category: "general", priority: "medium" });

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTickets((data as any) || []);
    setLoading(false);
  };

  const createTicket = async () => {
    if (!newTicket.subject || !newTicket.description) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    haptic.medium();

    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      ...newTicket,
    });

    if (!error) {
      toast.success("Ticket created!");
      haptic.success();
      setShowNew(false);
      setNewTicket({ subject: "", description: "", category: "general", priority: "medium" });
      fetchTickets();
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticket.id).order("created_at");
    setMessages((data as any) || []);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedTicket) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    haptic.light();

    await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      message: newMsg,
      is_admin: false,
    });
    setNewMsg("");
    openTicket(selectedTicket);
  };

  // Chat view
  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-3 px-5 py-4">
            <button onClick={() => setSelectedTicket(null)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{selectedTicket.subject}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{selectedTicket.status}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
          {/* Initial ticket */}
          <div className="p-4 rounded-2xl bg-card/50 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">{new Date(selectedTicket.created_at).toLocaleString()}</p>
            <p className="text-sm">{selectedTicket.description}</p>
          </div>

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${
                msg.is_admin
                  ? "bg-card/50 border border-border/30 rounded-bl-md"
                  : "bg-primary/10 border border-primary/10 rounded-br-md"
              }`}>
                {msg.is_admin && <p className="text-[10px] text-primary font-semibold mb-1">Support Team</p>}
                <p className="text-sm">{msg.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex gap-2">
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 h-11 rounded-xl bg-card/50 border border-border px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim()}
              className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Support</h1>
          <button onClick={() => { haptic.light(); setShowNew(true); }} className="p-2 -mr-2 rounded-xl bg-primary/10 text-primary active:scale-90 transition-all">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {tickets.map((ticket, i) => {
          const cfg = statusConfig[ticket.status] || statusConfig.open;
          const Icon = cfg.icon;
          return (
            <button
              key={ticket.id}
              onClick={() => openTicket(ticket)}
              style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.1 + i * 0.06}s both` }}
              className="w-full text-left p-4 rounded-2xl bg-card/50 border border-border/30 active:scale-[0.98] transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} capitalize`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span className={`text-[10px] ${priorityColors[ticket.priority]} capitalize`}>
                      {ticket.priority}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <MessageCircle className="w-4 h-4 text-muted-foreground mt-1" />
              </div>
            </button>
          );
        })}

        {!loading && tickets.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-4xl">💬</div>
            <p className="text-sm text-muted-foreground">No tickets yet</p>
            <button onClick={() => setShowNew(true)} className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
              Create a Ticket
            </button>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowNew(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-card border-t border-border/50 rounded-t-3xl p-6 space-y-4"
            style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto" />
            <h2 className="text-lg font-bold">New Ticket</h2>
            <input
              placeholder="Subject..."
              value={newTicket.subject}
              onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))}
              className="w-full h-11 rounded-xl bg-background border border-border px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <textarea
              placeholder="Describe your issue..."
              value={newTicket.description}
              onChange={e => setNewTicket(p => ({ ...p, description: e.target.value }))}
              className="w-full h-24 rounded-xl bg-background border border-border px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
            />
            <div className="flex gap-3">
              <select
                value={newTicket.category}
                onChange={e => setNewTicket(p => ({ ...p, category: e.target.value }))}
                className="flex-1 h-11 rounded-xl bg-background border border-border px-3 text-sm"
              >
                <option value="general">General</option>
                <option value="payment">Payment</option>
                <option value="account">Account</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
              </select>
              <select
                value={newTicket.priority}
                onChange={e => setNewTicket(p => ({ ...p, priority: e.target.value }))}
                className="flex-1 h-11 rounded-xl bg-background border border-border px-3 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button
              onClick={createTicket}
              disabled={!newTicket.subject || !newTicket.description}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-all disabled:opacity-50"
            >
              Submit Ticket 📩
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default SupportTickets;
