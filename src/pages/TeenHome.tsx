import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, RefreshCw, QrCode, Plus, Clock, Eye, EyeOff, Target, TrendingUp, ArrowUpRight, ArrowDownLeft, Sparkles, Shield, CreditCard } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

interface Profile {
  full_name: string;
  avatar_url: string | null;
  kyc_status: string | null;
}

interface Wallet {
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

const TeenHome = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
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
      setWallet(walletRes.data as Wallet);
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const dailyPct = wallet ? Math.min(((wallet.spent_today || 0) / (wallet.daily_limit || 1)) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2"><div className="w-20 h-3 bg-muted rounded animate-pulse" /><div className="w-28 h-4 bg-muted rounded animate-pulse" /></div>
          </div>
        </div>
        <div className="w-full h-48 rounded-2xl bg-muted animate-pulse mb-5" />
        <div className="flex gap-3 mb-6">{[1,2,3].map(i => <div key={i} className="flex-1 h-14 rounded-2xl bg-muted animate-pulse" />)}</div>
        {[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-xl bg-muted animate-pulse mb-3" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-slide-up">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-primary/20" />
          ) : (
            <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground shimmer-border">
              {initials}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">{greeting()},</p>
            <p className="text-base font-semibold">{firstName} ✨</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/notifications")} className="w-10 h-10 rounded-full bg-input flex items-center justify-center hover:bg-muted transition-all active:scale-95 relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground min-w-[18px] h-[18px]">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={fetchData} className="w-10 h-10 rounded-full bg-input flex items-center justify-center hover:bg-muted transition-all active:scale-95">
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Premium Balance Card */}
      <div className="relative rounded-2xl p-6 mb-5 overflow-hidden animate-slide-up-delay-1 shimmer-border" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-medium tracking-[0.15em] text-primary uppercase">Available Balance</span>
            </div>
            <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[40px] font-bold tracking-[-2px] mb-3 animate-count-up">
            {showBalance ? formatAmount(wallet?.balance || 0) : "₹••••••"}
          </p>

          {/* Daily spending bar */}
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${dailyPct > 80 ? "bg-destructive" : "gradient-primary"}`} style={{ width: `${dailyPct}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{formatCompact(wallet?.spent_today || 0)}/{formatCompact(wallet?.daily_limit || 0)}</span>
          </div>

          {wallet?.is_frozen && (
            <div className="mt-3 px-3 py-1.5 bg-destructive/20 rounded-pill inline-flex items-center gap-1.5">
              <span className="text-xs font-medium text-destructive">🔒 Wallet Frozen</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mb-6 animate-slide-up-delay-2">
        {[
          { icon: QrCode, label: "Scan & Pay", path: "/scan", gradient: true },
          { icon: Plus, label: "Add Money", path: "/add-money" },
          { icon: Clock, label: "History", path: "/activity" },
          { icon: Target, label: "Goals", path: "/savings" },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className={`flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95 ${
              action.gradient ? "gradient-primary" : "bg-card border border-border card-glow hover:border-primary/20"
            }`}
          >
            <action.icon className={`w-5 h-5 ${action.gradient ? "text-primary-foreground" : "text-primary"}`} />
            <span className={`text-[10px] font-medium ${action.gradient ? "text-primary-foreground" : ""}`}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up-delay-3">
        <div className="rounded-xl bg-card border border-border card-glow p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-success" />
            </div>
            <span className="text-[10px] text-muted-foreground">Money In</span>
          </div>
          <p className="text-lg font-bold text-success">
            {formatCompact(transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0))}
          </p>
        </div>
        <div className="rounded-xl bg-card border border-border card-glow p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-[10px] text-muted-foreground">Money Out</span>
          </div>
          <p className="text-lg font-bold text-destructive">
            {formatCompact(transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0))}
          </p>
        </div>
      </div>

      {/* Savings Goals Preview */}
      {goals.length > 0 && (
        <div className="mb-6 animate-slide-up-delay-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" /> Savings Goals
            </h3>
            <button onClick={() => navigate("/savings")} className="text-xs text-primary font-medium">View All</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {goals.map(goal => {
              const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
              return (
                <button key={goal.id} onClick={() => navigate("/savings")} className="min-w-[140px] p-3 rounded-xl bg-card border border-border card-glow hover:border-primary/20 transition-all active:scale-[0.97]">
                  <div className="text-lg mb-1">{goal.icon || "🎯"}</div>
                  <p className="text-xs font-medium truncate">{goal.title}</p>
                  <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                    <div className="h-full rounded-full gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{Math.round(pct)}%</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Access Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up-delay-4">
        <button onClick={() => navigate("/card")} className="p-4 rounded-xl bg-card border border-border card-premium hover:border-primary/20 transition-all active:scale-[0.97] text-left">
          <CreditCard className="w-5 h-5 text-primary mb-2" />
          <p className="text-xs font-semibold">Virtual Card</p>
          <p className="text-[10px] text-muted-foreground">Pay online securely</p>
        </button>
        <button onClick={() => navigate("/spending-limits")} className="p-4 rounded-xl bg-card border border-border card-premium hover:border-primary/20 transition-all active:scale-[0.97] text-left">
          <Shield className="w-5 h-5 text-primary mb-2" />
          <p className="text-xs font-semibold">Spending Limits</p>
          <p className="text-[10px] text-muted-foreground">Manage your budget</p>
        </button>
      </div>

      {/* Recent Activity */}
      <div className="mb-6 animate-slide-up-delay-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" /> Recent Activity
          </h3>
          <button onClick={() => navigate("/activity")} className="text-xs text-primary font-medium">View All</button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10 rounded-xl bg-card border border-border card-glow">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start by adding money to your wallet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, idx) => (
              <div key={tx.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border card-glow transition-all hover:border-primary/10" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                  {categoryIcons[tx.category || "other"] || "💸"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.merchant_name || tx.category || "Transaction"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{tx.category} · {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <p className={`text-sm font-semibold ${tx.type === "credit" ? "text-success" : ""}`}>
                  {tx.type === "credit" ? "+" : "-"}{formatCompact(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default TeenHome;
