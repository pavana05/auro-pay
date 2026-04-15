import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Shield, Wallet, Users, Target, Bell, HelpCircle, Info, LogOut,
  ChevronRight, Trophy, Star, Flame, Zap, Crown, Copy, Check, Gem,
  Award, TrendingUp, Gift, Tag, Clock,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

const SlotMachineText = ({ text }: { text: string }) => {
  const [revealed, setRevealed] = useState(false);
  const [slots, setSlots] = useState<string[]>(text.split("").map(() => " "));

  useEffect(() => {
    const chars = text.split("");
    const timers: NodeJS.Timeout[] = [];
    
    // Scramble phase — each character cycles through random chars
    chars.forEach((_, i) => {
      const scrambleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let count = 0;
      const maxCycles = 6 + i * 3; // Later chars spin longer
      const interval = setInterval(() => {
        setSlots(prev => {
          const next = [...prev];
          next[i] = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
          return next;
        });
        count++;
        if (count >= maxCycles) {
          clearInterval(interval);
          // Land on final character
          setSlots(prev => {
            const next = [...prev];
            next[i] = chars[i];
            return next;
          });
          if (i === chars.length - 1) setRevealed(true);
        }
      }, 60);
      timers.push(interval as unknown as NodeJS.Timeout);
    });

    return () => timers.forEach(t => clearInterval(t));
  }, [text]);

  return (
    <p className="text-lg font-bold tracking-[0.15em] text-primary flex">
      {slots.map((char, i) => (
        <span
          key={i}
          className="inline-block transition-all duration-200"
          style={{
            animation: revealed && slots[i] === text[i] ? `slide-up-spring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.04}s both` : undefined,
            minWidth: "0.7em",
            textAlign: "center",
          }}
        >
          {char}
        </span>
      ))}
    </p>
  );
};

interface RedeemedReward {
  id: string;
  redeemed_at: string;
  reward: {
    title: string;
    coupon_code: string;
    discount_type: string;
    discount_value: number;
    category: string | null;
    image_url: string | null;
  } | null;
}

const ProfileScreen = () => {
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [txCount, setTxCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [rewardCount, setRewardCount] = useState(0);
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [p, w, g, rr] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
        supabase.from("savings_goals").select("id").eq("teen_id", user.id),
        supabase.from("reward_redemptions").select("id, redeemed_at, reward:rewards(title, coupon_code, discount_type, discount_value, category, image_url)").eq("user_id", user.id).order("redeemed_at", { ascending: false }),
      ]);
      setProfile(p.data);
      setWallet(w.data);
      setGoalCount(g.data?.length || 0);
      const rrData = (rr.data || []) as unknown as RedeemedReward[];
      setRedeemedRewards(rrData);
      setRewardCount(rrData.length);
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

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    haptic.light();
    toast.success("Coupon code copied!");
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const categoryEmojis: Record<string, string> = {
    general: "🎁", food: "🍔", shopping: "🛍️", entertainment: "🎬", travel: "✈️", education: "📚",
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
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
      </div>

      <div className="relative z-10">
      {/* Profile Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(42 78% 55% / 0.04) 0%, transparent 60%)" }} />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-[0.04]" style={{ background: "hsl(42 78% 55%)" }} />

        <div className="relative z-10 flex flex-col items-center pt-8 pb-6 px-5">
          <div className="relative mb-4">
            <div className="absolute -inset-1.5 rounded-full" style={{ background: `conic-gradient(${currentLevel.color} ${levelProgress}%, transparent ${levelProgress}%)`, opacity: 0.6 }} />
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover relative z-10 ring-2 ring-background" />
            ) : (
              <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground relative z-10 ring-2 ring-background shadow-[0_4px_20px_hsl(42_78%_55%/0.25)]">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ background: currentLevel.color }}>
              <LevelIcon className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-[-0.5px]">{profile?.full_name}</h2>
          <p className="text-[11px] text-white/25 mt-0.5">{profile?.phone}</p>

          <div className="flex items-center gap-2 mt-3">
            <div className={`px-3 py-1 rounded-full text-[10px] font-semibold ${
              profile?.kyc_status === "verified" ? "bg-[hsl(152_60%_45%/0.1)] text-[hsl(152_60%_45%)]" : "bg-[hsl(38_92%_50%/0.1)] text-[hsl(38_92%_50%)]"
            }`}>
              {profile?.kyc_status === "verified" ? "✓ Verified" : "⏳ Pending KYC"}
            </div>
            <div className="px-3 py-1 rounded-full text-[10px] font-semibold" style={{ background: `${currentLevel.color}15`, color: currentLevel.color }}>
              {currentLevel.name} · {xp} XP
            </div>
          </div>
        </div>
      </div>

      {/* Level Progress Card */}
      <div className="px-5 mb-5 animate-slide-up-delay-1">
        <div className="rounded-[20px] p-4 border border-white/[0.03]" style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <LevelIcon className="w-4 h-4" style={{ color: currentLevel.color }} />
              <span className="text-[12px] font-semibold">{currentLevel.name}</span>
            </div>
            {nextLevel && (
              <span className="text-[10px] text-white/20">{nextLevel.minXP - xp} XP to {nextLevel.name}</span>
            )}
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${levelProgress}%`, background: currentLevel.color }} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Balance", value: formatAmount(wallet?.balance || 0) },
            { label: "Txns", value: txCount.toString() },
            { label: "Goals", value: goalCount.toString() },
            { label: "Points", value: totalPoints.toString() },
          ].map((s, i) => (
            <div key={s.label} className="rounded-[16px] p-3 border border-white/[0.03] text-center" style={{
              background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
              animation: `slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.15 + i * 0.08}s both`,
            }}>
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[9px] text-white/20 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="px-5 mb-5" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both" }}>
        <button onClick={() => { haptic.light(); navigate("/referrals"); }} className="w-full text-left relative rounded-[20px] p-4 border border-primary/[0.08] overflow-hidden active:scale-[0.98] transition-all" style={{ background: "linear-gradient(160deg, hsl(42 78% 55% / 0.03), hsl(220 18% 7%))" }}>
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-primary" />
              <p className="text-[12px] font-semibold text-primary">Your Referral Code</p>
              <ChevronRight className="w-3.5 h-3.5 text-primary/50 ml-auto" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-primary/[0.04] rounded-[14px] px-4 py-3 border border-primary/[0.06] overflow-hidden">
                <SlotMachineText text={referralCode} />
              </div>
              <button onClick={(e) => { e.stopPropagation(); copyReferral(); }} className="w-11 h-11 rounded-[14px] bg-primary/[0.08] flex items-center justify-center active:scale-90 transition-all">
                {copiedReferral ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5 text-primary" />}
              </button>
            </div>
            <p className="text-[10px] text-white/20 mt-2">Tap to view your referrals & earnings →</p>
          </div>
        </button>
      </div>

      {/* My Rewards Section */}
      {redeemedRewards.length > 0 && (
        <div className="px-5 mb-5 animate-slide-up-delay-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <p className="text-[13px] font-semibold">My Rewards</p>
            </div>
            <span className="text-[10px] text-white/20">{redeemedRewards.length} redeemed</span>
          </div>
          <div className="space-y-2.5">
            {redeemedRewards.slice(0, 5).map(rr => {
              const reward = rr.reward;
              if (!reward) return null;
              return (
                <div key={rr.id} className="rounded-[20px] p-3.5 border border-white/[0.03]" style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[14px] bg-primary/[0.06] flex items-center justify-center text-lg shrink-0">
                      {categoryEmojis[reward.category || "general"]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate">{reward.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-primary">
                          {reward.discount_type === "percentage" ? `${reward.discount_value}% OFF` : `₹${reward.discount_value} OFF`}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(rr.redeemed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => copyCoupon(reward.coupon_code)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-primary/[0.06] active:scale-90 transition-all">
                      {copiedCoupon === reward.coupon_code ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span className="text-[10px] font-bold text-primary tracking-wider">
                        {copiedCoupon === reward.coupon_code ? "Copied!" : reward.coupon_code}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
            {redeemedRewards.length > 5 && (
              <button onClick={() => navigate("/rewards")} className="w-full py-2.5 text-center text-[11px] font-semibold text-primary active:scale-95 transition-all">
                View all {redeemedRewards.length} rewards →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Achievement Badges */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.35s both" }}>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <p className="text-[13px] font-semibold">Achievements</p>
          </div>
          <span className="text-[10px] text-white/20">{earnedCount}/{badges.length} unlocked</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {badges.map((b, i) => (
            <div key={b.label}
              style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + i * 0.06}s both` }}
              className={`relative rounded-[16px] p-3 border flex flex-col items-center text-center transition-all ${
                b.earned
                  ? "border-primary/[0.15] bg-primary/[0.02]"
                  : "border-white/[0.03] opacity-40"
              }`}
              >
              {b.earned && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[hsl(152_60%_45%)] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center mb-1.5 ${b.earned ? "bg-primary/[0.06]" : "bg-white/[0.03]"}`}>
                <b.icon className={`w-5 h-5 ${b.earned ? "text-primary" : "text-white/20"}`} />
              </div>
              <p className="text-[10px] font-semibold leading-tight">{b.label}</p>
              <p className="text-[8px] text-white/15 mt-0.5">{b.points} pts</p>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-5 mb-5">
        <div className="rounded-[20px] border border-white/[0.03] overflow-hidden" style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => { haptic.light(); navigate(item.path); }}
              style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.55 + i * 0.05}s both` }}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-white/[0.02] transition-all ${
                i < menuItems.length - 1 ? "border-b border-white/[0.025]" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-[12px] bg-white/[0.03] flex items-center justify-center shrink-0">
                <item.icon className="w-[18px] h-[18px] text-white/30" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold">{item.label}</p>
                <p className="text-[10px] text-white/20">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/10 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-5 mb-8">
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[16px] bg-destructive/[0.04] border border-destructive/[0.08] text-destructive/70 text-[13px] font-semibold active:scale-[0.98] transition-all">
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfileScreen;
