import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, QrCode, Plus, Clock, Eye, EyeOff,
  Target, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Send, ChevronRight, Wallet, Zap, Gift,
  Search, Wifi, Droplets, Lightbulb, Receipt,
  Shield, Sparkles, ArrowRight, CreditCard, Users,
  BarChart3, RefreshCw, Activity,
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

  const moneyIn = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const moneyOut = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const spendPct = wallet ? Math.min(((wallet.spent_this_month || 0) / (wallet.monthly_limit || 1)) * 100, 100) : 0;

  // Financial health score (simple heuristic)
  const healthScore = Math.min(100, Math.max(0,
    100 - spendPct * 0.4
    + (goals.length > 0 ? 15 : 0)
    + (moneyIn > moneyOut ? 20 : 0)
  ));
  const healthColor = healthScore >= 70 ? "hsl(152 60% 45%)" : healthScore >= 40 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)";
  const healthLabel = healthScore >= 70 ? "Excellent" : healthScore >= 40 ? "Good" : "Needs Attention";

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-5 pt-14 pb-24">
        <div className="flex items-center gap-3 mb-8"><div className="w-12 h-12 rounded-2xl bg-white/[0.04] animate-pulse" /><div className="space-y-2"><div className="w-24 h-3 rounded-full bg-white/[0.04] animate-pulse" /><div className="w-36 h-4 rounded-full bg-white/[0.04] animate-pulse" /></div></div>
        <div className="w-full h-52 rounded-[32px] bg-white/[0.03] animate-pulse mb-6" />
        <div className="grid grid-cols-4 gap-3 mb-6">{[1,2,3,4].map(i => <div key={i} className="h-[76px] rounded-2xl bg-white/[0.03] animate-pulse" />)}</div>
        {[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-2xl bg-white/[0.03] animate-pulse mb-3" />)}
        <BottomNav />
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "Add Money", path: "/add-money", gradient: "from-[hsl(152_60%_45%)] to-[hsl(152_50%_35%)]", glow: "hsl(152 60% 45%)" },
    { icon: Send, label: "Send", path: "/quick-pay", gradient: "from-primary to-accent", glow: "hsl(42 78% 55%)" },
    { icon: TrendingUp, label: "Analytics", path: "/analytics", gradient: "from-[hsl(210_80%_55%)] to-[hsl(210_70%_40%)]", glow: "hsl(210 80% 55%)" },
    { icon: Target, label: "Savings", path: "/savings", gradient: "from-[hsl(270_60%_55%)] to-[hsl(270_50%_40%)]", glow: "hsl(270 60% 55%)" },
  ];

  const billPayments = [
    { label: "Electricity", emoji: "⚡", color: "hsl(48 90% 55%)" },
    { label: "Water", emoji: "💧", color: "hsl(200 80% 55%)" },
    { label: "Broadband", emoji: "📡", color: "hsl(160 60% 50%)" },
    { label: "More", emoji: "📋", color: "hsl(42 78% 55%)" },
  ];

  const allFeatures = [
    { label: "My Card", path: "/card", emoji: "💳", desc: "Virtual card" },
    { label: "Analytics", path: "/analytics", emoji: "📊", desc: "Track trends" },
    { label: "Split Bill", path: "/bill-split", emoji: "👥", desc: "Share costs" },
    { label: "Budget", path: "/budget", emoji: "📈", desc: "Plan ahead" },
    { label: "Quick Pay", path: "/quick-pay", emoji: "⚡", desc: "Fast transfer" },
    { label: "Recurring", path: "/quick-pay", emoji: "🔄", desc: "Auto-pay" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      {/* ─── Ultra-Premium Ambient Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[120px]" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute top-1/4 -left-40 w-[350px] h-[350px] rounded-full opacity-[0.025] blur-[100px]" style={{ background: "hsl(210 80% 55%)" }} />
        <div className="absolute bottom-1/3 right-0 w-[300px] h-[300px] rounded-full opacity-[0.02] blur-[90px]" style={{ background: "hsl(152 60% 45%)" }} />
        <div className="absolute top-1/2 left-1/3 w-[200px] h-[200px] rounded-full opacity-[0.015] blur-[80px]" style={{ background: "hsl(270 60% 55%)", animation: "glow-pulse 6s ease-in-out infinite" }} />
        {/* Mesh grid overlay */}
        <div className="absolute inset-0 opacity-[0.008]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(42 78% 55%) 0.5px, transparent 0)`,
          backgroundSize: "48px 48px"
        }} />
      </div>

      <div className="relative z-10">
        {/* ─── Status Bar Safe Area ─── */}
        <div className="h-2" />

        {/* ─── Header ─── */}
        <SpringIn delay={0} className="px-5 pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <button onClick={() => { haptic.light(); navigate("/profile"); }} className="shrink-0 group">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-[48px] h-[48px] rounded-[18px] object-cover ring-[1.5px] ring-white/[0.08] group-active:scale-90 transition-transform" />
                  ) : (
                    <div className="w-[48px] h-[48px] rounded-[18px] gradient-primary flex items-center justify-center text-[14px] font-bold text-primary-foreground shadow-[0_8px_28px_hsl(42_78%_55%/0.3)] group-active:scale-90 transition-transform">
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full bg-[hsl(152_60%_45%)] border-[2.5px] border-background" style={{ boxShadow: "0 0 8px hsl(152 60% 45% / 0.5)" }} />
                </div>
              </button>
              <div>
                <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">{greet()} 👋</p>
                <h1 className="text-[18px] font-bold tracking-[-0.4px] text-foreground">{firstName || "User"}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={() => { haptic.light(); navigate("/quick-pay"); }} className="w-[42px] h-[42px] rounded-[14px] bg-white/[0.03] backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]">
                <Search className="w-[18px] h-[18px] text-muted-foreground/60" />
              </button>
              <button onClick={() => { haptic.light(); navigate("/notifications"); }} className="w-[42px] h-[42px] rounded-[14px] bg-white/[0.03] backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all relative border border-white/[0.04]">
                <Bell className="w-[18px] h-[18px] text-muted-foreground/60" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shadow-[0_2px_16px_hsl(42_78%_55%/0.6)]" style={{ animation: "glow-pulse 2s ease-in-out infinite" }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </SpringIn>

        {/* ─── Balance Card — Ultra Premium ─── */}
        <SpringIn delay={0.05} className="px-5 mb-5">
          <div className="relative rounded-[28px] overflow-hidden" style={{ boxShadow: "0 20px 60px -15px hsl(42 78% 55% / 0.08), 0 0 0 1px hsl(42 30% 30% / 0.08)" }}>
            {/* Card background with mesh gradient */}
            <div className="absolute inset-0" style={{
              background: `
                radial-gradient(ellipse 80% 60% at 80% 10%, hsl(42 78% 55% / 0.1) 0%, transparent 60%),
                radial-gradient(ellipse 50% 40% at 15% 85%, hsl(210 80% 55% / 0.05) 0%, transparent 50%),
                radial-gradient(ellipse 40% 30% at 50% 50%, hsl(42 78% 55% / 0.02) 0%, transparent 50%),
                linear-gradient(165deg, hsl(220 22% 11%), hsl(220 24% 5%))
              `
            }} />
            {/* Noise texture */}
            <div className="absolute inset-0 opacity-[0.015] noise-overlay" />
            {/* Shimmer line top */}
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent 10%, hsl(42 78% 55% / 0.2) 50%, transparent 90%)" }} />
            {/* Bottom subtle border */}
            <div className="absolute bottom-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent 20%, hsl(42 78% 55% / 0.06) 50%, transparent 80%)" }} />

            <div className="relative z-10 p-6 pb-5">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-[6px] h-[6px] rounded-full bg-primary" style={{ boxShadow: "0 0 10px hsl(42 78% 55% / 0.7), 0 0 20px hsl(42 78% 55% / 0.3)", animation: "glow-pulse 2.5s ease-in-out infinite" }} />
                    <p className="text-[10px] text-white/25 font-semibold tracking-[0.2em] uppercase">Available Balance</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); haptic.selection(); setShowBalance(!showBalance); }}
                    className="flex items-center gap-3 active:opacity-60 transition-opacity"
                  >
                    {showBalance ? (
                      <h2 className="text-[40px] font-bold tracking-[-2px] tabular-nums leading-none" style={{ textShadow: "0 0 40px hsl(42 78% 55% / 0.08)" }}>{fmt(animBal)}</h2>
                    ) : (
                      <h2 className="text-[40px] font-bold tracking-[4px] text-white/15 leading-none select-none">•••••</h2>
                    )}
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center mt-1 backdrop-blur-sm border border-white/[0.04] hover:bg-white/[0.08] transition-colors">
                      {showBalance ? <EyeOff className="w-[15px] h-[15px] text-white/30" /> : <Eye className="w-[15px] h-[15px] text-white/30" />}
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => { haptic.medium(); navigate("/scan"); }}
                  className="w-[56px] h-[56px] rounded-[20px] gradient-primary flex items-center justify-center active:scale-90 transition-transform"
                  style={{ boxShadow: "0 8px 32px hsl(42 78% 55% / 0.35), 0 2px 8px hsl(42 78% 55% / 0.2), inset 0 1px 0 hsl(48 90% 70% / 0.3)", animation: "float-up 3s ease-in-out infinite" }}
                >
                  <QrCode className="w-[26px] h-[26px] text-primary-foreground" strokeWidth={1.8} />
                </button>
              </div>

              {wallet?.is_frozen && (
                <div className="mb-4 px-3.5 py-2 bg-destructive/[0.06] rounded-xl inline-flex items-center gap-2 border border-destructive/10">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-[11px] font-semibold text-destructive/80">Wallet Frozen</span>
                </div>
              )}

              {/* Income / Expense Pills */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[16px] px-4 py-3 bg-[hsl(152_60%_45%/0.04)] border border-[hsl(152_60%_45%/0.06)] backdrop-blur-sm hover:bg-[hsl(152_60%_45%/0.06)] transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-[22px] h-[22px] rounded-[7px] bg-[hsl(152_60%_45%/0.12)] flex items-center justify-center">
                      <ArrowDownLeft className="w-3 h-3 text-[hsl(152_60%_45%)]" />
                    </div>
                    <span className="text-[10px] text-white/25 font-medium tracking-wide">Income</span>
                  </div>
                  <p className="text-[15px] font-bold text-[hsl(152_60%_45%)] tabular-nums">{fmt(moneyIn)}</p>
                </div>
                <div className="rounded-[16px] px-4 py-3 bg-destructive/[0.04] border border-destructive/[0.06] backdrop-blur-sm hover:bg-destructive/[0.06] transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-[22px] h-[22px] rounded-[7px] bg-destructive/[0.12] flex items-center justify-center">
                      <ArrowUpRight className="w-3 h-3 text-destructive" />
                    </div>
                    <span className="text-[10px] text-white/25 font-medium tracking-wide">Expense</span>
                  </div>
                  <p className="text-[15px] font-bold text-destructive tabular-nums">{fmt(moneyOut)}</p>
                </div>
              </div>
            </div>
          </div>
        </SpringIn>

        {/* ─── Quick Actions — Premium Glassmorphism ─── */}
        <SpringIn delay={0.1} className="px-5 mb-6">
          <div className="grid grid-cols-4 gap-2.5">
            {quickActions.map((a, i) => (
              <button
                key={a.label}
                onClick={() => { haptic.light(); navigate(a.path); }}
                className="flex flex-col items-center gap-2.5 py-3.5 rounded-[20px] bg-white/[0.02] active:scale-[0.88] transition-all duration-300 group border border-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.04]"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center transition-all duration-300 group-active:shadow-[0_0_24px_var(--glow)] group-hover:scale-110"
                  style={{
                    background: `${a.glow}10`,
                    "--glow": `${a.glow}50`,
                    boxShadow: `0 4px 12px ${a.glow}08`,
                  } as React.CSSProperties}
                >
                  <a.icon className="w-[20px] h-[20px]" style={{ color: a.glow }} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-semibold text-white/45 group-hover:text-white/60 transition-colors">{a.label}</span>
              </button>
            ))}
          </div>
        </SpringIn>

        {/* ─── Spending Insights (AI-powered) ─── */}
        <SpringIn delay={0.12} className="px-5 mb-6">
          <div className="relative rounded-[24px] overflow-hidden border border-white/[0.03]" style={{
            background: `
              radial-gradient(ellipse 60% 50% at 85% 15%, hsl(270 60% 55% / 0.05) 0%, transparent 60%),
              linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))
            `
          }}>
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(270 60% 55% / 0.2), transparent)" }} />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: "hsl(270 60% 55% / 0.1)" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "hsl(270 60% 55%)" }} />
                </div>
                <div>
                  <span className="text-[12px] font-bold block">Spending Insights</span>
                  <span className="text-[9px] text-white/20">AI-powered analysis</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {(() => {
                  const insights: { text: string; emoji: string; type: "up" | "down" | "info" }[] = [];
                  const foodTxns = transactions.filter(t => t.category === "food" && t.type === "debit");
                  const totalSpent = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
                  if (foodTxns.length > 0) {
                    const foodTotal = foodTxns.reduce((s, t) => s + t.amount, 0);
                    const foodPct = totalSpent > 0 ? Math.round((foodTotal / totalSpent) * 100) : 0;
                    insights.push({ text: `Food takes ${foodPct}% of your spending`, emoji: "🍔", type: foodPct > 40 ? "up" : "info" });
                  }
                  if (moneyOut > moneyIn) {
                    insights.push({ text: `You spent ${fmt(moneyOut - moneyIn)} more than you earned`, emoji: "📉", type: "up" });
                  } else if (moneyIn > 0) {
                    insights.push({ text: `Great! You saved ${fmt(moneyIn - moneyOut)} this period`, emoji: "🎉", type: "down" });
                  }
                  if (spendPct > 70) {
                    insights.push({ text: `${Math.round(spendPct)}% of monthly budget used — slow down!`, emoji: "⚠️", type: "up" });
                  } else if (spendPct < 30) {
                    insights.push({ text: `Only ${Math.round(spendPct)}% budget used — you're on track!`, emoji: "✅", type: "down" });
                  }
                  if (goals.length > 0) {
                    const avgProgress = goals.reduce((s, g) => s + (g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0), 0) / goals.length;
                    insights.push({ text: `Savings goals are ${Math.round(avgProgress)}% complete on average`, emoji: "🎯", type: avgProgress > 50 ? "down" : "info" });
                  }
                  if (insights.length === 0) {
                    insights.push({ text: "Start spending to get personalized insights", emoji: "💡", type: "info" });
                  }
                  return insights.slice(0, 3).map((insight, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-[14px] bg-white/[0.02] border border-white/[0.03]"
                      style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.08}s both` }}>
                      <span className="text-[18px]">{insight.emoji}</span>
                      <p className="text-[11px] text-white/45 font-medium flex-1">{insight.text}</p>
                      <div className={`w-2 h-2 rounded-full ${insight.type === "up" ? "bg-destructive" : insight.type === "down" ? "bg-[hsl(152_60%_45%)]" : "bg-primary/50"}`} />
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </SpringIn>

        {/* ─── Financial Health Score ─── */}
        <SpringIn delay={0.18} className="px-5 mb-6">
          <button
            onClick={() => { haptic.light(); navigate("/analytics"); }}
            className="w-full relative overflow-hidden rounded-[24px] p-5 text-left active:scale-[0.98] transition-all border border-white/[0.03]"
            style={{
              background: `
                radial-gradient(ellipse 50% 80% at 85% 20%, ${healthColor}08 0%, transparent 60%),
                linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))
              `
            }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${healthColor}20, transparent)` }} />

            <div className="flex items-center gap-4">
              {/* Circular score */}
              <div className="relative w-[64px] h-[64px] shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(220 15% 15%)" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r="26" fill="none"
                    stroke={healthColor}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${(healthScore / 100) * 163.36} 163.36`}
                    style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)", filter: `drop-shadow(0 0 6px ${healthColor}60)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[16px] font-bold tabular-nums" style={{ color: healthColor }}>{Math.round(healthScore)}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-3.5 h-3.5 text-primary/70" />
                  <span className="text-[10px] font-semibold text-white/25 tracking-[0.1em] uppercase">Financial Health</span>
                </div>
                <p className="text-[15px] font-bold mb-0.5" style={{ color: healthColor }}>{healthLabel}</p>
                <p className="text-[11px] text-white/25">Based on spending habits & savings</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/15 shrink-0" />
            </div>
          </button>
        </SpringIn>

        {/* ─── Bill Payments ─── */}
        <SpringIn delay={0.18} className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[14px] font-bold tracking-[-0.3px]">Bill Payments</h3>
            <button className="text-[11px] text-primary/80 font-semibold flex items-center gap-0.5 active:opacity-60 transition-opacity">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {billPayments.map((bp) => (
              <button
                key={bp.label}
                onClick={() => { haptic.light(); navigate("/bill-payments"); }}
                className="flex flex-col items-center gap-2.5 py-3.5 rounded-[20px] bg-white/[0.02] active:scale-[0.88] transition-all duration-300 border border-white/[0.03]"
              >
                <div className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center" style={{ background: `${bp.color}10` }}>
                  <span className="text-[22px]">{bp.emoji}</span>
                </div>
                <span className="text-[10px] font-semibold text-white/45">{bp.label}</span>
              </button>
            ))}
          </div>
        </SpringIn>

        {/* ─── Quick Pay Contacts ─── */}
        {favorites.length > 0 && (
          <SpringIn delay={0.22} className="mb-6">
            <div className="flex items-center justify-between mb-3.5 px-5">
              <h3 className="text-[14px] font-bold tracking-[-0.3px]">People</h3>
              <button onClick={() => { haptic.light(); navigate("/quick-pay"); }} className="text-[11px] text-primary/80 font-semibold flex items-center gap-0.5 active:opacity-60 transition-opacity">
                See All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {favorites.map(fav => (
                <button key={fav.id} onClick={() => { haptic.light(); navigate("/quick-pay"); }}
                  className="flex flex-col items-center gap-2.5 min-w-[62px] active:scale-90 transition-all group">
                  <div className="w-[54px] h-[54px] rounded-[18px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center text-[24px] group-active:border-primary/20 transition-colors">
                    {fav.avatar_emoji}
                  </div>
                  <span className="text-[10px] text-white/35 font-medium truncate w-full text-center">{fav.contact_name.split(" ")[0]}</span>
                </button>
              ))}
              <button onClick={() => { haptic.light(); navigate("/quick-pay"); }}
                className="flex flex-col items-center gap-2.5 min-w-[62px] active:scale-90 transition-all">
                <div className="w-[54px] h-[54px] rounded-[18px] bg-primary/[0.04] border border-primary/[0.08] flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-primary/50" />
                </div>
                <span className="text-[10px] text-primary/50 font-semibold">Add</span>
              </button>
            </div>
          </SpringIn>
        )}

        {/* ─── Services ─── */}
        <SpringIn delay={0.26} className="px-5 mb-6">
          <h3 className="text-[14px] font-bold tracking-[-0.3px] mb-3.5">Services</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {allFeatures.map((f) => (
              <button
                key={f.label}
                onClick={() => { haptic.light(); navigate(f.path); }}
                className="flex flex-col items-center gap-1.5 py-4 rounded-[20px] bg-white/[0.02] active:scale-[0.88] transition-all duration-300 border border-white/[0.03] hover:border-white/[0.06] group"
              >
                <span className="text-[26px] group-active:scale-110 transition-transform">{f.emoji}</span>
                <span className="text-[11px] font-semibold text-white/50">{f.label}</span>
                <span className="text-[9px] text-white/20">{f.desc}</span>
              </button>
            ))}
          </div>
        </SpringIn>

        {/* ─── Monthly Spending Dashboard ─── */}
        <SpringIn delay={0.3} className="px-5 mb-6">
          <div className="relative rounded-[24px] overflow-hidden border border-white/[0.03]" style={{
            background: `
              radial-gradient(ellipse 60% 50% at 80% 20%, hsl(42 78% 55% / 0.04) 0%, transparent 60%),
              linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))
            `
          }}>
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.12), transparent)" }} />
            
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[12px] gradient-primary flex items-center justify-center shadow-[0_4px_16px_hsl(42_78%_55%/0.25)]">
                    <Wallet className="w-[18px] h-[18px] text-primary-foreground" />
                  </div>
                  <div>
                    <span className="text-[13px] font-bold block">Monthly Spending</span>
                    <span className="text-[10px] text-white/20">{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm ${
                  spendPct > 80 ? "bg-destructive/[0.08] text-destructive border border-destructive/10" 
                  : spendPct > 50 ? "bg-[hsl(38_92%_50%/0.08)] text-[hsl(38_92%_50%)] border border-[hsl(38_92%_50%/0.1)]" 
                  : "bg-[hsl(152_60%_45%/0.08)] text-[hsl(152_60%_45%)] border border-[hsl(152_60%_45%/0.1)]"
                }`}>
                  {Math.round(spendPct)}%
                </span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-[26px] font-bold tabular-nums tracking-[-1px]">{fmt(wallet?.spent_this_month || 0)}</p>
                    <p className="text-[10px] text-white/20 mt-0.5">of {fmt(wallet?.monthly_limit || 0)} limit</p>
                  </div>
                </div>
                <div className="h-[8px] rounded-full bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1500 ease-out" style={{
                    width: `${spendPct}%`,
                    background: spendPct > 80
                      ? "linear-gradient(90deg, hsl(0 72% 51%), hsl(0 72% 41%))"
                      : spendPct > 50
                        ? "linear-gradient(90deg, hsl(38 92% 50%), hsl(28 92% 45%))"
                        : "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 42%))",
                    boxShadow: spendPct > 80
                      ? "0 0 16px hsl(0 72% 51% / 0.4)"
                      : "0 0 16px hsl(42 78% 55% / 0.3)",
                  }} />
                </div>
              </div>

              <div className="flex items-center justify-between py-3 px-4 rounded-[14px] bg-white/[0.02] border border-white/[0.03]">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/[0.08] flex items-center justify-center">
                    <Zap className="w-3 h-3 text-primary/60" />
                  </div>
                  <span className="text-[11px] text-white/30 font-medium">Today's spending</span>
                </div>
                <span className="text-[12px] font-bold tabular-nums text-white/50">{fmt(wallet?.spent_today || 0)}<span className="text-white/20"> / {fmt(wallet?.daily_limit || 0)}</span></span>
              </div>
            </div>
          </div>
        </SpringIn>

        {/* ─── Savings Goals ─── */}
        {goals.length > 0 && (
          <SpringIn delay={0.34} className="mb-6">
            <div className="flex items-center justify-between mb-3.5 px-5">
              <h3 className="text-[14px] font-bold tracking-[-0.3px] flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Savings Goals
              </h3>
              <button onClick={() => { haptic.light(); navigate("/savings"); }} className="text-[11px] text-primary/80 font-semibold flex items-center gap-0.5 active:opacity-60">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {goals.map(goal => {
                const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
                return (
                  <button key={goal.id} onClick={() => { haptic.light(); navigate("/savings"); }}
                    className="min-w-[155px] p-4 rounded-[20px] active:scale-95 transition-all bg-white/[0.02] border border-white/[0.03]">
                    <div className="text-[26px] mb-2.5">{goal.icon || "🎯"}</div>
                    <p className="text-[12px] font-semibold truncate mb-2.5">{goal.title}</p>
                    <div className="w-full h-[5px] rounded-full bg-white/[0.04] overflow-hidden mb-2">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 48%))", boxShadow: "0 0 10px hsl(42 78% 55% / 0.3)" }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-white/20 font-medium">{Math.round(pct)}%</span>
                      <span className="text-[10px] text-primary font-bold">{fmt(goal.current_amount)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </SpringIn>
        )}

        {/* ─── Rewards ─── */}
        {rewards.length > 0 && (
          <SpringIn delay={0.38} className="mb-6">
            <div className="flex items-center justify-between mb-3.5 px-5">
              <h3 className="text-[14px] font-bold tracking-[-0.3px] flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" /> Rewards
              </h3>
              <button onClick={() => { haptic.light(); navigate("/rewards"); }} className="text-[11px] text-primary/80 font-semibold flex items-center gap-0.5 active:opacity-60">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {rewards.map(r => (
                <button key={r.id} onClick={() => { haptic.light(); navigate(`/rewards/${r.id}`); }}
                  className="min-w-[180px] rounded-[20px] overflow-hidden active:scale-[0.97] transition-all bg-white/[0.02] border border-white/[0.03]">
                  {r.image_url ? (
                    <div className="w-full h-[100px] overflow-hidden"><img src={r.image_url} alt={r.title} className="w-full h-full object-cover" /></div>
                  ) : (
                    <div className="w-full h-[100px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(42 78% 55% / 0.06), transparent)" }}>
                      <Sparkles className="w-8 h-8 text-primary/15" />
                    </div>
                  )}
                  <div className="p-3.5">
                    <p className="text-[11px] font-semibold truncate">{r.title}</p>
                    <p className="text-[9px] text-white/20 mt-0.5 truncate">{r.description || "Limited time offer"}</p>
                    <div className="mt-2.5 inline-flex px-3 py-1.5 rounded-[10px] bg-primary/[0.06] text-primary text-[10px] font-bold border border-primary/[0.08]">
                      {r.discount_type === "percentage" ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </SpringIn>
        )}

        {/* ─── Recent Activity ─── */}
        <SpringIn delay={0.42} className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[14px] font-bold tracking-[-0.3px] flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent Activity
            </h3>
            <button onClick={() => { haptic.light(); navigate("/activity"); }} className="text-[11px] text-primary/80 font-semibold flex items-center gap-0.5 active:opacity-60">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-16 rounded-[24px] bg-white/[0.015] border border-white/[0.03]">
              <div className="w-[64px] h-[64px] rounded-[20px] bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-white/10" />
              </div>
              <p className="text-[14px] font-semibold text-white/25 mb-1">No transactions yet</p>
              <p className="text-[11px] text-white/15">Your activity will appear here</p>
            </div>
          ) : (
            <div className="rounded-[24px] overflow-hidden border border-white/[0.03]" style={{
              background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))"
            }}>
              <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.08), transparent)" }} />
              {transactions.map((tx, idx) => (
                <button
                  key={tx.id}
                  onClick={() => { haptic.light(); navigate(`/transaction/${tx.id}`); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-4 transition-all duration-200 active:bg-white/[0.02] ${idx < transactions.length - 1 ? "border-b border-white/[0.025]" : ""}`}
                >
                  <div className="w-[44px] h-[44px] rounded-[14px] bg-white/[0.03] flex items-center justify-center text-[20px] shrink-0 border border-white/[0.03]">
                    {catEmoji[tx.category || "other"] || "💸"}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-semibold truncate">{tx.merchant_name || tx.category || "Transaction"}</p>
                    <p className="text-[10px] text-white/20 capitalize mt-0.5">
                      {tx.category || "other"} · {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13px] font-bold tabular-nums ${tx.type === "credit" ? "text-[hsl(152_60%_45%)]" : "text-foreground"}`}>
                      {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                    </p>
                    <p className={`text-[9px] font-medium mt-0.5 ${tx.status === "success" ? "text-[hsl(152_60%_45%/0.4)]" : "text-[hsl(38_92%_50%/0.4)]"}`}>
                      {tx.status === "success" ? "Completed" : tx.status}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SpringIn>

        {/* ─── Refer & Earn ─── */}
        <SpringIn delay={0.46} className="px-5 mb-6">
          <button
            onClick={() => {
              haptic.medium();
              const txt = "Hey! Join AuroPay and we both get ₹100! Download now 🎁";
              navigator.share?.({ text: txt }).catch(() => { navigator.clipboard.writeText(txt); toast.success("Referral link copied!"); });
            }}
            className="w-full relative overflow-hidden rounded-[24px] p-5 text-left active:scale-[0.98] transition-transform border border-white/[0.03]"
            style={{
              background: `
                radial-gradient(ellipse 50% 70% at 90% 30%, hsl(42 78% 55% / 0.06) 0%, transparent 60%),
                linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))
              `
            }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.15), transparent)" }} />

            <div className="relative z-10 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                  <span className="text-[10px] font-semibold text-white/25 tracking-[0.08em] uppercase">Referral Bonus</span>
                </div>
                <h3 className="text-[16px] font-bold leading-snug mb-1">Invite & Earn ₹20</h3>
                <p className="text-[11px] text-white/25 mb-3.5">Your friend gets ₹20 too after first spend</p>
                <div className="inline-flex items-center gap-2 gradient-primary text-primary-foreground px-4 py-2.5 rounded-[12px] shadow-[0_4px_24px_hsl(42_78%_55%/0.3)]">
                  <Send className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Invite Now</span>
                </div>
              </div>
              <div className="relative w-[60px] h-[60px] shrink-0">
                <div className="absolute inset-0 rounded-[18px] bg-primary/[0.04] border border-primary/[0.06] flex items-center justify-center">
                  <span className="text-[32px]" style={{ animation: "float-up 2.5s ease-in-out infinite" }}>🎁</span>
                </div>
              </div>
            </div>
          </button>
        </SpringIn>

        {/* ─── Explore ─── */}
        <SpringIn delay={0.5} className="px-5 mb-8">
          <h3 className="text-[14px] font-bold tracking-[-0.3px] mb-3.5">Explore</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { haptic.light(); navigate("/savings"); }}
              className="rounded-[20px] p-4 overflow-hidden relative active:scale-[0.97] transition-all bg-white/[0.02] border border-white/[0.03] text-left">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] blur-[30px]" style={{ background: "hsl(152 60% 45%)" }} />
              <span className="text-[28px] mb-3 block" style={{ animation: "float-up 3s ease-in-out infinite 0.5s" }}>🏦</span>
              <p className="text-[12px] font-semibold mb-0.5">Save & Invest</p>
              <p className="text-[10px] text-white/20">Set savings goals</p>
            </button>
            <button onClick={() => { haptic.light(); navigate("/rewards"); }}
              className="rounded-[20px] p-4 overflow-hidden relative active:scale-[0.97] transition-all bg-white/[0.02] border border-white/[0.03] text-left">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] blur-[30px]" style={{ background: "hsl(42 78% 55%)" }} />
              <span className="text-[28px] mb-3 block" style={{ animation: "float-up 3s ease-in-out infinite 1s" }}>🎟️</span>
              <p className="text-[12px] font-semibold mb-0.5">Earn Rewards</p>
              <p className="text-[10px] text-white/20">Exclusive deals</p>
            </button>
          </div>
        </SpringIn>
      </div>

      <BottomNav />
    </div>
  );
};

export default TeenHome;
