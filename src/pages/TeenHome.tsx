import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, QrCode, Plus, Clock, Eye, EyeOff,
  Target, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Sparkles, Shield, CreditCard, Send, ChevronRight,
  Wallet, Zap, BarChart3, Gift, Users, PieChart, Star,
  Search, Smartphone, Globe, Award, Coins, Receipt,
  RefreshCw, ArrowRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Profile {
  full_name: string;
  avatar_url: string | null;
  kyc_status: string | null;
  phone: string | null;
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

interface Reward {
  id: string;
  title: string;
  description: string | null;
  discount_value: number;
  discount_type: string;
  image_url: string | null;
  category: string | null;
}

interface QuickPayFav {
  id: string;
  contact_name: string;
  avatar_emoji: string;
}

const categoryIcons: Record<string, string> = {
  food: "🍔", transport: "🚗", education: "📚", shopping: "🛍️", entertainment: "🎮", other: "💸",
};

// CountUp hook
const useCountUp = (target: number, duration = 1200, enabled = true) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();
  const prevTarget = useRef(0);

  useEffect(() => {
    if (!enabled) { setValue(0); return; }
    const from = prevTarget.current;
    prevTarget.current = target;
    startRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, enabled]);

  return value;
};

const TeenHome = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [favorites, setFavorites] = useState<QuickPayFav[]>([]);
  const [showBalance, setShowBalance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, walletRes, goalsRes, notifRes, rewardsRes, favsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, kyc_status, phone").eq("id", user.id).single(),
      supabase.from("wallets").select("*").eq("user_id", user.id).single(),
      supabase.from("savings_goals").select("id, title, target_amount, current_amount, icon").eq("teen_id", user.id).eq("is_completed", false).limit(3),
      supabase.from("notifications").select("id").eq("user_id", user.id).eq("is_read", false),
      supabase.from("rewards").select("id, title, description, discount_value, discount_type, image_url, category").eq("is_active", true).limit(4),
      supabase.from("quick_pay_favorites").select("id, contact_name, avatar_emoji").eq("user_id", user.id).order("last_paid_at", { ascending: false, nullsFirst: false }).limit(5),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (goalsRes.data) setGoals(goalsRes.data as SavingsGoal[]);
    if (rewardsRes.data) setRewards(rewardsRes.data as Reward[]);
    if (favsRes.data) setFavorites(favsRes.data as QuickPayFav[]);
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
  const formatCompact = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  const animatedBalance = useCountUp(wallet?.balance || 0, 1200, showBalance);

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="w-24 h-3 rounded-full bg-muted animate-pulse" />
              <div className="w-36 h-4 rounded-full bg-muted animate-pulse" />
            </div>
          </div>
        </div>
        <div className="w-full h-44 rounded-3xl bg-muted animate-pulse mb-4" />
        <div className="grid grid-cols-4 gap-3 mb-4">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}</div>
        {[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-2xl bg-muted animate-pulse mb-3" />)}
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "Add Money", path: "/add-money", gradient: "from-emerald-500/20 to-emerald-600/5" },
    { icon: Send, label: "Send", path: "/quick-pay", gradient: "from-primary/20 to-primary/5" },
    { icon: TrendingUp, label: "Analytics", path: "/analytics", gradient: "from-blue-500/20 to-blue-600/5" },
    { icon: Target, label: "Savings", path: "/savings", gradient: "from-violet-500/20 to-violet-600/5" },
  ];

  const allFeatures = [
    { icon: CreditCard, label: "My Card", path: "/card", emoji: "💳" },
    { icon: PieChart, label: "Analytics", path: "/analytics", emoji: "📊" },
    { icon: Users, label: "Split Bill", path: "/bill-split", emoji: "👥" },
    { icon: BarChart3, label: "Budget", path: "/budget", emoji: "📈" },
    { icon: Star, label: "Quick Pay", path: "/quick-pay", emoji: "⚡" },
    { icon: RefreshCw, label: "Recurring", path: "/quick-pay", emoji: "🔄" },
  ];

  const moneyIn = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const moneyOut = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const spendPct = wallet ? Math.min(((wallet.spent_this_month || 0) / (wallet.monthly_limit || 1)) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ─── Premium Top Bar ─── */}
      <div className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.07] blur-3xl" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-[0.04] blur-3xl" style={{ background: "hsl(42 78% 65%)" }} />

        <div className="relative z-10 px-5 pt-6 pb-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <button onClick={() => { haptic.light(); navigate("/profile"); }} className="shrink-0 group">
                {profile?.avatar_url ? (
                  <div className="relative">
                    <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-primary/20 group-active:scale-95 transition-transform" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-background" />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-[0_6px_20px_hsl(42_78%_55%/0.3)] group-active:scale-95 transition-transform">
                      {initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-background" />
                  </div>
                )}
              </button>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">{greetingTime()} 👋</p>
                <h1 className="text-[17px] font-bold tracking-[-0.3px]">{firstName || "User"}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <button
                onClick={() => { haptic.light(); navigate("/quick-pay"); }}
                className="w-10 h-10 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 flex items-center justify-center active:scale-90 transition-all"
              >
                <Search className="w-[17px] h-[17px] text-muted-foreground" />
              </button>
              {/* Notification */}
              <button
                onClick={() => { haptic.light(); navigate("/notifications"); }}
                className="w-10 h-10 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 flex items-center justify-center active:scale-90 transition-all relative"
              >
                <Bell className="w-[17px] h-[17px] text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shadow-[0_2px_8px_hsl(42_78%_55%/0.4)] animate-scale-in">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Premium Balance Card ─── */}
      <div className="px-5 mb-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div
          className="relative rounded-[28px] overflow-hidden"
          style={{ background: "linear-gradient(165deg, hsl(220 20% 12%), hsl(220 22% 6%))" }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(ellipse at 30% 20%, hsl(42 78% 55%), transparent 50%),
              radial-gradient(ellipse at 70% 80%, hsl(42 78% 45%), transparent 50%)`
          }} />
          {/* Floating orbs */}
          <div className="absolute top-4 right-8 w-20 h-20 rounded-full opacity-[0.06] blur-xl" style={{ background: "hsl(42 78% 55%)" }} />
          <div className="absolute bottom-4 left-6 w-16 h-16 rounded-full opacity-[0.04] blur-xl" style={{ background: "hsl(42 78% 65%)" }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 24px, hsl(42 78% 55%) 24px, hsl(42 78% 55%) 25px),
              repeating-linear-gradient(90deg, transparent, transparent 24px, hsl(42 78% 55%) 24px, hsl(42 78% 55%) 25px)`,
          }} />

          <div className="relative z-10 p-6">
            {/* Balance section */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium tracking-wider uppercase mb-2">Total Balance</p>
                <button
                  onClick={(e) => { e.stopPropagation(); haptic.selection(); setShowBalance(!showBalance); }}
                  className="flex items-center gap-3 active:opacity-70 transition-opacity"
                >
                  {showBalance ? (
                    <h2 className="text-[32px] font-bold tracking-[-1px] tabular-nums leading-none">
                      {formatCompact(animatedBalance)}
                    </h2>
                  ) : (
                    <h2 className="text-[32px] font-bold tracking-[2px] text-muted-foreground leading-none">•••••</h2>
                  )}
                  {showBalance ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground mt-1" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground mt-1" />
                  )}
                </button>
              </div>
              {/* QR Scan button */}
              <button
                onClick={() => { haptic.medium(); navigate("/scan"); }}
                className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-[0_8px_24px_hsl(42_78%_55%/0.35)] active:scale-90 transition-transform"
              >
                <QrCode className="w-7 h-7 text-primary-foreground" strokeWidth={1.8} />
              </button>
            </div>

            {/* Frozen badge */}
            {wallet?.is_frozen && (
              <div className="mb-4 px-3 py-2 bg-destructive/10 rounded-xl inline-flex items-center gap-2 animate-scale-in border border-destructive/20">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-[11px] font-semibold text-destructive">Wallet Frozen</span>
              </div>
            )}

            {/* Money flow mini cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3 bg-success/[0.06] border border-success/10 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-lg bg-success/15 flex items-center justify-center">
                    <ArrowDownLeft className="w-3 h-3 text-success" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">Income</span>
                </div>
                <p className="text-[14px] font-bold text-success tabular-nums">{formatCompact(moneyIn)}</p>
              </div>
              <div className="rounded-2xl p-3 bg-destructive/[0.06] border border-destructive/10 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-lg bg-destructive/15 flex items-center justify-center">
                    <ArrowUpRight className="w-3 h-3 text-destructive" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">Expense</span>
                </div>
                <p className="text-[14px] font-bold text-destructive tabular-nums">{formatCompact(moneyOut)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quick Actions Grid ─── */}
      <div className="px-5 mb-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => { haptic.light(); a.path && navigate(a.path); }}
              className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 active:scale-90 transition-all duration-200 group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center border border-border/30 group-active:shadow-[0_0_16px_hsl(42_78%_55%/0.15)] transition-shadow`}>
                <a.icon className="w-5 h-5 text-foreground" strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Quick Pay Contacts ─── */}
      {favorites.length > 0 && (
        <div className="mb-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-3.5 px-5">
            <h3 className="text-[13px] font-bold tracking-[-0.2px]">Quick Pay</h3>
            <button onClick={() => { haptic.light(); navigate("/quick-pay"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-70 transition-opacity">
              See All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {favorites.map(fav => (
              <button key={fav.id} onClick={() => { haptic.light(); navigate("/quick-pay"); }}
                className="flex flex-col items-center gap-2 min-w-[64px] active:scale-90 transition-all group">
                <div className="w-[56px] h-[56px] rounded-2xl bg-card border border-border/60 flex items-center justify-center text-2xl shadow-sm group-active:shadow-[0_0_20px_hsl(42_78%_55%/0.1)] transition-shadow">
                  {fav.avatar_emoji}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium truncate w-full text-center">{fav.contact_name.split(" ")[0]}</span>
              </button>
            ))}
            <button onClick={() => { haptic.light(); navigate("/quick-pay"); }}
              className="flex flex-col items-center gap-2 min-w-[64px] active:scale-90 transition-all">
              <div className="w-[56px] h-[56px] rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <span className="text-[10px] text-primary font-semibold">Add</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Feature Grid ─── */}
      <div className="px-5 mb-5 animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <h3 className="text-[13px] font-bold tracking-[-0.2px] mb-3.5">Services</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {allFeatures.map((f) => (
            <button
              key={f.label}
              onClick={() => { haptic.light(); navigate(f.path); }}
              className="group relative flex flex-col items-center gap-2.5 py-5 rounded-2xl transition-all duration-300 active:scale-90 overflow-hidden border border-border/40 bg-card/40 backdrop-blur-sm"
            >
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-300" style={{ background: "radial-gradient(circle at center, hsl(42 78% 55% / 0.06), transparent)" }} />
              <span className="text-2xl">{f.emoji}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Monthly Spending Card ─── */}
      <div className="px-5 mb-5 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <div className="rounded-[24px] p-5 border border-border/40 bg-card/40 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-[13px] font-bold tracking-[-0.2px]">Monthly Spending</span>
            </div>
            <span className="text-[10px] text-muted-foreground px-2.5 py-1 rounded-full bg-muted/20 border border-border/30">
              {new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </span>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[22px] font-bold tabular-nums">{formatCompact(wallet?.spent_this_month || 0)}</p>
                <p className="text-[10px] text-muted-foreground">of {formatCompact(wallet?.monthly_limit || 0)} limit</p>
              </div>
              <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${spendPct > 80 ? "bg-destructive/10 text-destructive" : spendPct > 50 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                {Math.round(spendPct)}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted/15 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                width: `${spendPct}%`,
                background: spendPct > 80
                  ? "linear-gradient(90deg, hsl(0 72% 51%), hsl(0 72% 41%))"
                  : spendPct > 50
                    ? "linear-gradient(90deg, hsl(38 92% 50%), hsl(28 92% 45%))"
                    : "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 42%))",
              }} />
            </div>
          </div>

          {/* Daily limit */}
          <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/8 border border-border/20">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">Today's spending</span>
            </div>
            <span className="text-[11px] font-bold tabular-nums">{formatCompact(wallet?.spent_today || 0)} / {formatCompact(wallet?.daily_limit || 0)}</span>
          </div>
        </div>
      </div>

      {/* ─── Savings Goals ─── */}
      {goals.length > 0 && (
        <div className="mb-5 animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center justify-between mb-3.5 px-5">
            <h3 className="text-[13px] font-bold tracking-[-0.2px] flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Savings Goals
            </h3>
            <button onClick={() => { haptic.light(); navigate("/savings"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-70 transition-opacity">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {goals.map(goal => {
              const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
              return (
                <button
                  key={goal.id}
                  onClick={() => { haptic.light(); navigate("/savings"); }}
                  className="min-w-[150px] p-4 rounded-2xl border border-border/40 active:scale-95 transition-all duration-200 bg-card/40 backdrop-blur-sm"
                >
                  <div className="text-2xl mb-2.5">{goal.icon || "🎯"}</div>
                  <p className="text-[12px] font-semibold truncate mb-2">{goal.title}</p>
                  <div className="w-full h-1.5 rounded-full bg-muted/15 overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 48%))" }} />
                  </div>
                  <div className="flex justify-between">
                    <p className="text-[10px] text-muted-foreground">{Math.round(pct)}%</p>
                    <p className="text-[10px] text-primary font-semibold">{formatCompact(goal.current_amount)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Rewards ─── */}
      {rewards.length > 0 && (
        <div className="mb-5 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center justify-between mb-3.5 px-5">
            <h3 className="text-[13px] font-bold tracking-[-0.2px] flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" /> Rewards
            </h3>
            <button onClick={() => { haptic.light(); navigate("/rewards"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-70 transition-opacity">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {rewards.map(r => (
              <button
                key={r.id}
                onClick={() => { haptic.light(); navigate(`/rewards/${r.id}`); }}
                className="min-w-[200px] rounded-2xl border border-border/40 overflow-hidden active:scale-[0.97] transition-all bg-card/40 backdrop-blur-sm"
              >
                {r.image_url ? (
                  <div className="w-full h-24 overflow-hidden">
                    <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-24 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(42 78% 55% / 0.08), transparent)" }}>
                    <Gift className="w-8 h-8 text-primary/30" />
                  </div>
                )}
                <div className="p-3.5">
                  <p className="text-[11px] font-semibold truncate">{r.title}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{r.description || "Limited time offer"}</p>
                  <div className="mt-2 inline-flex px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold border border-primary/15">
                    {r.discount_type === "percentage" ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Recent Activity ─── */}
      <div className="px-5 mb-5 animate-fade-in" style={{ animationDelay: "0.45s" }}>
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-[13px] font-bold tracking-[-0.2px] flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Recent Activity
          </h3>
          <button onClick={() => { haptic.light(); navigate("/activity"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-70 transition-opacity">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-14 rounded-[24px] border border-border/40 bg-card/40 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-muted/15 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">No transactions yet</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">Start by adding money to your wallet</p>
          </div>
        ) : (
          <div className="rounded-[24px] border border-border/40 overflow-hidden bg-card/40 backdrop-blur-sm">
            {transactions.map((tx, idx) => (
              <button
                key={tx.id}
                onClick={() => { haptic.light(); navigate(`/transaction/${tx.id}`); }}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-all duration-200 active:bg-muted/8 ${idx < transactions.length - 1 ? "border-b border-border/20" : ""}`}
              >
                <div className="w-11 h-11 rounded-2xl bg-muted/10 flex items-center justify-center text-lg shrink-0 border border-border/20">
                  {categoryIcons[tx.category || "other"] || "💸"}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[12px] font-semibold truncate">{tx.merchant_name || tx.category || "Transaction"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {tx.category || "other"} · {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-[13px] font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                    {tx.type === "credit" ? "+" : "-"}{formatCompact(tx.amount)}
                  </p>
                  <p className={`text-[9px] font-medium mt-0.5 ${tx.status === "success" ? "text-success/60" : "text-warning/60"}`}>
                    {tx.status === "success" ? "Completed" : tx.status}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Refer & Earn ─── */}
      <div className="px-5 mb-5 animate-fade-in" style={{ animationDelay: "0.5s" }}>
        <button
          onClick={() => {
            haptic.medium();
            const shareText = "Hey! Join AuroPay and we both get ₹100! Download now 🎁";
            navigator.share?.({ text: shareText }).catch(() => {
              navigator.clipboard.writeText(shareText);
              toast.success("Referral link copied!");
            });
          }}
          className="w-full relative overflow-hidden rounded-[24px] border border-primary/15 p-5 text-left active:scale-[0.98] transition-transform bg-card/40 backdrop-blur-sm"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: "hsl(42 78% 55%)" }} />
          <div className="absolute top-3 right-14 w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
          <div className="absolute top-8 right-6 w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: "0.5s" }} />

          <div className="relative z-10 flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-[15px] font-bold leading-snug mb-0.5">
                Invite & Earn ₹20
              </h3>
              <p className="text-[11px] text-muted-foreground mb-3">Your friend gets ₹20 too after first spend</p>
              <div className="inline-flex items-center gap-2 gradient-primary text-primary-foreground px-4 py-2.5 rounded-xl shadow-[0_4px_16px_hsl(42_78%_55%/0.3)]">
                <Send className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Invite Now</span>
              </div>
            </div>
            <div className="relative w-16 h-16 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                <span className="text-3xl">🎁</span>
              </div>
              <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-lg animate-bounce" style={{ animationDuration: "2s" }}>
                ₹
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* ─── Explore More ─── */}
      <div className="px-5 mb-8 animate-fade-in" style={{ animationDelay: "0.55s" }}>
        <h3 className="text-[13px] font-bold tracking-[-0.2px] mb-3.5">Explore</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { haptic.light(); navigate("/savings"); }}
            className="rounded-2xl p-4 border border-border/40 overflow-hidden relative active:scale-[0.97] transition-all bg-card/40 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.08] blur-xl" style={{ background: "hsl(152 60% 45%)" }} />
            <span className="text-2xl mb-2.5 block">🏦</span>
            <p className="text-[12px] font-semibold mb-0.5">Save & Invest</p>
            <p className="text-[10px] text-muted-foreground">Set savings goals</p>
          </button>
          <button onClick={() => { haptic.light(); navigate("/rewards"); }}
            className="rounded-2xl p-4 border border-border/40 overflow-hidden relative active:scale-[0.97] transition-all bg-card/40 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.08] blur-xl" style={{ background: "hsl(42 78% 55%)" }} />
            <span className="text-2xl mb-2.5 block">🎟️</span>
            <p className="text-[12px] font-semibold mb-0.5">Earn Rewards</p>
            <p className="text-[10px] text-muted-foreground">Exclusive deals</p>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default TeenHome;
