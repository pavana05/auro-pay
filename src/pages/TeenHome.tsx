import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, QrCode, Plus, Clock, Eye, EyeOff,
  Target, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Send, ChevronRight, Wallet, Zap, Gift,
  Search, Shield, Sparkles, Activity, BarChart3,
  MessageCircle, Flame, Trophy, Star, X, ArrowRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import InlineSearchResults from "@/components/InlineSearchResults";
import PressTooltip from "@/components/PressTooltip";
import SwipeActionRow from "@/components/SwipeActionRow";
import PaymentRequestPill from "@/components/PaymentRequestPill";
import { CountUp as ZenCountUp } from "@/components/zen/CountUp";
import ZenzoPointsWidget from "@/components/zen/ZenzoPointsWidget";

interface Profile { full_name: string; avatar_url: string | null; kyc_status: string | null; phone: string | null; }
interface WalletData { id: string; balance: number; daily_limit: number; monthly_limit: number; spent_today: number; spent_this_month: number; is_frozen: boolean; }
interface Transaction { id: string; type: string; amount: number; merchant_name: string | null; category: string | null; status: string; created_at: string; }
interface SavingsGoal { id: string; title: string; target_amount: number; current_amount: number; icon: string | null; }
interface Reward { id: string; title: string; description: string | null; discount_value: number; discount_type: string; image_url: string | null; category: string | null; }
interface QuickPayFav { id: string; contact_name: string; avatar_emoji: string; }
interface StreakData { current_streak: number; longest_streak: number; streak_coins: number; }
interface AchievementData { id: string; title: string; icon: string; }

const catEmoji: Record<string, string> = { food: "🍔", transport: "🚗", education: "📚", shopping: "🛍️", entertainment: "🎮", other: "💸" };

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } } },
};

const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

import { useAppSettings } from "@/hooks/useAppSettings";

const TeenHome = () => {
  const { isOn: settingOn } = useAppSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [favorites, setFavorites] = useState<QuickPayFav[]>([]);
  const [showBalance, setShowBalance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<AchievementData[]>([]);
  const [unreadChats, setUnreadChats] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rewardsScrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const handle = (e: DeviceOrientationEvent) => {
      if (!active) return;
      const gamma = Math.max(-20, Math.min(20, e.gamma || 0));
      const beta = Math.max(-20, Math.min(20, (e.beta || 0) - 45));
      setCardTilt({ x: (gamma / 20) * 8, y: -(beta / 20) * 6 });
    };
    const init = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        try { const p = await (DeviceOrientationEvent as any).requestPermission(); if (p === "granted") window.addEventListener("deviceorientation", handle, true); } catch {}
      } else { window.addEventListener("deviceorientation", handle, true); }
    };
    init();
    return () => { active = false; window.removeEventListener("deviceorientation", handle, true); };
  }, []);

  const handleCardMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCardTilt({ x: ((e.clientX - rect.left) / rect.width - 0.5) * 16, y: -((e.clientY - rect.top) / rect.height - 0.5) * 12 });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const [profileRes, walletRes, goalsRes, notifRes, rewardsRes, favsRes, streakRes, achieveRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, kyc_status, phone").eq("id", user.id).single(),
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
        supabase.from("savings_goals").select("id, title, target_amount, current_amount, icon").eq("teen_id", user.id).eq("is_completed", false).limit(3),
        supabase.from("notifications").select("id").eq("user_id", user.id).eq("is_read", false),
        supabase.from("rewards").select("id, title, description, discount_value, discount_type, image_url, category").eq("is_active", true).limit(4),
        supabase.from("quick_pay_favorites").select("id, contact_name, avatar_emoji").eq("user_id", user.id).order("last_paid_at", { ascending: false, nullsFirst: false }).limit(5),
        supabase.from("user_streaks").select("current_streak, longest_streak, streak_coins").eq("user_id", user.id).single(),
        supabase.from("user_achievements").select("achievement_id, achievements(id, title, icon)").eq("user_id", user.id).order("earned_at", { ascending: false }).limit(4),
      ]);
      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (goalsRes.data) setGoals(goalsRes.data as SavingsGoal[]);
      if (rewardsRes.data) setRewards(rewardsRes.data as Reward[]);
      if (favsRes.data) setFavorites(favsRes.data as QuickPayFav[]);
      setUnreadCount(notifRes.data?.length || 0);
      if (streakRes.data) setStreak(streakRes.data as StreakData);
      if (achieveRes.data) {
        const badges = (achieveRes.data as any[]).map(a => a.achievements).filter(Boolean);
        setRecentAchievements(badges as AchievementData[]);
      }
      if (walletRes.data) {
        setWallet(walletRes.data as WalletData);
        const { data: txns } = await supabase.from("transactions").select("*").eq("wallet_id", walletRes.data.id).order("created_at", { ascending: false }).limit(40);
        if (txns) setTransactions(txns as Transaction[]);
      }
      // Unread chats — wrapped so a single failure can't strand us in skeleton state.
      try {
        const { data: convMembers } = await supabase.from("conversation_members").select("conversation_id, last_read_at").eq("user_id", user.id);
        if (convMembers && convMembers.length > 0) {
          const counts = await Promise.all(convMembers.map(cm =>
            supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", cm.conversation_id).gt("created_at", cm.last_read_at || "2000-01-01")
          ));
          setUnreadChats(counts.filter(c => (c.count || 0) > 0).length);
        }
      } catch (e) { console.warn("unread chats fetch failed", e); }
    } catch (e) {
      console.error("TeenHome fetchData failed", e);
      toast.error("Couldn't load your home. Pull to refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (!wallet?.id) return;
    const ch = supabase.channel("wallet-changes").on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `id=eq.${wallet.id}` }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [wallet?.id]);

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const firstName = profile?.full_name?.split(" ")[0] || "";
  const animBal = useCountUp(wallet?.balance || 0, 1200, showBalance);
  // IST-based greeting (UTC+5:30) regardless of device timezone
  const greet = () => {
    const istHour = (new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + 330) % 1440 / 60;
    return istHour < 12 ? "Good Morning" : istHour < 17 ? "Good Afternoon" : istHour < 21 ? "Good Evening" : "Good Night";
  };

  // Auto-scroll the rewards strip slowly, pause on touch
  useEffect(() => {
    const el = rewardsScrollRef.current;
    if (!el || rewards.length < 2) return;
    let paused = false;
    const onTouch = () => { paused = true; setTimeout(() => { paused = false; }, 4000); };
    el.addEventListener("touchstart", onTouch, { passive: true });
    el.addEventListener("mouseenter", onTouch);
    const id = setInterval(() => {
      if (paused) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 1, behavior: "auto" });
      }
    }, 30);
    return () => {
      clearInterval(id);
      el.removeEventListener("touchstart", onTouch);
      el.removeEventListener("mouseenter", onTouch);
    };
  }, [rewards.length]);

  // Focus search when opened
  useEffect(() => { if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100); }, [searchOpen]);

  const moneyIn = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const moneyOut = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const spendPct = wallet ? Math.min(((wallet.spent_this_month || 0) / (wallet.monthly_limit || 1)) * 100, 100) : 0;

  // Recent Activity list shows only 5; full list backs search + last-amount tooltip.
  const recentForList = transactions.slice(0, 5);

  // Map "merchant name (lowercase)" -> most recent debit amount, for Send Again tooltip.
  const lastAmountByContact = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "debit") continue;
    const key = (t.merchant_name || "").trim().toLowerCase();
    if (!key) continue;
    if (!lastAmountByContact.has(key)) lastAmountByContact.set(key, t.amount);
  }

  const healthScore = Math.min(100, Math.max(0, 100 - spendPct * 0.4 + (goals.length > 0 ? 15 : 0) + (moneyIn > moneyOut ? 20 : 0)));
  const healthColor = healthScore >= 70 ? "hsl(152 60% 45%)" : healthScore >= 40 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)";
  const healthLabel = healthScore >= 70 ? "Excellent" : healthScore >= 40 ? "Good" : "Needs Attention";

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-5 pt-14 pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl skeleton-gold" />
          <div className="space-y-2 flex-1">
            <div className="w-20 h-3 rounded-full skeleton-gold" />
            <div className="w-32 h-4 rounded-full skeleton-gold" />
          </div>
        </div>
        <div className="w-full h-56 rounded-[28px] skeleton-gold mb-6" />
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-[88px] rounded-[22px] skeleton-gold" />)}
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="w-full h-[72px] rounded-2xl skeleton-gold" />)}
        </div>
        <BottomNav />
        <style>{`
          .skeleton-gold {
            background: linear-gradient(110deg, hsl(220 15% 8%) 0%, hsl(220 15% 8%) 40%, hsl(42 78% 55% / 0.06) 50%, hsl(220 15% 8%) 60%, hsl(220 15% 8%) 100%);
            background-size: 200% 100%;
            animation: skel 1.8s ease-in-out infinite;
          }
          @keyframes skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "Add Money", path: "/add-money", desc: "Top up wallet" },
    { icon: Send, label: "Send", path: "/send", desc: "UPI transfer" },
    { icon: QrCode, label: "Scan & Pay", path: "/scan", desc: "QR payment" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", desc: "Insights" },
  ];

  const allFeatures = [
    { label: "My Card", path: "/card", emoji: "💳", desc: "Virtual card" },
    settingOn("feature_bill_split") && { label: "Split Bill", path: "/bill-split", emoji: "👥", desc: "Share costs" },
    { label: "Budget", path: "/budget", emoji: "📈", desc: "Plan ahead" },
    settingOn("feature_quick_pay") && { label: "Quick Pay", path: "/quick-pay", emoji: "⚡", desc: "Fast transfer" },
    settingOn("feature_quick_pay") && { label: "Request", path: "/quick-pay", state: { mode: "request" }, emoji: "💰", desc: "Ask for money" },
    { label: "Scratch", path: "/scratch-cards", emoji: "🎰", desc: "Win rewards" },
    { label: "Spin", path: "/spin-wheel", emoji: "🎡", desc: "Spin to win" },
    settingOn("feature_chores") && { label: "Chores", path: "/chores", emoji: "📋", desc: "Earn money" },
    { label: "Badges", path: "/achievements", emoji: "🏆", desc: "Your badges" },
    { label: "Friends", path: "/friends", emoji: "🤝", desc: "Social hub" },
    settingOn("feature_lessons") && { label: "Learn", path: "/learn", emoji: "📚", desc: "Earn coins" },
    { label: "Bills", path: "/bill-payments", emoji: "⚡", desc: "Pay bills" },
    settingOn("feature_referrals") && { label: "Refer", path: "/referrals", emoji: "🎁", desc: "Earn ₹20" },
  ].filter(Boolean) as Array<{ label: string; path: string; emoji: string; desc: string; state?: any }>;

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      {/* Ambient BG */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-[0.045] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute top-[40%] -left-32 w-[280px] h-[280px] rounded-full opacity-[0.02] blur-[80px]" style={{ background: "hsl(36 60% 48%)" }} />
        <div className="absolute bottom-[20%] right-0 w-[220px] h-[220px] rounded-full opacity-[0.02] blur-[70px]" style={{ background: "hsl(152 60% 45%)" }} />
      </div>

      <div className="relative z-10">
        <div className="h-2" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="px-5 pt-4 pb-5"
        >
          <div className="flex items-center justify-between gap-2">
            {/* Left: avatar with budget progress ring + greeting */}
            <div className={`flex items-center gap-3.5 transition-all duration-300 ${searchOpen ? "opacity-0 w-0 overflow-hidden" : "opacity-100 flex-1 min-w-0"}`}>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => { haptic.light(); navigate("/profile"); }}
                className="shrink-0 relative w-[54px] h-[54px]"
                aria-label="Open profile"
              >
                {/* Progress ring (monthly budget used) */}
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 54 54">
                  <circle cx="27" cy="27" r="25" fill="none" stroke="hsl(220 15% 14%)" strokeWidth="2" />
                  <motion.circle
                    cx="27" cy="27" r="25" fill="none"
                    stroke={spendPct > 80 ? "hsl(0 72% 51%)" : spendPct > 50 ? "hsl(38 92% 50%)" : "hsl(42 78% 55%)"}
                    strokeWidth="2.2" strokeLinecap="round"
                    initial={{ strokeDasharray: "0 157" }}
                    animate={{ strokeDasharray: `${(spendPct / 100) * 157} 157` }}
                    transition={{ duration: 1.4, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    style={{ filter: "drop-shadow(0 0 4px hsl(42 78% 55% / 0.45))" }}
                  />
                </svg>
                <div className="absolute inset-[3px] rounded-full overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full gradient-primary flex items-center justify-center text-[15px] font-bold text-primary-foreground">
                      {initials}
                    </div>
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 w-[13px] h-[13px] rounded-full bg-success border-[2px] border-background z-10" style={{ boxShadow: "0 0 8px hsl(152 60% 45% / 0.6)" }} />
              </motion.button>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground/50 font-medium tracking-wide truncate">{greet()}{firstName ? `, ${firstName}` : ""}</p>
                <h1 className="text-[18px] font-bold tracking-[-0.5px] text-foreground leading-tight font-sora truncate">Welcome back ✨</h1>
              </div>
            </div>

            {/* Expanding search */}
            <motion.div
              animate={{ width: searchOpen ? "100%" : 40 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="relative h-[40px] shrink-0"
              style={{ flexBasis: searchOpen ? "100%" : 40 }}
            >
              {searchOpen ? (
                <div className="w-full h-full rounded-[13px] bg-muted/30 backdrop-blur-sm border border-primary/30 flex items-center pl-3 pr-1 gap-2"
                  style={{ boxShadow: "0 0 16px hsl(42 78% 55% / 0.15)" }}>
                  <Search className="w-[15px] h-[15px] text-primary shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
                    placeholder="Search contacts, transactions…"
                    className="flex-1 min-w-0 bg-transparent outline-none text-[12px] font-sora placeholder:text-muted-foreground/40 text-foreground"
                  />
                  <button onClick={() => { haptic.light(); setSearchOpen(false); setSearchQuery(""); }}
                    className="w-[28px] h-[28px] rounded-[9px] bg-muted/40 flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5 text-muted-foreground/70" />
                  </button>
                </div>
              ) : (
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => { haptic.light(); setSearchOpen(true); }}
                  className="w-[40px] h-[40px] rounded-[13px] bg-muted/30 backdrop-blur-sm flex items-center justify-center border border-border/30">
                  <Search className="w-[17px] h-[17px] text-muted-foreground/50" />
                </motion.button>
              )}
            </motion.div>

            {/* Hide chat + bell when search is open */}
            <div className={`flex items-center gap-2 transition-all duration-200 ${searchOpen ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => { haptic.light(); navigate("/chats"); }}
                className="w-[40px] h-[40px] rounded-[13px] bg-muted/30 backdrop-blur-sm flex items-center justify-center relative border border-border/30">
                <MessageCircle className="w-[17px] h-[17px] text-muted-foreground/50" />
                {unreadChats > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-success flex items-center justify-center text-[7px] font-bold text-primary-foreground" />
                )}
              </motion.button>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => { haptic.light(); navigate("/notifications"); }}
                className="w-[40px] h-[40px] rounded-[13px] bg-muted/30 backdrop-blur-sm flex items-center justify-center relative border border-border/30">
                <Bell className="w-[17px] h-[17px] text-muted-foreground/50" />
                {unreadCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-primary-foreground shadow-[0_2px_12px_hsl(42_78%_55%/0.5)]">
                    {unreadCount}
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Inline search results — shown below the header while typing */}
        {searchOpen && searchQuery.trim() && (
          <InlineSearchResults
            query={searchQuery}
            contacts={favorites.map(f => ({ id: f.id, contact_name: f.contact_name, avatar_emoji: f.avatar_emoji }))}
            transactions={transactions}
            onPickContact={(c) => {
              const fav = favorites.find(f => f.id === c.id);
              setSearchOpen(false); setSearchQuery("");
              navigate("/quick-pay", { state: { selectedContact: fav } });
            }}
            onPickTransaction={(t) => {
              setSearchOpen(false); setSearchQuery("");
              navigate(`/transaction/${t.id}`);
            }}
            onClose={() => { setSearchOpen(false); setSearchQuery(""); }}
          />
        )}

        {/* Pending payment requests — banner if 1, list if 2+ */}
        {userId && <PaymentRequestPill userId={userId} />}

        {/* KYC pending banner */}
        {profile && profile.kyc_status !== "verified" && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, type: "spring", stiffness: 280, damping: 24 }}
            onClick={() => { haptic.light(); navigate("/personal-info"); }}
            className="mx-5 mb-4 w-[calc(100%-2.5rem)] flex items-center gap-3 px-4 py-3 rounded-[16px] border border-warning/25 relative overflow-hidden text-left"
            style={{ background: "linear-gradient(135deg, hsl(38 92% 50% / 0.12), hsl(42 78% 55% / 0.04))" }}
          >
            <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(38 92% 50% / 0.4), transparent)" }} />
            <div className="w-[36px] h-[36px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: "hsl(38 92% 50% / 0.15)" }}>
              <Shield className="w-[17px] h-[17px] text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground font-sora leading-tight">
                Complete KYC to unlock full access
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-sora mt-0.5">
                Verify Aadhaar to remove limits & enable payouts
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-warning shrink-0" />
          </motion.button>
        )}

        {/* Streak + Daily Spin Strip */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 22 }}
          className="px-5 mb-4 flex gap-2.5"
        >
          {/* Streak Card */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { haptic.light(); navigate("/achievements"); }}
            className="flex-1 flex items-center gap-2.5 px-3.5 py-3 rounded-[16px] border border-border/20 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(220 18% 9%), hsl(220 20% 6%))" }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.1), transparent)" }} />
            <div className="w-[36px] h-[36px] rounded-[11px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(25 100% 50% / 0.12), hsl(42 78% 55% / 0.06))" }}>
              <Flame className="w-[18px] h-[18px] text-warning" style={{ filter: "drop-shadow(0 0 6px hsl(38 92% 50% / 0.5))" }} />
            </div>
            <div className="text-left">
              <p className="text-[18px] font-bold tabular-nums font-mono leading-none text-warning">{streak?.current_streak || 0}</p>
              <p className="text-[8px] text-muted-foreground/40 font-semibold tracking-[0.08em] uppercase font-sora mt-0.5">Day Streak</p>
            </div>
            {(streak?.current_streak || 0) >= 7 && (
              <div className="ml-auto px-2 py-0.5 rounded-full bg-warning/[0.08] border border-warning/10">
                <span className="text-[7px] font-bold text-warning font-sora">🔥 ON FIRE</span>
              </div>
            )}
          </motion.button>

          {/* Daily Spin */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { haptic.medium(); navigate("/spin-wheel"); }}
            className="flex items-center gap-2.5 px-3.5 py-3 rounded-[16px] border border-primary/[0.1] relative overflow-hidden"
            style={{ background: "radial-gradient(ellipse at 80% 20%, hsl(42 78% 55% / 0.06) 0%, transparent 60%), linear-gradient(135deg, hsl(220 18% 9%), hsl(220 20% 6%))" }}
          >
            <motion.span
              className="text-[24px]"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              🎡
            </motion.span>
            <div className="text-left">
              <p className="text-[10px] font-bold text-primary font-sora leading-tight">Daily Spin</p>
              <p className="text-[8px] text-muted-foreground/30 font-sora">Win rewards</p>
            </div>
          </motion.button>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.08 }}
          className="px-5 mb-5"
          style={{ perspective: "800px" }}
        >
          <div
            ref={cardRef}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={() => setCardTilt({ x: 0, y: 0 })}
            className="zen-balance-card zen-card-shimmer relative rounded-[26px] overflow-hidden"
            style={{
              transform: `rotateY(${cardTilt.x}deg) rotateX(${cardTilt.y}deg)`,
              transition: cardTilt.x === 0 && cardTilt.y === 0 ? "transform 0.5s ease-out" : "transform 0.1s ease-out",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent 5%, hsl(42 78% 55% / 0.35) 30%, hsl(42 78% 55% / 0.5) 50%, hsl(42 78% 55% / 0.35) 70%, transparent 95%)" }} />

            <div className="relative z-10 p-5 pb-4">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-[6px] h-[6px] rounded-full bg-primary" style={{ boxShadow: "0 0 10px hsl(42 78% 55% / 0.8)", animation: "glow-pulse 2.5s ease-in-out infinite" }} />
                    <p className="text-[9px] text-foreground/25 font-bold tracking-[0.3em] uppercase font-sora">Available Balance</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => { e.stopPropagation(); haptic.selection(); setShowBalance(!showBalance); }}
                    className="flex items-center gap-2.5"
                  >
                    <AnimatePresence mode="wait">
                      {showBalance ? (
                        <motion.h2
                          key="bal"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="text-[44px] font-bold tracking-[-2px] tabular-nums leading-none text-primary font-mono"
                          style={{ textShadow: "0 2px 8px hsl(42 78% 55% / 0.15)" }}
                        >
                          {fmt(animBal)}
                        </motion.h2>
                      ) : (
                        <motion.div
                          key="hidden"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          className="flex items-end gap-1.5 leading-none select-none h-[44px]"
                          aria-label="Balance hidden"
                        >
                          <span className="text-[40px] font-bold text-primary/35 mr-1">₹</span>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <span
                              key={i}
                              className="w-2.5 h-2.5 rounded-full bg-primary/40"
                              style={{
                                animation: `dot-pulse 1.4s ease-in-out ${i * 0.12}s infinite`,
                                boxShadow: "0 0 6px hsl(42 78% 55% / 0.4)",
                              }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="w-8 h-8 rounded-[10px] bg-muted/20 flex items-center justify-center backdrop-blur-sm border border-border/20">
                      {showBalance ? <EyeOff className="w-[14px] h-[14px] text-foreground/25" /> : <Eye className="w-[14px] h-[14px] text-foreground/25" />}
                    </div>
                  </motion.button>
                </div>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => { haptic.medium(); navigate("/scan"); }}
                  className="w-[52px] h-[52px] rounded-[18px] gradient-primary flex items-center justify-center"
                  style={{ boxShadow: "0 8px 28px hsl(42 78% 55% / 0.3), inset 0 1px 0 hsl(48 90% 70% / 0.25)" }}
                >
                  <QrCode className="w-[24px] h-[24px] text-primary-foreground" strokeWidth={1.8} />
                </motion.button>
              </div>

              {wallet?.is_frozen && (
                <div className="mb-3.5 px-3 py-1.5 bg-destructive/[0.06] rounded-xl inline-flex items-center gap-2 border border-destructive/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  <span className="text-[10px] font-semibold text-destructive/80 font-sora">Wallet Frozen</span>
                </div>
              )}

              {/* Spent Today / Daily Limit + horizontal progress */}
              {(() => {
                const todayPct = wallet ? Math.min(((wallet.spent_today || 0) / Math.max(wallet.daily_limit || 1, 1)) * 100, 100) : 0;
                const todayColor = todayPct > 80 ? "hsl(0 72% 51%)" : todayPct > 50 ? "hsl(38 92% 50%)" : "hsl(42 78% 55%)";
                return (
                  <div className="mb-3 pt-3.5 border-t border-border/15">
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <span className="text-[8px] text-foreground/25 font-bold tracking-[0.15em] uppercase font-sora block mb-0.5">Spent Today</span>
                        <p className="text-[13px] font-bold tabular-nums font-mono text-foreground/85">{fmt(wallet?.spent_today || 0)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] text-foreground/25 font-bold tracking-[0.15em] uppercase font-sora block mb-0.5">Daily Limit</span>
                        <p className="text-[13px] font-bold tabular-nums font-mono text-foreground/55">{fmt(wallet?.daily_limit || 0)}</p>
                      </div>
                    </div>
                    <div className="h-[4px] rounded-full bg-muted/25 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${todayPct}%` }}
                        transition={{ duration: 1.1, delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${todayColor}, ${todayColor}cc)`,
                          boxShadow: `0 0 10px ${todayColor}55`,
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Income / Expense */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative rounded-[16px] px-3.5 py-3 overflow-hidden border border-success/[0.06]">
                  <div className="absolute inset-0 bg-success/[0.02]" />
                  <div className="relative z-10 flex items-center gap-2.5">
                    <div className="w-[22px] h-[22px] rounded-[7px] bg-success/[0.1] flex items-center justify-center">
                      <ArrowDownLeft className="w-2.5 h-2.5 text-success" />
                    </div>
                    <div>
                      <span className="text-[8px] text-foreground/20 font-bold tracking-[0.15em] uppercase font-sora block">Income</span>
                      <p className="text-[14px] font-bold text-success tabular-nums font-mono">{fmt(moneyIn)}</p>
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
                      <span className="text-[8px] text-foreground/20 font-bold tracking-[0.15em] uppercase font-sora block">Spent</span>
                      <p className="text-[14px] font-bold text-destructive tabular-nums font-mono">{fmt(moneyOut)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Zenzo Points Widget */}
        <div className="px-5 mb-5">
          <ZenzoPointsWidget userId={userId} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, type: "spring", stiffness: 200, damping: 22 }}
          className="px-5 mb-5"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { haptic.medium(); navigate("/send"); }}
            className="group w-full rounded-[20px] p-4 relative overflow-hidden border border-primary/15 text-left flex items-center gap-3.5"
            style={{
              background: "linear-gradient(135deg, hsl(220 22% 9%) 0%, hsl(220 18% 6%) 100%)",
              boxShadow: "0 8px 28px -8px hsl(42 78% 55% / 0.12), inset 0 1px 0 hsl(42 78% 55% / 0.08)",
            }}
          >
            <div className="absolute -right-10 -top-10 w-[180px] h-[180px] rounded-full opacity-[0.06] blur-[60px]" style={{ background: "hsl(42 78% 55%)" }} />
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.3), transparent)" }} />

            {/* Indian flag tile */}
            <div className="relative w-[46px] h-[46px] rounded-[14px] overflow-hidden shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ border: "1px solid hsl(42 30% 30% / 0.3)" }}>
              <div className="absolute inset-x-0 top-0 h-1/3" style={{ background: "hsl(20 80% 50%)" }} />
              <div className="absolute inset-x-0 top-1/3 h-1/3 bg-white flex items-center justify-center">
                <div className="w-3 h-3 rounded-full border-[1.5px]" style={{ borderColor: "hsl(220 80% 35%)" }} />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: "hsl(120 50% 35%)" }} />
            </div>

            <div className="flex-1 min-w-0 relative z-10">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[8px] font-bold text-primary tracking-[0.18em] uppercase font-sora">India · UPI</span>
                <span className="w-1 h-1 rounded-full bg-success animate-pulse" />
              </div>
              <h3 className="text-[14px] font-bold leading-tight font-sora">Send Money Across India</h3>
              <p className="text-[10px] text-muted-foreground/45 font-sora mt-0.5">Instant UPI transfers · Zero fees</p>
            </div>

            <div
              className="w-[40px] h-[40px] rounded-full gradient-primary flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-45 group-active:rotate-45"
              style={{ boxShadow: "0 6px 20px hsl(42 78% 55% / 0.35), inset 0 1px 0 hsl(48 90% 70% / 0.3)" }}
            >
              <ArrowRight className="w-[18px] h-[18px] text-primary-foreground" strokeWidth={2.2} />
            </div>
          </motion.button>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={stagger.container}
          initial="hidden"
          animate="show"
          className="px-5 mb-5 grid grid-cols-4 gap-2.5"
        >
          {quickActions.map((a) => (
            <motion.button
              key={a.label}
              variants={stagger.item}
              whileTap={{ scale: 0.88 }}
              onClick={() => { haptic.light(); navigate(a.path); }}
              className="flex flex-col items-center gap-2 py-3.5 rounded-[20px] bg-muted/15 border border-border/20 relative overflow-hidden group"
            >
              <div className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center bg-primary/[0.08] border border-primary/[0.06] shadow-[0_4px_14px_hsl(42_78%_55%/0.06)]">
                <a.icon className="w-[20px] h-[20px] text-primary" strokeWidth={1.8} style={{ filter: "drop-shadow(0 0 4px hsl(42 78% 55% / 0.25))" }} />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground font-sora">{a.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Monthly Spending Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 22 }}
          className="px-5 mb-5"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { haptic.light(); navigate("/analytics"); }}
            className="w-full rounded-[20px] p-4 relative overflow-hidden border border-border/20 text-left"
            style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.1), transparent)" }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary/70" />
                <span className="text-[11px] font-semibold text-muted-foreground/60 font-sora">Monthly Budget</span>
              </div>
              <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full ${
                spendPct > 80 ? "bg-destructive/[0.08] text-destructive border border-destructive/10"
                : spendPct > 50 ? "bg-warning/[0.08] text-warning border border-warning/10"
                : "bg-success/[0.08] text-success border border-success/10"
              }`}>{Math.round(spendPct)}% used</span>
            </div>
            <div className="flex items-end justify-between mb-2.5">
              <p className="text-[22px] font-bold tabular-nums tracking-[-1px] font-mono">{fmt(wallet?.spent_this_month || 0)}</p>
              <p className="text-[10px] text-muted-foreground/30 mb-1 font-mono">of {fmt(wallet?.monthly_limit || 0)}</p>
            </div>
            <div className="h-[6px] rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${spendPct}%` }}
                transition={{ duration: 1, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="h-full rounded-full"
                style={{
                  background: spendPct > 80 ? "linear-gradient(90deg, hsl(0 72% 51%), hsl(0 72% 41%))" : spendPct > 50 ? "linear-gradient(90deg, hsl(38 92% 50%), hsl(28 92% 45%))" : "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 42%))",
                  boxShadow: spendPct > 80 ? "0 0 12px hsl(0 72% 51% / 0.4)" : "0 0 12px hsl(42 78% 55% / 0.25)",
                }}
              />
            </div>
          </motion.button>
        </motion.div>

        {/* Achievement Badges Preview */}
        {recentAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, type: "spring", stiffness: 200, damping: 22 }}
            className="px-5 mb-5"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { haptic.light(); navigate("/achievements"); }}
              className="w-full rounded-[20px] p-4 relative overflow-hidden border border-border/20 text-left"
              style={{ background: "radial-gradient(ellipse 50% 70% at 90% 20%, hsl(42 78% 55% / 0.04) 0%, transparent 60%), linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}
            >
              <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.08), transparent)" }} />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary/70" />
                  <span className="text-[11px] font-semibold text-muted-foreground/60 font-sora">Recent Badges</span>
                </div>
                <span className="text-[9px] text-primary/50 font-semibold flex items-center gap-0.5 font-sora">View All <ChevronRight className="w-3 h-3" /></span>
              </div>
              <div className="flex items-center gap-2">
                {recentAchievements.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
                    className="w-[44px] h-[44px] rounded-[14px] bg-muted/20 border border-border/15 flex items-center justify-center text-[20px]"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                  >
                    {a.icon || "🏆"}
                  </motion.div>
                ))}
                <div className="flex-1 min-w-0 ml-1">
                  <p className="text-[10px] font-semibold text-muted-foreground/50 font-sora">{recentAchievements[0]?.title}</p>
                  <p className="text-[8px] text-muted-foreground/25 font-sora mt-0.5">{recentAchievements.length} earned</p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Financial Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, type: "spring", stiffness: 200, damping: 22 }}
          className="px-5 mb-5"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { haptic.light(); navigate("/analytics"); }}
            className="w-full relative overflow-hidden rounded-[20px] p-4 text-left border border-border/20"
            style={{ background: `radial-gradient(ellipse 50% 80% at 85% 20%, ${healthColor}06 0%, transparent 60%), linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))` }}
          >
            <div className="flex items-center gap-3.5">
              <div className="relative w-[56px] h-[56px] shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(220 15% 12%)" strokeWidth="4.5" />
                  <motion.circle
                    cx="28" cy="28" r="22" fill="none" stroke={healthColor} strokeWidth="4.5" strokeLinecap="round"
                    initial={{ strokeDasharray: "0 138.2" }}
                    animate={{ strokeDasharray: `${(healthScore / 100) * 138.2} 138.2` }}
                    transition={{ duration: 1.5, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    style={{ filter: `drop-shadow(0 0 4px ${healthColor}50)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[14px] font-bold tabular-nums font-mono" style={{ color: healthColor }}>{Math.round(healthScore)}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Shield className="w-3 h-3 text-primary/50" />
                  <span className="text-[9px] font-bold text-muted-foreground/40 tracking-[0.08em] uppercase font-sora">Health Score</span>
                </div>
                <p className="text-[14px] font-bold font-sora" style={{ color: healthColor }}>{healthLabel}</p>
                <p className="text-[10px] text-muted-foreground/30 font-sora">Spending habits & savings</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/20 shrink-0" />
            </div>
          </motion.button>
        </motion.div>

        {/* Send Again */}
        {favorites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, type: "spring", stiffness: 200, damping: 22 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-3 px-5">
              <h3 className="text-[13px] font-bold tracking-[-0.3px] font-sora">Send Again</h3>
              <button onClick={() => { haptic.light(); navigate("/quick-pay"); }} className="text-[10px] text-primary/70 font-semibold flex items-center gap-0.5 font-sora">
                See All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-3.5 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {favorites.map((fav, i) => {
                const lastAmt = lastAmountByContact.get(fav.contact_name.trim().toLowerCase());
                return (
                  <PressTooltip
                    key={fav.id}
                    label={lastAmt != null ? `Pay Again ₹${(lastAmt / 100).toLocaleString("en-IN")}` : null}
                    className={`${i === 0 ? "min-w-[66px]" : "min-w-[58px]"}`}
                  >
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.45 + i * 0.06, type: "spring", stiffness: 300, damping: 22 }}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => { haptic.light(); navigate("/quick-pay", { state: { selectedContact: fav } }); }}
                      className="flex flex-col items-center gap-2 group w-full"
                    >
                      <div
                        className={`${i === 0 ? "w-[66px] h-[66px] text-[26px]" : "w-[50px] h-[50px] text-[22px]"} rounded-full flex items-center justify-center transition-all relative`}
                        style={{
                          background: "linear-gradient(135deg, hsl(220 18% 11%), hsl(220 20% 7%))",
                          border: i === 0 ? "1.5px solid hsl(42 78% 55% / 0.55)" : "1px solid hsl(0 0% 100% / 0.06)",
                          boxShadow: i === 0
                            ? "0 6px 20px hsl(42 78% 55% / 0.25), 0 0 0 3px hsl(42 78% 55% / 0.08)"
                            : "0 2px 8px rgba(0,0,0,0.25)",
                        }}
                      >
                        {fav.avatar_emoji}
                        {i === 0 && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-[1px] rounded-full text-[7px] font-bold tracking-wider gradient-primary text-primary-foreground shadow-[0_2px_8px_hsl(42_78%_55%/0.4)]">NEW</span>
                        )}
                      </div>
                      <span className={`${i === 0 ? "text-[10px] font-bold text-foreground/85" : "text-[9px] font-medium text-muted-foreground/55"} truncate w-full text-center font-sora`}>{fav.contact_name.split(" ")[0]}</span>
                    </motion.button>
                  </PressTooltip>
                );
              })}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 + favorites.length * 0.06, type: "spring" }}
                whileTap={{ scale: 0.88 }}
                onClick={() => { haptic.light(); navigate("/quick-pay"); }}
                className="flex flex-col items-center gap-2 min-w-[58px]"
              >
                <div className="w-[50px] h-[50px] rounded-[16px] bg-primary/[0.03] border border-primary/[0.08] flex items-center justify-center">
                  <Plus className="w-4.5 h-4.5 text-primary/40" />
                </div>
                <span className="text-[9px] text-primary/40 font-semibold font-sora">Add</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Savings Goals */}
        {goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 22 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-3 px-5">
              <h3 className="text-[13px] font-bold tracking-[-0.3px] flex items-center gap-1.5 font-sora">
                <Target className="w-3.5 h-3.5 text-primary/70" /> Goals
              </h3>
              <button onClick={() => { haptic.light(); navigate("/savings"); }} className="text-[10px] text-primary/70 font-semibold flex items-center gap-0.5 font-sora">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {goals.map((goal, i) => {
                const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
                return (
                  <motion.button
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 + i * 0.06, type: "spring", stiffness: 300, damping: 22 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { haptic.light(); navigate("/savings"); }}
                    className="min-w-[140px] w-full p-3.5 rounded-[18px] bg-muted/15 border border-border/20 text-left"
                  >
                    <div className="text-[24px] mb-2">{goal.icon || "🎯"}</div>
                    <p className="text-[11px] font-semibold truncate mb-2 font-sora">{goal.title}</p>
                    <div className="w-full h-[4px] rounded-full bg-muted/30 overflow-hidden mb-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.8, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 48%))", boxShadow: "0 0 8px hsl(42 78% 55% / 0.25)" }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-muted-foreground/30 font-medium font-mono">{Math.round(pct)}%</span>
                      <span className="text-[9px] text-primary font-bold font-mono">{fmt(goal.current_amount)}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.56, type: "spring", stiffness: 200, damping: 22 }}
          className="px-5 mb-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold tracking-[-0.3px] flex items-center gap-1.5 font-sora">
              <Clock className="w-3.5 h-3.5 text-primary/70" /> Recent Activity
            </h3>
            <button onClick={() => { haptic.light(); navigate("/activity"); }} className="text-[10px] text-primary/70 font-semibold flex items-center gap-0.5 font-sora">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {recentForList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-14 rounded-[20px] bg-muted/10 border border-border/20"
            >
              <div className="w-[56px] h-[56px] rounded-[18px] bg-muted/15 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-7 h-7 text-muted-foreground/15" />
              </div>
              <p className="text-[13px] font-semibold text-muted-foreground/40 mb-0.5 font-sora">No transactions yet</p>
              <p className="text-[10px] text-muted-foreground/20 font-sora">Your activity will appear here</p>
            </motion.div>
          ) : (
            <div className="relative rounded-[20px] overflow-hidden border border-border/20" style={{
              background: "linear-gradient(160deg, hsl(220 18% 8.5%), hsl(220 20% 5%))",
              boxShadow: "0 8px 32px -8px hsl(220 20% 4% / 0.5), inset 0 1px 0 hsl(40 20% 95% / 0.02)"
            }}>
              <div className="absolute top-0 inset-x-0 h-[1px] z-10" style={{ background: "linear-gradient(90deg, transparent 10%, hsl(42 78% 55% / 0.1) 50%, transparent 90%)" }} />
              {recentForList.map((tx, idx) => (
                <SwipeActionRow
                  key={tx.id}
                  onDetails={() => navigate(`/transaction/${tx.id}`)}
                  onDispute={() => navigate("/help")}
                  className={idx < recentForList.length - 1 ? "border-b border-border/10" : ""}
                >
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.05, type: "spring", stiffness: 300, damping: 24 }}
                    whileTap={{ scale: 0.98, backgroundColor: "rgba(255,255,255,0.025)" }}
                    onClick={() => { haptic.light(); navigate(`/transaction/${tx.id}`); }}
                    className="w-full flex items-center gap-3 px-3.5 py-3.5 transition-all duration-200"
                    style={{ background: "linear-gradient(160deg, hsl(220 18% 8.5%), hsl(220 20% 5%))" }}
                  >
                    <div className="w-[40px] h-[40px] rounded-[13px] bg-muted/20 flex items-center justify-center text-[18px] shrink-0 border border-border/10">
                      {catEmoji[tx.category || "other"] || "💸"}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[11px] font-semibold truncate font-sora">{tx.merchant_name || tx.category || "Transaction"}</p>
                      <p className="text-[9px] text-muted-foreground/30 capitalize mt-0.5 font-sora">
                        {tx.category || "other"} · {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[12px] font-bold tabular-nums font-mono ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                        {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                      </p>
                      <p className={`text-[8px] font-medium mt-0.5 font-sora ${
                        tx.status === "success" ? "text-success/40" : tx.status === "pending" ? "text-warning/50" : "text-destructive/40"
                      }`}>
                        {tx.status === "success" ? "Completed" : tx.status === "pending" ? "Pending" : tx.status}
                      </p>
                    </div>
                  </motion.button>
                </SwipeActionRow>
              ))}
            </div>
          )}
        </motion.div>

        {/* Rewards */}
        {rewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, type: "spring", stiffness: 200, damping: 22 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-3 px-5">
              <h3 className="text-[13px] font-bold tracking-[-0.3px] flex items-center gap-1.5 font-sora">
                <Gift className="w-3.5 h-3.5 text-primary/70" /> Rewards
              </h3>
              <button onClick={() => { haptic.light(); navigate("/rewards"); }} className="text-[10px] text-primary/70 font-semibold flex items-center gap-0.5 font-sora">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div ref={rewardsScrollRef} className="flex gap-2.5 overflow-x-auto px-5 pb-1 scrollbar-hide scroll-smooth">
              {rewards.map((r, i) => (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.06, type: "spring" }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { haptic.light(); navigate(`/rewards/${r.id}`); }}
                  className="min-w-[160px] rounded-[18px] overflow-hidden bg-muted/15 border border-border/20"
                >
                  {r.image_url ? (
                    <div className="w-full h-[88px] overflow-hidden"><img src={r.image_url} alt={r.title} className="w-full h-full object-cover" loading="lazy" /></div>
                  ) : (
                    <div className="w-full h-[88px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(42 78% 55% / 0.05), transparent)" }}>
                      <Sparkles className="w-7 h-7 text-primary/12" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[10px] font-semibold truncate font-sora">{r.title}</p>
                    <p className="text-[8px] text-muted-foreground/30 mt-0.5 truncate font-sora">{r.description || "Limited time"}</p>
                    <div className="mt-2 inline-flex px-2.5 py-1 rounded-[8px] bg-primary/[0.05] text-primary text-[9px] font-bold border border-primary/[0.06] font-mono">
                      {r.discount_type === "percentage" ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Services Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72 }}
          className="px-5 mb-5"
        >
          <h3 className="text-[13px] font-bold tracking-[-0.3px] mb-3 font-sora">Services</h3>
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-4 gap-2">
            {allFeatures.map((f) => (
              <motion.button
                key={f.label}
                variants={stagger.item}
                whileTap={{ scale: 0.88 }}
                onClick={() => { haptic.light(); navigate(f.path, (f as any).state ? { state: (f as any).state } : undefined); }}
                className="flex flex-col items-center gap-1 py-3 rounded-[16px] bg-muted/10 border border-border/15 group"
              >
                <span className="text-[22px] group-active:scale-110 transition-transform duration-200">{f.emoji}</span>
                <span className="text-[9px] font-semibold text-muted-foreground/50 font-sora">{f.label}</span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* Refer & Earn */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="px-5 mb-8"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic.medium();
              navigate("/referrals");
            }}
            className="w-full relative overflow-hidden rounded-[20px] p-4 text-left border border-border/20"
            style={{ background: "radial-gradient(ellipse 50% 70% at 90% 30%, hsl(42 78% 55% / 0.05) 0%, transparent 60%), linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}
          >
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.12), transparent)" }} />
            <div className="relative z-10 flex items-center gap-3.5">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-primary/60" />
                  <span className="text-[9px] font-bold text-muted-foreground/40 tracking-[0.08em] uppercase font-sora">Referral</span>
                </div>
                <h3 className="text-[14px] font-bold leading-snug mb-0.5 font-sora">Invite & Earn ₹20</h3>
                <p className="text-[10px] text-muted-foreground/30 mb-3 font-sora">Friend gets ₹20 too</p>
                <div className="inline-flex items-center gap-1.5 gradient-primary text-primary-foreground px-3.5 py-2 rounded-[10px] shadow-[0_4px_20px_hsl(42_78%_55%/0.25)]">
                  <Send className="w-3 h-3" />
                  <span className="text-[10px] font-bold font-sora">Invite Now</span>
                </div>
              </div>
              <span className="text-[36px] shrink-0" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>🎁</span>
            </div>
          </motion.button>
        </motion.div>

        {/* Explore */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.86 }}
          className="px-5 mb-8"
        >
          <h3 className="text-[13px] font-bold tracking-[-0.3px] mb-3 font-sora">Explore</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { haptic.light(); navigate("/savings"); }}
              className="rounded-[18px] p-3.5 overflow-hidden relative bg-muted/10 border border-border/15 text-left">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.03] blur-[25px]" style={{ background: "hsl(152 60% 45%)" }} />
              <span className="text-[26px] mb-2 block">🏦</span>
              <p className="text-[11px] font-semibold mb-0.5 font-sora">Save & Invest</p>
              <p className="text-[9px] text-muted-foreground/30 font-sora">Set savings goals</p>
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { haptic.light(); navigate("/learn"); }}
              className="rounded-[18px] p-3.5 overflow-hidden relative bg-muted/10 border border-border/15 text-left">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.03] blur-[25px]" style={{ background: "hsl(42 78% 55%)" }} />
              <span className="text-[26px] mb-2 block">📚</span>
              <p className="text-[11px] font-semibold mb-0.5 font-sora">Learn & Earn</p>
              <p className="text-[9px] text-muted-foreground/30 font-sora">Financial quizzes</p>
            </motion.button>
          </div>
        </motion.div>
      </div>

      <BottomNav />

      <style>{`
        @keyframes shimmer-card {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px hsl(42 78% 55% / 0.8); }
          50% { opacity: 0.6; box-shadow: 0 0 4px hsl(42 78% 55% / 0.4); }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export default TeenHome;
