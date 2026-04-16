import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Zap, CreditCard, Building2, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

const quickAmounts = [100, 200, 500, 1000, 2000];

type Phase = "idle" | "processing" | "success";

const AddMoney = () => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayAmount, setDisplayAmount] = useState("0");
  const [amountScale, setAmountScale] = useState(1);
  const [processingStep, setProcessingStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const methods = [
    { id: "upi", label: "UPI", desc: "Instant transfer", icon: Zap, fee: "Free", accent: "152 60% 45%" },
    { id: "card", label: "Debit Card", desc: "Visa, Mastercard", icon: CreditCard, fee: "0.9%", accent: "210 80% 55%" },
    { id: "netbanking", label: "Net Banking", desc: "All major banks", icon: Building2, fee: "₹15", accent: "270 60% 55%" },
  ];

  const processingSteps = ["Connecting...", "Verifying payment...", "Crediting wallet..."];

  useEffect(() => {
    setAmountScale(1.08);
    const t = setTimeout(() => setAmountScale(1), 150);
    setDisplayAmount(amount || "0");
    return () => clearTimeout(t);
  }, [amount]);

  // Animate processing steps
  useEffect(() => {
    if (phase !== "processing") return;
    setProcessingStep(0);
    const i1 = setTimeout(() => setProcessingStep(1), 1200);
    const i2 = setTimeout(() => setProcessingStep(2), 2400);
    return () => { clearTimeout(i1); clearTimeout(i2); };
  }, [phase]);

  const handleAddMoney = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    haptic.medium();
    setPhase("processing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      if (!wallet) throw new Error("Wallet not found");

      const amountPaise = Math.round(amt * 100);

      const { error: txError } = await supabase.from("transactions").insert({
        wallet_id: wallet.id,
        type: "credit",
        amount: amountPaise,
        merchant_name: `Add Money (${method.toUpperCase()})`,
        category: "other",
        status: "success",
        description: `Added ₹${amt} via ${method}`,
      });
      if (txError) throw txError;

      const updated = (wallet.balance || 0) + amountPaise;
      await supabase.from("wallets").update({ balance: updated }).eq("id", wallet.id);

      // Ensure minimum processing animation time
      await new Promise(r => setTimeout(r, 3200));

      setPhase("success");
      haptic.heavy();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add money");
      setPhase("idle");
    }
  };

  // ── Processing + Success fullscreen overlay ──
  if (phase === "processing" || phase === "success") {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Animated background rings */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          {[1, 2, 3].map(i => (
            <div key={i} className="absolute rounded-full border"
              style={{
                width: `${150 + i * 120}px`,
                height: `${150 + i * 120}px`,
                borderColor: phase === "success"
                  ? `hsl(152 60% 45% / ${0.06 - i * 0.015})`
                  : `hsl(var(--primary) / ${0.06 - i * 0.015})`,
                animation: phase === "processing"
                  ? `ring-pulse 2.5s ease-in-out ${i * 0.4}s infinite`
                  : `ring-expand 0.8s ease-out ${i * 0.1}s both`,
                transition: "border-color 0.6s ease",
              }} />
          ))}
        </div>

        {/* Ambient glow - transitions color */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[400px] h-[400px] rounded-full blur-[120px] transition-all duration-1000"
            style={{
              background: phase === "success" ? "hsl(152 60% 45%)" : "hsl(var(--primary))",
              opacity: phase === "success" ? 0.1 : 0.06,
              transform: phase === "success" ? "scale(1.3)" : "scale(1)",
            }} />
        </div>

        <div className="relative z-10 text-center w-full max-w-xs">
          {/* Central animated element */}
          <div className="relative mx-auto mb-10 w-[120px] h-[120px]">
            {/* Outer spinning ring (processing) / drawn circle (success) */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 120">
              {/* Background ring */}
              <circle cx="60" cy="60" r="54" fill="none"
                stroke={phase === "success" ? "hsl(152 60% 45% / 0.08)" : "hsl(var(--primary) / 0.06)"}
                strokeWidth="2.5"
                style={{ transition: "stroke 0.6s ease" }} />
              {/* Animated ring */}
              <circle cx="60" cy="60" r="54" fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{
                  stroke: phase === "success" ? "hsl(152 60% 45% / 0.7)" : "hsl(var(--primary) / 0.5)",
                  strokeDasharray: phase === "success" ? "339.3" : "80 259.3",
                  strokeDashoffset: phase === "success" ? "0" : "0",
                  animation: phase === "processing"
                    ? "spinner-rotate 1.4s linear infinite"
                    : "circle-complete 0.8s ease-out both",
                  transformOrigin: "center",
                  transition: "stroke 0.4s ease",
                }} />
            </svg>

            {/* Inner glow disc */}
            <div className="absolute inset-[14px] rounded-full transition-all duration-700"
              style={{
                background: phase === "success"
                  ? "linear-gradient(135deg, hsl(152 60% 45% / 0.12), hsl(152 60% 45% / 0.03))"
                  : "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))",
                boxShadow: phase === "success"
                  ? "0 0 60px hsl(152 60% 45% / 0.15)"
                  : "0 0 40px hsl(var(--primary) / 0.1)",
                border: `1px solid ${phase === "success" ? "hsl(152 60% 45% / 0.1)" : "hsl(var(--primary) / 0.06)"}`,
              }} />

            {/* Icon transition */}
            <div className="absolute inset-0 flex items-center justify-center">
              {phase === "processing" ? (
                <div className="text-[28px]" style={{ animation: "icon-breathe 2s ease-in-out infinite" }}>
                  {method === "upi" ? "⚡" : method === "card" ? "💳" : "🏦"}
                </div>
              ) : (
                <div style={{ animation: "checkmark-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
                  <Check className="w-12 h-12" style={{ color: "hsl(152 60% 50%)" }} strokeWidth={2} />
                </div>
              )}
            </div>
          </div>

          {/* Amount display */}
          <div className="mb-3" style={{ animation: phase === "success" ? "amount-celebrate 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" : undefined }}>
            <p className="text-[42px] font-bold tracking-[-2px] leading-none transition-all duration-500"
              style={{
                background: phase === "success"
                  ? "linear-gradient(135deg, hsl(152 60% 55%), hsl(152 60% 70%))"
                  : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
              ₹{amount}
            </p>
          </div>

          {/* Status text */}
          <div className="h-[50px] flex flex-col items-center justify-center">
            {phase === "processing" ? (
              <div key="processing" style={{ animation: "fade-switch 0.3s ease both" }}>
                <p className="text-[15px] font-semibold text-white/60 mb-1.5">
                  {processingSteps[processingStep]}
                </p>
                {/* Step dots */}
                <div className="flex items-center justify-center gap-2">
                  {processingSteps.map((_, i) => (
                    <div key={i} className="h-[3px] rounded-full transition-all duration-500"
                      style={{
                        width: i === processingStep ? "20px" : "6px",
                        background: i <= processingStep
                          ? "hsl(var(--primary) / 0.6)"
                          : "hsl(220 15% 15%)",
                      }} />
                  ))}
                </div>
              </div>
            ) : (
              <div key="success" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
                <p className="text-[18px] font-bold tracking-[-0.3px]"
                  style={{
                    background: "linear-gradient(135deg, hsl(152 60% 55%), hsl(152 60% 70%))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                  Payment Successful
                </p>
                <p className="text-[12px] text-white/30 mt-1 font-medium">
                  via {method.toUpperCase()} • {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>

          {/* Success CTA - only show after success */}
          {phase === "success" && (
            <div className="mt-12 space-y-3" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both" }}>
              <button onClick={() => navigate("/home")}
                className="w-full h-[54px] rounded-2xl font-semibold text-[14px] tracking-wide active:scale-[0.97] transition-all relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
                  color: "hsl(220 20% 6%)",
                  boxShadow: "0 4px 24px hsl(var(--primary) / 0.3), inset 0 1px 0 hsl(var(--primary) / 0.3)",
                }}>
                <div className="absolute inset-0 opacity-20"
                  style={{
                    background: "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.15) 50%, transparent 70%)",
                    backgroundSize: "200% 100%",
                    animation: "skeleton-shimmer 3s ease-in-out infinite",
                  }} />
                <span className="relative z-10">Back to Home</span>
              </button>

              <button onClick={() => { setPhase("idle"); setAmount(""); }}
                className="w-full h-[48px] rounded-2xl font-medium text-[13px] text-white/40 active:scale-[0.97] transition-all"
                style={{
                  background: "hsl(220 15% 8%)",
                  border: "1px solid hsl(220 15% 12%)",
                }}>
                Add More Money
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes spinner-rotate {
            to { transform: rotate(360deg); }
          }
          @keyframes circle-complete {
            0% { stroke-dasharray: 80 259.3; stroke-dashoffset: 0; transform: rotate(0deg); }
            100% { stroke-dasharray: 339.3 0; stroke-dashoffset: 0; transform: rotate(0deg); }
          }
          @keyframes ring-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.5; }
          }
          @keyframes ring-expand {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes icon-breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes checkmark-reveal {
            0% { opacity: 0; transform: scale(0) rotate(-45deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
          }
          @keyframes amount-celebrate {
            0% { transform: scale(1); }
            40% { transform: scale(1.12); }
            100% { transform: scale(1); }
          }
          @keyframes fade-switch {
            0% { opacity: 0; transform: translateY(6px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes slide-up-spring {
            0% { opacity: 0; transform: translateY(20px) scale(0.97); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full opacity-[0.035] blur-[100px]" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute bottom-[40%] -left-20 w-[200px] h-[200px] rounded-full opacity-[0.02] blur-[70px]" style={{ background: "hsl(152 60% 45%)" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <div className="pt-4 pb-6" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]"
              style={{ background: "hsl(220 15% 8%)" }}>
              <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
            </button>
            <div>
              <h1 className="text-[19px] font-bold tracking-[-0.5px]">Add Money</h1>
              <p className="text-[10px] text-white/30 font-medium">Top up your wallet</p>
            </div>
          </div>
        </div>

        {/* Amount Display Card */}
        <div className="rounded-[22px] p-6 mb-5 border border-white/[0.04] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
            animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both",
          }}
          onClick={() => inputRef.current?.focus()}>
          <div className="absolute top-0 left-6 right-6 h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), transparent)" }} />

          <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase mb-4">Enter Amount</p>

          <div className="flex items-baseline gap-1 justify-center py-2">
            <span className="text-[24px] font-bold text-white/30">₹</span>
            <span
              className="text-[48px] font-bold tracking-[-2px] transition-transform duration-150"
              style={{
                transform: `scale(${amountScale})`,
                background: displayAmount !== "0"
                  ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))"
                  : "linear-gradient(135deg, hsl(220 10% 25%), hsl(220 10% 18%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
              {displayAmount}
            </span>
          </div>

          <input
            ref={inputRef}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-text"
            autoFocus
            inputMode="numeric"
          />

          <div className="w-16 h-[2px] mx-auto mt-2 rounded-full transition-all duration-300"
            style={{
              background: amount
                ? "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.2))"
                : "hsl(220 15% 15%)",
            }} />
        </div>

        {/* Quick Amounts */}
        <div className="flex gap-2 mb-6" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both" }}>
          {quickAmounts.map((a) => (
            <button
              key={a}
              onClick={() => { haptic.light(); setAmount(String(a)); }}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-300 active:scale-[0.93]"
              style={{
                background: amount === String(a)
                  ? "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.08))"
                  : "hsl(220 15% 8%)",
                border: `1px solid ${amount === String(a) ? "hsl(var(--primary) / 0.3)" : "hsl(220 15% 12%)"}`,
                color: amount === String(a) ? "hsl(var(--primary))" : "hsl(220 10% 45%)",
                boxShadow: amount === String(a) ? "0 2px 12px hsl(var(--primary) / 0.1)" : "none",
              }}
            >
              ₹{a >= 1000 ? `${a / 1000}K` : a}
            </button>
          ))}
        </div>

        {/* Payment Methods */}
        <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-3"
          style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both" }}>
          Payment Method
        </p>
        <div className="space-y-2.5 mb-8">
          {methods.map((m, i) => (
            <button
              key={m.id}
              onClick={() => { haptic.selection(); setMethod(m.id); }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-[16px] border transition-all duration-300 active:scale-[0.97] relative overflow-hidden"
              style={{
                background: method === m.id
                  ? `linear-gradient(135deg, hsl(${m.accent} / 0.06), hsl(220 18% 6%))`
                  : "linear-gradient(135deg, hsl(220 15% 8%), hsl(220 18% 6%))",
                borderColor: method === m.id ? `hsl(${m.accent} / 0.15)` : "hsl(220 15% 10%)",
                boxShadow: method === m.id ? `0 4px 20px hsl(${m.accent} / 0.08)` : "none",
                animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.18 + i * 0.04}s both`,
              }}
            >
              {method === m.id && (
                <div className="absolute top-0 left-4 right-4 h-[1px]"
                  style={{ background: `linear-gradient(90deg, transparent, hsl(${m.accent} / 0.25), transparent)` }} />
              )}

              <div className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center shrink-0 transition-all duration-300"
                style={{
                  background: method === m.id
                    ? `linear-gradient(135deg, hsl(${m.accent} / 0.15), hsl(${m.accent} / 0.05))`
                    : "hsl(220 15% 10%)",
                  boxShadow: method === m.id ? `0 2px 8px hsl(${m.accent} / 0.1)` : "none",
                }}>
                <m.icon className="w-[18px] h-[18px] transition-colors duration-300"
                  style={{ color: method === m.id ? `hsl(${m.accent})` : "hsl(220 10% 35%)" }} />
              </div>

              <div className="flex-1 text-left">
                <p className={`text-[13px] font-semibold transition-colors duration-300 ${method === m.id ? "text-white/80" : "text-white/40"}`}>{m.label}</p>
                <p className={`text-[10px] mt-0.5 transition-colors duration-300 ${method === m.id ? "text-white/30" : "text-white/15"}`}>{m.desc}</p>
              </div>

              <div className="text-right">
                <span className={`text-[11px] font-semibold ${m.id === "upi" ? "" : "text-white/30"}`}
                  style={{ color: m.id === "upi" ? "hsl(152 60% 50%)" : undefined }}>
                  {m.fee}
                </span>
              </div>

              <div className="w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0"
                style={{
                  borderColor: method === m.id ? `hsl(${m.accent})` : "hsl(220 12% 18%)",
                  background: method === m.id ? `hsl(${m.accent} / 0.1)` : "transparent",
                }}>
                {method === m.id && (
                  <div className="w-[8px] h-[8px] rounded-full transition-all"
                    style={{ background: `hsl(${m.accent})`, boxShadow: `0 0 6px hsl(${m.accent} / 0.4)` }} />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* CTA Button */}
        <div style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both" }}>
          <button
            onClick={handleAddMoney}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full h-[52px] rounded-2xl font-semibold text-[14px] tracking-wide active:scale-[0.97] transition-all duration-300 disabled:opacity-30 disabled:scale-100 relative overflow-hidden"
            style={{
              background: (!amount || parseFloat(amount) <= 0)
                ? "hsl(220 15% 12%)"
                : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              color: (!amount || parseFloat(amount) <= 0) ? "hsl(220 10% 30%)" : "hsl(220 20% 6%)",
              boxShadow: (amount && parseFloat(amount) > 0) ? "0 4px 24px hsl(var(--primary) / 0.3)" : "none",
            }}>
            {amount && parseFloat(amount) > 0 && (
              <div className="absolute inset-0"
                style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.1) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-shimmer 3s ease-in-out infinite",
                }} />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Add ₹{amount || "0"}
            </span>
          </button>
        </div>
      </div>

      <BottomNav />

      <style>{`
        @keyframes slide-up-spring {
          0% { opacity: 0; transform: translateY(20px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default AddMoney;
