import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  spent: number;
  month: string;
  alert_threshold: number;
}

const categoryIcons: Record<string, string> = {
  food: "🍔", transport: "🚗", education: "📚", shopping: "🛍️", entertainment: "🎮", other: "💸",
};

const categoryColors: Record<string, string> = {
  food: "hsl(25 95% 53%)", transport: "hsl(210 80% 55%)", education: "hsl(270 70% 60%)",
  shopping: "hsl(340 75% 55%)", entertainment: "hsl(150 60% 45%)", other: "hsl(42 78% 55%)",
};

const categories = ["food", "transport", "education", "shopping", "entertainment", "other"];

const BudgetPlanner = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCat, setSelectedCat] = useState("food");
  const [limitAmount, setLimitAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchBudgets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("budgets").select("*").eq("user_id", user.id).eq("month", currentMonth);
    setBudgets((data || []) as Budget[]);
    setLoading(false);
  };

  useEffect(() => { fetchBudgets(); }, []);

  const createBudget = async () => {
    if (!limitAmount) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const { error } = await supabase.from("budgets").insert({
      user_id: user.id,
      category: selectedCat,
      monthly_limit: Math.round(parseFloat(limitAmount) * 100),
      month: currentMonth,
    });

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Budget for this category already exists" : "Failed to create budget");
    } else {
      toast.success("Budget created!");
      haptic.success();
      setLimitAmount(""); setShowCreate(false);
      fetchBudgets();
    }
    setCreating(false);
  };

  const formatCompact = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  const totalBudget = budgets.reduce((s, b) => s + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="min-h-screen bg-background noise-overlay pb-28">
      <div className="px-5 pt-6 pb-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic.light(); navigate(-1); }} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold">Budget Planner</h1>
            <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
          </div>
          <button onClick={() => { haptic.light(); setShowCreate(true); }} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center active:scale-90 transition-all shadow-[0_4px_12px_hsl(42_78%_55%/0.3)]">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Overview Card */}
      <div className="px-5 mb-5 animate-slide-up-delay-1">
        <div className="rounded-2xl p-5 border border-border" style={{ background: "linear-gradient(145deg, hsl(42 78% 55% / 0.04), hsl(220 15% 8%))" }}>
          <div className="flex justify-between items-center mb-3">
            <p className="text-[12px] font-semibold">Monthly Overview</p>
            <p className="text-[11px] text-muted-foreground">{formatCompact(totalSpent)} / {formatCompact(totalBudget)}</p>
          </div>
          <div className="w-full h-3 bg-muted/20 rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-1000 gradient-primary"
              style={{ width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}% of total budget used` : "Set budgets to track spending"}
          </p>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-t-3xl border-t border-border p-6 animate-slide-up" style={{ background: "linear-gradient(180deg, hsl(220 15% 12%), hsl(220 18% 7%))" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted/30 rounded-full mx-auto mb-5" />
            <h2 className="text-[16px] font-bold mb-4">Set Budget</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCat(cat)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-medium border transition-all active:scale-95 ${
                        selectedCat === cat ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"
                      }`}>
                      <span>{categoryIcons[cat]}</span>
                      <span className="capitalize">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Monthly Limit (₹)</label>
                <input value={limitAmount} onChange={e => setLimitAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" type="text" inputMode="decimal" className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary/40 outline-none transition-all" />
              </div>
              <button onClick={createBudget} disabled={creating || !limitAmount}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_4px_16px_hsl(42_78%_55%/0.3)]">
                {creating ? "Creating..." : "Set Budget"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Cards */}
      <div className="px-5">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-16 animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No budgets set</p>
            <p className="text-[11px] text-muted-foreground mt-1">Tap + to set your first budget</p>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map(b => {
              const pct = b.monthly_limit > 0 ? (b.spent / b.monthly_limit) * 100 : 0;
              const isOver = pct >= 100;
              const isWarning = pct >= b.alert_threshold && !isOver;
              return (
                <div key={b.id} className="rounded-2xl p-4 border border-border transition-all" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ background: `${categoryColors[b.category] || categoryColors.other}15` }}>
                      {categoryIcons[b.category] || "💸"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold capitalize">{b.category}</p>
                      <p className="text-[10px] text-muted-foreground">{formatCompact(b.spent)} / {formatCompact(b.monthly_limit)}</p>
                    </div>
                    {isOver ? (
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Over
                      </span>
                    ) : isWarning ? (
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-warning/10 text-warning flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {pct.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-success/10 text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: isOver ? "hsl(0 72% 51%)" : isWarning ? "hsl(38 92% 50%)" : categoryColors[b.category] || categoryColors.other,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BudgetPlanner;
