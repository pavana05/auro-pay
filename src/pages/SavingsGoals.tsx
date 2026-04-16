import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Target, Trash2, PiggyBank, TrendingUp, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  is_completed: boolean;
}

const iconOptions = ["🎯", "📱", "🎮", "👟", "🎸", "💻", "📚", "✈️", "🎁", "🏠"];

const SavingsGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [addAmount, setAddAmount] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const fetchGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("savings_goals").select("*").eq("teen_id", user.id).order("created_at", { ascending: false });
    setGoals((data || []) as Goal[]);
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, []);

  const addGoal = async () => {
    if (!newTitle || !newTarget) { toast.error("Fill in all fields"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    haptic.medium();
    const { error } = await supabase.from("savings_goals").insert({
      teen_id: user.id,
      title: newTitle,
      target_amount: parseInt(newTarget) * 100,
      deadline: newDeadline || null,
      icon: newIcon,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Goal created!");
    setShowAdd(false);
    setNewTitle(""); setNewTarget(""); setNewDeadline(""); setNewIcon("🎯");
    fetchGoals();
  };

  const addToGoal = async (goalId: string) => {
    const amount = parseInt(addAmount[goalId] || "0");
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    haptic.light();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const newAmount = goal.current_amount + amount * 100;
    const completed = newAmount >= goal.target_amount;
    const { error } = await supabase.from("savings_goals").update({
      current_amount: newAmount,
      is_completed: completed,
    }).eq("id", goalId);
    if (error) { toast.error(error.message); return; }
    if (completed) toast.success("🎉 Goal completed!");
    else toast.success(`Added ₹${amount}`);
    setAddAmount(prev => ({ ...prev, [goalId]: "" }));
    fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    haptic.medium();
    const { error } = await supabase.from("savings_goals").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Goal deleted"); fetchGoals(); }
  };

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const completedCount = goals.filter(g => g.is_completed).length;
  const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full opacity-[0.035] blur-[100px]" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute bottom-[30%] -left-20 w-[200px] h-[200px] rounded-full opacity-[0.02] blur-[70px]" style={{ background: "hsl(152 60% 45%)" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <div className="pt-4 pb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)}
                className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]"
                style={{ background: "hsl(220 15% 8%)" }}>
                <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
              </button>
              <div>
                <h1 className="text-[19px] font-bold tracking-[-0.5px]">Savings Goals</h1>
                <p className="text-[10px] text-white/30 font-medium">{goals.length} goals</p>
              </div>
            </div>
            <button onClick={() => { haptic.light(); setShowAdd(true); }}
              className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                boxShadow: "0 4px 16px hsl(var(--primary) / 0.25)",
              }}>
              <Plus className="w-[18px] h-[18px]" style={{ color: "hsl(220 20% 6%)" }} />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2.5 mb-6" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both" }}>
          {[
            { icon: PiggyBank, label: "Saved", value: fmt(totalSaved), accent: "152 60% 45%" },
            { icon: TrendingUp, label: "Target", value: fmt(totalTarget), accent: "var(--primary)" },
            { icon: Target, label: "Done", value: `${completedCount}/${goals.length}`, accent: "210 80% 55%" },
          ].map((card, i) => (
            <div key={i} className="rounded-[16px] p-3.5 text-center border border-white/[0.04] relative overflow-hidden"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
              <div className="absolute top-0 left-3 right-3 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, hsl(${card.accent} / 0.15), transparent)` }} />
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ background: `hsl(${card.accent} / 0.1)` }}>
                <card.icon className="w-4 h-4" style={{ color: `hsl(${card.accent})` }} />
              </div>
              <p className="text-[13px] font-bold tracking-[-0.3px]">{card.value}</p>
              <p className="text-[9px] text-white/25 font-medium mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Create Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setShowAdd(false)}>
            <div className="w-full max-w-lg rounded-t-[28px] p-6 border-t border-white/[0.06]"
              style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold">New Savings Goal</h2>
                <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white/30" />
                </button>
              </div>

              {/* Icon picker */}
              <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-2">Icon</p>
              <div className="flex gap-2 mb-4 flex-wrap">
                {iconOptions.map(ic => (
                  <button key={ic} onClick={() => setNewIcon(ic)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all active:scale-90"
                    style={{
                      background: newIcon === ic ? "hsl(var(--primary) / 0.12)" : "hsl(220 15% 10%)",
                      border: `1px solid ${newIcon === ic ? "hsl(var(--primary) / 0.3)" : "hsl(220 15% 13%)"}`,
                      boxShadow: newIcon === ic ? "0 2px 8px hsl(var(--primary) / 0.1)" : "none",
                    }}>
                    {ic}
                  </button>
                ))}
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">Goal Name</p>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., New Phone"
                    className="w-full h-[48px] rounded-[14px] px-4 text-[13px] outline-none transition-all"
                    style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />
                </div>
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">Target Amount (₹)</p>
                  <input value={newTarget} onChange={e => setNewTarget(e.target.value.replace(/\D/g, ""))} placeholder="5000"
                    className="w-full h-[48px] rounded-[14px] px-4 text-[13px] outline-none transition-all"
                    style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} inputMode="numeric" />
                </div>
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">Deadline (optional)</p>
                  <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                    className="w-full h-[48px] rounded-[14px] px-4 text-[13px] outline-none transition-all"
                    style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white", colorScheme: "dark" }} />
                </div>
              </div>

              <button onClick={addGoal}
                className="w-full h-[52px] rounded-2xl font-semibold text-[14px] active:scale-[0.97] transition-all relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                  color: "hsl(220 20% 6%)",
                  boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                }}>
                Create Goal
              </button>
            </div>
          </div>
        )}

        {/* Goals List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-[120px] rounded-[18px] overflow-hidden relative">
                <div className="absolute inset-0" style={{ background: "hsl(220 15% 8%)" }} />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(220 15% 12%) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-shimmer 1.8s ease-in-out infinite",
                }} />
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-20" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mx-auto mb-4 border border-white/[0.04]"
              style={{ background: "linear-gradient(135deg, hsl(220 15% 9%), hsl(220 18% 6%))" }}>
              <Target className="w-8 h-8 text-white/8" />
            </div>
            <p className="text-[14px] font-semibold text-white/20 mb-1">No savings goals yet</p>
            <p className="text-[11px] text-white/10">Tap + to create your first goal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal, idx) => {
              const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
              const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)) : null;
              const accent = goal.is_completed ? "152 60% 45%" : "var(--primary)";
              return (
                <div key={goal.id} className="rounded-[18px] p-4 border border-white/[0.04] relative overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                    animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.08 + idx * 0.04}s both`,
                  }}>
                  {/* Top accent */}
                  <div className="absolute top-0 left-4 right-4 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, hsl(${accent} / 0.15), transparent)` }} />

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center text-lg"
                        style={{
                          background: `linear-gradient(135deg, hsl(${accent} / 0.12), hsl(${accent} / 0.04))`,
                          boxShadow: goal.is_completed ? `0 2px 8px hsl(${accent} / 0.1)` : "none",
                        }}>
                        {goal.icon || "🎯"}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold">{goal.title}</p>
                        <p className="text-[10px] text-white/25 mt-0.5">{fmt(goal.current_amount)} of {fmt(goal.target_amount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {goal.is_completed && (
                        <span className="text-[9px] font-semibold px-2 py-1 rounded-full"
                          style={{ background: "hsl(152 60% 45% / 0.1)", color: "hsl(152 60% 50%)" }}>
                          ✓ Done
                        </span>
                      )}
                      <button onClick={() => deleteGoal(goal.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                        style={{ background: "hsl(220 15% 10%)" }}>
                        <Trash2 className="w-3.5 h-3.5 text-white/20" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-[6px] rounded-full overflow-hidden mb-2" style={{ background: "hsl(220 15% 10%)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: goal.is_completed
                          ? "linear-gradient(90deg, hsl(152 60% 45%), hsl(152 60% 55%))"
                          : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                        boxShadow: `0 0 8px hsl(${accent} / 0.3)`,
                      }} />
                  </div>

                  <div className="flex justify-between mb-3">
                    <p className="text-[10px] text-white/20 font-medium">{Math.round(pct)}% saved</p>
                    {daysLeft !== null && (
                      <p className="text-[10px] text-white/20 font-medium">{daysLeft}d left</p>
                    )}
                  </div>

                  {/* Add money input */}
                  {!goal.is_completed && (
                    <div className="flex gap-2">
                      <input
                        value={addAmount[goal.id] || ""}
                        onChange={e => setAddAmount(prev => ({ ...prev, [goal.id]: e.target.value.replace(/\D/g, "") }))}
                        placeholder="Add ₹"
                        inputMode="numeric"
                        className="flex-1 h-[40px] rounded-xl px-3 text-[12px] outline-none transition-all"
                        style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }}
                      />
                      <button onClick={() => addToGoal(goal.id)}
                        className="h-[40px] px-5 rounded-xl text-[12px] font-semibold active:scale-[0.95] transition-all"
                        style={{
                          background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.08))",
                          color: "hsl(var(--primary))",
                          border: "1px solid hsl(var(--primary) / 0.2)",
                        }}>
                        Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      <style>{`
        @keyframes slide-up-spring {
          0% { opacity: 0; transform: translateY(20px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default SavingsGoals;
