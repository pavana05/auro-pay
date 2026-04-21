import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingDown, TrendingUp, PieChart } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import { haptic } from "@/lib/haptics";

interface CategorySpend {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

const categoryIcons: Record<string, string> = {
  food: "🍔", transport: "🚗", education: "📚", shopping: "🛍️", entertainment: "🎮", other: "💸",
};

const categoryColors: Record<string, string> = {
  food: "hsl(25 95% 53%)",
  transport: "hsl(210 80% 55%)",
  education: "hsl(270 70% 60%)",
  shopping: "hsl(340 75% 55%)",
  entertainment: "hsl(150 60% 45%)",
  other: "hsl(42 78% 55%)",
};

const periods = ["This Week", "This Month", "Last Month", "Last 3 Months"];

const ExpenseAnalytics = () => {
  const [categorySpends, setCategorySpends] = useState<CategorySpend[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [period, setPeriod] = useState("This Month");
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const back = useSafeBack();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: wallet } = await supabase.from("wallets").select("id").eq("user_id", user.id).single();
      if (!wallet) { setLoading(false); return; }

      const now = new Date();
      let startDate: Date;
      if (period === "This Week") {
        startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay());
      } else if (period === "This Month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === "Last Month") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      }
      startDate.setHours(0, 0, 0, 0);

      const { data: txns } = await supabase
        .from("transactions").select("*")
        .eq("wallet_id", wallet.id)
        .gte("created_at", startDate.toISOString())
        .eq("status", "success");

      const transactions = (txns || []) as any[];
      const debits = transactions.filter(t => t.type === "debit");
      const credits = transactions.filter(t => t.type === "credit");

      const spent = debits.reduce((s: number, t: any) => s + t.amount, 0);
      const earned = credits.reduce((s: number, t: any) => s + t.amount, 0);
      setTotalSpent(spent);
      setTotalEarned(earned);

      // Category breakdown
      const catMap: Record<string, { amount: number; count: number }> = {};
      debits.forEach((t: any) => {
        const cat = t.category || "other";
        if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 };
        catMap[cat].amount += t.amount;
        catMap[cat].count++;
      });

      const catSpends: CategorySpend[] = Object.entries(catMap)
        .map(([category, { amount, count }]) => ({
          category,
          amount,
          count,
          percentage: spent > 0 ? (amount / spent) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      setCategorySpends(catSpends);

      // Weekly bar chart data (last 7 days)
      const weekly: number[] = Array(7).fill(0);
      debits.forEach((t: any) => {
        const d = new Date(t.created_at);
        const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
        if (daysAgo < 7) weekly[6 - daysAgo] += t.amount;
      });
      setWeeklyData(weekly);

      setLoading(false);
    };
    fetch();
  }, [period]);

  const formatCompact = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  const maxWeekly = Math.max(...weeklyData, 1);
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2);
  });

  return (
    <div className="min-h-screen bg-background noise-overlay pb-28">
      <div className="px-5 pt-6 pb-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic.light(); back(); }} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[18px] font-bold">Expense Analytics</h1>
        </div>
      </div>

      {/* Period Selector */}
      <div className="px-5 mb-5 animate-slide-up-delay-1">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {periods.map(p => (
            <button key={p} onClick={() => { haptic.selection(); setPeriod(p); }}
              className={`px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95 ${
                period === p ? "gradient-primary text-primary-foreground shadow-[0_4px_12px_hsl(42_78%_55%/0.2)]" : "bg-card border border-border text-muted-foreground"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="px-5 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="px-5 mb-5 animate-slide-up-delay-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 border border-border" style={{ background: "linear-gradient(145deg, hsl(0 72% 51% / 0.04), hsl(220 15% 8%))" }}>
                <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">Total Spent</p>
                <p className="text-lg font-bold text-destructive">{formatCompact(totalSpent)}</p>
              </div>
              <div className="rounded-2xl p-4 border border-border" style={{ background: "linear-gradient(145deg, hsl(152 60% 45% / 0.06), hsl(220 15% 8%))" }}>
                <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">Total Earned</p>
                <p className="text-lg font-bold text-success">{formatCompact(totalEarned)}</p>
              </div>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="px-5 mb-5 animate-slide-up-delay-2">
            <div className="rounded-2xl p-5 border border-border" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
              <p className="text-[12px] font-semibold text-foreground mb-4">Daily Spending (Last 7 Days)</p>
              <div className="flex items-end justify-between gap-2 h-32">
                {weeklyData.map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[8px] text-muted-foreground font-medium">
                      {val > 0 ? `₹${(val / 100).toFixed(0)}` : ""}
                    </span>
                    <div className="w-full relative rounded-t-lg overflow-hidden" style={{ height: `${Math.max((val / maxWeekly) * 100, 4)}%` }}>
                      <div className="absolute inset-0 rounded-t-lg gradient-primary opacity-80" style={{ animation: `grow-up 0.8s ease-out ${i * 0.1}s both` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-medium">{dayLabels[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="px-5 mb-5 animate-slide-up-delay-2">
            <p className="text-[12px] font-semibold text-foreground mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" /> Category Breakdown
            </p>
            <div className="space-y-3">
              {categorySpends.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No spending data for this period</p>
              ) : (
                categorySpends.map((cat) => (
                  <div key={cat.category} className="rounded-2xl p-4 border border-border" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${categoryColors[cat.category] || categoryColors.other}15` }}>
                        {categoryIcons[cat.category] || "💸"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold capitalize">{cat.category}</p>
                        <p className="text-[10px] text-muted-foreground">{cat.count} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-bold">{formatCompact(cat.amount)}</p>
                        <p className="text-[10px] text-muted-foreground">{cat.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${cat.percentage}%`, background: categoryColors[cat.category] || categoryColors.other }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default ExpenseAnalytics;
