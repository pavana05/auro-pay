// Screen 13 — Savings Goals. Animated rings, color palette per goal,
// 5-step wizard, withdraw → wallet, milestone confetti + push.
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Plus, X, Trash2, ArrowDownToLine, Check, ChevronLeft, ChevronRight, Sparkles, Repeat,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import confetti from "canvas-confetti";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  color: string | null;
  is_completed: boolean;
  autosave_enabled?: boolean;
  autosave_amount?: number;
  autosave_frequency?: string;
  autosave_next_run_at?: string | null;
}

const EMOJIS = [
  "🎯","📱","💻","🎮","🎧","👟","👕","🎒","🛹","🚲",
  "✈️","🏖️","🎢","🎬","🎸","🎤","📷","📚","🏆","🥇",
  "💍","⌚","🛒","🍕","🎂","🎁","🏠","🚗","💰","✨",
];

const COLORS = [
  { name: "Gold",    hsl: "40 90% 60%" },
  { name: "Mint",    hsl: "152 60% 50%" },
  { name: "Sky",     hsl: "205 80% 60%" },
  { name: "Coral",   hsl: "10 80% 62%" },
  { name: "Violet",  hsl: "270 70% 65%" },
  { name: "Rose",    hsl: "335 75% 60%" },
  { name: "Cyan",    hsl: "180 70% 55%" },
  { name: "Amber",   hsl: "30 90% 58%" },
];

const MILESTONES = [25, 50, 75, 100];
const fmt = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const SavingsGoals = () => {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletId, setWalletId] = useState<string | null>(null);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ title: "", emoji: "🎯", target: "", deadline: "", color: COLORS[0].hsl });

  // Per-card add/withdraw state
  const [actionFor, setActionFor] = useState<{ id: string; mode: "add" | "withdraw" } | null>(null);
  const [actionAmount, setActionAmount] = useState("");

  const ringsRef = useRef<Record<string, number>>({});
  const [animatedPct, setAnimatedPct] = useState<Record<string, number>>({});

  // ─── Data ───
  const fetchGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [g, w] = await Promise.all([
      supabase.from("savings_goals").select("*").eq("teen_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallets").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    setGoals((g.data || []) as Goal[]);
    setWalletId(w.data?.id || null);
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, []);

  // ─── Animate rings on mount/data change (0 → current %) ───
  useEffect(() => {
    if (goals.length === 0) return;
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const next: Record<string, number> = {};
      goals.forEach(g => {
        const target = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
        next[g.id] = target * eased;
      });
      ringsRef.current = next;
      setAnimatedPct(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [goals]);

  // ─── Totals ───
  const totalSaved = useMemo(() => goals.reduce((s, g) => s + (g.current_amount || 0), 0), [goals]);
  const activeCount = useMemo(() => goals.filter(g => !g.is_completed).length, [goals]);

  // ─── Confetti ───
  const burst = (origin: { x: number; y: number }, big = false) => {
    confetti({
      particleCount: big ? 140 : 60,
      spread: big ? 100 : 65,
      startVelocity: big ? 50 : 38,
      origin,
      colors: ["#c8952e", "#ffd96b", "#22c55e", "#60a5fa", "#f472b6"],
      ticks: big ? 220 : 140,
      scalar: big ? 1.1 : 0.9,
      zIndex: 9999,
    });
  };

  // ─── Milestone notify (push + DB) ───
  const sendMilestone = async (goal: Goal, milestone: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isComplete = milestone === 100;
    const title = isComplete ? `🎉 Goal Achieved: ${goal.title}` : `${milestone}% there: ${goal.title}`;
    const body = isComplete
      ? `You saved ${fmt(goal.target_amount)} for ${goal.title}. Time to celebrate!`
      : `You're ${milestone}% of the way to your ${goal.title} goal. Keep going!`;
    await supabase.from("notifications").insert({
      user_id: user.id, title, body, type: isComplete ? "goal_completed" : "goal_milestone",
    });
    supabase.functions.invoke("send-push-notification", {
      body: { user_id: user.id, title, body, data: { type: "savings_milestone", goal_id: goal.id, milestone } },
    }).catch(() => { /* push is best-effort */ });
  };

  // ─── Create goal ───
  const createGoal = async () => {
    if (!draft.title.trim()) { toast.error("Goal needs a name"); return; }
    const target = parseInt(draft.target || "0", 10);
    if (!target || target < 1) { toast.error("Enter a valid target amount"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    haptic.medium();
    const { error } = await supabase.from("savings_goals").insert({
      teen_id: user.id,
      title: draft.title.trim(),
      target_amount: target * 100,
      deadline: draft.deadline || null,
      icon: draft.emoji,
      color: draft.color,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Goal created");
    setWizardOpen(false);
    setStep(0);
    setDraft({ title: "", emoji: "🎯", target: "", deadline: "", color: COLORS[0].hsl });
    fetchGoals();
  };

  // ─── Add money to a goal (with milestone trigger) ───
  const handleAdd = async (goal: Goal) => {
    const rupees = parseInt(actionAmount || "0", 10);
    if (!rupees || rupees < 1) { toast.error("Enter a valid amount"); return; }
    if (!walletId) { toast.error("Wallet not found"); return; }

    // Check wallet balance
    const { data: w } = await supabase.from("wallets").select("balance").eq("id", walletId).maybeSingle();
    const bal = w?.balance ?? 0;
    if (rupees * 100 > bal) { toast.error(`Only ${fmt(bal)} available in wallet`); return; }

    const oldPct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
    const newAmount = goal.current_amount + rupees * 100;
    const newPct = goal.target_amount > 0 ? Math.min(100, (newAmount / goal.target_amount) * 100) : 0;
    const completed = newAmount >= goal.target_amount;

    const updates = await Promise.all([
      supabase.from("savings_goals").update({
        current_amount: newAmount, is_completed: completed,
      }).eq("id", goal.id),
      supabase.from("wallets").update({ balance: bal - rupees * 100 }).eq("id", walletId),
      supabase.from("transactions").insert({
        wallet_id: walletId, type: "debit", amount: rupees * 100,
        category: "savings", description: `Saved to ${goal.title}`,
        merchant_name: goal.title, status: "success",
      }),
    ]);
    const err = updates.find(r => r.error)?.error;
    if (err) { toast.error(err.message); return; }

    haptic.success();
    setActionFor(null); setActionAmount("");

    // Milestones crossed
    const crossed = MILESTONES.filter(m => oldPct < m && newPct >= m);
    if (crossed.length > 0) {
      const big = crossed.includes(100);
      burst({ x: 0.5, y: 0.45 }, big);
      if (big) setTimeout(() => burst({ x: 0.3, y: 0.5 }, true), 250);
      crossed.forEach(m => sendMilestone(goal, m));
      toast.success(big ? "🎉 Goal achieved!" : `🎊 ${crossed[crossed.length - 1]}% reached!`);
    } else {
      toast.success(`Added ${fmt(rupees * 100)} to ${goal.title}`);
    }
    fetchGoals();
  };

  // ─── Withdraw from goal back to wallet ───
  const handleWithdraw = async (goal: Goal) => {
    const rupees = parseInt(actionAmount || "0", 10);
    if (!rupees || rupees < 1) { toast.error("Enter a valid amount"); return; }
    if (rupees * 100 > goal.current_amount) { toast.error(`Only ${fmt(goal.current_amount)} saved`); return; }
    if (!walletId) { toast.error("Wallet not found"); return; }

    const { data: w } = await supabase.from("wallets").select("balance").eq("id", walletId).maybeSingle();
    const bal = w?.balance ?? 0;
    const newAmount = goal.current_amount - rupees * 100;

    const updates = await Promise.all([
      supabase.from("savings_goals").update({
        current_amount: newAmount,
        is_completed: newAmount >= goal.target_amount,
      }).eq("id", goal.id),
      supabase.from("wallets").update({ balance: bal + rupees * 100 }).eq("id", walletId),
      supabase.from("transactions").insert({
        wallet_id: walletId, type: "credit", amount: rupees * 100,
        category: "savings", description: `Withdrew from ${goal.title}`,
        merchant_name: goal.title, status: "success",
      }),
    ]);
    const err = updates.find(r => r.error)?.error;
    if (err) { toast.error(err.message); return; }

    haptic.medium();
    setActionFor(null); setActionAmount("");
    toast.success(`Withdrew ${fmt(rupees * 100)} to wallet`);
    fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    haptic.medium();
    const { error } = await supabase.from("savings_goals").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Goal deleted"); fetchGoals(); }
  };

  // ─── Toggle / configure auto-save for a goal ───
  const setAutoSave = async (goal: Goal, enabled: boolean, amount?: number, frequency?: string) => {
    haptic.light();
    const amt = amount ?? goal.autosave_amount ?? 100;
    const freq = frequency ?? goal.autosave_frequency ?? "weekly";
    if (enabled && (!amt || amt < 1)) { toast.error("Set a valid amount first"); return; }

    const next = new Date();
    if (freq === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
    else if (freq === "daily") next.setUTCDate(next.getUTCDate() + 1);
    else next.setUTCDate(next.getUTCDate() + 7);

    const { error } = await supabase.from("savings_goals").update({
      autosave_enabled: enabled,
      autosave_amount: amt,
      autosave_frequency: freq,
      autosave_next_run_at: enabled ? next.toISOString() : null,
    }).eq("id", goal.id);
    if (error) { toast.error(error.message); return; }

    toast.success(enabled ? `Auto-save on: ₹${amt} ${freq}` : "Auto-save off");
    fetchGoals();
  };

  // ─── Wizard steps config ───
  const stepLabels = ["Name & Icon", "Target", "Deadline", "Color", "Preview"];
  const canAdvance = (s: number) => {
    if (s === 0) return draft.title.trim().length > 0;
    if (s === 1) return parseInt(draft.target || "0", 10) > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-background pb-32 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[120px]" style={{ background: "hsl(var(--primary))" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <PageHeader
          title="Savings Goals"
          subtitle={`Across ${goals.length} ${goals.length === 1 ? "goal" : "goals"}`}
          fallback="/home"
          sticky={false}
          className="mb-1"
        />

        {/* Total saved hero */}
        <div className="rounded-[22px] p-5 mb-5 border border-white/[0.05] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5%))",
            animation: "su-spring 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both",
          }}>
          <div className="absolute -top-16 -right-16 w-[180px] h-[180px] rounded-full opacity-[0.18] blur-[60px]"
            style={{ background: "hsl(var(--primary))" }} />
          <div className="relative">
            <p className="text-[10px] tracking-[2px] uppercase text-white/30 font-semibold mb-2">Total saved</p>
            <p className="font-mono font-bold tracking-tight" style={{ fontSize: "32px", lineHeight: 1.05, color: "hsl(var(--primary))" }}>
              {fmt(totalSaved)}
            </p>
            <p className="text-[11px] text-white/40 mt-2">
              <span className="text-white/70 font-semibold">{activeCount}</span> active · <span className="text-white/70 font-semibold">{goals.length - activeCount}</span> achieved
            </p>
          </div>
        </div>

        {/* Goals list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-[180px] rounded-[20px] relative overflow-hidden" style={{ background: "hsl(220 15% 8%)" }}>
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(220 15% 12%) 50%, transparent 70%)",
                  backgroundSize: "200% 100%", animation: "skel 1.8s ease-in-out infinite",
                }} />
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16" style={{ animation: "su-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mx-auto mb-4 border border-white/[0.05]"
              style={{ background: "linear-gradient(135deg, hsl(220 15% 9%), hsl(220 18% 6%))" }}>
              <Sparkles className="w-7 h-7 text-white/15" />
            </div>
            <p className="text-[14px] font-semibold text-white/40 mb-1">No goals yet</p>
            <p className="text-[11px] text-white/20">Tap + to dream big</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal, idx) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={idx}
                pct={animatedPct[goal.id] ?? 0}
                onDelete={() => deleteGoal(goal.id)}
                onAddClick={() => { setActionFor({ id: goal.id, mode: "add" }); setActionAmount(""); }}
                onWithdrawClick={() => { setActionFor({ id: goal.id, mode: "withdraw" }); setActionAmount(""); }}
                actionMode={actionFor?.id === goal.id ? actionFor.mode : null}
                actionAmount={actionAmount}
                setActionAmount={setActionAmount}
                onAddSubmit={() => handleAdd(goal)}
                onWithdrawSubmit={() => handleWithdraw(goal)}
                onCancelAction={() => { setActionFor(null); setActionAmount(""); }}
                onSetAutoSave={(enabled, amt, freq) => setAutoSave(goal, enabled, amt, freq)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating New Goal button */}
      <button onClick={() => { haptic.light(); setWizardOpen(true); setStep(0); }}
        className="fixed bottom-[88px] right-5 z-30 h-[52px] pl-4 pr-5 rounded-full flex items-center gap-2 active:scale-95 transition-all"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
          color: "hsl(220 20% 6%)",
          boxShadow: "0 8px 28px hsl(var(--primary) / 0.4), 0 2px 6px rgba(0,0,0,0.3)",
        }}>
        <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
        <span className="text-[13px] font-bold tracking-[-0.2px]">New Goal</span>
      </button>

      <BottomNav />

      {/* ─── 5-STEP WIZARD ─── */}
      {wizardOpen && (
        <Sheet onClose={() => { setWizardOpen(false); setStep(0); }}>
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              {stepLabels.map((_, i) => (
                <div key={i} className="h-1 rounded-full transition-all"
                  style={{
                    width: i === step ? 24 : 6,
                    background: i <= step ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.1)",
                  }} />
              ))}
            </div>
            <p className="text-[10px] text-white/40 font-semibold tracking-wider uppercase">
              {step + 1}/{stepLabels.length} · {stepLabels[step]}
            </p>
          </div>

          <div className="min-h-[280px]">
            {step === 0 && (
              <div>
                <h3 className="text-[18px] font-bold mb-1">What are you saving for?</h3>
                <p className="text-[12px] text-white/45 mb-4">Pick a name and an emoji</p>
                <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder="e.g., New iPhone"
                  className="w-full h-[50px] rounded-[14px] px-4 text-[14px] outline-none mb-4"
                  style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 12%)", color: "white" }}
                  autoFocus maxLength={40} />
                <p className="text-[10px] text-white/30 font-semibold tracking-wider uppercase mb-2">Choose an icon</p>
                <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => { haptic.light(); setDraft(d => ({ ...d, emoji: em })); }}
                      className="aspect-square rounded-[12px] text-[20px] flex items-center justify-center active:scale-90 transition"
                      style={{
                        background: draft.emoji === em ? "hsl(var(--primary) / 0.15)" : "hsl(220 15% 7%)",
                        border: `1px solid ${draft.emoji === em ? "hsl(var(--primary) / 0.4)" : "hsl(0 0% 100% / 0.04)"}`,
                      }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="text-[18px] font-bold mb-1">How much do you need?</h3>
                <p className="text-[12px] text-white/45 mb-5">Enter your target amount</p>
                <div className="rounded-[18px] p-5 text-center border border-white/[0.06] mb-4"
                  style={{ background: "hsl(220 15% 6%)" }}>
                  <p className="text-[10px] text-white/30 tracking-widest uppercase mb-2">Target</p>
                  <div className="flex items-center justify-center">
                    <span className="text-[28px] font-bold mr-1" style={{ color: "hsl(var(--primary))" }}>₹</span>
                    <input
                      value={draft.target}
                      onChange={e => setDraft(d => ({ ...d, target: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                      placeholder="0"
                      inputMode="numeric"
                      className="bg-transparent outline-none text-[40px] font-mono font-bold text-white text-center w-[200px]"
                      autoFocus />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[500, 1000, 5000, 10000, 25000, 50000].map(v => (
                    <button key={v} onClick={() => { haptic.light(); setDraft(d => ({ ...d, target: String(v) })); }}
                      className="px-3 h-[32px] rounded-full text-[11px] font-semibold border active:scale-95 transition"
                      style={{
                        background: draft.target === String(v) ? "hsl(var(--primary) / 0.15)" : "hsl(220 15% 8%)",
                        borderColor: draft.target === String(v) ? "hsl(var(--primary) / 0.4)" : "hsl(0 0% 100% / 0.06)",
                        color: draft.target === String(v) ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.6)",
                      }}>
                      ₹{v.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="text-[18px] font-bold mb-1">When do you need it by?</h3>
                <p className="text-[12px] text-white/45 mb-4">Optional — leave empty for no deadline</p>
                <input
                  type="date"
                  value={draft.deadline}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setDraft(d => ({ ...d, deadline: e.target.value }))}
                  className="w-full h-[52px] rounded-[14px] px-4 text-[14px] outline-none"
                  style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 12%)", color: "white", colorScheme: "dark" }}
                />
                {draft.deadline && (
                  <p className="text-[11px] text-white/50 mt-3 text-center">
                    {Math.max(0, Math.ceil((new Date(draft.deadline).getTime() - Date.now()) / 86400000))} days from today
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="text-[18px] font-bold mb-1">Pick a color</h3>
                <p className="text-[12px] text-white/45 mb-5">Make this goal stand out</p>
                <div className="grid grid-cols-4 gap-3">
                  {COLORS.map(c => (
                    <button key={c.hsl} onClick={() => { haptic.light(); setDraft(d => ({ ...d, color: c.hsl })); }}
                      className="aspect-square rounded-[16px] flex items-center justify-center active:scale-90 transition relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, hsl(${c.hsl}), hsl(${c.hsl} / 0.6))`,
                        boxShadow: draft.color === c.hsl ? `0 0 0 3px hsl(220 22% 5%), 0 0 0 5px hsl(${c.hsl}), 0 8px 20px hsl(${c.hsl} / 0.35)` : "none",
                      }}>
                      {draft.color === c.hsl && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h3 className="text-[18px] font-bold mb-1">Looking good!</h3>
                <p className="text-[12px] text-white/45 mb-4">Here's your new goal</p>
                <PreviewCard
                  title={draft.title || "Untitled goal"}
                  emoji={draft.emoji}
                  target={parseInt(draft.target || "0", 10) * 100}
                  deadline={draft.deadline}
                  color={draft.color}
                />
              </div>
            )}
          </div>

          {/* Wizard nav */}
          <div className="flex gap-2 mt-5">
            {step > 0 && (
              <button onClick={() => { haptic.light(); setStep(s => s - 1); }}
                className="h-[50px] px-4 rounded-2xl flex items-center gap-1 font-semibold text-[13px] border border-white/[0.06] text-white/70"
                style={{ background: "hsl(220 15% 8%)" }}>
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < stepLabels.length - 1 ? (
              <button
                onClick={() => { if (canAdvance(step)) { haptic.light(); setStep(s => s + 1); } else { toast.error("Fill this step first"); } }}
                disabled={!canAdvance(step)}
                className="flex-1 h-[50px] rounded-2xl flex items-center justify-center gap-1 font-semibold text-[13px] disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                  color: "hsl(220 20% 6%)",
                  boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                }}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={createGoal}
                className="flex-1 h-[50px] rounded-2xl flex items-center justify-center gap-1 font-semibold text-[13px]"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                  color: "hsl(220 20% 6%)",
                  boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                }}>
                <Sparkles className="w-4 h-4" /> Create Goal
              </button>
            )}
          </div>
        </Sheet>
      )}

      <style>{`
        @keyframes su-spring { 0% { opacity: 0; transform: translateY(20px) scale(0.97); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes float-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes sheet-up { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

// ─── Goal Card ───
const GoalCard = ({
  goal, index, pct, onDelete, onAddClick, onWithdrawClick,
  actionMode, actionAmount, setActionAmount, onAddSubmit, onWithdrawSubmit, onCancelAction,
  onSetAutoSave,
}: {
  goal: Goal; index: number; pct: number;
  onDelete: () => void; onAddClick: () => void; onWithdrawClick: () => void;
  actionMode: "add" | "withdraw" | null;
  actionAmount: string; setActionAmount: (v: string) => void;
  onAddSubmit: () => void; onWithdrawSubmit: () => void; onCancelAction: () => void;
  onSetAutoSave: (enabled: boolean, amount?: number, frequency?: string) => void;
}) => {
  const [autosaveOpen, setAutosaveOpen] = useState(false);
  const [draftAmount, setDraftAmount] = useState(String(goal.autosave_amount || 100));
  const [draftFreq, setDraftFreq] = useState<string>(goal.autosave_frequency || "weekly");
  const color = goal.color || "40 90% 60%";
  const accent = goal.is_completed ? "152 65% 50%" : color;
  const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)) : null;
  const overdue = goal.deadline && !goal.is_completed && new Date(goal.deadline).getTime() < Date.now();

  // Ring math
  const R = 38, C = 2 * Math.PI * R;
  const offset = C - (pct / 100) * C;

  return (
    <div className="rounded-[20px] overflow-hidden border border-white/[0.05] relative"
      style={{
        background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5%))",
        animation: `su-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.08 + index * 0.04}s both`,
      }}>
      {/* Colored header band */}
      <div className="h-[6px] w-full" style={{ background: `linear-gradient(90deg, hsl(${accent}), hsl(${accent} / 0.4))` }} />

      {goal.is_completed && (
        <div className="px-4 py-2 flex items-center gap-2 border-b border-white/[0.04]"
          style={{ background: `hsl(${accent} / 0.08)` }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: `hsl(${accent})` }} />
          <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: `hsl(${accent})` }}>Goal Achieved!</p>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Left: emoji + title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center text-[22px] shrink-0"
                style={{
                  background: `linear-gradient(135deg, hsl(${accent} / 0.18), hsl(${accent} / 0.06))`,
                  border: `1px solid hsl(${accent} / 0.18)`,
                  animation: "float-bounce 3s ease-in-out infinite",
                }}>
                {goal.icon || "🎯"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold tracking-[-0.2px] truncate">{goal.title}</p>
                <p className="text-[10px] text-white/35 mt-0.5">
                  {daysLeft === null ? "No deadline" : overdue ? "Overdue" : `${daysLeft} days left`}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-white/45 font-mono">
              <span className="font-bold text-white/85">{fmt(goal.current_amount)}</span>
              <span className="text-white/30"> of </span>
              {fmt(goal.target_amount)}
            </p>
          </div>

          {/* Right: ring */}
          <div className="relative w-[88px] h-[88px] shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
              <circle cx="44" cy="44" r={R} fill="none"
                stroke="hsl(0 0% 100% / 0.06)" strokeWidth="6" />
              <circle cx="44" cy="44" r={R} fill="none"
                stroke={`hsl(${accent})`} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={offset}
                style={{
                  transition: "stroke-dashoffset 0.4s ease-out",
                  filter: `drop-shadow(0 0 4px hsl(${accent} / 0.5))`,
                }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {goal.is_completed ? (
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: `hsl(${accent})`, boxShadow: `0 0 16px hsl(${accent} / 0.6)` }}>
                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                </div>
              ) : (
                <p className="font-mono font-bold text-[15px]" style={{ color: `hsl(${accent})` }}>
                  {Math.round(pct)}%
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action row */}
        {actionMode ? (
          <div className="mt-4 flex gap-2 items-center" style={{ animation: "fade-in 0.2s" }}>
            <span className="text-[12px] font-semibold text-white/60 mr-1">
              {actionMode === "add" ? "Add" : "Withdraw"} ₹
            </span>
            <input
              value={actionAmount}
              onChange={e => setActionAmount(e.target.value.replace(/\D/g, "").slice(0, 7))}
              inputMode="numeric"
              autoFocus
              placeholder="0"
              className="flex-1 h-[40px] rounded-xl px-3 text-[13px] font-mono outline-none"
              style={{ background: "hsl(220 15% 7%)", border: `1px solid hsl(${accent} / 0.25)`, color: "white" }}
            />
            <button onClick={actionMode === "add" ? onAddSubmit : onWithdrawSubmit}
              className="h-[40px] px-4 rounded-xl text-[12px] font-bold active:scale-95 transition"
              style={{
                background: `hsl(${accent})`,
                color: "hsl(220 22% 6%)",
                boxShadow: `0 2px 10px hsl(${accent} / 0.3)`,
              }}>
              {actionMode === "add" ? "Save" : "Withdraw"}
            </button>
            <button onClick={onCancelAction}
              className="w-[40px] h-[40px] rounded-xl flex items-center justify-center active:scale-90 transition"
              style={{ background: "hsl(220 15% 9%)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            {!goal.is_completed && (
              <button onClick={onAddClick}
                className="flex-1 h-[40px] rounded-xl text-[12px] font-bold active:scale-[0.97] transition flex items-center justify-center gap-1.5"
                style={{
                  background: `linear-gradient(135deg, hsl(${accent} / 0.2), hsl(${accent} / 0.08))`,
                  border: `1px solid hsl(${accent} / 0.3)`,
                  color: `hsl(${accent})`,
                }}>
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add ₹
              </button>
            )}
            {goal.current_amount > 0 && (
              <button onClick={onWithdrawClick}
                className="h-[40px] px-3 rounded-xl text-[11px] font-semibold text-white/60 flex items-center gap-1 active:scale-95 transition"
                style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                <ArrowDownToLine className="w-3.5 h-3.5" /> Withdraw
              </button>
            )}
            <button onClick={onDelete}
              className="w-[40px] h-[40px] rounded-xl flex items-center justify-center active:scale-90 transition"
              style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
              <Trash2 className="w-3.5 h-3.5 text-white/25" />
            </button>
          </div>
        )}

        {/* Auto-save rule */}
        {!goal.is_completed && (
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            <button
              onClick={() => { haptic.light(); setAutosaveOpen(o => !o); }}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-[28px] h-[28px] rounded-[9px] flex items-center justify-center"
                  style={{
                    background: goal.autosave_enabled
                      ? `linear-gradient(135deg, hsl(${accent} / 0.22), hsl(${accent} / 0.08))`
                      : "hsl(220 15% 8%)",
                    border: `1px solid hsl(${accent} / ${goal.autosave_enabled ? 0.35 : 0.08})`,
                  }}>
                  <Repeat className="w-3.5 h-3.5" style={{ color: goal.autosave_enabled ? `hsl(${accent})` : "hsl(0 0% 100% / 0.3)" }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-white/70">Auto-save</p>
                  <p className="text-[9.5px] text-white/35">
                    {goal.autosave_enabled
                      ? `₹${goal.autosave_amount} every ${goal.autosave_frequency || "week"}`
                      : "Hands-off saving"}
                  </p>
                </div>
              </div>
              {/* Toggle pill */}
              <div
                onClick={(e) => { e.stopPropagation(); onSetAutoSave(!goal.autosave_enabled, parseInt(draftAmount, 10) || 100, draftFreq); }}
                className="w-[36px] h-[20px] rounded-full relative transition-colors cursor-pointer"
                style={{ background: goal.autosave_enabled ? `hsl(${accent})` : "hsl(220 15% 14%)" }}
              >
                <div className="absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white transition-all"
                  style={{ left: goal.autosave_enabled ? "18px" : "2px" }} />
              </div>
            </button>

            {autosaveOpen && (
              <div className="mt-3 flex gap-2 items-center" style={{ animation: "fade-in 0.2s" }}>
                <span className="text-[11px] text-white/45">₹</span>
                <input
                  value={draftAmount}
                  onChange={e => setDraftAmount(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="100"
                  className="w-[80px] h-[34px] rounded-lg px-2 text-[12px] font-mono outline-none"
                  style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 12%)", color: "white" }}
                />
                <select
                  value={draftFreq}
                  onChange={e => setDraftFreq(e.target.value)}
                  className="h-[34px] rounded-lg px-2 text-[12px] outline-none"
                  style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 12%)", color: "white" }}
                >
                  <option value="weekly">weekly</option>
                  <option value="monthly">monthly</option>
                  <option value="daily">daily</option>
                </select>
                <button
                  onClick={() => { onSetAutoSave(true, parseInt(draftAmount, 10) || 100, draftFreq); setAutosaveOpen(false); }}
                  className="ml-auto h-[34px] px-3 rounded-lg text-[11px] font-bold active:scale-95 transition"
                  style={{ background: `hsl(${accent})`, color: "hsl(220 22% 6%)" }}
                >
                  Save rule
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Preview card (wizard step 5) ───
const PreviewCard = ({ title, emoji, target, deadline, color }: {
  title: string; emoji: string; target: number; deadline: string; color: string;
}) => {
  const days = deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)) : null;
  return (
    <div className="rounded-[20px] overflow-hidden border border-white/[0.05]"
      style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5%))" }}>
      <div className="h-[6px] w-full" style={{ background: `linear-gradient(90deg, hsl(${color}), hsl(${color} / 0.4))` }} />
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center text-[22px]"
              style={{
                background: `linear-gradient(135deg, hsl(${color} / 0.18), hsl(${color} / 0.06))`,
                border: `1px solid hsl(${color} / 0.18)`,
                animation: "float-bounce 3s ease-in-out infinite",
              }}>
              {emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold tracking-[-0.2px] truncate">{title}</p>
              <p className="text-[10px] text-white/35 mt-0.5">
                {days === null ? "No deadline" : `${days} days left`}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-white/45 font-mono">
            <span className="font-bold text-white/85">₹0</span>
            <span className="text-white/30"> of </span>{fmt(target)}
          </p>
        </div>
        <div className="relative w-[88px] h-[88px]">
          <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
            <circle cx="44" cy="44" r="38" fill="none" stroke="hsl(0 0% 100% / 0.06)" strokeWidth="6" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono font-bold text-[15px]" style={{ color: `hsl(${color})` }}>0%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sheet ───
const Sheet = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "fade-in 0.2s ease-out" }}>
    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
    <div className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8 max-h-[88vh] overflow-y-auto scrollbar-hide"
      style={{
        background: "linear-gradient(180deg, hsl(220 20% 9%), hsl(220 22% 5%))",
        animation: "sheet-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}>
      <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />
      {children}
    </div>
  </div>
);

export default SavingsGoals;
