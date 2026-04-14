import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthScreen = ({ onAuth }: { onAuth: () => void }) => {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const sendOtp = async () => {
    if (phone.length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${phone}`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("OTP sent!");
    setStep("otp");
    setResendTimer(30);
  };

  const verifyOtp = async (otpStr: string) => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${phone}`,
      token: otpStr,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onAuth();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const full = newOtp.join("");
    if (full.length === 6) {
      verifyOtp(full);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background noise-overlay px-6">
      <h1 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
        AuroPay
      </h1>
      <p className="text-sm text-muted-foreground mb-12">Money freedom for teens</p>

      {step === "phone" ? (
        <div className="w-full max-w-sm animate-fade-in-up">
          <h2 className="text-[22px] font-semibold mb-2">Welcome!</h2>
          <p className="text-sm text-muted-foreground mb-8">Enter your phone number to get started</p>
          
          <div className="flex items-center gap-2 mb-6">
            <div className="h-[52px] px-4 rounded-[14px] bg-input border border-border flex items-center text-sm text-muted-foreground shrink-0">
              🇮🇳 +91
            </div>
            <input
              type="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="Phone number"
              className="input-auro flex-1 w-full"
              autoFocus
            />
          </div>

          <button
            onClick={sendOtp}
            disabled={loading || phone.length !== 10}
            className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm animate-fade-in-up">
          <h2 className="text-[22px] font-semibold mb-2">Verify OTP</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Enter the 6-digit code sent to +91 {phone}
          </p>

          <div className="flex gap-3 justify-center mb-8">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="w-12 h-14 rounded-[14px] bg-input border border-border text-center text-lg font-semibold text-foreground transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(263_84%_58%/0.2)] outline-none"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {loading && (
            <p className="text-center text-sm text-muted-foreground mb-4">Verifying...</p>
          )}

          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-muted-foreground">Resend in {resendTimer}s</p>
            ) : (
              <button
                onClick={sendOtp}
                className="text-sm text-primary hover:underline"
              >
                Resend OTP
              </button>
            )}
          </div>

          <button
            onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); }}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Change phone number
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;
