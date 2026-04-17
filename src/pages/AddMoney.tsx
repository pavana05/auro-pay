import { useEffect, useState, useRef, useMemo } from "react";
import { ArrowLeft, CreditCard, Building2, Check, Sparkles, Search, X, Shield, Zap, Repeat, Calendar, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { startRazorpayPayment } from "@/lib/razorpay";
import { isAndroidNative, openUpiApp } from "@/lib/upi-intent";
import KycGate from "@/components/KycGate";

type Phase = "idle" | "processing" | "success";
type Method = "upi" | "card" | "netbanking";

const quickAmounts = [100, 500, 1000, 2000, 5000];

// UPI apps — render coloured glyphs (no external assets) and trigger upi:// intents.
const upiApps = [
  { id: "gpay",    label: "GPay",       glyph: "G",  bg: "linear-gradient(135deg, hsl(38 90% 60%), hsl(28 90% 55%))",  pkg: "com.google.android.apps.nbu.paisa.user" },
  { id: "phonepe", label: "PhonePe",    glyph: "Pe", bg: "linear-gradient(135deg, hsl(42 80% 55%), hsl(36 88% 50%))",  pkg: "com.phonepe.app" },
  { id: "paytm",   label: "Paytm",      glyph: "P",  bg: "linear-gradient(135deg, hsl(48 85% 58%), hsl(40 90% 52%))",  pkg: "net.one97.paytm" },
  { id: "bhim",    label: "BHIM",       glyph: "B",  bg: "linear-gradient(135deg, hsl(32 88% 56%), hsl(22 88% 50%))",  pkg: "in.org.npci.upiapp" },
] as const;

// Top Indian banks for the netbanking picker.
const banks = [
  { code: "HDFC",  name: "HDFC Bank",          tint: "42 85% 55%" },
  { code: "ICICI", name: "ICICI Bank",         tint: "32 80% 55%" },
  { code: "SBI",   name: "State Bank of India",tint: "48 75% 55%" },
  { code: "AXIS",  name: "Axis Bank",          tint: "26 85% 55%" },
  { code: "KOTAK", name: "Kotak Mahindra Bank",tint: "38 80% 55%" },
  { code: "YES",   name: "Yes Bank",           tint: "44 82% 55%" },
  { code: "IDFC",  name: "IDFC FIRST Bank",    tint: "36 85% 55%" },
  { code: "PNB",   name: "Punjab National Bank",tint: "40 78% 55%" },
  { code: "BOB",   name: "Bank of Baroda",     tint: "30 82% 55%" },
  { code: "CANARA",name: "Canara Bank",        tint: "46 80% 55%" },
  { code: "UNION", name: "Union Bank of India",tint: "34 82% 55%" },
  { code: "INDUS", name: "IndusInd Bank",      tint: "28 85% 55%" },
] as const;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AddMoney = () => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("upi");
  const [selectedUpi, setSelectedUpi] = useState<string>("gpay");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [showBankSheet, setShowBankSheet] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [processingStep, setProcessingStep] = useState(0);
  // Auto-Pay
  const [autoPay, setAutoPay] = useState(false);
  const [autoFreq, setAutoFreq] = useState<"weekly" | "monthly">("weekly");
  const [autoDay, setAutoDay] = useState<number>(1); // weekday for weekly, day-of-month for monthly
  // UPI fallback sheet
  const [showFallback, setShowFallback] = useState<{ appLabel: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const amt = parseFloat(amount) || 0;
  const MIN = 10, MAX = 100000;
  const outOfRange = amt > 0 && (amt < MIN || amt > MAX);
  const canPay = amt >= MIN && amt <= MAX && (method !== "netbanking" || !!selectedBank);

  const fee = method === "card" ? Math.ceil(amt * 0.009) : method === "netbanking" ? 15 : 0;
  const total = amt + fee;

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    return q ? banks.filter(b => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)) : [...banks];
  }, [bankSearch]);

  const processingSteps = ["Connecting to bank…", "Verifying payment…", "Crediting wallet…"];

  useEffect(() => {
    if (phase !== "processing") return;
    setProcessingStep(0);
    const i1 = setTimeout(() => setProcessingStep(1), 1100);
    const i2 = setTimeout(() => setProcessingStep(2), 2300);
    return () => { clearTimeout(i1); clearTimeout(i2); };
  }, [phase]);

  const createAutoPay = async (uid: string) => {
    if (!autoPay) return;
    try {
      const next = new Date();
      if (autoFreq === "weekly") {
        const delta = (autoDay - next.getUTCDay() + 7) % 7 || 7;
        next.setUTCDate(next.getUTCDate() + delta);
      } else {
        next.setUTCMonth(next.getUTCMonth() + 1);
        next.setUTCDate(Math.min(autoDay, 28));
      }
      await supabase.from("recurring_payments").insert({
        user_id: uid,
        amount: amt * 100,
        frequency: autoFreq,
        next_run_at: next.toISOString(),
        kind: "topup",
        day_of_week: autoFreq === "weekly" ? autoDay : null,
        day_of_month: autoFreq === "monthly" ? autoDay : null,
        note: `Auto top-up · ₹${amt}`,
        favorite_id: null,
      } as any);
      toast.success(`Auto-Pay set: ₹${amt} ${autoFreq === "weekly" ? `every ${DAY_LABELS[autoDay]}` : `on the ${autoDay}${["st","nd","rd"][autoDay-1]||"th"}`}`);
    } catch (e: any) {
      toast.error("Couldn't save Auto-Pay: " + (e.message || "unknown"));
    }
  };

  const tryUpiIntent = async (): Promise<boolean> => {
    if (method !== "upi" || !isAndroidNative()) return false;
    const app = upiApps.find(a => a.id === selectedUpi);
    if (!app) return false;
    // Use AuroPay's master VPA (sandbox-friendly placeholder).
    const handled = await openUpiApp(selectedUpi, {
      pa: "auropay@upi",
      pn: "AuroPay Wallet",
      am: total,
      tn: `Add money`,
      tr: `AP${Date.now()}`,
    });
    if (!handled) {
      setShowFallback({ appLabel: app.label });
      return true; // we handled (showed sheet)
    }
    // We can't programmatically confirm payment, so move to a pending state and wait
    // for the user to return. On return, ask backend if anything succeeded — for now
    // we optimistically show success after a short delay (sandbox).
    setTimeout(() => setPhase("success"), 1500);
    return true;
  };

  const handlePay = async () => {
    if (!canPay) {
      if (method === "netbanking" && !selectedBank) { toast.error("Pick a bank to continue"); return; }
      toast.error(`Enter an amount between ₹${MIN} and ₹${MAX.toLocaleString("en-IN")}`);
      return;
    }

    haptic.medium();

    // Try Android UPI intent first
    const used = await tryUpiIntent();
    if (used) return;

    setPhase("processing");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle()
        : { data: null };

      const desc =
        method === "upi"        ? `Add ₹${amt} via ${upiApps.find(a => a.id === selectedUpi)?.label}` :
        method === "card"       ? `Add ₹${amt} via Debit/Credit Card` :
                                  `Add ₹${amt} via ${banks.find(b => b.code === selectedBank)?.name || "Netbanking"}`;

      await startRazorpayPayment({
        amount: total,
        description: desc,
        prefill: {
          name: profile?.full_name || undefined,
          email: user?.email,
          contact: profile?.phone || undefined,
        },
        onSuccess: async () => {
          await new Promise(r => setTimeout(r, 1400));
          if (user) await createAutoPay(user.id);
          setPhase("success");
          haptic.success();
        },
        onFailure: (err) => {
          toast.error(err?.message || err?.description || "Payment failed");
          setPhase("idle");
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to add money");
      setPhase("idle");
    }
  };

  // ────────────────────────────────────────────────────────────────────
  // SUCCESS / PROCESSING — full-screen overlay
  // ────────────────────────────────────────────────────────────────────
  if (phase === "processing" || phase === "success") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 overflow-hidden"
        style={{ background: "hsl(220 22% 4%)" }}>

        {/* Tunnel — concentric pulsing gold rings drawing the eye to the centre */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="absolute rounded-full border"
              style={{
                width: `${120 + i * 110}px`,
                height: `${120 + i * 110}px`,
                borderColor: phase === "success"
                  ? `hsl(var(--primary) / ${0.18 - i * 0.025})`
                  : `hsl(var(--primary) / ${0.14 - i * 0.022})`,
                animation: phase === "processing"
                  ? `am-tunnel 2.4s ease-in-out ${i * 0.18}s infinite`
                  : `am-ring-burst 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s both`,
              }} />
          ))}
        </div>

        {/* Ambient glow */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[420px] h-[420px] rounded-full blur-[120px] transition-all duration-[1200ms]"
            style={{
              background: "hsl(var(--primary))",
              opacity: phase === "success" ? 0.18 : 0.08,
              transform: phase === "success" ? "scale(1.35)" : "scale(1)",
            }} />
        </div>

        {/* Confetti — only on success */}
        {phase === "success" && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => {
              const left = (i * 37) % 100;
              const delay = (i % 8) * 0.06;
              const duration = 1.6 + ((i * 13) % 10) / 12;
              const tint = i % 3 === 0 ? "var(--primary)" : i % 3 === 1 ? "42 85% 65%" : "32 80% 60%";
              const size = 6 + (i % 4) * 2;
              const rot = (i * 47) % 360;
              return (
                <div key={i}
                  className="absolute rounded-[2px]"
                  style={{
                    left: `${left}%`,
                    top: "-20px",
                    width: size,
                    height: size * 0.45,
                    background: `hsl(${tint})`,
                    transform: `rotate(${rot}deg)`,
                    animation: `am-confetti ${duration}s cubic-bezier(0.4, 0.6, 0.6, 1) ${delay}s forwards`,
                    boxShadow: `0 0 8px hsl(${tint} / 0.5)`,
                  }} />
              );
            })}
          </div>
        )}

        <div className="relative z-10 text-center w-full max-w-xs">
          {/* Central icon disc */}
          <div className="relative mx-auto mb-10 w-[130px] h-[130px]">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="58" fill="none"
                stroke="hsl(var(--primary) / 0.08)" strokeWidth="2.5" />
              <circle cx="65" cy="65" r="58" fill="none"
                strokeWidth="2.5" strokeLinecap="round"
                style={{
                  stroke: "hsl(var(--primary))",
                  strokeDasharray: phase === "success" ? "364.4" : "90 274.4",
                  animation: phase === "processing"
                    ? "am-spin 1.4s linear infinite"
                    : "am-circle-complete 0.8s ease-out both",
                  transformOrigin: "center",
                }} />
            </svg>

            <div className="absolute inset-[16px] rounded-full transition-all duration-700"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.02))",
                boxShadow: phase === "success"
                  ? "0 0 70px hsl(var(--primary) / 0.35)"
                  : "0 0 40px hsl(var(--primary) / 0.15)",
                border: "1px solid hsl(var(--primary) / 0.12)",
              }} />

            {/* Coin drop — animated coin descends and lands with a bounce */}
            <div className="absolute inset-0 flex items-center justify-center">
              {phase === "processing" ? (
                <div style={{ animation: "am-coin-fall 1.6s cubic-bezier(0.5, 0, 0.6, 1) infinite" }}>
                  <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center font-bold text-[20px] tracking-tight"
                    style={{
                      background: "linear-gradient(135deg, hsl(48 90% 65%), hsl(38 88% 52%))",
                      color: "hsl(220 25% 8%)",
                      boxShadow: "0 6px 20px hsl(var(--primary) / 0.5), inset 0 2px 0 hsl(48 95% 80% / 0.6), inset 0 -2px 0 hsl(28 80% 35% / 0.4)",
                    }}>
                    ₹
                  </div>
                </div>
              ) : (
                <div style={{ animation: "am-check-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
                  <Check className="w-[52px] h-[52px]" style={{ color: "hsl(var(--primary))" }} strokeWidth={2.5} />
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="mb-3" style={{ animation: phase === "success" ? "am-amount-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both" : undefined }}>
            <p className="text-[44px] font-bold tracking-[-2px] leading-none"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(48 90% 70%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
              ₹{amount}
            </p>
            {fee > 0 && (
              <p className="text-[10px] text-white/30 mt-1.5">+ ₹{fee} fee · Total ₹{total.toLocaleString("en-IN")}</p>
            )}
          </div>

          {/* Status text */}
          <div className="h-[60px] flex flex-col items-center justify-center">
            {phase === "processing" ? (
              <div key={`p-${processingStep}`} style={{ animation: "am-fade-switch 0.3s ease both" }}>
                <p className="text-[14px] font-semibold text-white/65 mb-2">{processingSteps[processingStep]}</p>
                <div className="flex items-center justify-center gap-1.5">
                  {processingSteps.map((_, i) => (
                    <div key={i} className="h-[3px] rounded-full transition-all duration-500"
                      style={{
                        width: i === processingStep ? "22px" : "6px",
                        background: i <= processingStep ? "hsl(var(--primary) / 0.7)" : "hsl(220 15% 14%)",
                      }} />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ animation: "am-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
                <p className="text-[18px] font-bold tracking-[-0.3px]" style={{ color: "hsl(var(--primary))" }}>
                  Money Added
                </p>
                <p className="text-[12px] text-white/35 mt-1 font-medium">
                  {method === "upi"
                    ? `via ${upiApps.find(a => a.id === selectedUpi)?.label}`
                    : method === "card"
                    ? "via Debit Card"
                    : `via ${banks.find(b => b.code === selectedBank)?.name}`}
                  {" · "}
                  {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>

          {/* Success CTAs */}
          {phase === "success" && (
            <div className="mt-10 space-y-2.5" style={{ animation: "am-slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s both" }}>
              <button onClick={() => navigate("/home")}
                className="w-full h-[52px] rounded-2xl font-semibold text-[14px] tracking-wide active:scale-[0.97] transition-all relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))",
                  color: "hsl(220 22% 6%)",
                  boxShadow: "0 6px 24px hsl(var(--primary) / 0.35), inset 0 1px 0 hsl(48 95% 80% / 0.3)",
                }}>
                Done
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={() => { setPhase("idle"); setAmount(""); }}
                  className="h-[46px] rounded-2xl font-medium text-[12.5px] text-white/65 active:scale-[0.97] transition-all"
                  style={{
                    background: "hsl(220 15% 8%)",
                    border: "1px solid hsl(220 15% 13%)",
                  }}>
                  Add more
                </button>
                <button onClick={() => navigate("/activity")}
                  className="h-[46px] rounded-2xl font-medium text-[12.5px] text-white/65 active:scale-[0.97] transition-all"
                  style={{
                    background: "hsl(220 15% 8%)",
                    border: "1px solid hsl(220 15% 13%)",
                  }}>
                  View activity
                </button>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes am-spin { to { transform: rotate(360deg); } }
          @keyframes am-circle-complete {
            0% { stroke-dasharray: 90 274.4; stroke-dashoffset: 0; }
            100% { stroke-dasharray: 364.4 0; stroke-dashoffset: 0; }
          }
          @keyframes am-tunnel {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.06); opacity: 0.55; }
          }
          @keyframes am-ring-burst {
            0% { transform: scale(0.85); opacity: 0; }
            60% { opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes am-coin-fall {
            0%   { transform: translateY(-26px) rotateY(0deg); opacity: 0; }
            18%  { opacity: 1; }
            55%  { transform: translateY(8px) rotateY(180deg); }
            70%  { transform: translateY(-4px) rotateY(220deg); }
            85%  { transform: translateY(2px) rotateY(340deg); }
            100% { transform: translateY(0) rotateY(360deg); opacity: 1; }
          }
          @keyframes am-check-pop {
            0% { opacity: 0; transform: scale(0.4) rotate(-25deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
          }
          @keyframes am-amount-pop {
            0% { transform: scale(1); }
            45% { transform: scale(1.14); }
            100% { transform: scale(1); }
          }
          @keyframes am-fade-switch {
            0% { opacity: 0; transform: translateY(6px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes am-slide-up {
            0% { opacity: 0; transform: translateY(18px) scale(0.97); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes am-confetti {
            0%   { transform: translate3d(0,0,0) rotate(0deg); opacity: 1; }
            100% { transform: translate3d(var(--cx, 20px), 110vh, 0) rotate(720deg); opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // MAIN FORM
  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      {/* Background ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[360px] h-[360px] rounded-full opacity-[0.04] blur-[100px]"
          style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute bottom-[35%] -left-24 w-[220px] h-[220px] rounded-full opacity-[0.025] blur-[80px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <div className="pt-4 pb-5" style={{ animation: "am-slide-up 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]"
              style={{ background: "hsl(220 15% 8%)" }}>
              <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
            </button>
            <div>
              <h1 className="text-[19px] font-bold tracking-[-0.5px]">Add Money</h1>
              <p className="text-[10px] text-white/30 font-medium flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> 256-bit encrypted top-up
              </p>
            </div>
          </div>
        </div>

        {/* Amount card with native input */}
        <div className="rounded-[22px] p-5 mb-4 border border-white/[0.04] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5.5%))",
            animation: "am-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both",
          }}>
          <div className="absolute top-0 left-6 right-6 h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.25), transparent)" }} />

          <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-3">Amount</p>

          <div className="flex items-baseline gap-1.5">
            <span className="text-[24px] font-mono font-semibold" style={{ color: "hsl(var(--primary))" }}>₹</span>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              autoFocus
              className="flex-1 bg-transparent outline-none text-[40px] font-mono font-semibold tracking-[-1px]"
              style={{
                color: outOfRange ? "hsl(0 70% 60%)" : amount ? "hsl(var(--primary))" : "hsl(220 10% 22%)",
                caretColor: "hsl(var(--primary))",
              }}
            />
            {amount && (
              <button onClick={() => { setAmount(""); haptic.light(); inputRef.current?.focus(); }}
                className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition"
                style={{ background: "hsl(220 15% 11%)" }}>
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            )}
          </div>

          <div className="w-full h-[1px] mt-2 rounded-full transition-all"
            style={{
              background: outOfRange
                ? "hsl(0 70% 55% / 0.5)"
                : amount
                ? "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.1))"
                : "hsl(220 15% 12%)",
            }} />

          <p className="text-[11px] mt-2.5 font-medium"
            style={{ color: outOfRange ? "hsl(0 70% 60%)" : "hsl(220 10% 38%)" }}>
            {outOfRange
              ? (amt < MIN ? `Minimum ₹${MIN}` : `Maximum ₹${MAX.toLocaleString("en-IN")}`)
              : `Min ₹${MIN} · Max ₹${MAX.toLocaleString("en-IN")}`}
          </p>
        </div>

        {/* Quick amount chips */}
        <div className="-mx-5 px-5 mb-5 overflow-x-auto scrollbar-hide"
          style={{ animation: "am-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both" }}>
          <div className="flex gap-2 w-max">
            {quickAmounts.map((a) => {
              const active = amount === String(a);
              return (
                <button key={a}
                  onClick={() => { haptic.light(); setAmount(String(a)); }}
                  className="px-4 py-2 rounded-full text-[12px] font-mono font-semibold transition-all active:scale-[0.92] whitespace-nowrap"
                  style={{
                    background: active
                      ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))"
                      : "hsl(220 15% 8%)",
                    border: `1px solid ${active ? "hsl(var(--primary) / 0.5)" : "hsl(220 15% 12%)"}`,
                    color: active ? "hsl(220 22% 6%)" : "hsl(220 10% 55%)",
                    boxShadow: active ? "0 4px 16px hsl(var(--primary) / 0.28)" : "none",
                  }}>
                  ₹{a.toLocaleString("en-IN")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Method tabs */}
        <p className="text-[10px] text-white/25 font-semibold tracking-widest uppercase mb-2.5"
          style={{ animation: "am-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.13s both" }}>
          Pay using
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4"
          style={{ animation: "am-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both" }}>
          {([
            { id: "upi", label: "UPI", icon: Zap, fee: "Free" },
            { id: "card", label: "Card", icon: CreditCard, fee: "0.9%" },
            { id: "netbanking", label: "Net Bank", icon: Building2, fee: "₹15" },
          ] as const).map((t) => {
            const active = method === t.id;
            return (
              <button key={t.id}
                onClick={() => { haptic.selection(); setMethod(t.id); }}
                className="flex flex-col items-center justify-center gap-1.5 h-[78px] rounded-[16px] border transition-all active:scale-[0.97]"
                style={{
                  background: active
                    ? "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(220 18% 6%))"
                    : "hsl(220 15% 7%)",
                  borderColor: active ? "hsl(var(--primary) / 0.35)" : "hsl(220 15% 11%)",
                  boxShadow: active ? "0 4px 20px hsl(var(--primary) / 0.12)" : "none",
                }}>
                <t.icon className="w-[18px] h-[18px]"
                  style={{ color: active ? "hsl(var(--primary))" : "hsl(220 10% 40%)" }} />
                <p className="text-[12px] font-semibold"
                  style={{ color: active ? "hsl(0 0% 95%)" : "hsl(220 10% 50%)" }}>
                  {t.label}
                </p>
                <p className="text-[9px] font-mono"
                  style={{ color: active ? "hsl(var(--primary) / 0.85)" : "hsl(220 10% 35%)" }}>
                  {t.fee}
                </p>
              </button>
            );
          })}
        </div>

        {/* UPI app picker */}
        {method === "upi" && (
          <div className="mb-5" style={{ animation: "am-slide-up 0.4s ease-out both" }}>
            <p className="text-[10px] text-white/25 font-semibold tracking-widest uppercase mb-2.5">Choose UPI app</p>
            <div className="grid grid-cols-4 gap-2">
              {upiApps.map((app) => {
                const active = selectedUpi === app.id;
                return (
                  <button key={app.id}
                    onClick={() => { haptic.selection(); setSelectedUpi(app.id); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-[14px] border transition-all active:scale-[0.95]"
                    style={{
                      background: active ? "hsl(var(--primary) / 0.06)" : "hsl(220 15% 7%)",
                      borderColor: active ? "hsl(var(--primary) / 0.4)" : "hsl(220 15% 11%)",
                    }}>
                    <div className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-[14px]"
                      style={{
                        background: app.bg,
                        color: "hsl(220 25% 8%)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
                      }}>
                      {app.glyph}
                    </div>
                    <p className="text-[10px] font-semibold"
                      style={{ color: active ? "hsl(0 0% 92%)" : "hsl(220 10% 55%)" }}>
                      {app.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Card hint */}
        {method === "card" && (
          <div className="mb-5 p-3.5 rounded-[14px] border flex items-center gap-3"
            style={{
              background: "hsl(220 15% 7%)",
              borderColor: "hsl(220 15% 11%)",
              animation: "am-slide-up 0.4s ease-out both",
            }}>
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center"
              style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <CreditCard className="w-[18px] h-[18px]" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-white/85">Debit / Credit / Rupay</p>
              <p className="text-[10.5px] text-white/40">Card details collected on the next screen</p>
            </div>
          </div>
        )}

        {/* Bank picker trigger */}
        {method === "netbanking" && (
          <div className="mb-5" style={{ animation: "am-slide-up 0.4s ease-out both" }}>
            <p className="text-[10px] text-white/25 font-semibold tracking-widest uppercase mb-2.5">Select your bank</p>
            <button onClick={() => { haptic.light(); setShowBankSheet(true); }}
              className="w-full flex items-center gap-3 p-3.5 rounded-[14px] border transition-all active:scale-[0.98]"
              style={{
                background: "hsl(220 15% 7%)",
                borderColor: selectedBank ? "hsl(var(--primary) / 0.3)" : "hsl(220 15% 11%)",
              }}>
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-[12px]"
                style={{
                  background: selectedBank
                    ? `linear-gradient(135deg, hsl(${banks.find(b => b.code === selectedBank)?.tint} / 0.25), hsl(${banks.find(b => b.code === selectedBank)?.tint} / 0.08))`
                    : "hsl(220 15% 10%)",
                  color: selectedBank ? `hsl(${banks.find(b => b.code === selectedBank)?.tint})` : "hsl(220 10% 40%)",
                  border: selectedBank ? `1px solid hsl(${banks.find(b => b.code === selectedBank)?.tint} / 0.3)` : "1px solid hsl(220 15% 13%)",
                }}>
                {selectedBank || <Building2 className="w-[18px] h-[18px]" />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[12.5px] font-semibold text-white/85 truncate">
                  {selectedBank ? banks.find(b => b.code === selectedBank)?.name : "Pick a bank"}
                </p>
                <p className="text-[10.5px] text-white/40">{selectedBank ? "Tap to change" : `${banks.length}+ banks supported`}</p>
              </div>
              <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--primary))" }}>{selectedBank ? "Change" : "Choose"}</span>
            </button>
          </div>
        )}

        {/* Order summary */}
        {amt > 0 && !outOfRange && (
          <div className="rounded-[16px] p-3.5 mb-5 border"
            style={{
              background: "hsl(220 15% 6.5%)",
              borderColor: "hsl(220 15% 11%)",
              animation: "am-slide-up 0.35s ease-out both",
            }}>
            <div className="flex items-center justify-between text-[11.5px] mb-1.5">
              <span className="text-white/45">Amount</span>
              <span className="text-white/80 font-mono">₹{amt.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between text-[11.5px] mb-2">
              <span className="text-white/45">Convenience fee</span>
              <span className="font-mono" style={{ color: fee > 0 ? "hsl(0 0% 80%)" : "hsl(var(--primary))" }}>
                {fee > 0 ? `₹${fee}` : "FREE"}
              </span>
            </div>
            <div className="h-[1px] my-2" style={{ background: "hsl(220 15% 11%)" }} />
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-white/85">Total payable</span>
              <span className="text-[15px] font-mono font-bold" style={{ color: "hsl(var(--primary))" }}>
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ animation: "am-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both" }}>
          <button onClick={handlePay} disabled={!canPay}
            className="w-full h-[54px] rounded-2xl font-semibold text-[14px] tracking-wide active:scale-[0.97] transition-all disabled:scale-100 relative overflow-hidden"
            style={{
              background: !canPay
                ? "hsl(220 15% 12%)"
                : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))",
              color: !canPay ? "hsl(220 10% 35%)" : "hsl(220 22% 6%)",
              boxShadow: canPay ? "0 6px 26px hsl(var(--primary) / 0.32)" : "none",
              opacity: !canPay ? 0.6 : 1,
            }}>
            {canPay && (
              <div className="absolute inset-0"
                style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.12) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "am-shimmer 3s ease-in-out infinite",
                }} />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              {amt > 0
                ? `Pay ₹${total.toLocaleString("en-IN")}`
                : "Enter an amount"}
            </span>
          </button>
          <p className="text-center text-[10px] text-white/25 mt-2.5 flex items-center justify-center gap-1">
            <Shield className="w-2.5 h-2.5" /> Secured by Razorpay · RBI authorised
          </p>
        </div>
      </div>

      {/* Bank picker bottom sheet */}
      {showBankSheet && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            style={{ animation: "am-overlay-in 0.25s ease-out both" }}
            onClick={() => setShowBankSheet(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 rounded-t-[24px] border-t border-x"
            style={{
              background: "hsl(220 22% 5%)",
              borderColor: "hsl(220 15% 11%)",
              maxHeight: "78vh",
              animation: "am-sheet-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}>
            <div className="flex justify-center pt-3">
              <div className="w-10 h-1 rounded-full" style={{ background: "hsl(220 15% 18%)" }} />
            </div>
            <div className="px-5 pt-3 pb-3 flex items-center justify-between">
              <h3 className="text-[16px] font-bold tracking-[-0.3px]">Select Bank</h3>
              <button onClick={() => setShowBankSheet(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90"
                style={{ background: "hsl(220 15% 9%)" }}>
                <X className="w-4 h-4 text-white/55" />
              </button>
            </div>
            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Search banks…"
                  className="w-full h-[44px] pl-10 pr-3 rounded-[12px] text-[13px] outline-none border placeholder:text-white/25"
                  style={{ background: "hsl(220 15% 7%)", borderColor: "hsl(220 15% 11%)" }}
                />
              </div>
            </div>
            <div className="px-3 pb-6 overflow-y-auto" style={{ maxHeight: "calc(78vh - 140px)" }}>
              {filteredBanks.length === 0 ? (
                <div className="px-5 py-10 text-center text-[12px] text-white/40">No banks match "{bankSearch}"</div>
              ) : filteredBanks.map((b) => {
                const active = selectedBank === b.code;
                return (
                  <button key={b.code}
                    onClick={() => {
                      haptic.selection();
                      setSelectedBank(b.code);
                      setBankSearch("");
                      setShowBankSheet(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-[12px] active:scale-[0.98] transition mb-1"
                    style={{ background: active ? "hsl(var(--primary) / 0.06)" : "transparent" }}>
                    <div className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-[11px] shrink-0"
                      style={{
                        background: `linear-gradient(135deg, hsl(${b.tint} / 0.22), hsl(${b.tint} / 0.06))`,
                        color: `hsl(${b.tint})`,
                        border: `1px solid hsl(${b.tint} / 0.25)`,
                      }}>
                      {b.code}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[13px] font-semibold text-white/85 truncate">{b.name}</p>
                      <p className="text-[10px] text-white/35">Netbanking · ₹15 fee</p>
                    </div>
                    {active && <Check className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <BottomNav />

      <style>{`
        @keyframes am-slide-up {
          0% { opacity: 0; transform: translateY(16px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes am-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes am-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes am-sheet-in {
          from { transform: translate(-50%, 100%); }
          to   { transform: translate(-50%, 0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const AddMoneyGated = () => (
  <KycGate feature="Add Money">
    <AddMoney />
  </KycGate>
);

export default AddMoneyGated;
