// Cinematic payment confirmation flow: Merchant → PIN pad → Processing → Success/Failure.
// Navigated to from ScanPay (and reusable from QuickPay/recurring) via:
//   navigate("/pay", { state: { upi_id, payee_name, amount, amount_locked, note, category } })
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Wallet, Delete, Lock, ArrowRight, CheckCircle2, XCircle,
  Share2, Download, Shield, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import ForgotPinModal from "@/components/ForgotPinModal";

type Stage = "review" | "pin" | "processing" | "success" | "failure";

interface PayState {
  upi_id?: string;
  payee_name?: string;
  amount?: number;
  amount_locked?: boolean;
  note?: string;
  category?: string;
}

const PROCESSING_STEPS = [
  "Verifying PIN…",
  "Checking balance…",
  "Connecting to UPI…",
  "Confirming payment…",
];

// Hash-based color picker so each merchant has a stable colour
const merchantColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 55%)`;
};

const PaymentConfirm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as PayState;

  const [stage, setStage] = useState<Stage>("review");
  const [amount, setAmount] = useState<string>(state.amount ? String(state.amount) : "");
  const [pin, setPin] = useState<string>("");
  const [pinError, setPinError] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [hasPinSet, setHasPinSet] = useState<boolean | null>(null);
  const [setupPin, setSetupPin] = useState<string>("");
  const [setupConfirm, setSetupConfirm] = useState<string>("");
  const [setupStage, setSetupStage] = useState<"enter" | "confirm">("enter");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [shake, setShake] = useState(false);
  const [txMeta, setTxMeta] = useState<{ id?: string; reference?: string; time?: string }>({});
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [recentContacts, setRecentContacts] = useState<Array<{ id: string; name: string; emoji: string | null; upi: string | null }>>([]);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const procTimerRef = useRef<ReturnType<typeof setInterval>>();

  const upi = state.upi_id || "";
  const payee = state.payee_name || upi.split("@")[0] || "Merchant";
  const note = state.note || "";
  const amountLocked = !!state.amount_locked;
  const initial = (payee[0] || "M").toUpperCase();
  const color = useMemo(() => merchantColor(payee), [payee]);

  // Guard: if no upi, bounce back home
  useEffect(() => {
    if (!upi) navigate("/home", { replace: true });
  }, [upi, navigate]);

  // Load wallet + check pin status
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: wallet }, { data: pinStatus }] = await Promise.all([
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.functions.invoke("payment-pin", { body: { action: "status" } }),
      ]);
      setWalletBalance(wallet?.balance || 0);
      setHasPinSet(!!pinStatus?.data?.is_set || !!(pinStatus as any)?.is_set);

      // Last 3 paid contacts for the quick-switch row
      const { data: recents } = await supabase
        .from("quick_pay_favorites")
        .select("id, contact_name, avatar_emoji, contact_upi_id, last_paid_at")
        .eq("user_id", user.id)
        .not("last_paid_at", "is", null)
        .order("last_paid_at", { ascending: false })
        .limit(3);
      setRecentContacts(
        (recents || []).map((r: any) => ({
          id: r.id, name: r.contact_name, emoji: r.avatar_emoji, upi: r.contact_upi_id,
        }))
      );
    })();
  }, []);

  const numericAmount = parseFloat(amount) || 0;
  const amountPaise = Math.round(numericAmount * 100);
  const exceedsBalance = amountPaise > walletBalance && walletBalance > 0;

  // Trigger shake when entering an over-balance amount
  useEffect(() => {
    if (exceedsBalance && numericAmount > 0) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [exceedsBalance, numericAmount]);

  // Processing step cycler
  useEffect(() => {
    if (stage !== "processing") return;
    setProcessingStep(0);
    procTimerRef.current = setInterval(() => {
      setProcessingStep((s) => Math.min(s + 1, PROCESSING_STEPS.length - 1));
    }, 700);
    return () => { if (procTimerRef.current) clearInterval(procTimerRef.current); };
  }, [stage]);

  // ---- PIN PAD HANDLERS ----
  const onPinKey = (k: string) => {
    haptic.light();
    if (k === "del") { setPin((p) => p.slice(0, -1)); setPinError(false); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) setTimeout(() => submitPayment(next), 220);
  };

  const onSetupKey = (k: string) => {
    haptic.light();
    const target = setupStage === "enter" ? setupPin : setupConfirm;
    const setter = setupStage === "enter" ? setSetupPin : setSetupConfirm;
    if (k === "del") { setter(target.slice(0, -1)); return; }
    if (target.length >= 4) return;
    const next = target + k;
    setter(next);
    if (next.length === 4) {
      if (setupStage === "enter") {
        setTimeout(() => setSetupStage("confirm"), 200);
      } else {
        setTimeout(() => savePin(setupPin, next), 200);
      }
    }
  };

  const savePin = async (a: string, b: string) => {
    if (a !== b) {
      toast.error("PINs don't match. Try again.");
      haptic.error();
      setSetupPin(""); setSetupConfirm(""); setSetupStage("enter");
      return;
    }
    const { data, error } = await supabase.functions.invoke("payment-pin", {
      body: { action: "set", pin: a },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Could not set PIN");
      return;
    }
    haptic.success();
    toast.success("Payment PIN set");
    setHasPinSet(true);
    setSetupPin(""); setSetupConfirm(""); setSetupStage("enter");
  };

  // ---- SUBMIT ----
  const submitPayment = async (pinValue: string) => {
    setStage("processing");
    haptic.medium();
    try {
      const { data, error } = await supabase.functions.invoke("process-scan-payment", {
        body: {
          upi_id: upi,
          payee_name: payee,
          amount: numericAmount,
          category: state.category || "other",
          note,
          pin: pinValue,
        },
      });
      if (error) throw new Error(error.message || "Payment failed");
      if ((data as any)?.error) throw new Error((data as any).error);

      const tx = (data as any)?.transaction;
      setTxMeta({
        id: tx?.id,
        reference: (tx?.id || "").slice(0, 12).toUpperCase(),
        time: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      });
      // Let processing animation play out a bit
      setTimeout(() => { setStage("success"); haptic.success(); }, 1800);
    } catch (err: any) {
      setErrorMsg(err?.message || "Payment failed");
      haptic.error();
      setTimeout(() => { setStage("failure"); }, 800);
    }
  };

  const fmt = (paise: number) => new Intl.NumberFormat("en-IN").format(paise / 100);

  // ---- PIN SETUP MODE ----
  if (stage === "review" && hasPinSet === false) {
    const showVal = setupStage === "enter" ? setupPin : setupConfirm;
    return (
      <div className="min-h-screen bg-background flex flex-col px-5 pt-4 pb-6">
        <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5" style={{ boxShadow: "0 0 28px hsl(42 78% 55% / 0.2)" }}>
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-[22px] font-bold tracking-[-0.5px] mb-1.5">{setupStage === "enter" ? "Create Payment PIN" : "Confirm Your PIN"}</h1>
          <p className="text-[13px] text-muted-foreground mb-9 max-w-[280px]">
            {setupStage === "enter" ? "You'll use this 4-digit PIN to authorize every payment." : "Re-enter the PIN to confirm."}
          </p>
          <PinDots count={showVal.length} error={false} />
        </div>
        <NumPad onPress={onSetupKey} />
      </div>
    );
  }

  // ---- REVIEW STAGE ----
  if (stage === "review") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden pb-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[100px]" style={{ background: color }} />
        </div>

        <div className="relative z-10 px-5 pt-4">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center active:scale-90 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-bold text-muted-foreground/70 tracking-[0.18em] uppercase">Confirm & Pay</span>
            <div className="w-11" />
          </div>

          {/* Merchant card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="rounded-[24px] p-5 border border-white/[0.06] mb-5 relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, hsl(220 22% 9%), hsl(220 18% 6%))", boxShadow: "0 8px 28px -8px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[24px] font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.4)]" style={{ background: `linear-gradient(135deg, ${color}, ${color.replace("70%", "45%")})` }}>
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h2 className="text-[17px] font-bold truncate">{payee}</h2>
                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full bg-success/15 border border-success/25">
                    <CheckCircle2 className="w-2.5 h-2.5 text-success" />
                    <span className="text-[8px] font-bold text-success tracking-wide">VERIFIED</span>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/70 font-mono truncate">{upi}</p>
              </div>
            </div>
            {note && <p className="text-[11px] text-muted-foreground/60 mt-3 pl-[60px] truncate">📝 {note}</p>}
          </motion.div>

          {/* Recents quick-switch — last 3 paid contacts */}
          {recentContacts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 22 }}
              className="mb-5"
            >
              <p className="text-[10px] font-bold text-muted-foreground/50 tracking-[0.18em] uppercase mb-2.5 px-1">
                Pay someone else
              </p>
              <div className="flex gap-2.5">
                {recentContacts.map((c) => {
                  const init = (c.name[0] || "?").toUpperCase();
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        haptic.light();
                        navigate("/quick-pay", { state: { selectedContact: { id: c.id, contact_name: c.name, contact_upi_id: c.upi, avatar_emoji: c.emoji, contact_phone: null, last_paid_at: null } } });
                      }}
                      className="flex-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-2.5 flex items-center gap-2 active:scale-[0.96] hover:bg-white/[0.05] transition"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${merchantColor(c.name)}, ${merchantColor(c.name).replace("70%", "45%")})` }}
                      >
                        {c.emoji && c.emoji !== "👤" ? c.emoji : init}
                      </div>
                      <p className="text-[11px] font-semibold truncate text-left">{c.name.split(" ")[0]}</p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Amount */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, type: "spring", stiffness: 260, damping: 22 }}
            className="text-center mb-2"
            style={{ animation: shake ? "amount-shake 0.45s cubic-bezier(.36,.07,.19,.97) both" : undefined }}
          >
            {amountLocked && (
              <div className="inline-flex items-center gap-1.5 mb-2.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-primary">Fixed by merchant</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-1">
              <span className="text-[36px] font-bold text-muted-foreground/60 -mt-2">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => !amountLocked && setAmount(e.target.value)}
                readOnly={amountLocked}
                placeholder="0"
                inputMode="decimal"
                className="bg-transparent border-0 outline-none text-[58px] font-bold tabular-nums font-mono text-foreground text-center w-auto max-w-[260px] p-0"
                style={{ caretColor: "hsl(42 78% 55%)" }}
                autoFocus={!amountLocked}
              />
            </div>
            <p className={`text-[12px] font-medium mt-1 transition-colors ${exceedsBalance ? "text-destructive" : "text-muted-foreground/60"}`}>
              Available: ₹{fmt(walletBalance)}
            </p>
          </motion.div>

          {/* Payment method badge */}
          <motion.button
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 22 }}
            onClick={() => toast.message("UPI Wallet selected", { description: "Other payment methods coming soon" })}
            className="w-full mt-6 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3.5 flex items-center gap-3 active:scale-[0.98] transition"
          >
            <div className="w-9 h-9 rounded-[10px] bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">Pay using</p>
              <p className="text-[13px] font-bold">UPI Wallet · ₹{fmt(walletBalance)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </motion.button>

          {/* Continue → PIN */}
          <motion.button
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, type: "spring", stiffness: 260, damping: 22 }}
            disabled={!numericAmount || exceedsBalance}
            onClick={() => { haptic.medium(); setStage("pin"); }}
            className="w-full mt-5 h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-40 transition-all"
            style={{ boxShadow: "0 10px 30px hsl(42 78% 55% / 0.3), inset 0 1px 0 hsl(48 90% 70% / 0.3)" }}
          >
            <Lock className="w-4 h-4" /> Continue · Pay ₹{numericAmount || 0}
          </motion.button>
        </div>

        <style>{`@keyframes amount-shake { 10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(4px)} 30%,50%,70%{transform:translateX(-8px)} 40%,60%{transform:translateX(8px)} }`}</style>
      </div>
    );
  }

  // ---- PIN STAGE ----
  if (stage === "pin") {
    return (
      <div className="min-h-screen bg-background flex flex-col px-5 pt-4 pb-6">
        <button onClick={() => { setPin(""); setStage("review"); }} className="w-11 h-11 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${color}, ${color.replace("70%", "45%")})`, boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>
            <span className="text-[22px] font-bold text-white">{initial}</span>
          </div>
          <p className="text-[12px] text-muted-foreground/70 mb-1">Paying {payee}</p>
          <h1 className="text-[34px] font-bold tabular-nums font-mono mb-6">₹{numericAmount}</h1>
          <p className="text-[13px] text-muted-foreground mb-7">Enter your 4-digit payment PIN</p>
          <PinDots count={pin.length} error={pinError} />
          <button
            onClick={() => { haptic.light(); setShowForgotPin(true); }}
            className="mt-6 text-[12px] font-semibold text-primary hover:text-primary/80 transition py-1.5 px-3"
          >
            Forgot PIN?
          </button>
        </div>
        <NumPad onPress={onPinKey} />
        <ForgotPinModal
          open={showForgotPin}
          onClose={() => setShowForgotPin(false)}
          onSuccess={() => { setPin(""); toast.success("PIN reset — enter your new PIN"); }}
        />
      </div>
    );
  }

  // ---- PROCESSING ----
  if (stage === "processing") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
        <div className="relative w-[200px] h-[200px] flex items-center justify-center">
          {/* Concentric expanding rings */}
          {[0, 1, 2].map((i) => (
            <span key={i} className="absolute rounded-full border border-primary/40" style={{
              width: 80, height: 80,
              animation: `ring-expand 2.4s ease-out ${i * 0.8}s infinite`,
            }} />
          ))}
          {/* Icon morph */}
          <div className="relative w-[80px] h-[80px] rounded-full gradient-primary flex items-center justify-center" style={{ boxShadow: "0 0 40px hsl(42 78% 55% / 0.6)" }}>
            <AnimatePresence mode="wait">
              {processingStep < 2 ? (
                <motion.div key="lock" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}>
                  <Lock className="w-9 h-9 text-primary-foreground" strokeWidth={2.2} />
                </motion.div>
              ) : (
                <motion.div key="arrow" initial={{ scale: 0, x: -20 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0, x: 20 }}>
                  <ArrowRight className="w-9 h-9 text-primary-foreground" strokeWidth={2.2} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-8 h-6">
          <AnimatePresence mode="wait">
            <motion.p key={processingStep} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-[13px] text-muted-foreground font-medium">
              {PROCESSING_STEPS[processingStep]}
            </motion.p>
          </AnimatePresence>
        </div>
        <style>{`@keyframes ring-expand { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.4);opacity:0} }`}</style>
      </div>
    );
  }

  // ---- SUCCESS ----
  if (stage === "success") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col px-5 pb-6 overflow-hidden">
        {/* Confetti */}
        <Confetti />
        <div className="flex-1 flex flex-col items-center justify-center pt-12 relative z-10">
          {/* Drawn checkmark */}
          <svg className="w-24 h-24" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(152 60% 45%)" strokeWidth="4" strokeDasharray="289" strokeDashoffset="289" style={{ animation: "draw-circle 0.6s ease-out forwards" }} />
            <path d="M30 52 L45 67 L72 38" fill="none" stroke="hsl(152 60% 45%)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="80" strokeDashoffset="80" style={{ animation: "draw-check 0.4s 0.55s ease-out forwards" }} />
          </svg>
          <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="text-[24px] font-bold mt-5 text-success">
            Payment Successful
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="text-[12px] text-muted-foreground mt-1">
            ₹{numericAmount} paid to {payee}
          </motion.p>
        </div>

        {/* Receipt slide-up */}
        <motion.div
          initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ delay: 1.0, type: "spring", stiffness: 220, damping: 26 }}
          className="rounded-[24px] bg-white/[0.04] border border-white/[0.08] p-5 backdrop-blur-xl"
          style={{ boxShadow: "0 -10px 40px rgba(0,0,0,0.4)" }}
        >
          <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4" />
          <div className="space-y-3 mb-5">
            <ReceiptRow label="Paid to" value={payee} />
            <ReceiptRow label="UPI ID" value={upi} mono />
            <ReceiptRow label="Amount" value={`₹${numericAmount}`} mono bold />
            <ReceiptRow label="Reference" value={txMeta.reference || "—"} mono />
            <ReceiptRow label="Time" value={txMeta.time || "—"} />
          </div>

          <div className="flex gap-2 mb-3">
            <button onClick={() => { haptic.light(); shareReceipt(); }} className="flex-1 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center gap-1.5 text-[12px] font-semibold active:scale-[0.97] transition">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button onClick={() => { haptic.light(); downloadReceipt(); }} className="flex-1 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center gap-1.5 text-[12px] font-semibold active:scale-[0.97] transition">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
          <button onClick={() => navigate("/home", { replace: true })} className="w-full h-13 py-3.5 rounded-2xl gradient-primary text-primary-foreground font-bold text-[14px] active:scale-[0.97]" style={{ boxShadow: "0 8px 24px hsl(42 78% 55% / 0.3)" }}>
            Done
          </button>
        </motion.div>

        <style>{`
          @keyframes draw-circle { to { stroke-dashoffset: 0; } }
          @keyframes draw-check  { to { stroke-dashoffset: 0; } }
        `}</style>
      </div>
    );
  }

  // ---- FAILURE ----
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-6 text-center">
      <svg className="w-24 h-24" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(0 72% 55%)" strokeWidth="4" strokeDasharray="289" strokeDashoffset="289" style={{ animation: "draw-circle 0.6s ease-out forwards" }} />
        <path d="M35 35 L65 65" fill="none" stroke="hsl(0 72% 55%)" strokeWidth="5" strokeLinecap="round" strokeDasharray="50" strokeDashoffset="50" style={{ animation: "draw-check 0.3s 0.55s ease-out forwards" }} />
        <path d="M65 35 L35 65" fill="none" stroke="hsl(0 72% 55%)" strokeWidth="5" strokeLinecap="round" strokeDasharray="50" strokeDashoffset="50" style={{ animation: "draw-check 0.3s 0.85s ease-out forwards" }} />
      </svg>
      <h2 className="text-[24px] font-bold mt-5 text-destructive">Payment Failed</h2>
      <p className="text-[13px] text-muted-foreground mt-2 max-w-[280px]">{errorMsg || "Something went wrong"}</p>
      <button onClick={() => { setPin(""); setStage("pin"); }} className="mt-8 w-full max-w-[280px] h-13 py-3.5 rounded-2xl gradient-primary text-primary-foreground font-bold text-[14px] active:scale-[0.97]" style={{ boxShadow: "0 8px 24px hsl(42 78% 55% / 0.3)" }}>
        Try Again
      </button>
      <button onClick={() => navigate("/support")} className="mt-3 text-[12px] text-muted-foreground hover:text-foreground transition py-2">
        Contact Support
      </button>
      <style>{`
        @keyframes draw-circle { to { stroke-dashoffset: 0; } }
        @keyframes draw-check  { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );

  function shareReceipt() {
    const text = `Payment receipt — ₹${numericAmount} to ${payee} (${upi}) · Ref ${txMeta.reference} · ${txMeta.time}`;
    if (navigator.share) { navigator.share({ title: "Payment Receipt", text }).catch(() => {}); }
    else { navigator.clipboard.writeText(text); toast.success("Receipt copied"); }
  }
  function downloadReceipt() {
    const text = `AuroPay Receipt\n\nPaid to: ${payee}\nUPI: ${upi}\nAmount: ₹${numericAmount}\nReference: ${txMeta.reference}\nTime: ${txMeta.time}\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `receipt-${txMeta.reference || Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  }
};

// ---------- Sub-components ----------

const PinDots = ({ count, error }: { count: number; error: boolean }) => (
  <div className={`flex items-center gap-4 ${error ? "animate-[shake_0.45s]" : ""}`}>
    {[0, 1, 2, 3].map((i) => (
      <motion.div
        key={i}
        animate={{ scale: count === i + 1 ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.25 }}
        className="w-3.5 h-3.5 rounded-full transition-all"
        style={{
          background: error ? "hsl(0 72% 55%)" : i < count ? "hsl(42 78% 55%)" : "transparent",
          border: `2px solid ${error ? "hsl(0 72% 55%)" : i < count ? "hsl(42 78% 55%)" : "hsl(0 0% 100% / 0.15)"}`,
          boxShadow: i < count && !error ? "0 0 12px hsl(42 78% 55% / 0.6)" : "none",
        }}
      />
    ))}
  </div>
);

const NumPad = ({ onPress }: { onPress: (k: string) => void }) => {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-3 mt-7">
      {keys.map((k, i) => {
        if (k === "") return <div key={i} />;
        const isDel = k === "del";
        return (
          <motion.button
            key={i}
            whileTap={{ scale: 0.9 }}
            onClick={() => onPress(k)}
            className="relative h-[58px] rounded-[20px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[22px] font-bold font-mono active:bg-primary/10 active:border-primary/30 transition-colors overflow-hidden group"
          >
            <span className="absolute inset-0 rounded-[20px] bg-primary/0 group-active:bg-primary/15 transition-colors" />
            {isDel ? <Delete className="w-5 h-5 text-muted-foreground" /> : <span>{k}</span>}
          </motion.button>
        );
      })}
    </div>
  );
};

const ReceiptRow = ({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wider">{label}</span>
    <span className={`text-[13px] truncate ${mono ? "font-mono" : ""} ${bold ? "font-bold text-foreground" : "text-foreground/85"}`}>{value}</span>
  </div>
);

// Pure-CSS confetti — 28 particles in primary/white/gold
const Confetti = () => {
  const colors = ["hsl(42 78% 55%)", "hsl(48 90% 70%)", "hsl(0 0% 100%)", "hsl(42 95% 65%)"];
  const particles = Array.from({ length: 28 }).map((_, i) => ({
    left: 5 + Math.random() * 90,
    delay: Math.random() * 0.4,
    dur: 1.6 + Math.random() * 1.4,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 6,
    rot: Math.random() * 360,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <span key={i} className="absolute top-[-20px]" style={{
          left: `${p.left}%`, width: p.size, height: p.size, background: p.color,
          transform: `rotate(${p.rot}deg)`,
          animation: `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(0.4, 0, 0.6, 1) forwards`,
          borderRadius: i % 3 === 0 ? "50%" : "2px",
        }} />
      ))}
      <style>{`@keyframes confetti-fall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }`}</style>
    </div>
  );
};

export default PaymentConfirm;
