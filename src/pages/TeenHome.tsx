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
import { ScrollReveal } from "@/hooks/useScrollReveal";

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
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 3D tilt via device orientation (gyroscope)
  useEffect(() => {
    let active = true;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!active) return;
      const gamma = Math.max(-20, Math.min(20, e.gamma || 0));
      const beta = Math.max(-20, Math.min(20, (e.beta || 0) - 45));
      setCardTilt({ x: (gamma / 20) * 8, y: -(beta / 20) * 6 });
    };
    const init = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        try {
          const p = await (DeviceOrientationEvent as any).requestPermission();
          if (p === "granted") window.addEventListener("deviceorientation", handleOrientation, true);
        } catch {}
      } else {
        window.addEventListener("deviceorientation", handleOrientation, true);
      }
    };
    init();
    return () => { active = false; window.removeEventListener("deviceorientation", handleOrientation, true); };
  }, []);

  // 3D tilt via mouse hover (desktop fallback)
  const handleCardMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setCardTilt({ x: x * 8, y: -y * 6 });
  };
  const handleCardMouseLeave = () => setCardTilt({ x: 0, y: 0 });

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

  const healthScore = Math.min(100, Math.max(0,
    100 - spendPct * 0.4
    + (goals.length > 0 ? 15 : 0)
    + (moneyIn > moneyOut ? 20 : 0)
  ));
  const healthColor = healthScore >= 70 ? "hsl(152 60% 45%)" : healthScore >= 40 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)";
  const healthLabel = healthScore >= 70 ? "Excellent" : healthScore >= 40 ? "Good" : "Needs Attention";

  // Skeleton shimmer loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background px-5 pt-14 pb-24">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl skeleton-shimmer" />
          <div className="space-y-2 flex-1">
            <div className="w-20 h-3 rounded-full skeleton-shimmer" />
            <div className="w-32 h-4 rounded-full skeleton-shimmer" />
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
            <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
          </div>
        </div>
        {/* Balance card skeleton */}
        <div className="w-full h-56 rounded-[28px] skeleton-shimmer mb-6" />
        {/* Quick actions skeleton */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-[88px] rounded-[22px] skeleton-shimmer" />)}
        </div>
        {/* Transactions skeleton */}
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="w-full h-[72px] rounded-2xl skeleton-shimmer" />)}
        </div>
        <BottomNav />
        <style>{`
          .skeleton-shimmer {
            background: linear-gradient(110deg, hsl(220 15% 8%) 0%, hsl(220 15% 8%) 40%, hsl(220 15% 12%) 50%, hsl(220 15% 8%) 60%, hsl(220 15% 8%) 100%);
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.8s ease-in-out infinite;
          }
          @keyframes skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "Add", path: "/add-money", color: "152 60% 45%" },
    { icon: Send, label: "Send", path: "/quick-pay", color: "42 78% 55%" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "210 80% 55%" },
    { icon: Target, label: "Goals", path: "/savings", color: "270 60% 55%" },
  ];

  const allFeatures = [
    { label: "My Card", path: "/card", emoji: "💳", desc: "Virtual card" },
    { label: "Analytics", path: "/analytics", emoji: "📊", desc: "Track trends" },
    { label: "Split Bill", path: "/bill-split", emoji: "👥", desc: "Share costs" },
    { label: "Budget", path: "/budget", emoji: "📈", desc: "Plan ahead" },
    { label: "Quick Pay", path: "/quick-pay", emoji: "⚡", desc: "Fast transfer" },
    { label: "Scratch & Win", path: "/scratch-cards", emoji: "🎰", desc: "Win rewards" },
    { label: "Spin Wheel", path: "/spin-wheel", emoji: "🎡", desc: "Spin to win" },
    { label: "Chores", path: "/chores", emoji: "📋", desc: "Earn rewards" },
    { label: "Achievements", path: "/achievements", emoji: "🏆", desc: "Your badges" },
    { label: "Friends", path: "/friends", emoji: "🤝", desc: "Social hub" },
    { label: "Learn", path: "/learn", emoji: "📚", desc: "Earn coins" },
    { label: "Support", path: "/support", emoji: "💬", desc: "Get help" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      {/* ─── Ultra-Premium Ambient Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-[0.045] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute top-[40%] -left-32 w-[280px] h-[280px] rounded-full opacity-[0.025] blur-[80px]" style={{ background: "hsl(210 80% 55%)" }} />
        <div className="absolute bottom-[20%] right-0 w-[220px] h-[220px] rounded-full opacity-[0.02] blur-[70px]" style={{ background: "hsl(152 60% 45%)" }} />
        {/* Micro-dot grid */}
        <div className="absolute inset-0 opacity-[0.006]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(42 78% 55%) 0.4px, transparent 0)`,
          backgroundSize: "40px 40px"
        }} />
      </div>

      <div className="relative z-10">
        <div className="h-2" />

        {/* ─── Header ─── */}
        <div className="px-5 pt-4 pb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0s both" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <button onClick={() => { haptic.light(); navigate("/profile"); }} className="shrink-0 group">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-[50px] h-[50px] rounded-[17px] object-cover ring-[1.5px] ring-primary/20 group-active:scale-90 transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.3)]" />
                  ) : (
                    <div className="w-[50px] h-[50px] rounded-[17px] gradient-primary flex items-center justify-center text-[15px] font-bold text-primary-foreground shadow-[0_8px_32px_hsl(42_78%_55%/0.35)] group-active:scale-90 transition-transform ring-[1.5px] ring-primary/20">
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-[13px] h-[13px] rounded-full bg-[hsl(152_60%_45%)] border-[2px] border-background" style={{ boxShadow: "0 0 8px hsl(152 60% 45% / 0.6)" }} />
                </div>
              </button>
              <div>
                <p className="text-[11px] text-muted-foreground/50 font-medium tracking-wide">{greet()}</p>
                <h1 className="text-[19px] font-bold tracking-[-0.5px] text-foreground leading-tight">{firstName || "User"} ✨</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { haptic.light(); navigate("/quick-pay"); }} className="w-[40px] h-[40px] rounded-[13px] bg-white/[0.025] backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all border border-white/[0.04] hover:border-white/[0.08]">
                <Search className="w-[17px] h-[17px] text-muted-foreground/50" />
              </button>
              <button onClick={() => { haptic.light(); navigate("/notifications"); }} className="w-[40px] h-[40px] rounded-[13px] bg-white/[0.025] backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all relative border border-white/[0.04] hover:border-white/[0.08]">
                <Bell className="w-[17px] h-[17px] text-muted-foreground/50" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-primary-foreground shadow-[0_2px_12px_hsl(42_78%_55%/0.5)]">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Balance Card — Ultra Luxury ─── */}
        <div className="px-5 mb-5" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.06s both" }}>
          <div className="relative rounded-[26px] overflow-hidden" style={{ boxShadow: "0 20px 60px -12px hsl(42 78% 55% / 0.08), 0 0 0 1px hsl(42 30% 30% / 0.12), 0 8px 32px -8px rgba(0,0,0,0.5)" }}>
            {/* Layered gradient background */}
            <div className="absolute inset-0" style={{
              background: `
                radial-gradient(ellipse 80% 60% at 90% 0%, hsl(42 78% 55% / 0.1) 0%, transparent 50%),
                radial-gradient(ellipse 50% 40% at 10% 100%, hsl(210 80% 55% / 0.05) 0%, transparent 45%),
                radial-gradient(ellipse 40% 30% at 50% 50%, hsl(42 78% 55% / 0.02) 0%, transparent 40%),
                linear-gradient(170deg, hsl(220 25% 11%), hsl(225 30% 4%))
              `
            }} />
            {/* Top gold shimmer edge */}
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent 5%, hsl(42 78% 55% / 0.35) 30%, hsl(42 78% 55% / 0.5) 50%, hsl(42 78% 55% / 0.35) 70%, transparent 95%)" }} />
            <div className="absolute top-0 left-0 bottom-0 w-[1px]" style={{ background: "linear-gradient(180deg, hsl(42 78% 55% / 0.2) 10%, transparent 70%)" }} />

            <div className="relative z-10 p-5 pb-4">
              {/* Balance row */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="relative">
                      <div className="w-[6px] h-[6px] rounded-full bg-primary" style={{ boxShadow: "0 0 10px hsl(42 78% 55% / 0.8)", animation: "glow-pulse 2.5s ease-in-out infinite" }} />
                    </div>
                    <p className="text-[9px] text-white/25 font-bold tracking-[0.3em] uppercase">Balance</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); haptic.selection(); setShowBalance(!showBalance); }}
                    className="flex items-center gap-2.5 active:opacity-60 transition-opacity"
                  >
                    {showBalance ? (
                      <h2 className="text-[38px] font-extrabold tracking-[-2px] tabular-nums leading-none" style={{
                        background: "linear-gradient(135deg, hsl(42 78% 65%), hsl(42 78% 50%), hsl(42 78% 40%))",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                        filter: "drop-shadow(0 2px 8px hsl(42 78% 55% / 0.15))"
                      }}>{fmt(animBal)}</h2>
                    ) : (
                      <h2 className="text-[34px] font-extrabold tracking-[4px] leading-none select-none" style={{
                        background: "linear-gradient(90deg, hsl(42 78% 55% / 0.2), hsl(42 78% 55% / 0.06), hsl(42 78% 55% / 0.2))",
                        backgroundSize: "200% 100%", animation: "shimmer-card 2s linear infinite",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                      }}>•••••</h2>
                    )}
                    <div className="w-8 h-8 rounded-[10px] bg-white/[0.03] flex items-center justify-center backdrop-blur-sm border border-white/[0.05]">
                      {showBalance ? <EyeOff className="w-[14px] h-[14px] text-white/25" /> : <Eye className="w-[14px] h-[14px] text-white/25" />}
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => { haptic.medium(); navigate("/scan"); }}
                  className="w-[52px] h-[52px] rounded-[18px] gradient-primary flex items-center justify-center active:scale-90 transition-transform"
                  style={{ boxShadow: "0 8px 28px hsl(42 78% 55% / 0.3), inset 0 1px 0 hsl(48 90% 70% / 0.25)" }}
                >
                  <QrCode className="w-[24px] h-[24px] text-primary-foreground" strokeWidth={1.8} />
                </button>
              </div>

              {wallet?.is_frozen && (
                <div className="mb-3.5 px-3 py-1.5 bg-destructive/[0.06] rounded-xl inline-flex items-center gap-2 border border-destructive/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  <span className="text-[10px] font-semibold text-destructive/80">Wallet Frozen</span>
                </div>
              )}

              {/* Income / Expense */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative rounded-[16px] px-3.5 py-3 overflow-hidden border border-[hsl(152_60%_45%/0.06)]">
                  <div className="absolute inset-0 bg-[hsl(152_60%_45%/0.02)]" />
                  <div className="relative z-10 flex items-center gap-2.5">
                    <div className="w-[22px] h-[22px] rounded-[7px] bg-[hsl(152_60%_45%/0.1)] flex items-center justify-center">
                      <ArrowDownLeft className="w-2.5 h-2.5 text-[hsl(152_60%_45%)]" />
                    </div>
                    <div>
                      <span className="text-[8px] text-white/20 font-bold tracking-[0.15em] uppercase block">Income</span>
                      <p className="text-[14px] font-bold text-[hsl(152_60%_45%)] tabular-nums">{fmt(moneyIn)}</p>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[16px] px-3.5 py-3 overflow-hidden border border-destructive/[0.06]">
                  <div className="absolute inset-0 bg-destructive/[0.02]" />
                  <div className="relative z-10 flex items-center gap-2.5">
                    <div className="w-[22px] h-[22px] rounded-[7px] bg-destructive/[0.1] flex items-center justify-center">
                      <ArrowUpRight className="w-2.5 h-2.5 text-destructive" />
                    </div>
                    <div>
                      <span className="text-[8px] text-white/20 font-bold tracking-[0.15em] uppercase block">Spent</span>
                      <p className="text-[14px] font-bold text-destructive tabular-nums">{fmt(moneyOut)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Quick Actions ─── */}
        <ScrollReveal className="px-5 mb-5">
          <div className="grid grid-cols-4 gap-2.5">
            {quickActions.map((a, i) => (
              <button
                key={a.label}
                onClick={() => { haptic.light(); navigate(a.path); }}
                className="flex flex-col items-center gap-2 py-3.5 rounded-[20px] bg-white/[0.015] active:scale-[0.88] transition-all duration-300 group relative overflow-hidden border border-white/[0.03] hover:border-white/[0.08]"
                style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.12 + i * 0.05}s both` }}
              >
                <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at 50% 40%, hsl(${a.color} / 0.08), transparent 70%)` }} />
                <div className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center transition-transform duration-300 group-active:scale-110 relative"
                  style={{
                    background: `linear-gradient(135deg, hsl(${a.color} / 0.12), hsl(${a.color} / 0.04))`,
                    boxShadow: `0 4px 14px hsl(${a.color} / 0.08), inset 0 1px 0 hsl(${a.color} / 0.08)`,
                  }}>
                  <a.icon className="w-[20px] h-[20px]" style={{ color: `hsl(${a.color})`, filter: `drop-shadow(0 0 4px hsl(${a.color} / 0.25))` }} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-semibold text-white/35 group-active:text-white/60 transition-colors">{a.label}</span>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ─── Monthly Spending Bar ─── */}
        <ScrollReveal className="px-5 mb-5">
          <button
            onClick={() => { haptic.light(); navigate("/analytics"); }}
            className="w-full rounded-[20px] p-4 active:scale-[0.98] transition-all relative overflow-hidden border border-white/[0.03] text-left"
            style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.1), transparent)" }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary/70" />
                <span className="text-[11px] font-semibold text-white/40">Monthly Budget</span>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                spendPct > 80 ? "bg-destructive/[0.08] text-destructive border border-destructive/10"
                : spendPct > 50 ? "bg-[hsl(38_92%_50%/0.08)] text-[hsl(38_92%_50%)] border border-[hsl(38_92%_50%/0.1)]"
                : "bg-[hsl(152_60%_45%/0.08)] text-[hsl(152_60%_45%)] border border-[hsl(152_60%_45%/0.1)]"
              }`}>{Math.round(spendPct)}% used</span>
            </div>
            <div className="flex items-end justify-between mb-2.5">
              <p className="text-[22px] font-bold tabular-nums tracking-[-1px]">{fmt(wallet?.spent_this_month || 0)}</p>
              <p className="text-[10px] text-white/15 mb-1">of {fmt(wallet?.monthly_limit || 0)}</p>
            </div>
            <div className="h-[6px] rounded-full bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                width: `${spendPct}%`,
                background: spendPct > 80
                  ? "linear-gradient(90deg, hsl(0 72% 51%), hsl(0 72% 41%))"
                  : spendPct > 50
                    ? "linear-gradient(90deg, hsl(38 92% 50%), hsl(28 92% 45%))"
                    : "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 42%))",
                boxShadow: spendPct > 80 ? "0 0 12px hsl(0 72% 51% / 0.4)" : "0 0 12px hsl(42 78% 55% / 0.25)",
              }} />
            </div>
          </button>
        </ScrollReveal>

        {/* ─── Financial Health Score ─── */}
        <ScrollReveal className="px-5 mb-5">
          <button
            onClick={() => { haptic.light(); navigate("/analytics"); }}
            className="w-full relative overflow-hidden rounded-[20px] p-4 text-left active:scale-[0.98] transition-all border border-white/[0.03]"
            style={{ background: `radial-gradient(ellipse 50% 80% at 85% 20%, ${healthColor}06 0%, transparent 60%), linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))` }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${healthColor}15, transparent)` }} />
            <div className="flex items-center gap-3.5">
              <div className="relative w-[56px] h-[56px] shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(220 15% 12%)" strokeWidth="4.5" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke={healthColor} strokeWidth="4.5" strokeLinecap="round"
                    strokeDasharray={`${(healthScore / 100) * 138.2} 138.2`}
                    style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)", filter: `drop-shadow(0 0 4px ${healthColor}50)` }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[14px] font-bold tabular-nums" style={{ color: healthColor }}>{Math.round(healthScore)}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Shield className="w-3 h-3 text-primary/50" />
                  <span className="text-[9px] font-bold text-white/20 tracking-[0.08em] uppercase">Health Score</span>
                </div>
                <p className="text-[14px] font-bold" style={{ color: healthColor }}>{healthLabel}</p>
                <p className="text-[10px] text-white/20">Spending habits & savings</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/10 shrink-0" />
            </div>
          </button>
        </ScrollReveal>

        {/* ─── Quick Pay People ─── */}
        {favorites.length > 0 && (
          <ScrollReveal className="mb-5">
            <div className="flex items-center justify-between mb-3 px-5">
              <h3 className="text-[13px] font-bold tracking-[-0.3px]">People</h3>
              <button onClick={() => { haptic.light(); navigate("/quick-pay"); }} className="text-[10px] text-primary/70 font-semibold flex items-center gap-0.5 active:opacity-60 transition-opacity">
                See All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-3.5 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {favorites.map(fav => (
                <button key={fav.id} onClick={() => { haptic.light(); navigate("/quick-pay", { state: { selectedContact: fav } }); }}
                  className="flex flex-col items-center gap-2 min-w-[58px] active:scale-90 transition-all group">
                  <div className="w-[50px] h-[50px] rounded-[16px] bg-white/[0.025] border border-white/[0.04] flex items-center justify-center text-[22px] group-active:border-primary/20 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                    {fav.avatar_emoji}
                  </div>
                  <span className="text-[9px] text-white/30 font-medium truncate w-full text-center">{fav.contact_name.split(" ")[0]}</span>
                </button>
              ))}
              <button onClick={() => { haptic.light(); navigate("/quick-pay"); }}
                className="flex flex-col items-center gap-2 min-w-[58px] active:scale-90 transition-all">
                <div className="w-[50px] h-[50px] rounded-[16px] bg-primary/[0.03] border border-primary/[0.08] flex items-center justify-center transition-colors">
                  <Plus className="w-4.5 h-4.5 text-primary/40" />
                </div>
                <span className="text-[9px] text-primary/40 font-semibold">Add</span>
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* ─── Savings Goals ─── */}
        {goals.length > 0 && (
          <ScrollReveal className="mb-5">
            <div className="flex items-center justify-between mb-3 px-5">
              <h3 className="text-[13px] font-bold tracking-[-0.3px] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary/70" /> Goals
              </h3>
              <button onClick={() => { haptic.light(); navigate("/savings"); }} className="text-[10px] text-primary/70 font-semibold flex items-center gap-0.5 active:opacity-60">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {goals.map(goal => {
                const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
                return (
                  <button key={goal.id} onClick={() => { haptic.light(); navigate("/savings"); }}
                    className="min-w-[140px] p-3.5 rounded-[18px] active:scale-95 transition-all bg-white/[0.015] border border-white/[0.03] hover:border-white/[0.06]">
                    <div className="text-[24px] mb-2">{goal.icon || "🎯"}</div>
                    <p className="text-[11px] font-semibold truncate mb-2">{goal.title}</p>
                    <div className="w-full h-[4px] rounded-full bg-white/[0.04] overflow-hidden mb-1.5">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 48%))", boxShadow: "0 0 8px hsl(42 78% 55% / 0.25)" }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-white/15 font-medium">{Math.round(pct)}%</span>
                      <span className="text-[9px] text-primary font-bold">{fmt(goal.current_amount)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollReveal>
        )}

        {/* ─── Bill Payments ─── */}
        <ScrollReveal className="px-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold tracking-[-0.3px]">Bill Payments</h3>
            <button onClick={() => { haptic.light(); navigate("/bill-payments"); }} className="text-[10px] text-primary/70 font-semibold flex items-center gap-0.5 active:opacity-60 transition-opacity">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Electricity", emoji: "⚡", color: "48 90% 55%" },
              { label: "Water", emoji: "💧", color: "200 80% 55%" },
              { label: "Broadband", emoji: "📡", color: "160 60% 50%" },
              { label: "More", emoji: "📋", color: "42 78% 55%" },
            ].map((bp) => (
              <button
                key={bp.label}
                onClick={() => { haptic.light(); navigate("/bill-payments"); }}
                className="flex flex-col items-center gap-2 py-3 rounded-[16px] bg-white/[0.015] active:scale-[0.88] transition-all duration-300 border border-white/[0.03]"
              >
                <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center" style={{ background: `hsl(${bp.color} / 0.08)` }}>
                  <span className="text-[20px]">{bp.emoji}</span>
                </div>
                <span className="text-[9px] font-semibold text-white/35">{bp.label}</span>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ─── Recent Activity ─── */}
        <ScrollReveal className="px-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold tracking-[-0.3px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary/70" /> Recent Activity
            </h3>
            <button onClick={() => { haptic.light(); navigate("/activity"); }} className="text-[10px] text-primary/70 font-semibold flex items-center gap-0.5 active:opacity-60">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-14 rounded-[20px] bg-white/[0.01] border border-white/[0.03]">
              <div className="w-[56px] h-[56px] rounded-[18px] bg-white/[0.02] flex items-center justify-center mx-auto mb-3">
                <Activity className="w-7 h-7 text-white/8" />
              </div>
              <p className="text-[13px] font-semibold text-white/20 mb-0.5">No transactions yet</p>
              <p className="text-[10px] text-white/10">Your activity will appear here</p>
            </div>
          ) : (
            <div className="relative rounded-[20px] overflow-hidden border border-white/[0.035]" style={{
              background: "linear-gradient(160deg, hsl(220 18% 8.5%), hsl(220 20% 5%))",
              boxShadow: "0 8px 32px -8px hsl(220 20% 4% / 0.5), inset 0 1px 0 hsl(40 20% 95% / 0.02)"
            }}>
              <div className="absolute top-0 inset-x-0 h-[1px] z-10" style={{ background: "linear-gradient(90deg, transparent 10%, hsl(42 78% 55% / 0.1) 50%, transparent 90%)" }} />
              {transactions.map((tx, idx) => (
                <button
                  key={tx.id}
                  onClick={() => { haptic.light(); navigate(`/transaction/${tx.id}`); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3.5 transition-all duration-200 active:bg-white/[0.025] ${idx < transactions.length - 1 ? "border-b border-white/[0.02]" : ""}`}
                  style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + idx * 0.04}s both` }}
                >
                  <div className="w-[40px] h-[40px] rounded-[13px] bg-white/[0.025] flex items-center justify-center text-[18px] shrink-0 border border-white/[0.025]">
                    {catEmoji[tx.category || "other"] || "💸"}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[11px] font-semibold truncate">{tx.merchant_name || tx.category || "Transaction"}</p>
                    <p className="text-[9px] text-white/15 capitalize mt-0.5">
                      {tx.category || "other"} · {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[12px] font-bold tabular-nums ${tx.type === "credit" ? "text-[hsl(152_60%_45%)]" : "text-foreground"}`}>
                      {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                    </p>
                    <p className={`text-[8px] font-medium mt-0.5 ${
                      tx.status === "success" ? "text-[hsl(152_60%_45%/0.4)]" : tx.status === "pending" ? "text-[hsl(38_92%_50%/0.5)]" : "text-destructive/40"
                    }`}>
                      {tx.status === "success" ? "Completed" : tx.status === "pending" ? "Pending" : tx.status}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollReveal>

        {/* ─── Rewards ─── */}
        {rewards.length > 0 && (
          <ScrollReveal className="mb-5">
            <div className="flex items-center justify-between mb-3 px-5">
              <h3 className="text-[13px] font-bold tracking-[-0.3px] flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-primary/70" /> Rewards
              </h3>
              <button onClick={() => { haptic.light(); navigate("/rewards"); }} className="text-[10px] text-primary/70 font-semibold flex items-center gap-0.5 active:opacity-60">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {rewards.map(r => (
                <button key={r.id} onClick={() => { haptic.light(); navigate(`/rewards/${r.id}`); }}
                  className="min-w-[160px] rounded-[18px] overflow-hidden active:scale-[0.97] transition-all bg-white/[0.015] border border-white/[0.03]">
                  {r.image_url ? (
                    <div className="w-full h-[88px] overflow-hidden"><img src={r.image_url} alt={r.title} className="w-full h-full object-cover" /></div>
                  ) : (
                    <div className="w-full h-[88px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(42 78% 55% / 0.05), transparent)" }}>
                      <Sparkles className="w-7 h-7 text-primary/12" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[10px] font-semibold truncate">{r.title}</p>
                    <p className="text-[8px] text-white/15 mt-0.5 truncate">{r.description || "Limited time"}</p>
                    <div className="mt-2 inline-flex px-2.5 py-1 rounded-[8px] bg-primary/[0.05] text-primary text-[9px] font-bold border border-primary/[0.06]">
                      {r.discount_type === "percentage" ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* ─── Services Grid ─── */}
        <ScrollReveal className="px-5 mb-5">
          <h3 className="text-[13px] font-bold tracking-[-0.3px] mb-3">Services</h3>
          <div className="grid grid-cols-4 gap-2">
            {allFeatures.map((f, i) => (
              <button
                key={f.label}
                onClick={() => { haptic.light(); navigate(f.path); }}
                className="flex flex-col items-center gap-1 py-3 rounded-[16px] bg-white/[0.012] active:scale-[0.88] transition-all duration-300 border border-white/[0.025] hover:border-white/[0.06] group"
                style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + i * 0.03}s both` }}
              >
                <span className="text-[22px] group-active:scale-115 transition-transform duration-200">{f.emoji}</span>
                <span className="text-[9px] font-semibold text-white/35 group-active:text-white/55 transition-colors">{f.label}</span>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ─── Refer & Earn ─── */}
        <ScrollReveal className="px-5 mb-8">
          <button
            onClick={() => {
              haptic.medium();
              const code = profile ? `AURO${profile.full_name?.replace(/\s/g, "").substring(0, 4).toUpperCase() || "USER"}${Math.random().toString(36).substring(2, 5).toUpperCase()}` : "AUROPAY";
              const deepLink = `https://auro-pay.lovable.app?ref=${code}`;
              const txt = `Hey! Join AuroPay and we both get ₹20! Use my link: ${deepLink} 🎁`;
              navigator.share?.({ title: "Join AuroPay", text: txt, url: deepLink }).catch(() => { navigator.clipboard.writeText(deepLink); toast.success("Referral link copied!"); });
            }}
            className="w-full relative overflow-hidden rounded-[20px] p-4 text-left active:scale-[0.98] transition-transform border border-white/[0.03]"
            style={{ background: "radial-gradient(ellipse 50% 70% at 90% 30%, hsl(42 78% 55% / 0.05) 0%, transparent 60%), linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.12), transparent)" }} />
            <div className="relative z-10 flex items-center gap-3.5">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-primary/60" />
                  <span className="text-[9px] font-bold text-white/20 tracking-[0.08em] uppercase">Referral</span>
                </div>
                <h3 className="text-[14px] font-bold leading-snug mb-0.5">Invite & Earn ₹20</h3>
                <p className="text-[10px] text-white/20 mb-3">Friend gets ₹20 too</p>
                <div className="inline-flex items-center gap-1.5 gradient-primary text-primary-foreground px-3.5 py-2 rounded-[10px] shadow-[0_4px_20px_hsl(42_78%_55%/0.25)]">
                  <Send className="w-3 h-3" />
                  <span className="text-[10px] font-bold">Invite Now</span>
                </div>
              </div>
              <span className="text-[36px] shrink-0" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>🎁</span>
            </div>
          </button>
        </ScrollReveal>

        {/* ─── Explore ─── */}
        <ScrollReveal className="px-5 mb-8">
          <h3 className="text-[13px] font-bold tracking-[-0.3px] mb-3">Explore</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => { haptic.light(); navigate("/savings"); }}
              className="rounded-[18px] p-3.5 overflow-hidden relative active:scale-[0.97] transition-all bg-white/[0.015] border border-white/[0.03] text-left">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.03] blur-[25px]" style={{ background: "hsl(152 60% 45%)" }} />
              <span className="text-[26px] mb-2 block">🏦</span>
              <p className="text-[11px] font-semibold mb-0.5">Save & Invest</p>
              <p className="text-[9px] text-white/15">Set savings goals</p>
            </button>
            <button onClick={() => { haptic.light(); navigate("/rewards"); }}
              className="rounded-[18px] p-3.5 overflow-hidden relative active:scale-[0.97] transition-all bg-white/[0.015] border border-white/[0.03] text-left">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.03] blur-[25px]" style={{ background: "hsl(42 78% 55%)" }} />
              <span className="text-[26px] mb-2 block">🎟️</span>
              <p className="text-[11px] font-semibold mb-0.5">Earn Rewards</p>
              <p className="text-[9px] text-white/15">Exclusive deals</p>
            </button>
          </div>
        </ScrollReveal>
      </div>

      <BottomNav />
    </div>
  );
};

export default TeenHome;
