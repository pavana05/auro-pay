import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard, QrCode, Snowflake, Eye, EyeOff,
  ChevronLeft, Shield, Lock, Globe, Wifi,
  Copy, Check, Settings, AlertTriangle,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

const CardScreen = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [showNumber, setShowNumber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [onlineTxn, setOnlineTxn] = useState(true);
  const [intlTxn, setIntlTxn] = useState(false);
  const [contactless, setContactless] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      setWallet(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleFreeze = async () => {
    if (!wallet) return;
    haptic.heavy();
    const newState = !wallet.is_frozen;
    await supabase.from("wallets").update({ is_frozen: newState }).eq("id", wallet.id);
    setWallet({ ...wallet, is_frozen: newState });
    toast.success(newState ? "Card frozen" : "Card unfrozen");
  };

  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  // Generate deterministic card number from wallet id
  const cardLast4 = wallet?.id?.slice(-4)?.toUpperCase() || "0000";
  const maskedNumber = showNumber ? `4242  8765  1234  ${cardLast4}` : `••••  ••••  ••••  ${cardLast4}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="h-52 rounded-3xl bg-muted animate-pulse mb-6" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
      </div>

      <div className="relative z-10">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => { haptic.light(); navigate("/home"); }}
          className="w-[42px] h-[42px] rounded-[14px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
          <ChevronLeft className="w-[18px] h-[18px] text-muted-foreground/60" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold tracking-[-0.4px]">My Card</h1>
          <p className="text-[10px] text-white/25">Virtual Prepaid Card</p>
        </div>
        <button onClick={() => { haptic.light(); }} className="w-[42px] h-[42px] rounded-[14px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center">
          <Settings className="w-[18px] h-[18px] text-muted-foreground/60" />
        </button>
      </div>

      {/* Card */}
      <div className="px-5 mb-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl p-6 h-52"
          style={{
            background: wallet?.is_frozen
              ? "linear-gradient(145deg, hsl(210 20% 20%), hsl(220 15% 12%))"
              : "linear-gradient(145deg, hsl(42 78% 55%), hsl(36 80% 38%), hsl(28 70% 28%))",
          }}>
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full border border-white/10" />
          <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full border border-white/10" />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

          {/* Frozen overlay */}
          {wallet?.is_frozen && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center z-20 rounded-3xl">
              <div className="text-center">
                <Snowflake className="w-10 h-10 text-blue-400 mx-auto mb-2 animate-pulse" />
                <p className="text-sm font-semibold text-blue-400">Card Frozen</p>
                <p className="text-[10px] text-muted-foreground">Tap below to unfreeze</p>
              </div>
            </div>
          )}

          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider">AuroPay</p>
                <p className="text-[10px] text-white/40 mt-0.5">Virtual Card</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-white/60" />
              </div>
            </div>

            {/* Card number */}
            <div className="flex items-center gap-3">
              <p className="text-lg font-mono tracking-[0.15em] text-white/90">{maskedNumber}</p>
              <button onClick={() => { haptic.light(); setShowNumber(!showNumber); }}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
                {showNumber ? <EyeOff className="w-3.5 h-3.5 text-white/70" /> : <Eye className="w-3.5 h-3.5 text-white/70" />}
              </button>
            </div>

            {/* Bottom row */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] text-white/40 uppercase">Balance</p>
                <p className="text-sm font-bold text-white">{formatAmount(wallet?.balance || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-white/40 uppercase">Expires</p>
                <p className="text-xs font-medium text-white/80">12/28</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={toggleFreeze}
            className="flex flex-col items-center gap-2.5 py-4 rounded-[20px] bg-white/[0.02] border border-white/[0.03] active:scale-[0.88] transition-all">
            <div className={`w-[44px] h-[44px] rounded-[14px] flex items-center justify-center ${wallet?.is_frozen ? "bg-[hsl(210_80%_55%/0.1)]" : "bg-white/[0.03]"}`}>
              <Snowflake className={`w-5 h-5 ${wallet?.is_frozen ? "text-[hsl(210_80%_55%)]" : "text-white/30"}`} />
            </div>
            <span className="text-[10px] font-semibold text-white/45">{wallet?.is_frozen ? "Unfreeze" : "Freeze"}</span>
          </button>
          <button onClick={() => { haptic.light(); navigate("/scan"); }}
            className="flex flex-col items-center gap-2.5 py-4 rounded-[20px] bg-white/[0.02] border border-white/[0.03] active:scale-[0.88] transition-all">
            <div className="w-[44px] h-[44px] rounded-[14px] bg-primary/[0.08] flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] font-semibold text-white/45">Scan Pay</span>
          </button>
          <button onClick={() => {
            haptic.light();
            navigator.clipboard.writeText(`4242876512${cardLast4}`);
            setCopied(true);
            toast.success("Card number copied");
            setTimeout(() => setCopied(false), 2000);
          }}
            className="flex flex-col items-center gap-2.5 py-4 rounded-[20px] bg-white/[0.02] border border-white/[0.03] active:scale-[0.88] transition-all">
            <div className="w-[44px] h-[44px] rounded-[14px] bg-white/[0.03] flex items-center justify-center">
              {copied ? <Check className="w-5 h-5 text-[hsl(152_60%_45%)]" /> : <Copy className="w-5 h-5 text-white/30" />}
            </div>
            <span className="text-[10px] font-semibold text-white/45">Copy No.</span>
          </button>
        </div>
      </div>

      {/* Card Controls */}
      <div className="px-5 mb-6">
        <h3 className="text-[13px] font-bold tracking-[-0.3px] mb-3">Card Controls</h3>
        <div className="rounded-[20px] overflow-hidden border border-white/[0.03]" style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
          {[
            { icon: Globe, label: "Online Transactions", desc: "Allow payments on websites & apps", enabled: onlineTxn, toggle: () => { haptic.light(); setOnlineTxn(!onlineTxn); } },
            { icon: CreditCard, label: "International", desc: "Allow international payments", enabled: intlTxn, toggle: () => { haptic.light(); setIntlTxn(!intlTxn); } },
            { icon: Wifi, label: "Contactless", desc: "Tap to pay at stores", enabled: contactless, toggle: () => { haptic.light(); setContactless(!contactless); } },
          ].map((control, idx) => (
            <div key={control.label} className={`flex items-center gap-3 px-4 py-3.5 ${idx < 2 ? "border-b border-white/[0.025]" : ""}`}>
              <div className="w-9 h-9 rounded-[12px] bg-white/[0.03] flex items-center justify-center shrink-0">
                <control.icon className="w-[18px] h-[18px] text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{control.label}</p>
                <p className="text-[10px] text-muted-foreground">{control.desc}</p>
              </div>
              <button onClick={control.toggle}
                className={`w-11 h-6 rounded-full transition-all duration-300 relative ${control.enabled ? "bg-primary" : "bg-muted"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${control.enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Spending Limits */}
      <div className="px-5 mb-6">
        <h3 className="text-[13px] font-bold tracking-[-0.3px] mb-3">Spending Limits</h3>
        <div className="rounded-[20px] p-4 space-y-4 border border-white/[0.03]" style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-white/25">Daily Limit</span>
              <span className="text-[11px] font-bold tabular-nums">{formatAmount(wallet?.spent_today || 0)} <span className="text-white/20">/ {formatAmount(wallet?.daily_limit || 50000)}</span></span>
            </div>
            <div className="h-[6px] rounded-full bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ background: "linear-gradient(90deg, hsl(42 78% 55%), hsl(36 80% 42%))", boxShadow: "0 0 12px hsl(42 78% 55% / 0.3)", width: `${Math.min(((wallet?.spent_today || 0) / (wallet?.daily_limit || 50000)) * 100, 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-white/25">Monthly Limit</span>
              <span className="text-[11px] font-bold tabular-nums">{formatAmount(wallet?.spent_this_month || 0)} <span className="text-white/20">/ {formatAmount(wallet?.monthly_limit || 500000)}</span></span>
            </div>
            <div className="h-[6px] rounded-full bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ background: "linear-gradient(90deg, hsl(42 78% 55% / 0.7), hsl(36 80% 42% / 0.7))", width: `${Math.min(((wallet?.spent_this_month || 0) / (wallet?.monthly_limit || 500000)) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="px-5 mb-6">
        <div className="flex items-start gap-3 p-4 rounded-[20px] bg-primary/[0.03] border border-primary/[0.06]">
          <Shield className="w-5 h-5 text-primary/60 shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-semibold mb-0.5">Your card is secure</p>
            <p className="text-[10px] text-white/25 leading-relaxed">
              Protected with real-time fraud detection. All transactions are encrypted end-to-end.
            </p>
          </div>
        </div>
      </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CardScreen;
