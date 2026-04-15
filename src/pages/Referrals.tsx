import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, Copy, Check, Share2, Gift, Users, TrendingUp,
  Sparkles, Star, ArrowRight, Crown, Zap,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Referral {
  id: string;
  referred_id: string;
  referral_code: string;
  reward_amount: number;
  status: string;
  created_at: string;
  referred_name?: string;
}

const SpringIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <div className={className} style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both` }}>
    {children}
  </div>
);

const Referrals = () => {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"all" | "pending" | "credited">("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Generate referral code from user id
    const code = `AURO${user.id.substring(0, 6).toUpperCase()}`;
    setReferralCode(code);

    // Fetch referrals
    const { data } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const referredIds = data.map((r: any) => r.referred_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", referredIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      setReferrals(data.map((r: any) => ({ ...r, referred_name: nameMap[r.referred_id] || "User" })));
    } else {
      setReferrals([]);
    }
    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    haptic.success();
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    haptic.medium();
    const shareText = `Hey! Join AuroPay using my referral code ${referralCode} and we both earn ₹100! 🎉\n\nDownload now: https://auro-pay.lovable.app`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join AuroPay", text: shareText });
      } catch {}
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Share text copied to clipboard!");
    }
  };

  const totalEarned = referrals.filter(r => r.status === "credited").reduce((s, r) => s + r.reward_amount, 0);
  const pendingAmount = referrals.filter(r => r.status === "pending").reduce((s, r) => s + r.reward_amount, 0);
  const filtered = tab === "all" ? referrals : referrals.filter(r => r.status === tab);

  const milestones = [
    { count: 1, label: "First Referral", reward: "₹100", icon: "🎯" },
    { count: 5, label: "Social Star", reward: "₹250 bonus", icon: "⭐" },
    { count: 10, label: "Influencer", reward: "₹500 bonus", icon: "🔥" },
    { count: 25, label: "Ambassador", reward: "₹1,000 bonus", icon: "👑" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[120px]" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.02] blur-[100px]" style={{ background: "hsl(200 70% 50%)" }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Referral Program</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="relative z-10 px-5 pt-5 space-y-5">
        {/* Hero Card */}
        <SpringIn delay={0.1}>
          <div className="relative rounded-[24px] overflow-hidden border border-primary/[0.12]"
            style={{ background: "linear-gradient(160deg, hsl(42 78% 55% / 0.06), hsl(220 18% 7%))" }}>
            {/* Decorative */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, hsl(200 70% 50%), transparent)" }} />

            <div className="relative z-10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_hsl(42_78%_55%/0.1)]">
                  <Gift className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">Refer & Earn</p>
                  <p className="text-xs text-muted-foreground">₹100 for every friend who joins</p>
                </div>
              </div>

              {/* Referral Code */}
              <div className="mb-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Your Referral Code</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background/50 rounded-2xl px-5 py-3.5 border border-primary/[0.08] flex items-center justify-center">
                    <p className="text-xl font-black tracking-[0.2em] text-primary">{referralCode}</p>
                  </div>
                  <button onClick={copyCode} className="w-13 h-13 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center active:scale-90 transition-all">
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-primary" />}
                  </button>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={shareCode}
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_hsl(42_78%_55%/0.2)] active:scale-[0.97] transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share & Earn ₹100
              </button>
            </div>
          </div>
        </SpringIn>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Total Earned", value: `₹${(totalEarned / 100).toLocaleString()}`, icon: TrendingUp, color: "hsl(152 60% 45%)" },
            { label: "Referrals", value: referrals.length.toString(), icon: Users, color: "hsl(42 78% 55%)" },
            { label: "Pending", value: `₹${(pendingAmount / 100).toLocaleString()}`, icon: Sparkles, color: "hsl(38 92% 50%)" },
          ].map((s, i) => (
            <SpringIn key={s.label} delay={0.2 + i * 0.06}>
              <div className="rounded-[16px] p-3.5 border border-white/[0.03] text-center"
                style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
                <s.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: s.color }} />
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[9px] text-white/20 font-medium mt-0.5">{s.label}</p>
              </div>
            </SpringIn>
          ))}
        </div>

        {/* How it works */}
        <SpringIn delay={0.4}>
          <div className="rounded-[20px] p-4 border border-white/[0.03]"
            style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
            <p className="text-xs font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> How It Works
            </p>
            <div className="flex items-center gap-2">
              {[
                { emoji: "📤", text: "Share Code" },
                { emoji: "👤", text: "Friend Joins" },
                { emoji: "✅", text: "First Txn" },
                { emoji: "💰", text: "Both Earn" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center text-center flex-1">
                    <span className="text-lg mb-1">{step.emoji}</span>
                    <p className="text-[9px] text-white/30 leading-tight">{step.text}</p>
                  </div>
                  {i < 3 && <ArrowRight className="w-3 h-3 text-white/10 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </SpringIn>

        {/* Milestones */}
        <SpringIn delay={0.45}>
          <div className="rounded-[20px] p-4 border border-white/[0.03]"
            style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
            <p className="text-xs font-semibold mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" /> Milestones
            </p>
            <div className="space-y-2.5">
              {milestones.map((m, i) => {
                const achieved = referrals.length >= m.count;
                return (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${achieved ? "bg-primary/[0.04] border border-primary/[0.08]" : "opacity-50"}`}>
                    <span className="text-xl">{m.icon}</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold">{m.label}</p>
                      <p className="text-[9px] text-white/20">{m.count} referral{m.count > 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[11px] font-bold ${achieved ? "text-primary" : "text-white/20"}`}>{m.reward}</p>
                      {achieved && <p className="text-[8px] text-emerald-400">Unlocked ✓</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SpringIn>

        {/* Referral List */}
        <SpringIn delay={0.5}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Your Referrals
            </p>
            <span className="text-[10px] text-white/20">{referrals.length} total</span>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-3">
            {(["all", "pending", "credited"] as const).map(t => (
              <button
                key={t}
                onClick={() => { haptic.light(); setTab(t); }}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-medium capitalize transition-all ${
                  tab === t ? "bg-primary/10 text-primary border border-primary/20" : "text-white/30 border border-white/[0.04]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </SpringIn>

        <div className="space-y-2.5 mb-6">
          {filtered.map((ref, i) => (
            <div
              key={ref.id}
              style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.55 + i * 0.05}s both` }}
              className="rounded-[16px] p-3.5 border border-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {ref.referred_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate">{ref.referred_name}</p>
                  <p className="text-[10px] text-white/20">{new Date(ref.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[12px] font-bold ${ref.status === "credited" ? "text-emerald-400" : "text-primary"}`}>
                    {ref.status === "credited" ? "+" : ""}₹{(ref.reward_amount / 100).toFixed(0)}
                  </p>
                  <p className={`text-[9px] capitalize ${ref.status === "credited" ? "text-emerald-400/60" : "text-white/20"}`}>
                    {ref.status}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {!loading && referrals.length === 0 && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/[0.04] border border-primary/[0.08] flex items-center justify-center">
                <Gift className="w-8 h-8 text-primary/40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">No referrals yet</p>
                <p className="text-xs text-muted-foreground mt-1">Share your code and start earning!</p>
              </div>
              <button onClick={shareCode} className="px-6 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all">
                <Share2 className="w-3.5 h-3.5" /> Share Now
              </button>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Referrals;
