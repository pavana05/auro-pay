import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, QrCode, Plus, Clock, Eye, EyeOff,
  Target, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Sparkles, Shield, CreditCard, Send, ChevronRight,
  Wallet, Zap, BarChart3, Gift, Users, PieChart, Star,
  Search, Smartphone, Globe, Award, Coins, Receipt,
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
const useCountUp = (target: number, duration = 800, enabled = true) => {
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
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
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
  const animatedBalance = useCountUp(wallet?.balance || 0, 800, showBalance);

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="w-40 h-10 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
        <div className="w-full h-56 rounded-3xl bg-muted animate-pulse mb-4" />
        <div className="flex gap-3 mb-4">{[1,2,3].map(i => <div key={i} className="flex-1 h-16 rounded-2xl bg-muted animate-pulse" />)}</div>
        {[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-xl bg-muted animate-pulse mb-3" />)}
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "Add Money", path: "/add-money" },
    { icon: Send, label: "Send Money", path: "/quick-pay" },
    { icon: TrendingUp, label: "Analytics", path: "/analytics" },
    { icon: Target, label: "Savings", path: "/savings" },
  ];

  const serviceActions = [
    { icon: Smartphone, label: "Recharge", emoji: "📱", path: "/scan" },
    { icon: Globe, label: "DigiGold", emoji: "🏆", path: "/savings" },
    { icon: Gift, label: "Refer & Earn", emoji: "🎁", path: null, action: () => {
      haptic.medium();
      const shareText = "Hey! Join AuroPay and we both get ₹100! Download now 🎁";
      navigator.share?.({ text: shareText }).catch(() => {
        navigator.clipboard.writeText(shareText);
        toast.success("Referral link copied!");
      });
    }},
  ];

  const allFeatures = [
    { icon: CreditCard, label: "My Card", path: "/card" },
    { icon: Target, label: "Goals", path: "/savings" },
    { icon: PieChart, label: "Analytics", path: "/analytics" },
    { icon: Users, label: "Split Bill", path: "/bill-split" },
    { icon: BarChart3, label: "Budget", path: "/budget" },
    { icon: Star, label: "Quick Pay", path: "/quick-pay" },
  ];

  return (
    <div className="min-h-screen bg-background noise-overlay pb-28">
      {/* ─── Top Bar ─── */}
      <div className="px-4 pt-5 pb-3 animate-slide-up">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <button onClick={() => { haptic.light(); navigate("/profile"); }} className="shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-[0_4px_12px_hsl(42_78%_55%/0.25)]">
                {initials}
              </div>
            )}
          </button>

          {/* Search Bar */}
          <button
            onClick={() => { haptic.light(); navigate("/quick-pay"); }}
            className="flex-1 flex items-center gap-2.5 h-10 px-4 rounded-full bg-card border border-border active:scale-[0.98] transition-all"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Pay any contact</span>
          </button>

          {/* Notification */}
          <button
            onClick={() => { haptic.light(); navigate("/notifications"); }}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-all relative shrink-0"
          >
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-primary-foreground animate-scale-in">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Scan & Pay Hero ─── */}
      <div className="px-4 mb-4 animate-slide-up-delay-1">
        <button
          onClick={() => { haptic.medium(); navigate("/scan"); }}
          className="w-full relative rounded-3xl overflow-hidden active:scale-[0.98] transition-all duration-200"
          style={{ background: "linear-gradient(160deg, hsl(220 18% 11%), hsl(220 20% 6%))" }}
        >
          {/* QR pattern background */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, hsl(42 78% 55%) 20px, hsl(42 78% 55%) 21px),
              repeating-linear-gradient(90deg, transparent, transparent 20px, hsl(42 78% 55%) 20px, hsl(42 78% 55%) 21px)`,
          }} />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, hsl(42 78% 65%), transparent)" }} />

          <div className="relative z-10 flex flex-col items-center py-8 px-6">
            {/* QR Icon */}
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-[0_8px_32px_hsl(42_78%_55%/0.3)]">
              <QrCode className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold tracking-[-0.5px] mb-1">SCAN</h2>
            <h2 className="text-xl font-bold tracking-[-0.5px] text-primary">& PAY</h2>

            {/* Balance peek */}
            {wallet && (
              <button
                onClick={() => { haptic.selection(); setShowBalance(!showBalance); }}
                className="mt-3 px-4 py-1.5 rounded-full bg-muted/20 backdrop-blur-sm border border-border/30 flex items-center gap-2 active:scale-95 transition-all"
              >
                <span className="text-[11px] text-muted-foreground">Balance: </span>
                {showBalance ? (
                  <span className="text-[11px] font-bold tabular-nums transition-all" key="amount">
                    {formatCompact(animatedBalance)}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold tracking-wider text-muted-foreground">•••••</span>
                )}
                {showBalance ? (
                  <EyeOff className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <Eye className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            )}

            {/* Frozen badge */}
            {wallet?.is_frozen && (
              <div className="mt-3 px-3 py-1.5 bg-destructive/15 rounded-full inline-flex items-center gap-1.5 animate-scale-in">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                <span className="text-[10px] font-semibold text-destructive">Wallet Frozen</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* ─── Quick Action Pills ─── */}
      <div className="px-4 mb-4 animate-slide-up-delay-1">
        <div className="flex gap-2">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => { haptic.light(); a.action ? a.action() : a.path && navigate(a.path); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-card border border-border active:scale-95 transition-all"
            >
              <a.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Services Row ─── */}
      <div className="px-4 mb-5 animate-slide-up-delay-2">
        <div className="flex gap-2">
          {serviceActions.map((a) => (
            <button
              key={a.label}
              onClick={() => { haptic.light(); a.action ? a.action() : a.path && navigate(a.path); }}
              className="flex-1 flex items-center gap-2 py-3 px-3 rounded-2xl bg-card border border-border active:scale-95 transition-all"
            >
              <span className="text-lg">{a.emoji}</span>
              <span className="text-[11px] font-semibold text-foreground truncate">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Quick Pay / Recommended ─── */}
      {favorites.length > 0 && (
        <div className="mb-5 animate-slide-up-delay-2">
          <div className="flex items-center justify-between mb-3 px-4">
            <h3 className="text-[13px] font-bold">Recommended</h3>
            <button onClick={() => { haptic.light(); navigate("/quick-pay"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto px-4 pb-1">
            {favorites.map(fav => (
              <button key={fav.id} onClick={() => { haptic.light(); navigate("/quick-pay"); }}
                className="flex flex-col items-center gap-1.5 min-w-[60px] active:scale-90 transition-all">
                <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-2xl shadow-sm">
                  {fav.avatar_emoji}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium truncate w-full text-center">{fav.contact_name.split(" ")[0]}</span>
              </button>
            ))}
            <button onClick={() => { haptic.light(); navigate("/quick-pay"); }}
              className="flex flex-col items-center gap-1.5 min-w-[60px] active:scale-90 transition-all">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <span className="text-[10px] text-primary font-medium">Add</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Feature Grid ─── */}
      <div className="px-4 mb-5 animate-slide-up-delay-2">
        <div className="grid grid-cols-3 gap-2.5">
          {allFeatures.map((f) => (
            <button
              key={f.label}
              onClick={() => { haptic.light(); navigate(f.path); }}
              className="group relative flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-300 active:scale-90 overflow-hidden border border-border/50"
              style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}
            >
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-300" style={{ background: "radial-gradient(circle at center, hsl(42 78% 55% / 0.06), transparent)" }} />
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Picked for you / Rewards ─── */}
      {rewards.length > 0 && (
        <div className="mb-5 animate-slide-up-delay-3">
          <div className="flex items-center justify-between mb-3 px-4">
            <h3 className="text-[13px] font-bold">Picked for you</h3>
            <button onClick={() => { haptic.light(); navigate("/rewards"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1">
            {rewards.map(r => (
              <button
                key={r.id}
                onClick={() => { haptic.light(); navigate(`/rewards/${r.id}`); }}
                className="min-w-[220px] rounded-2xl border border-border overflow-hidden active:scale-[0.97] transition-all"
                style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}
              >
                {r.image_url ? (
                  <div className="w-full h-28 overflow-hidden">
                    <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-28 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(42 78% 55% / 0.08), hsl(220 15% 10%))" }}>
                    <Gift className="w-10 h-10 text-primary/30" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-[12px] font-semibold truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.description || "Limited time offer"}</p>
                  <div className="mt-2 inline-flex px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    {r.discount_type === "percentage" ? `${r.discount_value}% off` : `₹${r.discount_value} off`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Savings Goals ─── */}
      {goals.length > 0 && (
        <div className="mb-5 animate-slide-up-delay-3">
          <div className="flex items-center justify-between mb-3 px-4">
            <h3 className="text-[13px] font-bold flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" /> Savings Goals
            </h3>
            <button onClick={() => { haptic.light(); navigate("/savings"); }} className="text-[11px] text-primary font-semibold flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1">
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

      {/* ─── Money Flow + Monthly Overview ─── */}
      <div className="px-4 mb-5 animate-slide-up-delay-3">
        <div className="rounded-2xl p-4 border border-border" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-bold">Monthly Overview</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
          </div>

          {/* Money In / Out */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3 bg-success/[0.04] border border-success/10">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-success" />
                <span className="text-[10px] text-muted-foreground">Money In</span>
              </div>
              <p className="text-sm font-bold text-success">
                {formatCompact(transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0))}
              </p>
            </div>
            <div className="rounded-xl p-3 bg-destructive/[0.04] border border-destructive/10">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
                <span className="text-[10px] text-muted-foreground">Money Out</span>
              </div>
              <p className="text-sm font-bold text-destructive">
                {formatCompact(transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0))}
              </p>
            </div>
          </div>

          {/* Spending progress */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground">Monthly Budget</span>
              <span className="text-[10px] font-medium">{formatCompact(wallet?.spent_this_month || 0)} / {formatCompact(wallet?.monthly_limit || 0)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{
                width: `${wallet ? Math.min(((wallet.spent_this_month || 0) / (wallet.monthly_limit || 1)) * 100, 100) : 0}%`,
                background: "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 48%))",
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Activity ─── */}
      <div className="px-4 mb-5 animate-slide-up-delay-4">
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
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 active:bg-muted/10 ${idx < transactions.length - 1 ? "border-b border-border/50" : ""}`}
              >
                <div className="w-10 h-10 rounded-xl bg-muted/15 flex items-center justify-center text-lg shrink-0">
                  {categoryIcons[tx.category || "other"] || "💸"}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[12px] font-semibold truncate">{tx.merchant_name || tx.category || "Transaction"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {tx.category || "other"} · {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <p className={`text-[12px] font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                  {tx.type === "credit" ? "+" : "-"}{formatCompact(tx.amount)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Refer & Earn ─── */}
      <div className="px-4 mb-5 animate-slide-up-delay-4">
        <button
          onClick={() => {
            haptic.medium();
            const shareText = "Hey! Join AuroPay and we both get ₹100! Download now 🎁";
            navigator.share?.({ text: shareText }).catch(() => {
              navigator.clipboard.writeText(shareText);
              toast.success("Referral link copied!");
            });
          }}
          className="w-full relative overflow-hidden rounded-3xl border border-primary/20 p-5 text-left active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-3xl opacity-30" style={{ background: "hsl(42 78% 55%)" }} />
          <div className="absolute top-4 right-16 w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
          <div className="absolute top-10 right-8 w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: "0.5s" }} />

          <div className="relative z-10 flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-[15px] font-bold leading-snug mb-0.5">
                Flat ₹20 for you,
              </h3>
              <h3 className="text-[15px] font-bold text-primary mb-1">₹20 for your friend*</h3>
              <p className="text-[10px] text-muted-foreground mb-3">*Reward unlocks after first spend</p>
              <div className="inline-flex items-center gap-2 bg-success text-white px-4 py-2 rounded-full">
                <Send className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Invite via WhatsApp</span>
              </div>
            </div>
            <div className="relative w-16 h-16 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">🎁</span>
              </div>
              <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-lg animate-bounce" style={{ animationDuration: "2s" }}>
                ₹
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* ─── Invest Your Money ─── */}
      <div className="px-4 mb-6 animate-slide-up-delay-4">
        <h3 className="text-[13px] font-bold mb-3">Explore More</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { haptic.light(); navigate("/savings"); }}
            className="rounded-2xl p-4 border border-border overflow-hidden relative active:scale-[0.97] transition-all"
            style={{ background: "linear-gradient(145deg, hsl(152 60% 45% / 0.05), hsl(220 15% 8%))" }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(152 60% 45%), transparent)" }} />
            <div className="relative z-10">
              <span className="text-2xl mb-2 block">🏦</span>
              <p className="text-[12px] font-semibold mb-0.5">Save & Invest</p>
              <p className="text-[10px] text-muted-foreground">Set savings goals</p>
            </div>
          </button>
          <button onClick={() => { haptic.light(); navigate("/rewards"); }}
            className="rounded-2xl p-4 border border-border overflow-hidden relative active:scale-[0.97] transition-all"
            style={{ background: "linear-gradient(145deg, hsl(42 78% 55% / 0.05), hsl(220 15% 8%))" }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
            <div className="relative z-10">
              <span className="text-2xl mb-2 block">🎟️</span>
              <p className="text-[12px] font-semibold mb-0.5">Earn Rewards</p>
              <p className="text-[10px] text-muted-foreground">Exclusive deals & offers</p>
            </div>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default TeenHome;
