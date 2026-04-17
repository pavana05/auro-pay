// Manage Recurring Payments — list, pause, edit, cancel auto-pays
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Repeat, Plus, Pause, Play, Trash2, Calendar,
  TrendingUp, Sparkles, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import BottomNav from "@/components/BottomNav";

interface Recurring {
  id: string;
  amount: number;
  frequency: string;
  next_run_at: string;
  is_active: boolean;
  note: string | null;
  kind: string;
  day_of_week: number | null;
  day_of_month: number | null;
  last_run_at: string | null;
  last_status: string | null;
  run_count: number;
  favorite_id: string | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatNext = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const describeSchedule = (r: Recurring) => {
  if (r.frequency === "daily") return "Every day";
  if (r.frequency === "weekly") {
    return r.day_of_week != null ? `Every ${DAYS[r.day_of_week]}` : "Every week";
  }
  return r.day_of_month ? `${r.day_of_month}${["st","nd","rd"][r.day_of_month-1]||"th"} of every month` : "Every month";
};

const ManageRecurring = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("recurring_payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as Recurring[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePause = async (r: Recurring) => {
    haptic.light();
    await supabase.from("recurring_payments")
      .update({ is_active: !r.is_active })
      .eq("id", r.id);
    toast.success(r.is_active ? "Paused" : "Resumed");
    load();
  };

  const cancel = async (id: string) => {
    haptic.medium();
    await supabase.from("recurring_payments").delete().eq("id", id);
    setConfirmId(null);
    toast.success("Auto-pay cancelled");
    load();
  };

  const totalMonthly = items
    .filter(r => r.is_active)
    .reduce((sum, r) => sum + (r.frequency === "monthly" ? r.amount : r.frequency === "weekly" ? r.amount * 4 : r.amount * 30), 0);

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[360px] h-[360px] rounded-full opacity-[0.04] blur-[100px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <div className="pt-4 pb-5 flex items-center gap-3">
          <button onClick={() => { haptic.light(); navigate(-1); }}
            className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 border border-white/[0.04]"
            style={{ background: "hsl(220 15% 8%)" }}>
            <ChevronLeft className="w-[18px] h-[18px] text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[19px] font-bold tracking-[-0.5px]">Auto-Pay</h1>
            <p className="text-[10px] text-white/30 font-medium flex items-center gap-1">
              <Repeat className="w-2.5 h-2.5" /> Scheduled top-ups & payments
            </p>
          </div>
          <button onClick={() => { haptic.light(); navigate("/add-money"); }}
            className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))",
              boxShadow: "0 4px 16px hsl(var(--primary) / 0.3)",
              color: "hsl(220 22% 6%)",
            }}>
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Summary card */}
        {items.length > 0 && (
          <div className="rounded-[20px] p-4 mb-5 border border-white/[0.06] relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(220 18% 7%))",
            }}>
            <div className="absolute top-0 left-6 right-6 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)" }} />
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[12px] flex items-center justify-center"
                style={{ background: "hsl(var(--primary) / 0.12)" }}>
                <TrendingUp className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-white/45 uppercase tracking-wider font-semibold">Est. monthly</p>
                <p className="text-[22px] font-bold font-mono tracking-tight" style={{ color: "hsl(var(--primary))" }}>
                  ₹{(totalMonthly / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/45 uppercase tracking-wider font-semibold">Active</p>
                <p className="text-[18px] font-bold font-mono">{items.filter(r => r.is_active).length}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.04))",
                border: "1px solid hsl(var(--primary) / 0.2)",
              }}>
              <Repeat className="w-9 h-9" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <h3 className="text-[17px] font-bold mb-2 tracking-tight">No auto-pays yet</h3>
            <p className="text-[12.5px] text-white/40 mb-6 max-w-xs mx-auto leading-relaxed">
              Schedule a recurring top-up so your wallet never runs dry. We'll add money on your chosen day, every week or month.
            </p>
            <button onClick={() => navigate("/add-money")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-[13px] active:scale-95 transition-all"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))",
                color: "hsl(220 22% 6%)",
                boxShadow: "0 6px 20px hsl(var(--primary) / 0.3)",
              }}>
              <Sparkles className="w-4 h-4" /> Set up Auto-Pay
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((r) => (
              <div key={r.id}
                className="rounded-[18px] p-4 border border-white/[0.05] relative overflow-hidden"
                style={{
                  background: r.is_active
                    ? "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5.5%))"
                    : "hsl(220 15% 6.5%)",
                  opacity: r.is_active ? 1 : 0.6,
                }}>
                {r.is_active && (
                  <div className="absolute top-0 left-6 right-6 h-[1px]"
                    style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)" }} />
                )}

                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
                    style={{
                      background: r.kind === "topup"
                        ? "hsl(var(--primary) / 0.1)"
                        : "hsl(220 15% 11%)",
                    }}>
                    {r.kind === "topup" ? (
                      <Plus className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} strokeWidth={2.5} />
                    ) : (
                      <Repeat className="w-5 h-5 text-white/60" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <p className="text-[15px] font-bold tracking-tight">
                        ₹{(r.amount / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                      {!r.is_active && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40 px-1.5 py-0.5 rounded"
                          style={{ background: "hsl(220 15% 11%)" }}>Paused</span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-white/55 truncate">
                      {r.kind === "topup" ? "Wallet top-up" : (r.note || "Recurring payment")}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10.5px] text-white/40">
                      <span className="flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5" /> {describeSchedule(r)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> Next: {formatNext(r.next_run_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                  <button onClick={() => togglePause(r)}
                    className="flex-1 h-9 rounded-[10px] text-[11.5px] font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition"
                    style={{
                      background: "hsl(220 15% 9%)",
                      color: r.is_active ? "hsl(0 0% 80%)" : "hsl(var(--primary))",
                      border: `1px solid ${r.is_active ? "hsl(220 15% 13%)" : "hsl(var(--primary) / 0.25)"}`,
                    }}>
                    {r.is_active ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
                  </button>
                  <button onClick={() => { haptic.light(); setConfirmId(r.id); }}
                    className="h-9 px-3 rounded-[10px] text-[11.5px] font-semibold flex items-center justify-center gap-1 active:scale-[0.97] transition"
                    style={{
                      background: "hsl(220 15% 9%)",
                      color: "hsl(0 65% 65%)",
                      border: "1px solid hsl(220 15% 13%)",
                    }}>
                    <Trash2 className="w-3 h-3" /> Cancel
                  </button>
                </div>

                {r.last_status && r.last_status.startsWith("failed") && (
                  <p className="mt-2 text-[10px] text-red-400/80">⚠ Last run failed</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel confirm */}
      {confirmId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmId(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 rounded-t-[24px] p-6 border-t border-x"
            style={{
              background: "hsl(220 22% 5%)",
              borderColor: "hsl(220 15% 11%)",
              animation: "slide-up-spring 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}>
            <div className="w-10 h-1 bg-white/[0.1] rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-[12px] flex items-center justify-center"
                style={{ background: "hsl(0 65% 50% / 0.1)" }}>
                <Trash2 className="w-5 h-5" style={{ color: "hsl(0 65% 65%)" }} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold">Cancel auto-pay?</h3>
                <p className="text-[11.5px] text-white/45">This can't be undone.</p>
              </div>
              <button onClick={() => setConfirmId(null)}
                className="ml-auto w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "hsl(220 15% 9%)" }}>
                <X className="w-4 h-4 text-white/55" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button onClick={() => setConfirmId(null)}
                className="h-12 rounded-2xl font-semibold text-[13px] text-white/70 active:scale-[0.97]"
                style={{ background: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 13%)" }}>
                Keep it
              </button>
              <button onClick={() => cancel(confirmId)}
                className="h-12 rounded-2xl font-semibold text-[13px] active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, hsl(0 65% 50%), hsl(0 65% 42%))",
                  color: "white",
                  boxShadow: "0 6px 20px hsl(0 65% 50% / 0.3)",
                }}>
                Cancel auto-pay
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default ManageRecurring;
