import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Mail, Phone, ChevronLeft, Lock as LockIcon, Fingerprint } from "lucide-react";
import { z } from "zod";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  authenticateBiometric,
  hasReturningSession,
  isBiometricAvailable,
  isBiometricEnabled,
  markReturningSession,
  setBiometricEnabled,
} from "@/lib/biometric";

const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile");

type Mode = "phone" | "otp" | "email";

const RESEND_SECONDS = 30;
const OTP_LENGTH = 6;

const AuthScreen = ({ onAuth }: { onAuth: () => void }) => {
  const { isOn } = useAppSettings();
  const signupsDisabled = isOn("disable_new_signups");
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("");
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [phoneShake, setPhoneShake] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpFlash, setOtpFlash] = useState<"none" | "success" | "error">("none");
  const [otpShake, setOtpShake] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email fallback (kept from original)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const [searchParams] = useSearchParams();
  const [refCode, setRefCode] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref);
  }, [searchParams]);

  // Resend countdown
  useEffect(() => {
    if (mode !== "otp" || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [mode, resendIn]);

  /* -------- BIOMETRIC UNLOCK FOR RETURNING USERS -------- */
  const [biometricAvailable, setBiometricAvailableState] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(isBiometricEnabled());
  const [unlocking, setUnlocking] = useState(false);
  const isReturning = hasReturningSession();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await isBiometricAvailable();
      if (!cancelled) setBiometricAvailableState(ok);
    })();
    return () => { cancelled = true; };
  }, []);

  const tryBiometricUnlock = useCallback(async () => {
    setUnlocking(true);
    try {
      const ok = await authenticateBiometric("Unlock AuroPay");
      if (!ok) {
        toast.error("Biometric not recognised — use PIN/OTP");
        return;
      }
      // Check if a Supabase session is already cached locally
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        toast.success("Welcome back!");
        onAuth();
      } else {
        toast.message("Biometric verified — please complete sign-in", {
          description: "Your session expired. Enter your number to receive an OTP.",
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Biometric unlock failed");
    } finally {
      setUnlocking(false);
    }
  }, [onAuth]);

  // Auto-prompt biometric on mount when enabled + available + returning user
  useEffect(() => {
    if (biometricAvailable && biometricEnabled && isReturning && mode === "phone") {
      tryBiometricUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricAvailable, biometricEnabled]);

  const fullPhone = `+91${phone}`;

  /* -------- PHONE OTP FLOW -------- */
  const sendOtp = useCallback(async () => {
    const result = phoneSchema.safeParse(phone);
    if (!result.success) {
      setPhoneShake(true);
      setTimeout(() => setPhoneShake(false), 500);
      toast.error(result.error.errors[0]?.message ?? "Invalid number");
      return;
    }
    setSendingOtp(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) throw error;
      toast.success(`OTP sent to ${fullPhone}`);
      setMode("otp");
      setResendIn(RESEND_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => otpRefs.current[0]?.focus(), 350);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to send OTP";
      toast.error(msg.includes("provider") || msg.includes("phone")
        ? "Phone OTP isn't configured yet. Try email below."
        : msg);
    } finally {
      setSendingOtp(false);
    }
  }, [phone, fullPhone]);

  const verifyOtp = useCallback(async (code: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: code,
        type: "sms",
      });
      if (error) throw error;
      if (data.user) {
        markReturningSession(data.user.id);
        if (await isBiometricAvailable() && !isBiometricEnabled()) setBiometricEnabled(true);
      }
      setOtpFlash("success");
      toast.success("Welcome to AuroPay!");
      setTimeout(() => onAuth(), 600);
    } catch (err: any) {
      setOtpFlash("error");
      setOtpShake(true);
      toast.error(err?.message ?? "Wrong OTP — try again");
      setTimeout(() => {
        setOtpShake(false);
        setOtpFlash("none");
        setOtp(Array(OTP_LENGTH).fill(""));
        otpRefs.current[0]?.focus();
      }, 800);
    } finally {
      setVerifying(false);
    }
  }, [fullPhone, onAuth]);

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();

    // Sequential green flash + auto-submit when full
    if (next.every((d) => d !== "")) {
      // flash green per box
      setOtpFlash("success");
      setTimeout(() => verifyOtp(next.join("")), OTP_LENGTH * 60 + 100);
    }
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
      const next = [...otp];
      next[i - 1] = "";
      setOtp(next);
    } else if (e.key === "ArrowLeft" && i > 0) {
      otpRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) {
      otpRefs.current[i + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((d, idx) => { next[idx] = d; });
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) {
      setOtpFlash("success");
      setTimeout(() => verifyOtp(pasted), OTP_LENGTH * 60 + 100);
    }
  };

  const resendOtp = () => {
    if (resendIn > 0) return;
    sendOtp();
  };

  /* -------- WEB OTP API: auto-fill OTP from SMS on Android Chrome / Capacitor WebView --------
     Works when the SMS contains the line: "Your code is 123456 @<origin> #<otp>"
     For native/Capacitor builds this still works via Chrome WebView when the origin is bound
     in the SMS message. Silently no-ops where unsupported.
  */
  useEffect(() => {
    if (mode !== "otp") return;
    if (typeof window === "undefined") return;
    const w = window as any;
    if (!("OTPCredential" in w)) return;

    const ac = new AbortController();
    // Cancel after 2 minutes — match typical OTP TTL
    const cancelTimer = setTimeout(() => ac.abort(), 120000);

    navigator.credentials
      .get({
        // @ts-expect-error: WebOTP is not in TS lib yet
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
      .then((cred: any) => {
        const code: string | undefined = cred?.code;
        if (!code) return;
        const digits = code.replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (digits.length !== OTP_LENGTH) return;
        const next = digits.split("");
        setOtp(next);
        setOtpFlash("success");
        setTimeout(() => verifyOtp(digits), OTP_LENGTH * 60 + 100);
      })
      .catch(() => { /* user dismissed / unsupported / aborted */ });

    return () => {
      clearTimeout(cancelTimer);
      ac.abort();
    };
  }, [mode, verifyOtp]);

  /* -------- EMAIL FALLBACK FLOW (kept) -------- */
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) { toast.error(result.error.message || "Google sign-in failed"); setGoogleLoading(false); return; }
      if (result.redirected) return;
      onAuth();
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { toast.error("Enter your email"); return; }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent!");
      setForgotMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally { setEmailLoading(false); }
  };

  const handleEmailSubmit = async () => {
    if (forgotMode) return handleForgotPassword();
    if (!email.trim() || !password.trim()) { toast.error("Enter email and password"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setEmailLoading(true);
    try {
      if (isSignUp) {
        if (signupsDisabled) {
          toast.error("New signups are temporarily disabled. Please try again later.");
          setEmailLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        if (refCode && data.user) {
          const refUserId = refCode.replace("AURO", "").toLowerCase();
          const { data: profiles } = await supabase.from("profiles").select("id").ilike("id", `${refUserId}%`).limit(1);
          if (profiles && profiles.length > 0) {
            await supabase.from("referrals").insert({ referrer_id: profiles[0].id, referred_id: data.user.id, referral_code: refCode });
          }
        }
        if (!data.session) toast.success("Check your email to verify!", { duration: 6000 });
        else { toast.success("Account created!"); onAuth(); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          markReturningSession(data.user.id);
          if (await isBiometricAvailable() && !isBiometricEnabled()) setBiometricEnabled(true);
        }
        toast.success("Welcome back!");
        onAuth();
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally { setEmailLoading(false); }
  };

  const phoneValid = phoneSchema.safeParse(phone).success;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6 overflow-hidden font-sora" style={{ background: "hsl(220 15% 5%)" }}>
      {/* Floating particle field — 20 dots, pure CSS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => {
          const size = 2 + ((i * 7) % 4);
          const left = (i * 53) % 100;
          const top = (i * 37) % 100;
          const dur = 14 + ((i * 3) % 12);
          const delay = (i * 0.6) % 8;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size, height: size,
                left: `${left}%`, top: `${top}%`,
                background: "hsl(42 90% 65%)",
                boxShadow: "0 0 6px hsl(42 78% 55% / 0.7), 0 0 12px hsl(42 78% 55% / 0.3)",
                opacity: 0.4 + ((i % 3) * 0.15),
                animation: `auth-particle-drift ${dur}s ease-in-out ${delay}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* Ambient gold radials */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[460px] h-[460px] rounded-full blur-[120px] opacity-25"
          style={{ top: "-15%", left: "-10%", background: "radial-gradient(circle, hsl(42 78% 55% / 0.5), transparent 70%)" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-20"
          style={{ bottom: "-15%", right: "-10%", background: "radial-gradient(circle, hsl(38 80% 45% / 0.5), transparent 70%)" }}
        />
      </div>

      {/* Verto-style brand stage — tilted phone, ghost wordmark, floating chips */}
      <div className="relative z-10 w-full max-w-sm mb-2 hidden sm:block" style={{ height: 280 }}>
        <div className="absolute inset-0 scale-[0.7] origin-top">
          <VertoStage variant="compact" wordmark="AURO" screen="home" />
        </div>
      </div>

      {/* Brand mark — visible on all sizes (acts as fallback on small screens) */}
      <div className="relative z-10 mb-6 text-center">
        <h1
          className="text-[34px] sm:text-[42px] font-black tracking-tight"
          style={{
            background: "linear-gradient(135deg, hsl(42 95% 75%) 0%, hsl(42 78% 55%) 50%, hsl(38 80% 45%) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 4px 20px hsl(42 78% 55% / 0.4))",
          }}
        >
          AuroPay
        </h1>
        <p className="text-[11px] tracking-[0.3em] uppercase font-semibold mt-1" style={{ color: "hsl(42 50% 65% / 0.7)" }}>
          Money freedom for teens
        </p>
      </div>

      {signupsDisabled && (
        <div
          className="relative z-10 mb-4 max-w-sm w-full px-4 py-2.5 rounded-[12px] flex items-center gap-2"
          style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.35)" }}
        >
          <LockIcon className="w-3.5 h-3.5 shrink-0" style={{ color: "#f59e0b" }} />
          <span className="text-[11px] text-white/80">
            New signups are paused. Existing users can still log in.
          </span>
        </div>
      )}

      {/* Frosted glass card */}
      <div
        className="relative z-10 w-full max-w-sm rounded-[24px] p-6 overflow-hidden"
        style={{
          background: "hsl(220 15% 8% / 0.6)",
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
          border: "1px solid hsl(42 78% 55% / 0.18)",
          boxShadow: "0 24px 60px hsl(0 0% 0% / 0.6), inset 0 1px 0 hsl(42 78% 55% / 0.1)",
        }}
      >
        {/* PHONE STEP */}
        {mode === "phone" && (
          <div className="flex flex-col" style={{ animation: "auth-fade-in 0.4s ease-out" }}>
            <h2 className="text-[20px] font-bold text-white mb-1">Enter your mobile</h2>
            <p className="text-[12px] text-white/50 mb-6">We'll send a 6-digit OTP</p>

            {biometricAvailable && isReturning && (
              <button
                onClick={tryBiometricUnlock}
                disabled={unlocking}
                className="mb-5 w-full h-12 rounded-full flex items-center justify-center gap-2 font-semibold text-[13px] active:scale-[0.97] transition disabled:opacity-50"
                style={{
                  background: "hsl(42 78% 55% / 0.12)",
                  border: "1px solid hsl(42 78% 55% / 0.4)",
                  color: "hsl(42 90% 75%)",
                }}
              >
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                {unlocking ? "Verifying…" : "Unlock with biometrics"}
              </button>
            )}

            <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-2 block">MOBILE NUMBER</label>
            <div
              className="flex items-center gap-2 pb-2 transition-colors"
              style={{ animation: phoneShake ? "auth-shake 0.45s ease" : undefined }}
            >
              <div className="flex items-center gap-1.5 pr-2 border-r border-white/10">
                <span className="text-lg leading-none">🇮🇳</span>
                <span className="text-[16px] font-semibold text-white/90">+91</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                placeholder="98765 43210"
                autoFocus
                maxLength={10}
                aria-label="Indian mobile number, 10 digits"
                aria-invalid={phoneShake}
                className="flex-1 bg-transparent outline-none text-[18px] font-medium text-white placeholder:text-white/25 tracking-wider font-sora"
              />
            </div>
            {/* Animated bottom border — fills as user types */}
            <div className="relative h-[2px] w-full bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.min((phone.length / 10) * 100, 100)}%`,
                  background: "linear-gradient(90deg, hsl(42 95% 70%), hsl(42 78% 55%), hsl(38 80% 50%))",
                  boxShadow: phoneFocused || phone.length > 0 ? "0 0 12px hsl(42 78% 55% / 0.7)" : "none",
                }}
              />
            </div>

            {/* CTA — morphs into ring when sending */}
            <button
              onClick={sendOtp}
              disabled={sendingOtp}
              className="group relative mt-8 h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] active:scale-[0.97] transition-all overflow-hidden"
              style={{
                background: sendingOtp ? "hsl(42 78% 55% / 0.2)" : "linear-gradient(135deg, hsl(42 95% 70%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
                color: "hsl(220 15% 5%)",
                boxShadow: sendingOtp ? "none" : "0 14px 40px hsl(42 78% 55% / 0.4), inset 0 1px 0 hsl(45 100% 85% / 0.5)",
                width: sendingOtp ? "56px" : "100%",
                marginLeft: sendingOtp ? "auto" : "0",
                marginRight: sendingOtp ? "auto" : "0",
              }}
            >
              {sendingOtp ? (
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(42 90% 70%)" }} />
              ) : (
                <>
                  <span className="relative z-10">Send OTP</span>
                  <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                </>
              )}
            </button>

            {/* Email fallback link */}
            <button
              onClick={() => setMode("email")}
              className="mt-5 flex items-center justify-center gap-2 text-[12px] text-white/50 hover:text-white/80 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> Use email & password instead
            </button>
          </div>
        )}

        {/* OTP STEP */}
        {mode === "otp" && (
          <div className="flex flex-col" style={{ animation: "auth-fade-in 0.4s ease-out" }}>
            <button
              onClick={() => { setMode("phone"); setOtp(Array(OTP_LENGTH).fill("")); setOtpFlash("none"); }}
              className="self-start mb-3 flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Change number
            </button>
            <h2 className="text-[20px] font-bold text-white mb-1">Enter the OTP</h2>
            <p className="text-[12px] text-white/50 mb-6">
              Sent to <span className="text-white/80 font-semibold">{fullPhone}</span>
            </p>

            <div
              className="flex justify-between gap-2 mb-6"
              role="group"
              aria-label="6-digit OTP entry"
              style={{ animation: otpShake ? "auth-shake 0.45s ease" : undefined }}
            >
              {otp.map((digit, i) => {
                const flashColor =
                  otpFlash === "success" ? "hsl(140 65% 50%)" :
                  otpFlash === "error" ? "hsl(0 75% 55%)" :
                  digit ? "hsl(42 78% 55%)" : "hsl(0 0% 100% / 0.12)";
                const flashGlow =
                  otpFlash === "success" ? `0 0 16px hsl(140 65% 50% / 0.6)` :
                  otpFlash === "error" ? `0 0 16px hsl(0 75% 55% / 0.6)` :
                  digit ? `0 0 12px hsl(42 78% 55% / 0.5)` : "none";
                const isCurrent = !digit && otp.findIndex((d) => !d) === i;
                return (
                  <div key={i} className="relative flex-1 h-14" style={{
                    animationDelay: otpFlash === "success" ? `${i * 60}ms` : "0ms",
                    animation: otpFlash === "success" ? "auth-otp-flash 0.5s ease forwards" : undefined,
                  }}>
                    <input
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="tel"
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      aria-label={`OTP digit ${i + 1} of ${OTP_LENGTH}`}
                      // Hide native value — render animated overlay instead
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      disabled={verifying || otpFlash === "success"}
                      className="absolute inset-0 w-full h-full text-center text-[24px] font-bold text-transparent caret-transparent bg-white/[0.04] rounded-xl outline-none transition-all"
                      style={{
                        border: `1.5px solid ${flashColor}`,
                        boxShadow: flashGlow,
                      }}
                    />
                    {/* Animated digit overlay — slides up from below + scales in for premium feel */}
                    <div
                      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl"
                    >
                      {digit ? (
                        <span
                          key={`d-${i}-${digit}`}
                          className="text-[24px] font-bold text-white"
                          style={{
                            animation: "otp-digit-rise 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
                            textShadow: "0 2px 12px hsl(42 78% 55% / 0.5)",
                          }}
                        >
                          {digit}
                        </span>
                      ) : isCurrent ? (
                        <span
                          className="block w-[2px] h-6 rounded-full"
                          style={{
                            background: "hsl(42 90% 70%)",
                            animation: "otp-caret-blink 1s ease-in-out infinite",
                            boxShadow: "0 0 8px hsl(42 78% 55% / 0.7)",
                          }}
                        />
                      ) : null}
                    </div>
                    {/* Subtle gold underline */}
                    <div
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                      style={{
                        background: digit ? "linear-gradient(90deg, transparent, hsl(42 78% 55%), transparent)" : "transparent",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Resend with circular ring */}
            <div className="flex items-center justify-center gap-2">
              {resendIn > 0 ? (
                <div className="flex items-center gap-2 text-[12px] text-white/50">
                  <div className="relative w-5 h-5">
                    <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="hsl(0 0% 100% / 0.1)" strokeWidth="2" />
                      <circle
                        cx="10" cy="10" r="8" fill="none"
                        stroke="hsl(42 78% 55%)" strokeWidth="2" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 8}
                        strokeDashoffset={2 * Math.PI * 8 * (1 - resendIn / RESEND_SECONDS)}
                        style={{ transition: "stroke-dashoffset 1s linear", filter: "drop-shadow(0 0 4px hsl(42 78% 55% / 0.6))" }}
                      />
                    </svg>
                  </div>
                  <span>Resend in <span className="font-semibold text-white/80">{resendIn}s</span></span>
                </div>
              ) : (
                <button
                  onClick={resendOtp}
                  className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  style={{ color: "hsl(42 90% 70%)" }}
                >
                  Resend OTP
                </button>
              )}
            </div>

            {verifying && (
              <div className="flex items-center justify-center gap-2 mt-4 text-[12px] text-white/60">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Verifying…
              </div>
            )}
          </div>
        )}

        {/* EMAIL FALLBACK STEP */}
        {mode === "email" && (
          <div className="flex flex-col" style={{ animation: "auth-fade-in 0.4s ease-out" }}>
            <button
              onClick={() => { setMode("phone"); setForgotMode(false); }}
              className="self-start mb-3 flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Use mobile instead
            </button>
            <h2 className="text-[20px] font-bold text-white mb-1">
              {forgotMode ? "Reset password" : isSignUp ? "Create account" : "Welcome back"}
            </h2>
            <p className="text-[12px] text-white/50 mb-5">
              {forgotMode ? "We'll email you a reset link" : isSignUp ? "Sign up with email" : "Log in with email"}
            </p>

            {!forgotMode && (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full h-12 rounded-full bg-white text-black font-semibold text-[13px] flex items-center justify-center gap-2 mb-3 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {googleLoading ? "Connecting…" : "Continue with Google"}
                </button>

                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[9px] text-white/30 tracking-widest">OR</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              </>
            )}

            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-primary/60 focus:bg-white/[0.06] transition mb-3"
            />
            {!forgotMode && (
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-primary/60 focus:bg-white/[0.06] transition mb-3"
              />
            )}

            <button
              onClick={handleEmailSubmit}
              disabled={emailLoading}
              className="w-full h-12 rounded-full font-bold text-[13px] active:scale-[0.97] transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, hsl(42 95% 70%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
                color: "hsl(220 15% 5%)",
                boxShadow: "0 10px 30px hsl(42 78% 55% / 0.35)",
              }}
            >
              {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : forgotMode ? "Send reset link" : isSignUp ? "Sign up" : "Log in"}
            </button>

            <div className="flex justify-between mt-4 text-[11px]">
              {!forgotMode && !isSignUp && (
                <button onClick={() => setForgotMode(true)} className="text-white/50 hover:text-primary transition" style={{ color: "hsl(42 90% 70%)" }}>
                  Forgot password?
                </button>
              )}
              <button
                onClick={() => {
                  if (signupsDisabled && !isSignUp) {
                    toast.error("New signups are temporarily disabled.");
                    return;
                  }
                  setForgotMode(false); setIsSignUp(!isSignUp);
                }}
                className="ml-auto text-white/50 hover:text-white/80 transition"
              >
                {isSignUp ? "Have an account? Log in" : "New here? Sign up"}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="relative z-10 mt-6 text-[10px] text-white/30 tracking-wider text-center max-w-[280px]">
        By continuing, you agree to AuroPay's Terms & Privacy Policy
      </p>

      <style>{`
        @keyframes auth-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes auth-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        @keyframes auth-otp-flash {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes auth-particle-drift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(20px, -30px); }
          50% { transform: translate(-15px, -50px); }
          75% { transform: translate(-25px, -20px); }
        }
        @keyframes otp-digit-rise {
          0% { opacity: 0; transform: translateY(14px) scale(0.7); filter: blur(4px); }
          60% { opacity: 1; transform: translateY(-2px) scale(1.08); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes otp-caret-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default AuthScreen;
