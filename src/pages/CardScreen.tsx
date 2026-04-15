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
    <div className="min-h-screen bg-background noise-overlay pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => { haptic.light(); navigate("/home"); }}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">My Card</h1>
          <p className="text-[10px] text-muted-foreground">Virtual Prepaid Card</p>
        </div>
        <button onClick={() => { haptic.light(); }} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
          <Settings className="w-4.5 h-4.5 text-muted-foreground" />
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
        <div className="grid grid-cols-3 gap-3">
          <button onClick={toggleFreeze}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-card border border-border active:scale-95 transition-all">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wallet?.is_frozen ? "bg-blue-500/10" : "bg-muted/30"}`}>
              <Snowflake className={`w-5 h-5 ${wallet?.is_frozen ? "text-blue-400" : "text-muted-foreground"}`} />
            </div>
            <span className="text-[10px] font-medium">{wallet?.is_frozen ? "Unfreeze" : "Freeze"}</span>
          </button>
          <button onClick={() => { haptic.light(); navigate("/scan"); }}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-card border border-border active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] font-medium">Scan Pay</span>
          </button>
          <button onClick={() => {
            haptic.light();
            navigator.clipboard.writeText(`4242876512${cardLast4}`);
            setCopied(true);
            toast.success("Card number copied");
            setTimeout(() => setCopied(false), 2000);
          }}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-card border border-border active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
            </div>
            <span className="text-[10px] font-medium">Copy No.</span>
          </button>
        </div>
      </div>

      {/* Card Controls */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-semibold mb-3">Card Controls</h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
          {[
            { icon: Globe, label: "Online Transactions", desc: "Allow payments on websites & apps", enabled: onlineTxn, toggle: () => { haptic.light(); setOnlineTxn(!onlineTxn); } },
            { icon: CreditCard, label: "International", desc: "Allow international payments", enabled: intlTxn, toggle: () => { haptic.light(); setIntlTxn(!intlTxn); } },
            { icon: Wifi, label: "Contactless", desc: "Tap to pay at stores", enabled: contactless, toggle: () => { haptic.light(); setContactless(!contactless); } },
          ].map((control) => (
            <div key={control.label} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
                <control.icon className="w-4.5 h-4.5 text-muted-foreground" />
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
        <h3 className="text-sm font-semibold mb-3">Spending Limits</h3>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Daily Limit</span>
              <span className="text-xs font-semibold">{formatAmount(wallet?.spent_today || 0)} / {formatAmount(wallet?.daily_limit || 50000)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${Math.min(((wallet?.spent_today || 0) / (wallet?.daily_limit || 50000)) * 100, 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Monthly Limit</span>
              <span className="text-xs font-semibold">{formatAmount(wallet?.spent_this_month || 0)} / {formatAmount(wallet?.monthly_limit || 500000)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div className="h-full rounded-full bg-primary/70 transition-all duration-700"
                style={{ width: `${Math.min(((wallet?.spent_this_month || 0) / (wallet?.monthly_limit || 500000)) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="px-5 mb-6">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold mb-0.5">Your card is secure</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Protected with real-time fraud detection. All transactions are encrypted end-to-end.
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CardScreen;
