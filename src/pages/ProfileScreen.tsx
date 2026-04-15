import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Shield, Wallet, Users, Target, Bell, HelpCircle, Info, LogOut,
  ChevronRight, Trophy, Star, Flame, Zap, Crown, Copy, Check, Gem,
  Award, TrendingUp, Gift,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

const ProfileScreen = () => {
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [txCount, setTxCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [rewardCount, setRewardCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [p, w, g, rr] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
        supabase.from("savings_goals").select("id").eq("teen_id", user.id),
        supabase.from("reward_redemptions").select("id").eq("user_id", user.id),
      ]);
      setProfile(p.data);
      setWallet(w.data);
      setGoalCount(g.data?.length || 0);
      setRewardCount(rr.data?.length || 0);
      if (w.data) {
        const { data: txns } = await supabase.from("transactions").select("id").eq("wallet_id", w.data.id);
        setTxCount(txns?.length || 0);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleLogout = async () => {
    haptic.medium();
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Logged out");
  };

  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;
  const referralCode = profile?.phone ? `AURO${profile.phone.slice(-4)}` : "AURO0000";

  // Account level system
  const xp = (txCount * 10) + (goalCount * 25) + (rewardCount * 15) + (profile?.kyc_status === "verified" ? 100 : 0);
  const levels = [
    { name: "Starter", minXP: 0, icon: Star, color: "hsl(220 15% 50%)" },
    { name: "Explorer", minXP: 50, icon: Zap, color: "hsl(210 80% 55%)" },
    { name: "Pro", minXP: 150, icon: Gem, color: "hsl(270 70% 60%)" },
    { name: "Elite", minXP: 500, icon: Crown, color: "hsl(42 78% 55%)" },
    { name: "Legend", minXP: 1000, icon: Trophy, color: "hsl(340 75% 55%)" },
  ];
  const currentLevel = [...levels].reverse().find(l => xp >= l.minXP) || levels[0];
  const nextLevel = levels.find(l => l.minXP > xp);
  const levelProgress = nextLevel ? ((xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 : 100;
  const LevelIcon = currentLevel.icon;

  // Achievement badges
  const badges = [
    { icon: Flame, label: "First Transaction", desc: "Complete your first transaction", earned: txCount > 0, points: 50 },
    { icon: Target, label: "Goal Setter", desc: "Create a savings goal", earned: goalCount > 0, points: 100 },
    { icon: Shield, label: "KYC Verified", desc: "Verify your identity", earned: profile?.kyc_status === "verified", points: 200 },
    { icon: Zap, label: "Power Saver", desc: "Save ₹1,000+", earned: (wallet?.balance || 0) >= 100000, points: 300 },
    { icon: TrendingUp, label: "10 Transactions", desc: "Complete 10 transactions", earned: txCount >= 10, points: 500 },
    { icon: Gift, label: "Reward Hunter", desc: "Redeem a reward", earned: rewardCount > 0, points: 150 },
  ];
  const totalPoints = badges.filter(b => b.earned).reduce((s, b) => s + b.points, 0);
  const earnedCount = badges.filter(b => b.earned).length;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedReferral(true);
    haptic.light();
    toast.success("Referral code copied!");
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const menuItems = [
    { icon: User, label: "Personal Info", path: "/personal-info", desc: "Name, phone, email" },
    { icon: Shield, label: "Security & PIN", path: "/security", desc: "Change PIN, biometrics" },
    { icon: Wallet, label: "Spending Limits", path: "/spending-limits", desc: "Daily & monthly limits" },
    { icon: Users, label: "Linked Parents", path: "/linked-parents", desc: "Manage parent connections" },
    { icon: Target, label: "Savings Goals", path: "/savings", desc: "Track your goals" },
    { icon: Bell, label: "Notifications", path: "/notifications", desc: "Alert preferences" },
    { icon: HelpCircle, label: "Help & Support", path: "/help", desc: "FAQs, contact us" },
    { icon: Info, label: "About AuroPay", path: "/about", desc: "Version, terms" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay pb-28">
        <div className="flex flex-col items-center pt-10 px-5">
          <div className="w-24 h-24 rounded-full bg-muted animate-pulse mb-4" />
          <div className="w-36 h-5 bg-muted rounded animate-pulse mb-2" />
          <div className="w-24 h-4 bg-muted rounded animate-pulse" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay pb-28">
      {/* Profile Hero */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(42 78% 55% / 0.06) 0%, transparent 60%)" }} />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-[0.06]" style={{ background: "hsl(42 78% 55%)" }} />

        <div className="relative z-10 flex flex-col items-center pt-8 pb-6 px-5">
          {/* Avatar with level ring */}
          <div className="relative mb-4">
            <div className="absolute -inset-1.5 rounded-full" style={{ background: `conic-gradient(${currentLevel.color} ${levelProgress}%, transparent ${levelProgress}%)`, opacity: 0.6 }} />
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover relative z-10 ring-2 ring-background" />
            ) : (
              <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground relative z-10 ring-2 ring-background shadow-[0_4px_20px_hsl(42_78%_55%/0.25)]">
                {initials}
              </div>
            )}
            {/* Level badge */}
            <div className="absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ background: currentLevel.color }}>
              <LevelIcon className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-[-0.5px]">{profile?.full_name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{profile?.phone}</p>

          {/* KYC + Level badges */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`px-3 py-1 rounded-full text-[10px] font-semibold ${
              profile?.kyc_status === "verified" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}>
              {profile?.kyc_status === "verified" ? "✓ Verified" : "⏳ Pending KYC"}
            </div>
            <div className="px-3 py-1 rounded-full text-[10px] font-semibold" style={{ background: `${currentLevel.color}20`, color: currentLevel.color }}>
              {currentLevel.name} · {xp} XP
            </div>
          </div>
        </div>
      </div>

      {/* Level Progress Card */}
      <div className="px-5 mb-5 animate-slide-up-delay-1">
        <div className="rounded-2xl p-4 border border-border" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <LevelIcon className="w-4 h-4" style={{ color: currentLevel.color }} />
              <span className="text-[12px] font-semibold">{currentLevel.name}</span>
            </div>
            {nextLevel && (
              <span className="text-[10px] text-muted-foreground">{nextLevel.minXP - xp} XP to {nextLevel.name}</span>
            )}
          </div>
          <div className="w-full h-2 rounded-full bg-muted/20 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${levelProgress}%`, background: currentLevel.color }} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-5 mb-5 animate-slide-up-delay-1">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Balance", value: formatAmount(wallet?.balance || 0) },
            { label: "Txns", value: txCount.toString() },
            { label: "Goals", value: goalCount.toString() },
            { label: "Points", value: totalPoints.toString() },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 border border-border text-center" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="px-5 mb-5 animate-slide-up-delay-2">
        <div className="relative rounded-2xl p-4 border border-primary/20 overflow-hidden" style={{ background: "linear-gradient(145deg, hsl(42 78% 55% / 0.05), hsl(220 15% 8%))" }}>
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-primary" />
              <p className="text-[12px] font-semibold text-primary">Your Referral Code</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-primary/5 rounded-xl px-4 py-3 border border-primary/10">
                <p className="text-lg font-bold tracking-[0.15em] text-primary">{referralCode}</p>
              </div>
              <button onClick={copyReferral} className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center active:scale-90 transition-all">
                {copiedReferral ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5 text-primary" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Share & earn ₹100 for each referral</p>
          </div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="px-5 mb-5 animate-slide-up-delay-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <p className="text-[13px] font-semibold">Achievements</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{earnedCount}/{badges.length} unlocked</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {badges.map(b => (
            <div key={b.label}
              className={`relative rounded-2xl p-3 border flex flex-col items-center text-center transition-all ${
                b.earned
                  ? "border-primary/30 bg-primary/[0.03]"
                  : "border-border opacity-40"
              }`}
              style={{ background: b.earned ? undefined : "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
              {b.earned && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 ${b.earned ? "bg-primary/10" : "bg-muted/20"}`}>
                <b.icon className={`w-5 h-5 ${b.earned ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <p className="text-[10px] font-semibold leading-tight">{b.label}</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{b.points} pts</p>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-5 mb-5 animate-slide-up-delay-2">
        <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => { haptic.light(); navigate(item.path); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-muted/10 transition-all ${
                i < menuItems.length - 1 ? "border-b border-border/30" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-muted/15 flex items-center justify-center shrink-0">
                <item.icon className="w-[18px] h-[18px] text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-5 mb-8">
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive text-sm font-semibold active:scale-[0.98] transition-all">
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfileScreen;
