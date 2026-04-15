import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, QrCode, Plus, Clock, Eye, EyeOff,
  Target, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Sparkles, Shield, CreditCard, Send, ChevronRight,
  Wallet, Zap, BarChart3, Gift, Users, PieChart, Star,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Profile {
  full_name: string;
  avatar_url: string | null;
  kyc_status: string | null;
}

interface WalletData {
  id: string;
  balance: number;
  daily_limit: number;
  monthly_limit: number;
  spent_today: number;
  spent_this_month: number;
  is_frozen: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  merchant_name: string | null;
  category: string | null;
  status: string;
  created_at: string;
}

interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
}

const categoryIcons: Record<string, string> = {
  food: "🍔", transport: "🚗", education: "📚", shopping: "🛍️", entertainment: "🎮", other: "💸",
};

// Animated counter hook
const useCountUp = (target: number, duration = 1200) => {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return value;
};

// Animated weekly spending chart
const WeeklyChart = ({ transactions }: { transactions: Transaction[] }) => {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);

  const days: { label: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayAmount = transactions
      .filter(t => t.type === "debit" && t.status === "success" && t.created_at.startsWith(dateStr))
      .reduce((s, t) => s + t.amount, 0);
    days.push({
      label: d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 3),
      amount: dayAmount,
    });
  }

  const max = Math.max(...days.map(d => d.amount), 1);

  return (
    <div className="flex items-end justify-between gap-1.5 h-20">
      {days.map((day, i) => {
        const pct = (day.amount / max) * 100;
        const isToday = i === 6;
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1">
            <div className="w-full relative h-14 flex items-end">
              <div
                className="w-full rounded-md transition-all duration-700 ease-out"
                style={{
                  height: animated ? `${Math.max(pct, 4)}%` : "4%",
                  background: isToday
                    ? "linear-gradient(180deg, hsl(42 78% 55%), hsl(36 80% 42%))"
                    : "hsl(42 78% 55% / 0.2)",
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
            <span className={`text-[9px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const TeenHome = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, walletRes, goalsRes, notifRes] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, kyc_status").eq("id", user.id).single(),
      supabase.from("wallets").select("*").eq("user_id", user.id).single(),
      supabase.from("savings_goals").select("id, title, target_amount, current_amount, icon").eq("teen_id", user.id).eq("is_completed", false).limit(3),
      supabase.from("notifications").select("id").eq("user_id", user.id).eq("is_read", false),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (goalsRes.data) setGoals(goalsRes.data as SavingsGoal[]);
    setUnreadCount(notifRes.data?.length || 0);

    if (walletRes.data) {
      setWallet(walletRes.data as WalletData);
      const { data: txns } = await supabase
        .from("transactions").select("*")
        .eq("wallet_id", walletRes.data.id)
        .order("created_at", { ascending: false }).limit(5);
      if (txns) setTransactions(txns as Transaction[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!wallet?.id) return;
    const channel = supabase
      .channel("wallet-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `id=eq.${wallet.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wallet?.id]);

  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const firstName = profile?.full_name?.split(" ")[0] || "";
  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const formatCompact = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  const animatedBalance = useCountUp(showBalance ? (wallet?.balance || 0) / 100 : 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const dailyPct = wallet ? Math.min(((wallet.spent_today || 0) / (wallet.daily_limit || 1)) * 100, 100) : 0;
  const monthlyPct = wallet ? Math.min(((wallet.spent_this_month || 0) / (wallet.monthly_limit || 1)) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2"><div className="w-20 h-3 bg-muted rounded animate-pulse" /><div className="w-28 h-4 bg-muted rounded animate-pulse" /></div>
          </div>
        </div>
        <div className="w-full h-52 rounded-3xl bg-muted animate-pulse mb-5" />
        <div className="flex gap-3 mb-6">{[1,2,3,4].map(i => <div key={i} className="flex-1 h-20 rounded-2xl bg-muted animate-pulse" />)}</div>
        {[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-xl bg-muted animate-pulse mb-3" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay pb-28">
      {/* ─── Header ─── */}
      <div className="px-5 pt-6 pb-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 ring-offset-2 ring-offset-background" />
            ) : (
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-[0_4px_16px_hsl(42_78%_55%/0.25)]">
                {initials}
              </div>
            )}
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">{greeting()},</p>
              <p className="text-[17px] font-bold tracking-[-0.3px]">{firstName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { haptic.light(); navigate("/notifications"); }}
              className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-all duration-200 relative"
            >
              <Bell className="w-[18px] h-[18px] text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground animate-scale-in">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Balance Card (Hero) ─── */}
      <div className="px-5 mb-5 animate-slide-up-delay-1">
        <div className="relative rounded-3xl overflow-hidden shimmer-border" style={{ background: "linear-gradient(160deg, hsl(220 18% 11%), hsl(220 20% 6%))" }}>
          {/* Ambient orbs */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
          <div className="absolute -bottom-16 -left-12 w-40 h-40 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, hsl(42 78% 65%), transparent)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-[0.02]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />

          <div className="relative z-10 px-6 pt-6 pb-5">
            {/* Balance label */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">Available Balance</span>
              </div>
              <button
                onClick={() => { haptic.selection(); setShowBalance(!showBalance); }}
                className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center transition-all active:scale-90"
              >
                {showBalance ? <Eye className="w-3.5 h-3.5 text-muted-foreground" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </div>

            {/* Amount */}
            <div className="mb-5">
              <p className="text-[42px] font-bold tracking-[-3px] leading-none">
                {showBalance ? (
                  <>₹{animatedBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                ) : (
                  <span className="text-muted-foreground">₹••••••</span>
                )}
              </p>
            </div>

            {/* Action pills */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { haptic.medium(); navigate("/scan"); }}
                className="flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-xs font-semibold active:scale-95 transition-all duration-200 shadow-[0_4px_20px_hsl(0_0%_100%/0.08)]"
              >
                <Send className="w-3.5 h-3.5" />
                Transfer Funds
              </button>
              <button
                onClick={() => { haptic.medium(); navigate("/add-money"); }}
                className="flex items-center gap-2 h-10 px-5 rounded-full bg-muted/30 backdrop-blur-sm text-foreground text-xs font-semibold border border-border/40 active:scale-95 transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Funds
              </button>
            </div>

            {/* Frozen badge */}
            {wallet?.is_frozen && (
              <div className="mt-4 px-3 py-1.5 bg-destructive/15 rounded-full inline-flex items-center gap-1.5 animate-scale-in">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                <span className="text-[11px] font-semibold text-destructive">Wallet Frozen</span>
              </div>
            )}
          </div>

          {/* Bottom spending bar */}
          <div className="px-6 pb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground">Daily Spending</span>
              <span className="text-[10px] text-muted-foreground font-medium">{formatCompact(wallet?.spent_today || 0)} / {formatCompact(wallet?.daily_limit || 0)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${dailyPct > 80 ? "bg-destructive" : ""}`}
                style={{
                  width: `${dailyPct}%`,
                  background: dailyPct <= 80 ? "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 48%))" : undefined,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quick Actions Grid ─── */}
      <div className="px-5 mb-6 animate-slide-up-delay-2">
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { icon: QrCode, label: "Scan Pay", path: "/scan", accent: true },
            { icon: CreditCard, label: "My Card", path: "/card" },
            { icon: Target, label: "Goals", path: "/savings" },
            { icon: Gift, label: "Rewards", path: "/rewards" },
            { icon: PieChart, label: "Analytics", path: "/analytics" },
            { icon: Users, label: "Split Bill", path: "/bill-split" },
            { icon: BarChart3, label: "Budget", path: "/budget" },
            { icon: Star, label: "Quick Pay", path: "/quick-pay" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => { haptic.light(); navigate(action.path); }}
              className="group relative flex flex-col items-center gap-2.5 py-4 rounded-2xl transition-all duration-300 active:scale-90 overflow-hidden"
              style={{
                background: action.accent
                  ? "linear-gradient(145deg, hsl(42 78% 55%), hsl(36 80% 42%))"
                  : "hsl(220 15% 8%)",
                border: action.accent ? "none" : "1px solid hsl(42 30% 30% / 0.12)",
              }}
            >
              {/* Hover glow */}
              {!action.accent && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "radial-gradient(circle at center, hsl(42 78% 55% / 0.05), transparent)" }} />
              )}
              <div className={`relative transition-transform duration-300 group-active:animate-icon-press`}>
                <action.icon className={`w-[22px] h-[22px] ${action.accent ? "text-primary-foreground" : "text-primary"}`} strokeWidth={1.8} />
              </div>
              <span className={`text-[10px] font-semibold ${action.accent ? "text-primary-foreground" : "text-muted-foreground"}`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Money Flow Cards ─── */}
      <div className="px-5 mb-6 animate-slide-up-delay-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 border border-border overflow-hidden relative" style={{ background: "linear-gradient(145deg, hsl(152 60% 45% / 0.06), hsl(220 15% 8%))" }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, hsl(152 60% 45%), transparent)" }} />
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center mb-3">
                <ArrowDownLeft className="w-4 h-4 text-success" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Money In</p>
              <p className="text-xl font-bold text-success">
                {formatCompact(transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0))}
              </p>
            </div>
          </div>
          <div className="rounded-2xl p-4 border border-border overflow-hidden relative" style={{ background: "linear-gradient(145deg, hsl(0 72% 51% / 0.04), hsl(220 15% 8%))" }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, hsl(0 72% 51%), transparent)" }} />
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
                <ArrowUpRight className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Money Out</p>
              <p className="text-xl font-bold text-destructive">
                {formatCompact(transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Promo Banner ─── */}
      <div className="px-5 mb-6 animate-slide-up-delay-3">
        <button
          onClick={() => { haptic.light(); navigate("/scan"); }}
          className="w-full relative rounded-2xl overflow-hidden p-5 active:scale-[0.98] transition-all duration-200"
          style={{ background: "linear-gradient(135deg, hsl(220 18% 10%), hsl(220 15% 13%))" }}
        >
          <div className="absolute inset-0 shimmer-glow" />
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-[0_4px_20px_hsl(42_78%_55%/0.25)]">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold mb-0.5">Instant Payments</p>
              <p className="text-[11px] text-muted-foreground">Scan any UPI QR to pay instantly</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </button>
      </div>

      {/* ─── Savings Goals ─── */}
      {goals.length > 0 && (
        <div className="mb-6 animate-slide-up-delay-3">
          <div className="flex items-center justify-between mb-3 px-5">
            <h3 className="text-[13px] font-bold flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" /> Savings Goals
            </h3>
            <button onClick={() => { haptic.light(); navigate("/savings"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-1">
            {goals.map(goal => {
              const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
              return (
                <button
                  key={goal.id}
                  onClick={() => { haptic.light(); navigate("/savings"); }}
                  className="min-w-[150px] p-4 rounded-2xl border border-border active:scale-95 transition-all duration-200"
                  style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}
                >
                  <div className="text-xl mb-2">{goal.icon || "🎯"}</div>
                  <p className="text-xs font-semibold truncate mb-1">{goal.title}</p>
                  <div className="w-full h-1.5 rounded-full bg-muted/20 overflow-hidden mb-1.5">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 48%))" }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{Math.round(pct)}% saved</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Monthly Overview with Weekly Chart ─── */}
      <div className="px-5 mb-6 animate-slide-up-delay-3">
        <div className="rounded-2xl p-5 border border-border" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-bold">Monthly Overview</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
          </div>

          {/* Budget bar */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Monthly Budget</span>
              <span className="text-[11px] font-medium">{formatCompact(wallet?.spent_this_month || 0)} / {formatCompact(wallet?.monthly_limit || 0)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${monthlyPct}%`,
                  background: monthlyPct > 80
                    ? "linear-gradient(90deg, hsl(0 72% 51%), hsl(0 72% 60%))"
                    : "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 48%))",
                }}
              />
            </div>
          </div>

          {/* Weekly spending chart */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground">Weekly Spending</span>
            </div>
            <WeeklyChart transactions={transactions} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2.5 rounded-xl bg-muted/10">
              <p className="text-[10px] text-muted-foreground mb-0.5">Daily Avg</p>
              <p className="text-xs font-bold">{formatCompact(Math.round((wallet?.spent_this_month || 0) / Math.max(new Date().getDate(), 1)))}</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-muted/10">
              <p className="text-[10px] text-muted-foreground mb-0.5">Remaining</p>
              <p className="text-xs font-bold text-success">{formatCompact(Math.max((wallet?.monthly_limit || 0) - (wallet?.spent_this_month || 0), 0))}</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-muted/10">
              <p className="text-[10px] text-muted-foreground mb-0.5">Used</p>
              <p className="text-xs font-bold">{Math.round(monthlyPct)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Activity ─── */}
      <div className="px-5 mb-6 animate-slide-up-delay-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" /> Recent Activity
          </h3>
          <button onClick={() => { haptic.light(); navigate("/activity"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-border" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
            <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">Start by adding money to your wallet</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
            {transactions.map((tx, idx) => (
              <button
                key={tx.id}
                onClick={() => { haptic.light(); navigate(`/transaction/${tx.id}`); }}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-all duration-200 active:bg-muted/10 ${idx < transactions.length - 1 ? "border-b border-border/50" : ""}`}
              >
                <div className="w-10 h-10 rounded-xl bg-muted/15 flex items-center justify-center text-lg shrink-0">
                  {categoryIcons[tx.category || "other"] || "💸"}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-semibold truncate">{tx.merchant_name || tx.category || "Transaction"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {tx.category} · {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <p className={`text-[13px] font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                  {tx.type === "credit" ? "+" : "-"}{formatCompact(tx.amount)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Refer & Earn ─── */}
      <div className="px-5 mb-6 animate-slide-up-delay-4">
        <button
          onClick={() => {
            haptic.medium();
            const shareText = "Hey! Join AuroPay and we both get ₹100! Download now 🎁";
            navigator.share?.({ text: shareText }).catch(() => {
              navigator.clipboard.writeText(shareText);
              toast?.("Referral link copied!");
            });
          }}
          className="w-full relative overflow-hidden rounded-3xl border border-primary/20 p-5 text-left active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}
        >
          {/* Ambient glow */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-3xl opacity-30" style={{ background: "hsl(42 78% 55%)" }} />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full blur-2xl opacity-10" style={{ background: "hsl(42 78% 55%)" }} />

          {/* Sparkle decorations */}
          <div className="absolute top-4 right-16 w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
          <div className="absolute top-10 right-8 w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-6 right-12 w-1 h-1 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: "1s" }} />

          <div className="relative z-10 flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-base font-bold leading-snug mb-1">
                Flat ₹100 for you,{"\n"}
                <span className="text-primary">₹100 for your friend</span>
              </h3>
              <p className="text-[11px] text-muted-foreground mb-3">
                *Reward unlocks after first spend
              </p>
              <div className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-full">
                <Send className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Invite Friends</span>
              </div>
            </div>

            {/* Gift icon illustration */}
            <div className="relative w-20 h-20 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-4xl">🎁</span>
              </div>
              {/* Rupee symbol floating */}
              <div className="absolute -top-2 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg animate-bounce" style={{ animationDuration: "2s" }}>
                ₹
              </div>
            </div>
          </div>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default TeenHome;
