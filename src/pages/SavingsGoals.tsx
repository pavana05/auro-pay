import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Target, Trash2, PiggyBank, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
    const { error } = await supabase.from("savings_goals").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Goal deleted"); fetchGoals(); }
  };

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const completedCount = goals.filter(g => g.is_completed).length;
  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-semibold">Savings Goals</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="gradient-card rounded-lg p-3 border border-border card-glow text-center">
          <PiggyBank className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-sm font-bold">{formatAmount(totalSaved)}</p>
          <p className="text-[10px] text-muted-foreground">Saved</p>
        </div>
        <div className="gradient-card rounded-lg p-3 border border-border card-glow text-center">
          <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-sm font-bold">{formatAmount(totalTarget)}</p>
          <p className="text-[10px] text-muted-foreground">Target</p>
        </div>
        <div className="gradient-card rounded-lg p-3 border border-border card-glow text-center">
          <Target className="w-4 h-4 text-success mx-auto mb-1" />
          <p className="text-sm font-bold">{completedCount}/{goals.length}</p>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="rounded-xl bg-card border border-border p-4 mb-6 animate-fade-in-up card-glow">
          <div className="flex gap-2 mb-3 flex-wrap">
            {iconOptions.map(ic => (
              <button key={ic} onClick={() => setNewIcon(ic)} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${newIcon === ic ? "bg-primary/20 border border-primary/40" : "bg-muted"}`}>
                {ic}
              </button>
            ))}
          </div>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Goal name (e.g., New Phone)" className="input-auro w-full mb-3" />
          <input value={newTarget} onChange={(e) => setNewTarget(e.target.value.replace(/\D/g, ""))} placeholder="Target amount (₹)" className="input-auro w-full mb-3" />
          <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="input-auro w-full mb-4" />
          <button onClick={addGoal} className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm">Create Goal</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="w-full h-24 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No savings goals yet</p>
          <p className="text-xs text-muted-foreground mt-1">Tap + to create your first goal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
            const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)) : null;
            return (
              <div key={goal.id} className="p-4 rounded-xl bg-card border border-border card-glow">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{goal.icon || "🎯"} {goal.title}</p>
                  <div className="flex items-center gap-2">
                    {goal.is_completed && <span className="text-xs text-success font-medium badge-premium px-2 py-0.5 rounded-full !text-primary-foreground">✓ Done</span>}
                    <button onClick={() => deleteGoal(goal.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted mb-2 overflow-hidden">
                  <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between mb-3">
                  <p className="text-xs text-muted-foreground">{formatAmount(goal.current_amount)} of {formatAmount(goal.target_amount)}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(pct)}%{daysLeft !== null ? ` · ${daysLeft}d left` : ""}</p>
                </div>
                {!goal.is_completed && (
                  <div className="flex gap-2">
                    <input
                      value={addAmount[goal.id] || ""}
                      onChange={e => setAddAmount(prev => ({ ...prev, [goal.id]: e.target.value.replace(/\D/g, "") }))}
                      placeholder="Add ₹"
                      className="input-auro flex-1 !h-10 text-sm"
                    />
                    <button onClick={() => addToGoal(goal.id)} className="h-10 px-4 rounded-xl gradient-primary text-primary-foreground text-sm font-medium">
                      Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default SavingsGoals;
