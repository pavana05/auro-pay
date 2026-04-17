// Pending payment request UI for the home screen.
// - 1 request → prominent banner above balance
// - 2+ requests → stackable card list
// Recipient actions: Pay / Decline / Remind later (24h snooze).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Clock, X, Send } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

export interface PendingRequest {
  id: string;
  amount: number;
  note: string | null;
  category: string | null;
  created_at: string;
  requester_id: string;
  requester_name: string;
  requester_upi: string | null;
}

const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

interface Props {
  userId: string;
  onChanged?: () => void;
}

const PaymentRequestPill = ({ userId, onChanged }: Props) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("payment_requests")
      .select("id, amount, note, category, created_at, requester_id")
      .eq("recipient_id", userId)
      .eq("status", "pending")
      .or(`remind_after_at.is.null,remind_after_at.lte.${nowIso}`)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const ids = Array.from(new Set(data.map((r: any) => r.requester_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, upi_id")
      .in("id", ids);
    const byId = new Map((profs || []).map((p: any) => [p.id, p]));

    setRequests(
      data.map((r: any) => ({
        id: r.id,
        amount: r.amount,
        note: r.note,
        category: r.category,
        created_at: r.created_at,
        requester_id: r.requester_id,
        requester_name: byId.get(r.requester_id)?.full_name || "Auropay user",
        requester_upi: byId.get(r.requester_id)?.upi_id || null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    load();
    const ch = supabase
      .channel(`pr-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_requests", filter: `recipient_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const decline = async (r: PendingRequest) => {
    setActing(r.id);
    haptic.medium();
    const { error } = await supabase
      .from("payment_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", r.id);
    setActing(null);
    if (error) {
      toast.error("Could not decline");
      return;
    }
    toast.success("Request declined");
    onChanged?.();
  };

  const remindLater = async (r: PendingRequest) => {
    setActing(r.id);
    haptic.light();
    const next = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("payment_requests")
      .update({ remind_after_at: next })
      .eq("id", r.id);
    setActing(null);
    if (error) {
      toast.error("Could not snooze");
      return;
    }
    toast("Reminder set for tomorrow", { icon: "⏰" });
    onChanged?.();
  };

  const pay = (r: PendingRequest) => {
    haptic.medium();
    navigate("/pay", {
      state: {
        upi_id: r.requester_upi || `${r.requester_name.toLowerCase().replace(/\s+/g, "")}@auropay`,
        payee_name: r.requester_name,
        amount: Math.round(r.amount / 100),
        amount_locked: true,
        note: r.note || `Payment request`,
        category: r.category || "other",
        payment_request_id: r.id,
      },
    });
  };

  if (loading || requests.length === 0) return null;

  // Single request → prominent banner
  if (requests.length === 1) {
    const r = requests[0];
    const initials = r.requester_name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("") || "?";
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="mx-5 mb-4 rounded-[16px] border border-primary/25 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))" }}
      >
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)" }}
        />
        <div className="p-3.5">
          <div className="flex items-center gap-3">
            <div
              className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0 font-bold text-[14px]"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                color: "hsl(220 25% 8%)",
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Pending request</span>
                <span className="text-[9px] text-muted-foreground/50">· {timeAgo(r.created_at)}</span>
              </div>
              <p className="text-[13px] font-semibold text-foreground truncate font-sora">
                {r.requester_name} requested <span className="text-primary font-mono">{fmt(r.amount)}</span>
              </p>
              {r.note && <p className="text-[10.5px] text-muted-foreground/70 truncate font-sora">"{r.note}"</p>}
            </div>
          </div>

          <div className="flex gap-1.5 mt-3">
            <button
              onClick={() => decline(r)}
              disabled={!!acting}
              className="flex-1 h-[36px] rounded-[11px] text-[11.5px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition border border-border/20 text-muted-foreground/80 disabled:opacity-50"
              style={{ background: "hsl(220 15% 8%)" }}
            >
              <X className="w-3 h-3" /> Decline
            </button>
            <button
              onClick={() => remindLater(r)}
              disabled={!!acting}
              className="flex-1 h-[36px] rounded-[11px] text-[11.5px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition border border-border/20 text-muted-foreground/80 disabled:opacity-50"
              style={{ background: "hsl(220 15% 8%)" }}
            >
              <Clock className="w-3 h-3" /> Later
            </button>
            <button
              onClick={() => pay(r)}
              disabled={!!acting}
              className="flex-[1.4] h-[36px] rounded-[11px] text-[11.5px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                color: "hsl(220 20% 6%)",
                boxShadow: "0 4px 14px hsl(var(--primary) / 0.3)",
              }}
            >
              <Check className="w-3 h-3" /> Pay {fmt(r.amount)}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Multiple requests → stacked card list
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-4 rounded-[16px] border border-primary/25 overflow-hidden"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))" }}
    >
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-primary/15">
        <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
          Pending requests · {requests.length}
        </span>
        <Send className="w-3 h-3 text-primary/60" />
      </div>
      <div className="divide-y divide-primary/[0.08]">
        <AnimatePresence>
          {requests.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-3 flex items-center gap-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate font-sora">
                  {r.requester_name} · <span className="text-primary font-mono">{fmt(r.amount)}</span>
                </p>
                <p className="text-[10px] text-muted-foreground/60 truncate font-sora">
                  {r.note ? `"${r.note}"` : "No note"} · {timeAgo(r.created_at)}
                </p>
              </div>
              <button
                onClick={() => remindLater(r)}
                disabled={!!acting}
                aria-label="Remind later"
                className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center active:scale-90 border border-border/20 text-muted-foreground/70 disabled:opacity-50"
                style={{ background: "hsl(220 15% 8%)" }}
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => decline(r)}
                disabled={!!acting}
                aria-label="Decline"
                className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center active:scale-90 border border-border/20 text-destructive/70 disabled:opacity-50"
                style={{ background: "hsl(220 15% 8%)" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => pay(r)}
                disabled={!!acting}
                className="h-[30px] px-2.5 rounded-[9px] flex items-center gap-1 text-[11px] font-semibold active:scale-95 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                  color: "hsl(220 20% 6%)",
                }}
              >
                Pay <ArrowRight className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PaymentRequestPill;
