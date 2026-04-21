import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, AlertTriangle, CheckCircle2, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
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

const categoryAccents: Record<string, string> = {
  food: "25 95% 53%", transport: "210 80% 55%", education: "270 70% 60%",
  shopping: "340 75% 55%", entertainment: "152 60% 45%", other: "var(--primary)",
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
  const back = useSafeBack();
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

  const fmt = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  const totalBudget = budgets.reduce((s, b) => s + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overallPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full opacity-[0.035] blur-[100px]" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute bottom-[30%] -left-20 w-[200px] h-[200px] rounded-full opacity-[0.02] blur-[70px]" style={{ background: "hsl(270 70% 60%)" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <div className="pt-4 pb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { haptic.light(); back(); }}
                className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]"
                style={{ background: "hsl(220 15% 8%)" }}>
                <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
              </button>
              <div>
                <h1 className="text-[19px] font-bold tracking-[-0.5px]">Budget Planner</h1>
                <p className="text-[10px] text-white/30 font-medium">
                  {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <button onClick={() => { haptic.light(); setShowCreate(true); }}
              className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                boxShadow: "0 4px 16px hsl(var(--primary) / 0.25)",
              }}>
              <Plus className="w-[18px] h-[18px]" style={{ color: "hsl(220 20% 6%)" }} />
            </button>
          </div>
        </div>

        {/* Overview Card */}
        <div className="rounded-[20px] p-5 mb-5 border border-white/[0.04] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
            animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both",
          }}>
          <div className="absolute top-0 left-6 right-6 h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), transparent)" }} />

          <div className="flex justify-between items-center mb-3">
            <p className="text-[12px] font-semibold text-white/60">Monthly Overview</p>
            <p className="text-[11px] text-white/25 font-medium">{fmt(totalSpent)} / {fmt(totalBudget)}</p>
          </div>

          <div className="w-full h-[8px] rounded-full overflow-hidden mb-2" style={{ background: "hsl(220 15% 10%)" }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${overallPct}%`,
                background: overallPct >= 90
                  ? "linear-gradient(90deg, hsl(0 72% 51%), hsl(0 72% 60%))"
                  : overallPct >= 70
                    ? "linear-gradient(90deg, hsl(38 92% 50%), hsl(38 92% 60%))"
                    : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                boxShadow: `0 0 8px ${overallPct >= 90 ? "hsl(0 72% 51% / 0.3)" : "hsl(var(--primary) / 0.3)"}`,
              }} />
          </div>

          <p className="text-[10px] text-white/20 font-medium">
            {totalBudget > 0 ? `${overallPct.toFixed(0)}% of total budget used` : "Set budgets to track spending"}
          </p>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setShowCreate(false)}>
            <div className="w-full max-w-lg rounded-t-[28px] p-6 border-t border-white/[0.06]"
              style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold">Set Budget</h2>
                <button onClick={() => setShowCreate(false)} className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white/30" />
                </button>
              </div>

              <div className="space-y-4 mb-5">
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-2">Category</p>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map(cat => {
                      const accent = categoryAccents[cat];
                      const active = selectedCat === cat;
                      return (
                        <button key={cat} onClick={() => setSelectedCat(cat)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all active:scale-95"
                          style={{
                            background: active ? `hsl(${accent} / 0.08)` : "hsl(220 15% 8%)",
                            border: `1px solid ${active ? `hsl(${accent} / 0.25)` : "hsl(220 15% 12%)"}`,
                            color: active ? `hsl(${accent})` : "hsl(220 10% 40%)",
                          }}>
                          <span>{categoryIcons[cat]}</span>
                          <span className="capitalize">{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">Monthly Limit (₹)</p>
                  <input value={limitAmount} onChange={e => setLimitAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00"
                    inputMode="decimal"
                    className="w-full h-[48px] rounded-[14px] px-4 text-[13px] outline-none transition-all"
                    style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />
                </div>
              </div>

              <button onClick={createBudget} disabled={creating || !limitAmount}
                className="w-full h-[52px] rounded-2xl font-semibold text-[14px] active:scale-[0.97] transition-all disabled:opacity-40 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                  color: "hsl(220 20% 6%)",
                  boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                }}>
                {creating ? "Creating..." : "Set Budget"}
              </button>
            </div>
          </div>
        )}

        {/* Budget Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-[90px] rounded-[18px] overflow-hidden relative">
                <div className="absolute inset-0" style={{ background: "hsl(220 15% 8%)" }} />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(220 15% 12%) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-shimmer 1.8s ease-in-out infinite",
                }} />
              </div>
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-20" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mx-auto mb-4 border border-white/[0.04]"
              style={{ background: "linear-gradient(135deg, hsl(220 15% 9%), hsl(220 18% 6%))" }}>
              <AlertTriangle className="w-8 h-8 text-white/8" />
            </div>
            <p className="text-[14px] font-semibold text-white/20 mb-1">No budgets set</p>
            <p className="text-[11px] text-white/10">Tap + to set your first budget</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {budgets.map((b, idx) => {
              const pct = b.monthly_limit > 0 ? (b.spent / b.monthly_limit) * 100 : 0;
              const isOver = pct >= 100;
              const isWarning = pct >= b.alert_threshold && !isOver;
              const accent = categoryAccents[b.category] || categoryAccents.other;
              const barColor = isOver ? "0 72% 51%" : isWarning ? "38 92% 50%" : accent;

              return (
                <div key={b.id} className="rounded-[18px] p-4 border border-white/[0.04] relative overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                    animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.08 + idx * 0.04}s both`,
                  }}>
                  <div className="absolute top-0 left-4 right-4 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, hsl(${accent} / 0.12), transparent)` }} />

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center text-lg shrink-0"
                      style={{ background: `linear-gradient(135deg, hsl(${accent} / 0.12), hsl(${accent} / 0.04))` }}>
                      {categoryIcons[b.category] || "💸"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold capitalize">{b.category}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{fmt(b.spent)} / {fmt(b.monthly_limit)}</p>
                    </div>
                    {isOver ? (
                      <span className="text-[9px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "hsl(0 72% 51% / 0.1)", color: "hsl(0 72% 55%)" }}>
                        <AlertTriangle className="w-3 h-3" /> Over
                      </span>
                    ) : isWarning ? (
                      <span className="text-[9px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "hsl(38 92% 50% / 0.1)", color: "hsl(38 92% 55%)" }}>
                        <AlertTriangle className="w-3 h-3" /> {pct.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
                        style={{ background: `hsl(${accent} / 0.1)`, color: `hsl(${accent})` }}>
                        <CheckCircle2 className="w-3 h-3" /> {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: "hsl(220 15% 10%)" }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: `linear-gradient(90deg, hsl(${barColor}), hsl(${barColor} / 0.7))`,
                        boxShadow: `0 0 8px hsl(${barColor} / 0.3)`,
                      }} />
                  </div>
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

export default BudgetPlanner;
