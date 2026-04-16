import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Zap, CreditCard, Building2, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

const quickAmounts = [100, 200, 500, 1000, 2000];

const AddMoney = () => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState(0);
  const [displayAmount, setDisplayAmount] = useState("0");
  const [amountScale, setAmountScale] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const methods = [
    { id: "upi", label: "UPI", desc: "Instant transfer", icon: Zap, fee: "Free", accent: "152 60% 45%" },
    { id: "card", label: "Debit Card", desc: "Visa, Mastercard", icon: CreditCard, fee: "0.9%", accent: "210 80% 55%" },
    { id: "netbanking", label: "Net Banking", desc: "All major banks", icon: Building2, fee: "₹15", accent: "270 60% 55%" },
  ];

  // Animate amount display
  useEffect(() => {
    setAmountScale(1.08);
    const t = setTimeout(() => setAmountScale(1), 150);
    setDisplayAmount(amount || "0");
    return () => clearTimeout(t);
  }, [amount]);

  const handleAddMoney = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    haptic.medium();
    setProcessing(true);
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

      setNewBalance(updated);
      setSuccess(true);
      haptic.heavy();
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (err: any) {
      toast.error(err.message || "Failed to add money");
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Multi-layer ambient glow */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[140px]"
            style={{ background: "hsl(152 60% 45%)", animation: "success-glow-expand 1.5s ease-out forwards" }} />
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full opacity-[0.04] blur-[80px]"
            style={{ background: "hsl(var(--primary))", animation: "success-glow-expand 2s ease-out 0.3s forwards" }} />
        </div>

        {/* Floating particles */}
        <div className="fixed inset-0 pointer-events-none z-[1]">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full"
              style={{
                left: `${15 + i * 10}%`,
                top: `${20 + (i % 3) * 25}%`,
                background: i % 2 === 0 ? "hsl(152 60% 50% / 0.3)" : "hsl(var(--primary) / 0.25)",
                animation: `float-particle ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
              }} />
          ))}
        </div>

        <div className="relative z-10 text-center w-full max-w-sm">
          {/* Animated checkmark ring */}
          <div className="relative mx-auto mb-8 w-[100px] h-[100px]"
            style={{ animation: "success-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            {/* Outer ring */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(152 60% 45% / 0.1)" strokeWidth="2" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(152 60% 45% / 0.6)" strokeWidth="2"
                strokeDasharray="289" strokeDashoffset="289" strokeLinecap="round"
                style={{ animation: "circle-draw 1s ease-out 0.3s forwards" }} />
            </svg>
            {/* Inner glow */}
            <div className="absolute inset-[8px] rounded-full"
              style={{
                background: "linear-gradient(135deg, hsl(152 60% 45% / 0.12), hsl(152 60% 45% / 0.03))",
                boxShadow: "0 8px 40px hsl(152 60% 45% / 0.2), inset 0 1px 0 hsl(152 60% 45% / 0.08)",
                border: "1px solid hsl(152 60% 45% / 0.08)",
                animation: "glow-pulse 2.5s ease-in-out infinite",
              }} />
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ animation: "checkmark-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both" }}>
              <Check className="w-10 h-10" style={{ color: "hsl(152 60% 50%)" }} strokeWidth={2.5} />
            </div>
          </div>

          {/* Title with stagger */}
          <h2 className="text-[26px] font-bold tracking-[-0.8px] mb-1"
            style={{
              background: "linear-gradient(135deg, hsl(152 60% 55%), hsl(152 60% 70%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both",
            }}>
            Money Added!
          </h2>
          <p className="text-[13px] text-white/35 mb-8 font-medium"
            style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both" }}>
            ₹{amount} added via {method.toUpperCase()}
          </p>

          {/* Premium balance card */}
          <div className="rounded-[24px] p-6 mb-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg, hsl(220 18% 10%), hsl(220 20% 5.5%))",
              border: "1px solid hsl(220 15% 13%)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 hsl(220 15% 14%)",
              animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both",
            }}>
            {/* Top accent line */}
            <div className="absolute top-0 left-8 right-8 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.25), transparent)" }} />
            {/* Card shimmer */}
            <div className="absolute inset-0 opacity-30"
              style={{
                background: "linear-gradient(110deg, transparent 30%, hsl(var(--primary) / 0.03) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-shimmer 4s ease-in-out infinite",
              }} />

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ background: "hsl(var(--primary) / 0.1)" }}>
                  <Sparkles className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <p className="text-[10px] text-white/30 font-semibold tracking-[0.2em] uppercase">New Balance</p>
              </div>
              <p className="text-[40px] font-bold tracking-[-1.5px] leading-none"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 8px hsl(var(--primary) / 0.2))",
                }}>
                ₹{(newBalance / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Transaction receipt mini */}
          <div className="rounded-[16px] p-4 mb-8 flex items-center justify-between"
            style={{
              background: "hsl(220 15% 8%)",
              border: "1px solid hsl(220 15% 11%)",
              animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s both",
            }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "hsl(152 60% 45% / 0.1)" }}>
                <Zap className="w-4 h-4" style={{ color: "hsl(152 60% 50%)" }} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-white/50">Transaction</p>
                <p className="text-[9px] text-white/20">Completed successfully</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold" style={{ color: "hsl(152 60% 50%)" }}>+₹{amount}</p>
            </div>
          </div>

          {/* CTA */}
          <div style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both" }}>
            <button onClick={() => navigate("/home")}
              className="w-full h-[54px] rounded-2xl font-semibold text-[14px] tracking-wide active:scale-[0.97] transition-all relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
                color: "hsl(220 20% 6%)",
                boxShadow: "0 4px 24px hsl(var(--primary) / 0.3), 0 1px 0 hsl(var(--primary) / 0.4) inset",
            }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient orbs */}
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
          {/* Top accent */}
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

          {/* Hidden input */}
          <input
            ref={inputRef}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-text"
            autoFocus
            inputMode="numeric"
          />

          {/* Subtle underline indicator */}
          <div className="w-16 h-[2px] mx-auto mt-2 rounded-full transition-all duration-300"
            style={{
              background: amount
                ? "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.2))"
                : "hsl(220 15% 15%)",
            }} />
        </div>

        {/* Quick Amounts */}
        <div className="flex gap-2 mb-6" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both" }}>
          {quickAmounts.map((a, i) => (
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
              {/* Selection accent */}
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

              {/* Radio indicator */}
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
            disabled={processing || !amount || parseFloat(amount) <= 0}
            className="w-full h-[52px] rounded-2xl font-semibold text-[14px] tracking-wide active:scale-[0.97] transition-all duration-300 disabled:opacity-30 disabled:scale-100 relative overflow-hidden"
            style={{
              background: (!amount || parseFloat(amount) <= 0)
                ? "hsl(220 15% 12%)"
                : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              color: (!amount || parseFloat(amount) <= 0) ? "hsl(220 10% 30%)" : "hsl(220 20% 6%)",
              boxShadow: (amount && parseFloat(amount) > 0) ? "0 4px 24px hsl(var(--primary) / 0.3)" : "none",
            }}>
            {/* Shimmer on active */}
            {amount && parseFloat(amount) > 0 && !processing && (
              <div className="absolute inset-0"
                style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.1) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-shimmer 3s ease-in-out infinite",
                }} />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Add ₹{amount || "0"}
                </>
              )}
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
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
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
