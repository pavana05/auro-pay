// Screen 17 — Referral Program: viral growth engine.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Copy, Check, Share2, Gift, Users, TrendingUp, MessageCircle,
  Instagram, Send, Crown, Sparkles, Zap, ArrowRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { useCountUp } from "@/hooks/useCountUp";

interface Referral {
  id: string;
  referred_id: string;
  referral_code: string;
  reward_amount: number;
  status: string;
  created_at: string;
  credited_at: string | null;
  referred_name?: string;
}

const SHARE_BASE = "https://auro-pay.lovable.app";

const MILESTONES = [
  { count: 1,  label: "First Spark",   reward: 50,   icon: "🎯" },
  { count: 5,  label: "Social Star",   reward: 350,  icon: "⭐" },
  { count: 10, label: "Influencer",    reward: 800,  icon: "🔥" },
  { count: 25, label: "Ambassador",    reward: 2500, icon: "👑" },
  { count: 50, label: "Legend",        reward: 6000, icon: "🏆" },
];

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  credited: { bg: "hsl(152 65% 42% / 0.15)", fg: "hsl(152 65% 60%)", label: "Credited" },
  pending:  { bg: "hsl(38 92% 50% / 0.15)",  fg: "hsl(38 92% 60%)",  label: "Pending"  },
  expired:  { bg: "hsl(0 70% 50% / 0.15)",   fg: "hsl(0 75% 65%)",   label: "Expired"  },
};

const Referrals = () => {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"all" | "credited" | "pending">("all");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setReferralCode(`AURO${user.id.substring(0, 6).toUpperCase()}`);

    const { data } = await supabase
      .from("referrals").select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (data?.length) {
      const ids = data.map(r => r.referred_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      setReferrals(data.map((r: any) => ({ ...r, referred_name: nameMap[r.referred_id] || "User" })));
    }
    setLoading(false);
  };

  const totalEarned = useMemo(
    () => referrals.filter(r => r.status === "credited").reduce((s, r) => s + r.reward_amount, 0),
    [referrals]
  );
  const pendingAmount = useMemo(
    () => referrals.filter(r => r.status === "pending").reduce((s, r) => s + r.reward_amount, 0),
    [referrals]
  );
  const referralCount = referrals.length;
  const filtered = useMemo(
    () => tab === "all" ? referrals : referrals.filter(r => r.status === tab),
    [referrals, tab]
  );

  const animatedEarned = useCountUp(Math.floor(totalEarned / 100), 1100, !loading);
  const animatedCount = useCountUp(referralCount, 1100, !loading);
  const animatedPending = useCountUp(Math.floor(pendingAmount / 100), 1100, !loading);

  // Milestone progress
  const nextMilestone = MILESTONES.find(m => referralCount < m.count);
  const lastMilestone = [...MILESTONES].reverse().find(m => referralCount >= m.count);
  const lowerBound = lastMilestone?.count || 0;
  const upperBound = nextMilestone?.count || MILESTONES[MILESTONES.length - 1].count;
  const progress = nextMilestone
    ? ((referralCount - lowerBound) / (upperBound - lowerBound)) * 100
    : 100;

  const shareUrl = `${SHARE_BASE}?ref=${referralCode}`;
  const shareText = `Join AuroPay with my code ${referralCode} and we both earn ₹50! 🎉`;
  const shareFull = `${shareText}\n\n${shareUrl}`;

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    haptic.success();
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const nativeShare = async () => {
    haptic.medium();
    if (Capacitor.isNativePlatform()) {
      try {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title: "Join AuroPay", text: shareText, url: shareUrl, dialogTitle: "Share your code" });
        return;
      } catch (e: any) {
        if (!String(e?.message || "").toLowerCase().includes("cancel")) toast.error("Share unavailable");
      }
    }
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: "Join AuroPay", text: shareText, url: shareUrl }); return; } catch {}
    }
    navigator.clipboard.writeText(shareFull);
    toast.success("Share text copied");
  };

  const shareWhatsApp = () => {
    haptic.light();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareFull)}`, "_blank");
  };

  const shareSMS = () => {
    haptic.light();
    window.location.href = `sms:?body=${encodeURIComponent(shareFull)}`;
  };

  const shareInstagram = () => {
    haptic.light();
    navigator.clipboard.writeText(shareFull);
    toast.success("Copied — paste in Instagram DM or story");
    // Try app deep link (only works if installed)
    setTimeout(() => { window.location.href = "instagram://"; }, 200);
  };

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[460px] h-[460px] rounded-full opacity-[0.05] blur-[110px]"
          style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/[0.04]"
        style={{ background: "hsl(220 22% 5% / 0.85)" }}>
        <PageHeader title="Referral Program" sticky={false} fallback="/profile" className="py-3.5" />
      </div>

      <div className="relative z-10 px-5 pt-5 space-y-5">
        {/* HERO — Big code card */}
        <div style={{ animation: "ref-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="relative rounded-[28px] overflow-hidden border border-primary/[0.15] p-6"
            style={{ background: "linear-gradient(160deg, hsl(var(--primary) / 0.10), hsl(220 18% 6%))" }}>
            <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-[0.18]"
              style={{ background: "hsl(var(--primary))" }} />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-3xl opacity-[0.10]"
              style={{ background: "hsl(var(--primary))" }} />

            <div className="relative">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center border border-primary/30"
                  style={{ background: "hsl(var(--primary) / 0.12)" }}>
                  <Gift className="w-[22px] h-[22px] text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[1.5px] font-bold text-primary/85">Your Code</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Earn ₹50 per friend</p>
                </div>
              </div>

              {/* Big code */}
              <div className="rounded-[20px] p-5 border border-primary/[0.12] mb-4 relative overflow-hidden"
                style={{ background: "hsl(220 22% 5% / 0.6)" }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[26px] font-black tracking-[0.18em] text-primary truncate"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {referralCode || "—"}
                  </p>
                  <button onClick={copyCode}
                    className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-primary/30"
                    style={{ background: "hsl(var(--primary) / 0.12)" }}>
                    {copied
                      ? <Check className="w-5 h-5" style={{ color: "hsl(152 65% 60%)" }} />
                      : <Copy className="w-5 h-5 text-primary" />}
                  </button>
                </div>
              </div>

              {/* Native share button */}
              <button onClick={nativeShare}
                className="w-full h-[52px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all font-bold text-[14px]"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                  color: "hsl(220 22% 6%)",
                  boxShadow: "0 8px 24px hsl(var(--primary) / 0.25)",
                }}>
                <Share2 className="w-[18px] h-[18px]" />
                Share & Earn
              </button>

              {/* Per-channel buttons */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { icon: MessageCircle, label: "WhatsApp", onClick: shareWhatsApp, color: "152 60% 50%" },
                  { icon: Send,          label: "SMS",      onClick: shareSMS,       color: "210 80% 55%" },
                  { icon: Instagram,     label: "Instagram",onClick: shareInstagram, color: "320 70% 60%" },
                ].map(c => (
                  <button key={c.label} onClick={c.onClick}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-white/[0.05] active:scale-95 transition-transform"
                    style={{ background: `linear-gradient(160deg, hsl(${c.color} / 0.10), hsl(220 18% 7%))` }}>
                    <c.icon className="w-[18px] h-[18px]" style={{ color: `hsl(${c.color})` }} />
                    <span className="text-[10px] font-semibold text-white/70">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5"
          style={{ animation: "ref-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both" }}>
          {[
            { label: "Earned",    value: `₹${animatedEarned.toLocaleString("en-IN")}`,   icon: TrendingUp, color: "152 65% 50%" },
            { label: "Referrals", value: animatedCount.toString(),                       icon: Users,      color: "var(--primary)" },
            { label: "Pending",   value: `₹${animatedPending.toLocaleString("en-IN")}`,  icon: Sparkles,   color: "38 92% 55%" },
          ].map(s => (
            <div key={s.label} className="rounded-[18px] p-3.5 border border-white/[0.04] text-center"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
              <s.icon className="w-[18px] h-[18px] mx-auto mb-1.5"
                style={{ color: s.color.includes("var") ? "hsl(var(--primary))" : `hsl(${s.color})` }} />
              <p className="text-[14px] font-bold tracking-[-0.3px]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
              <p className="text-[9px] text-white/30 font-medium mt-0.5 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-[20px] p-4 border border-white/[0.04]"
          style={{
            background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
            animation: "ref-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both",
          }}>
          <p className="text-[11px] font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> How it works
          </p>
          <div className="flex items-center gap-1.5">
            {[
              { emoji: "📤", text: "Share" },
              { emoji: "👤", text: "Sign up" },
              { emoji: "✅", text: "First txn" },
              { emoji: "💰", text: "Both earn" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  <span className="text-[18px] mb-1">{step.emoji}</span>
                  <p className="text-[9px] text-white/35 leading-tight font-medium">{step.text}</p>
                </div>
                {i < 3 && <ArrowRight className="w-3 h-3 text-white/15 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Milestone tracker */}
        <div className="rounded-[20px] p-4 border border-white/[0.04]"
          style={{
            background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
            animation: "ref-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both",
          }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" /> Milestones
            </p>
            <p className="text-[10px] text-white/30">
              You've referred <span className="text-primary font-bold">{referralCount}</span> friend{referralCount === 1 ? "" : "s"}
            </p>
          </div>

          {/* Progress bar to next milestone */}
          {nextMilestone && (
            <div className="mb-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-white/40">Next: {nextMilestone.label}</span>
                <span className="text-[10px] font-bold text-primary">
                  {referralCount}/{nextMilestone.count}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220 15% 12%)" }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                    boxShadow: "0 0 12px hsl(var(--primary) / 0.4)",
                  }} />
              </div>
            </div>
          )}

          {/* Tier list */}
          <div className="space-y-2">
            {MILESTONES.map(m => {
              const achieved = referralCount >= m.count;
              const isNext = m === nextMilestone;
              return (
                <div key={m.count}
                  className="flex items-center gap-3 p-2.5 rounded-[14px] transition-all border"
                  style={{
                    background: achieved
                      ? "hsl(var(--primary) / 0.06)"
                      : isNext ? "hsl(220 15% 9%)" : "transparent",
                    borderColor: achieved
                      ? "hsl(var(--primary) / 0.18)"
                      : isNext ? "hsl(var(--primary) / 0.10)" : "transparent",
                    opacity: achieved || isNext ? 1 : 0.42,
                  }}>
                  <span className="text-[20px]" style={{ filter: achieved ? "none" : "saturate(0.5)" }}>{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] font-semibold">{m.label}</p>
                    <p className="text-[9.5px] text-white/30">{m.count} referral{m.count > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11.5px] font-bold"
                      style={{ color: achieved ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.35)" }}>
                      ₹{m.reward.toLocaleString("en-IN")}
                    </p>
                    {achieved && (
                      <p className="text-[8.5px] font-semibold" style={{ color: "hsl(152 65% 60%)" }}>
                        ✓ Unlocked
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* History */}
        <div style={{ animation: "ref-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both" }}>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Reward History
            </p>
            <span className="text-[10px] text-white/30">{referralCount} total</span>
          </div>

          <div className="flex gap-1.5 mb-3">
            {(["all", "credited", "pending"] as const).map(t => (
              <button key={t} onClick={() => { haptic.selection(); setTab(t); }}
                className="h-[30px] px-3.5 rounded-full text-[11px] font-semibold capitalize transition-all active:scale-95 border"
                style={{
                  background: tab === t
                    ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))"
                    : "hsl(220 15% 8%)",
                  borderColor: tab === t ? "hsl(var(--primary) / 0.4)" : "hsl(0 0% 100% / 0.05)",
                  color: tab === t ? "hsl(220 22% 6%)" : "hsl(0 0% 100% / 0.55)",
                }}>
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-[60px] rounded-[16px] animate-pulse"
                  style={{ background: "hsl(220 15% 8%)" }} />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-[80px] h-[80px] rounded-[24px] flex items-center justify-center mx-auto mb-3 border border-white/[0.05]"
                  style={{ background: "linear-gradient(135deg, hsl(220 18% 10%), hsl(220 22% 5%))" }}>
                  <span className="text-[36px]">{tab === "credited" ? "💰" : tab === "pending" ? "⏳" : "🎁"}</span>
                </div>
                <p className="text-[13px] font-semibold text-white/55 mb-1">
                  {tab === "all" ? "No referrals yet" : `No ${tab} referrals`}
                </p>
                <p className="text-[11px] text-white/25 max-w-[240px] mx-auto leading-relaxed">
                  Share your code and start earning rewards together.
                </p>
              </div>
            ) : (
              filtered.map((ref, i) => {
                const style = STATUS_STYLE[ref.status] || STATUS_STYLE.pending;
                return (
                  <div key={ref.id}
                    className="rounded-[16px] p-3.5 border border-white/[0.04] flex items-center gap-3"
                    style={{
                      background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                      animation: `ref-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + i * 0.04}s both`,
                    }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                      style={{
                        background: "hsl(var(--primary) / 0.12)",
                        color: "hsl(var(--primary))",
                        border: "1px solid hsl(var(--primary) / 0.2)",
                      }}>
                      {ref.referred_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold truncate">{ref.referred_name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {new Date(ref.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold"
                        style={{ color: ref.status === "credited" ? "hsl(152 65% 60%)" : "hsl(var(--primary))" }}>
                        {ref.status === "credited" ? "+" : ""}₹{(ref.reward_amount / 100).toFixed(0)}
                      </p>
                      <span className="text-[9px] font-bold px-1.5 py-px rounded-full mt-0.5 inline-block"
                        style={{ background: style.bg, color: style.fg }}>
                        {style.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <BottomNav />

      <style>{`
        @keyframes ref-in { 0% { opacity: 0; transform: translateY(14px) scale(0.98); } 100% { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
};

export default Referrals;
