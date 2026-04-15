import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, QrCode, Plus, Clock, Eye, EyeOff,
  Target, TrendingUp, ArrowUpRight, ArrowDownLeft,
  CreditCard, Send, ChevronRight,
  Wallet, Zap, BarChart3, Gift, Users, PieChart, Star,
  Search, RefreshCw, Wifi, Droplets, Lightbulb, Receipt,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Profile { full_name: string; avatar_url: string | null; kyc_status: string | null; phone: string | null; }
interface WalletData { id: string; balance: number; daily_limit: number; monthly_limit: number; spent_today: number; spent_this_month: number; is_frozen: boolean; }
interface Transaction { id: string; type: string; amount: number; merchant_name: string | null; category: string | null; status: string; created_at: string; }
interface SavingsGoal { id: string; title: string; target_amount: number; current_amount: number; icon: string | null; }
interface Reward { id: string; title: string; description: string | null; discount_value: number; discount_type: string; image_url: string | null; category: string | null; }
interface QuickPayFav { id: string; contact_name: string; avatar_emoji: string; }

const catEmoji: Record<string, string> = { food: "🍔", transport: "🚗", education: "📚", shopping: "🛍️", entertainment: "🎮", other: "💸" };

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
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, enabled]);
  return value;
};

const SpringIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <div className={className} style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both` }}>
    {children}
  </div>
);

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
      const { data: txns } = await supabase.from("transactions").select("*").eq("wallet_id", walletRes.data.id).order("created_at", { ascending: false }).limit(5);
      if (txns) setTransactions(txns as Transaction[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (!wallet?.id) return;
    const ch = supabase.channel("wallet-changes").on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `id=eq.${wallet.id}` }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [wallet?.id]);

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const firstName = profile?.full_name?.split(" ")[0] || "";
  const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;
  const animBal = useCountUp(wallet?.balance || 0, 1200, showBalance);
  const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening"; };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-5 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 rounded-2xl bg-muted/30 animate-pulse" /><div className="space-y-2"><div className="w-24 h-3 rounded-full bg-muted/30 animate-pulse" /><div className="w-36 h-4 rounded-full bg-muted/30 animate-pulse" /></div></div>
        <div className="w-full h-48 rounded-[28px] bg-muted/20 animate-pulse mb-5" />
        <div className="grid grid-cols-4 gap-3 mb-5">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-muted/20 animate-pulse" />)}</div>
        {[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-2xl bg-muted/20 animate-pulse mb-3" />)}
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "Add Money", path: "/add-money", color: "hsl(152 60% 45%)" },
    { icon: Send, label: "Send", path: "/quick-pay", color: "hsl(42 78% 55%)" },
    { icon: TrendingUp, label: "Analytics", path: "/analytics", color: "hsl(210 80% 55%)" },
    { icon: Target, label: "Savings", path: "/savings", color: "hsl(270 60% 55%)" },
  ];

  const billPayments = [
    { icon: Lightbulb, label: "Electricity", emoji: "⚡", color: "hsl(48 90% 55%)" },
    { icon: Droplets, label: "Water", emoji: "💧", color: "hsl(200 80% 55%)" },
    { icon: Wifi, label: "Broadband", emoji: "📡", color: "hsl(160 60% 50%)" },
    { icon: Receipt, label: "More", emoji: "📋", color: "hsl(42 78% 55%)" },
  ];

  const allFeatures = [
    { label: "My Card", path: "/card", emoji: "💳" },
    { label: "Analytics", path: "/analytics", emoji: "📊" },
    { label: "Split Bill", path: "/bill-split", emoji: "👥" },
    { label: "Budget", path: "/budget", emoji: "📈" },
    { label: "Quick Pay", path: "/quick-pay", emoji: "⚡" },
    { label: "Recurring", path: "/quick-pay", emoji: "🔄" },
  ];

  const moneyIn = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const moneyOut = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const spendPct = wallet ? Math.min(((wallet.spent_this_month || 0) / (wallet.monthly_limit || 1)) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ─── Top Bar ─── */}
      <div className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-[0.05] blur-[80px]" style={{ background: "hsl(42 78% 55%)" }} />
        <SpringIn delay={0} className="relative z-10 px-5 pt-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <button onClick={() => { haptic.light(); navigate("/profile"); }} className="shrink-0 group">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/[0.06] group-active:scale-90 transition-transform" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-[0_8px_24px_hsl(42_78%_55%/0.25)] group-active:scale-90 transition-transform">
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-background" />
                </div>
              </button>
              <div>
                <p className="text-[11px] text-muted-foreground/70 font-medium">{greet()} 👋</p>
                <h1 className="text-[17px] font-bold tracking-[-0.3px]">{firstName || "User"}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { haptic.light(); navigate("/quick-pay"); }} className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
                <Search className="w-[17px] h-[17px] text-muted-foreground/70" />
              </button>
              <button onClick={() => { haptic.light(); navigate("/notifications"); }} className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center active:scale-90 transition-all relative">
                <Bell className="w-[17px] h-[17px] text-muted-foreground/70" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shadow-[0_2px_12px_hsl(42_78%_55%/0.5)]" style={{ animation: "glow-pulse 2s ease-in-out infinite" }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </SpringIn>
      </div>

      {/* ─── Balance Card ─── */}
      <SpringIn delay={0.06} className="px-5 mb-5">
        <div className="relative rounded-[28px] overflow-hidden" style={{ background: "linear-gradient(165deg, hsl(220 18% 11%), hsl(220 20% 5%))" }}>
          {/* Ambient effects */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.06] blur-[40px]" style={{ background: "hsl(42 78% 55%)", animation: "float-up 4s ease-in-out infinite" }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-[0.03] blur-[30px]" style={{ background: "hsl(42 78% 65%)", animation: "float-up 5s ease-in-out infinite 1s" }} />

          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] text-white/30 font-semibold tracking-[0.15em] uppercase mb-2.5">Total Balance</p>
                <button
                  onClick={(e) => { e.stopPropagation(); haptic.selection(); setShowBalance(!showBalance); }}
                  className="flex items-center gap-2.5 active:opacity-60 transition-opacity"
                >
                  {showBalance ? (
                    <h2 className="text-[34px] font-bold tracking-[-1.5px] tabular-nums leading-none">{fmt(animBal)}</h2>
                  ) : (
                    <h2 className="text-[34px] font-bold tracking-[3px] text-white/25 leading-none">•••••</h2>
                  )}
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center mt-1">
                    {showBalance ? <EyeOff className="w-4 h-4 text-white/40" /> : <Eye className="w-4 h-4 text-white/40" />}
                  </div>
                </button>
              </div>
              <button
                onClick={() => { haptic.medium(); navigate("/scan"); }}
                className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-[0_8px_30px_hsl(42_78%_55%/0.35)] active:scale-90 transition-transform"
                style={{ animation: "float-up 3s ease-in-out infinite" }}
              >
                <QrCode className="w-7 h-7 text-primary-foreground" strokeWidth={1.8} />
              </button>
            </div>

            {wallet?.is_frozen && (
              <div className="mb-4 px-3 py-2 bg-destructive/8 rounded-xl inline-flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-[11px] font-semibold text-destructive/80">Wallet Frozen</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3 bg-success/[0.04]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-success/10 flex items-center justify-center">
                    <ArrowDownLeft className="w-3 h-3 text-success" />
                  </div>
                  <span className="text-[10px] text-white/30 font-medium">Income</span>
                </div>
                <p className="text-[14px] font-bold text-success tabular-nums">{fmt(moneyIn)}</p>
              </div>
              <div className="rounded-2xl p-3 bg-destructive/[0.04]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-destructive/10 flex items-center justify-center">
                    <ArrowUpRight className="w-3 h-3 text-destructive" />
                  </div>
                  <span className="text-[10px] text-white/30 font-medium">Expense</span>
                </div>
                <p className="text-[14px] font-bold text-destructive tabular-nums">{fmt(moneyOut)}</p>
              </div>
            </div>
          </div>
        </div>
      </SpringIn>

      {/* ─── Quick Actions ─── */}
      <SpringIn delay={0.12} className="px-5 mb-6">
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((a, i) => (
            <button
              key={a.label}
              onClick={() => { haptic.light(); navigate(a.path); }}
              className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white/[0.02] active:scale-90 active:bg-white/[0.05] transition-all duration-200 group"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all group-active:shadow-lg"
                style={{ background: `${a.color}15`, boxShadow: `0 0 0 0px ${a.color}00`, transition: "box-shadow 0.3s" }}
              >
                <a.icon className="w-5 h-5" style={{ color: a.color }} strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-semibold text-white/50">{a.label}</span>
            </button>
          ))}
        </div>
      </SpringIn>

      {/* ─── Bill Payments ─── */}
      <SpringIn delay={0.16} className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold tracking-[-0.2px]">Bill Payments</h3>
          <button className="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-60 transition-opacity">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {billPayments.map((bp) => (
            <button
              key={bp.label}
              onClick={() => { haptic.light(); toast.info(`${bp.label} bill payment coming soon!`); }}
              className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white/[0.02] active:scale-90 active:bg-white/[0.05] transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${bp.color}12` }}>
                <span className="text-xl">{bp.emoji}</span>
              </div>
              <span className="text-[10px] font-semibold text-white/50">{bp.label}</span>
            </button>
          ))}
        </div>
      </SpringIn>

      {/* ─── Quick Pay Contacts ─── */}
      {favorites.length > 0 && (
        <SpringIn delay={0.2} className="mb-6">
          <div className="flex items-center justify-between mb-3 px-5">
            <h3 className="text-[13px] font-bold tracking-[-0.2px]">People</h3>
            <button onClick={() => { haptic.light(); navigate("/quick-pay"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-60 transition-opacity">
              See All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto px-5 pb-1">
            {favorites.map(fav => (
              <button key={fav.id} onClick={() => { haptic.light(); navigate("/quick-pay"); }}
                className="flex flex-col items-center gap-2 min-w-[60px] active:scale-90 transition-all">
                <div className="w-[52px] h-[52px] rounded-2xl bg-white/[0.04] flex items-center justify-center text-2xl">
                  {fav.avatar_emoji}
                </div>
                <span className="text-[10px] text-white/40 font-medium truncate w-full text-center">{fav.contact_name.split(" ")[0]}</span>
              </button>
            ))}
            <button onClick={() => { haptic.light(); navigate("/quick-pay"); }}
              className="flex flex-col items-center gap-2 min-w-[60px] active:scale-90 transition-all">
              <div className="w-[52px] h-[52px] rounded-2xl bg-primary/[0.06] flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary/60" />
              </div>
              <span className="text-[10px] text-primary/60 font-semibold">Add</span>
            </button>
          </div>
        </SpringIn>
      )}

      {/* ─── Services Grid ─── */}
      <SpringIn delay={0.24} className="px-5 mb-6">
        <h3 className="text-[13px] font-bold tracking-[-0.2px] mb-3">Services</h3>
        <div className="grid grid-cols-3 gap-2">
          {allFeatures.map((f) => (
            <button
              key={f.label}
              onClick={() => { haptic.light(); navigate(f.path); }}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/[0.02] active:scale-90 active:bg-white/[0.05] transition-all duration-200"
            >
              <span className="text-2xl">{f.emoji}</span>
              <span className="text-[10px] font-semibold text-white/40">{f.label}</span>
            </button>
          ))}
        </div>
      </SpringIn>

      {/* ─── Monthly Spending ─── */}
      <SpringIn delay={0.28} className="px-5 mb-6">
        <div className="rounded-[24px] p-5" style={{ background: "linear-gradient(160deg, hsl(220 18% 10%), hsl(220 20% 6%))" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-[0_4px_12px_hsl(42_78%_55%/0.2)]">
                <Wallet className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-[13px] font-bold">Monthly Spending</span>
            </div>
            <span className="text-[10px] text-white/25 px-2.5 py-1 rounded-full bg-white/[0.04]">
              {new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </span>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-end mb-2.5">
              <div>
                <p className="text-[24px] font-bold tabular-nums tracking-[-0.5px]">{fmt(wallet?.spent_this_month || 0)}</p>
                <p className="text-[10px] text-white/25">of {fmt(wallet?.monthly_limit || 0)} limit</p>
              </div>
              <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${
                spendPct > 80 ? "bg-destructive/8 text-destructive" : spendPct > 50 ? "bg-warning/8 text-warning" : "bg-success/8 text-success"
              }`}>
                {Math.round(spendPct)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
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

          <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary/60" />
              <span className="text-[10px] text-white/30">Today's spending</span>
            </div>
            <span className="text-[11px] font-bold tabular-nums text-white/60">{fmt(wallet?.spent_today || 0)} / {fmt(wallet?.daily_limit || 0)}</span>
          </div>
        </div>
      </SpringIn>

      {/* ─── Savings Goals ─── */}
      {goals.length > 0 && (
        <SpringIn delay={0.32} className="mb-6">
          <div className="flex items-center justify-between mb-3 px-5">
            <h3 className="text-[13px] font-bold tracking-[-0.2px] flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Savings Goals
            </h3>
            <button onClick={() => { haptic.light(); navigate("/savings"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-60">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-1">
            {goals.map(goal => {
              const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
              return (
                <button key={goal.id} onClick={() => { haptic.light(); navigate("/savings"); }}
                  className="min-w-[145px] p-4 rounded-2xl active:scale-95 transition-all bg-white/[0.02]">
                  <div className="text-2xl mb-2">{goal.icon || "🎯"}</div>
                  <p className="text-[12px] font-semibold truncate mb-2">{goal.title}</p>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 48%))" }} />
                  </div>
                  <div className="flex justify-between">
                    <p className="text-[10px] text-white/25">{Math.round(pct)}%</p>
                    <p className="text-[10px] text-primary font-semibold">{fmt(goal.current_amount)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </SpringIn>
      )}

      {/* ─── Rewards ─── */}
      {rewards.length > 0 && (
        <SpringIn delay={0.36} className="mb-6">
          <div className="flex items-center justify-between mb-3 px-5">
            <h3 className="text-[13px] font-bold tracking-[-0.2px] flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" /> Rewards
            </h3>
            <button onClick={() => { haptic.light(); navigate("/rewards"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-60">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-1">
            {rewards.map(r => (
              <button key={r.id} onClick={() => { haptic.light(); navigate(`/rewards/${r.id}`); }}
                className="min-w-[190px] rounded-2xl overflow-hidden active:scale-[0.97] transition-all bg-white/[0.02]">
                {r.image_url ? (
                  <div className="w-full h-24 overflow-hidden"><img src={r.image_url} alt={r.title} className="w-full h-full object-cover" /></div>
                ) : (
                  <div className="w-full h-24 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(42 78% 55% / 0.06), transparent)" }}>
                    <Gift className="w-8 h-8 text-primary/20" />
                  </div>
                )}
                <div className="p-3.5">
                  <p className="text-[11px] font-semibold truncate">{r.title}</p>
                  <p className="text-[9px] text-white/25 mt-0.5 truncate">{r.description || "Limited time offer"}</p>
                  <div className="mt-2 inline-flex px-2.5 py-1 rounded-lg bg-primary/8 text-primary text-[10px] font-bold">
                    {r.discount_type === "percentage" ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SpringIn>
      )}

      {/* ─── Recent Activity ─── */}
      <SpringIn delay={0.4} className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold tracking-[-0.2px] flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Recent Activity
          </h3>
          <button onClick={() => { haptic.light(); navigate("/activity"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-60">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-14 rounded-[24px] bg-white/[0.02]">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-white/15" />
            </div>
            <p className="text-sm font-semibold text-white/30">No transactions yet</p>
            <p className="text-[11px] text-white/15 mt-1">Start by adding money to your wallet</p>
          </div>
        ) : (
          <div className="rounded-[24px] overflow-hidden" style={{ background: "linear-gradient(160deg, hsl(220 18% 10%), hsl(220 20% 6%))" }}>
            {transactions.map((tx, idx) => (
              <button
                key={tx.id}
                onClick={() => { haptic.light(); navigate(`/transaction/${tx.id}`); }}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-all duration-200 active:bg-white/[0.03] ${idx < transactions.length - 1 ? "border-b border-white/[0.03]" : ""}`}
              >
                <div className="w-11 h-11 rounded-2xl bg-white/[0.04] flex items-center justify-center text-lg shrink-0">
                  {catEmoji[tx.category || "other"] || "💸"}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[12px] font-semibold truncate">{tx.merchant_name || tx.category || "Transaction"}</p>
                  <p className="text-[10px] text-white/25 capitalize mt-0.5">
                    {tx.category || "other"} · {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-[13px] font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                    {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                  </p>
                  <p className={`text-[9px] font-medium mt-0.5 ${tx.status === "success" ? "text-success/40" : "text-warning/40"}`}>
                    {tx.status === "success" ? "Completed" : tx.status}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </SpringIn>

      {/* ─── Refer & Earn ─── */}
      <SpringIn delay={0.44} className="px-5 mb-6">
        <button
          onClick={() => {
            haptic.medium();
            const txt = "Hey! Join AuroPay and we both get ₹100! Download now 🎁";
            navigator.share?.({ text: txt }).catch(() => { navigator.clipboard.writeText(txt); toast.success("Referral link copied!"); });
          }}
          className="w-full relative overflow-hidden rounded-[24px] p-5 text-left active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(160deg, hsl(220 18% 10%), hsl(220 20% 6%))" }}
        >
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-[50px] opacity-[0.12]" style={{ background: "hsl(42 78% 55%)" }} />

          <div className="relative z-10 flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-[15px] font-bold leading-snug mb-0.5">Invite & Earn ₹20</h3>
              <p className="text-[11px] text-white/30 mb-3">Your friend gets ₹20 too after first spend</p>
              <div className="inline-flex items-center gap-2 gradient-primary text-primary-foreground px-4 py-2.5 rounded-xl shadow-[0_4px_20px_hsl(42_78%_55%/0.25)]">
                <Send className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Invite Now</span>
              </div>
            </div>
            <div className="relative w-14 h-14 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-primary/[0.06] flex items-center justify-center">
                <span className="text-3xl" style={{ animation: "float-up 2.5s ease-in-out infinite" }}>🎁</span>
              </div>
            </div>
          </div>
        </button>
      </SpringIn>

      {/* ─── Explore ─── */}
      <SpringIn delay={0.48} className="px-5 mb-8">
        <h3 className="text-[13px] font-bold tracking-[-0.2px] mb-3">Explore</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { haptic.light(); navigate("/savings"); }}
            className="rounded-2xl p-4 overflow-hidden relative active:scale-[0.97] transition-all bg-white/[0.02]">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06] blur-2xl" style={{ background: "hsl(152 60% 45%)" }} />
            <span className="text-2xl mb-2.5 block" style={{ animation: "float-up 3s ease-in-out infinite 0.5s" }}>🏦</span>
            <p className="text-[12px] font-semibold mb-0.5">Save & Invest</p>
            <p className="text-[10px] text-white/25">Set savings goals</p>
          </button>
          <button onClick={() => { haptic.light(); navigate("/rewards"); }}
            className="rounded-2xl p-4 overflow-hidden relative active:scale-[0.97] transition-all bg-white/[0.02]">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06] blur-2xl" style={{ background: "hsl(42 78% 55%)" }} />
            <span className="text-2xl mb-2.5 block" style={{ animation: "float-up 3s ease-in-out infinite 1s" }}>🎟️</span>
            <p className="text-[12px] font-semibold mb-0.5">Earn Rewards</p>
            <p className="text-[10px] text-white/25">Exclusive deals</p>
          </button>
        </div>
      </SpringIn>

      <BottomNav />
    </div>
  );
};

export default TeenHome;
