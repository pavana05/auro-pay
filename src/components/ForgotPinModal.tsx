// Forgot PIN flow — request OTP → enter OTP + new PIN.
// Used from PaymentConfirm PIN stage and SecurityPin page.
import { useEffect, useState } from "react";
import { X, Shield, ArrowRight, Loader2, CheckCircle2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "request" | "verify" | "done";

const ForgotPinModal = ({ open, onClose, onSuccess }: Props) => {
  const [step, setStep] = useState<Step>("request");
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!open) {
      // Reset on close
      setStep("request");
      setMaskedPhone(null);
      setOtp(""); setNewPin(""); setConfirmPin("");
      setSecondsLeft(0);
    }
  }, [open]);

  // Countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const requestOtp = async () => {
    setRequesting(true);
    haptic.medium();
    const { data, error } = await supabase.functions.invoke("payment-pin", {
      body: { action: "request_otp" },
    });
    setRequesting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Could not send OTP");
      haptic.error();
      return;
    }
    setMaskedPhone((data as any)?.masked_phone || null);
    setSecondsLeft((data as any)?.expires_in_seconds || 600);
    setStep("verify");
    toast.success("OTP sent");
  };

  const submitReset = async () => {
    if (!/^\d{6}$/.test(otp)) { toast.error("Enter the 6-digit OTP"); return; }
    if (!/^\d{4}$/.test(newPin)) { toast.error("PIN must be 4 digits"); return; }
    if (newPin !== confirmPin) { toast.error("PINs don't match"); haptic.error(); return; }
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("payment-pin", {
      body: { action: "reset", otp, pin: newPin },
    });
    setResetting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Reset failed");
      haptic.error();
      return;
    }
    haptic.success();
    setStep("done");
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 1400);
  };

  if (!open) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(1, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !resetting && !requesting && onClose()}
        style={{ animation: "qp-fade 0.2s ease-out" }}
      />
      <div
        className="relative w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-white/[0.08] p-6 pb-8 mx-0 sm:mx-4"
        style={{
          background: "linear-gradient(180deg, hsl(220 22% 9%), hsl(220 22% 5%))",
          animation: "qp-sheet-up 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        {/* Drag handle */}
        <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5 sm:hidden" />

        {/* Close */}
        <button
          onClick={() => !resetting && !requesting && onClose()}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
          style={{ background: "hsl(220 15% 10%)" }}
        >
          <X className="w-4 h-4 text-white/55" />
        </button>

        {/* ─── REQUEST STEP ─── */}
        {step === "request" && (
          <>
            <div className="flex flex-col items-center text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border border-primary/20"
                style={{ background: "hsl(var(--primary) / 0.1)", boxShadow: "0 0 24px hsl(42 78% 55% / 0.18)" }}
              >
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-[19px] font-bold tracking-[-0.5px]">Reset Payment PIN</h2>
              <p className="text-[12.5px] text-white/55 mt-1.5 max-w-[300px] leading-relaxed">
                We'll send a 6-digit code to your registered mobile number. Use it to set a new 4-digit payment PIN.
              </p>
            </div>

            <button
              onClick={requestOtp}
              disabled={requesting}
              className="w-full mt-6 h-13 py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.97] transition disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))",
                color: "hsl(220 22% 6%)",
                boxShadow: "0 8px 24px hsl(var(--primary) / 0.3)",
              }}
            >
              {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {requesting ? "Sending OTP…" : "Send code"}
            </button>

            <p className="text-[10.5px] text-white/35 text-center mt-3 leading-relaxed">
              Don't have access to your number?{" "}
              <a href="/support" className="text-primary font-semibold">Contact support</a>
            </p>
          </>
        )}

        {/* ─── VERIFY + NEW PIN STEP ─── */}
        {step === "verify" && (
          <>
            <div className="flex flex-col items-center text-center mb-5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border border-primary/20"
                style={{ background: "hsl(var(--primary) / 0.1)" }}
              >
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-[18px] font-bold tracking-[-0.5px]">Enter code & new PIN</h2>
              <p className="text-[12px] text-white/50 mt-1">
                Code sent to {maskedPhone || "your phone"}
                {secondsLeft > 0 && (
                  <span className="ml-1 text-primary font-mono">· {mm}:{ss}</span>
                )}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10.5px] text-white/40 font-semibold uppercase tracking-wider mb-1.5">6-digit OTP</label>
                <input
                  inputMode="numeric"
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="w-full h-12 px-4 rounded-[14px] text-[18px] font-mono font-bold tracking-[0.4em] text-center bg-white/[0.04] border border-white/[0.06] outline-none focus:border-primary/40 transition-colors placeholder:text-white/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] text-white/40 font-semibold uppercase tracking-wider mb-1.5">New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="w-full h-12 px-4 rounded-[14px] text-[18px] font-mono font-bold tracking-[0.4em] text-center bg-white/[0.04] border border-white/[0.06] outline-none focus:border-primary/40 transition-colors placeholder:text-white/15"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] text-white/40 font-semibold uppercase tracking-wider mb-1.5">Confirm</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="w-full h-12 px-4 rounded-[14px] text-[18px] font-mono font-bold tracking-[0.4em] text-center bg-white/[0.04] border border-white/[0.06] outline-none focus:border-primary/40 transition-colors placeholder:text-white/15"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={submitReset}
              disabled={resetting || otp.length !== 6 || newPin.length !== 4 || confirmPin.length !== 4}
              className="w-full mt-5 h-13 py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.97] transition disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))",
                color: "hsl(220 22% 6%)",
                boxShadow: "0 8px 24px hsl(var(--primary) / 0.3)",
              }}
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {resetting ? "Resetting…" : "Reset PIN"}
            </button>

            <button
              onClick={requestOtp}
              disabled={requesting || secondsLeft > 540 /* don't allow within first minute */}
              className="w-full mt-2.5 text-[11.5px] text-white/50 hover:text-primary transition py-2 disabled:opacity-40"
            >
              {secondsLeft > 540 ? `Resend in ${600 - secondsLeft}s` : (requesting ? "Sending…" : "Resend code")}
            </button>
          </>
        )}

        {/* ─── DONE STEP ─── */}
        {step === "done" && (
          <div className="flex flex-col items-center text-center py-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, hsl(152 60% 50%), hsl(152 60% 40%))",
                boxShadow: "0 0 40px hsl(152 60% 45% / 0.3)",
                animation: "qp-success 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
              }}
            >
              <CheckCircle2 className="w-9 h-9" style={{ color: "hsl(220 20% 6%)" }} strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-bold">PIN reset successfully</h2>
            <p className="text-[12px] text-white/55 mt-1.5">You can now use your new PIN to authorize payments.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPinModal;
