import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ShieldCheck, Lock, Eye, BadgeCheck, ArrowRight, Loader2, Check, X, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startKyc } from "@/lib/kyc";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { Browser } from "@capacitor/browser";
import { createTunnelAudio, getTunnelMuted, type TunnelAudio } from "@/lib/kyc-audio";

interface KycGateProps {
  children: React.ReactNode;
  /** Short label shown in the prompt: "Add Money", "Send Money", etc. */
  feature: string;
}

const isNative = () => typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();

const openInAppBrowser = async (url: string) => {
  if (isNative()) {
    try {
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch {
      /* fall through */
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

const formatAadhaar = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

type Stage = "intro" | "tunnel" | "success";

const KycGate = ({ children, feature }: KycGateProps) => {
  const [status, setStatus] = useState<"loading" | "verified" | "pending">("loading");
  const [stage, setStage] = useState<Stage>("intro");
  const [aadhaar, setAadhaar] = useState("");
  const [name, setName] = useState("");
  const [starting, setStarting] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Re-check KYC status from DB; if verified, replay the success stamp before unlocking.
  const recheckAndCelebrate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("kyc_status")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.kyc_status === "verified") {
      haptic.success();
      setStage("success");
      // Hold the green stamp for a beat, then unlock by flipping status.
      setTimeout(() => setStatus("verified"), 1800);
    }
  };

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("pending"); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("kyc_status, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.full_name) {
        setProfileName(data.full_name);
        setName(data.full_name);
      }
      setStatus(data?.kyc_status === "verified" ? "verified" : "pending");
    };
    check();
  }, []);

  /* --- Deep-link callback from Digio + realtime fallback --- */
  useEffect(() => {
    if (status !== "pending" || !userId) return;

    // 1) Deep link triggers an immediate re-poll
    const onCallback = () => { recheckAndCelebrate(); };
    window.addEventListener("auropay:kyc-callback", onCallback);

    // 2) Realtime subscription on this user's profile row as fallback
    const channel = supabase
      .channel(`kyc-status-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload: any) => {
          if (payload?.new?.kyc_status === "verified") {
            recheckAndCelebrate();
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("auropay:kyc-callback", onCallback);
      supabase.removeChannel(channel);
    };
  }, [status, userId]);

  const aadhaarDigits = aadhaar.replace(/\s/g, "");
  const aadhaarValid = aadhaarDigits.length === 12;

  const handleProceed = async () => {
    if (!aadhaarValid) {
      haptic.error();
      toast.error("Enter a valid 12-digit Aadhaar number");
      inputRef.current?.focus();
      return;
    }
    haptic.medium();
    setStage("tunnel");

    // Kick off the real Digio request in parallel with the tunnel animation
    setStarting(true);
    let redirect: string | null = null;
    try {
      const res = await startKyc({ aadhaar_name: name.trim() || undefined });
      redirect = res.redirect_url;
    } catch (err: any) {
      toast.error(err?.message || "Couldn't start verification");
      setStage("intro");
      setStarting(false);
      return;
    }
    setStarting(false);

    // Let the tunnel play for a beat, then flip to success and open Digio
    setTimeout(() => {
      setStage("success");
      setTimeout(async () => {
        if (redirect) await openInAppBrowser(redirect);
      }, 1400);
    }, 2200);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (status === "verified") return <>{children}</>;

  return (
    <div className="fixed inset-0 overflow-y-auto font-sora" style={{ background: "hsl(220 15% 5%)" }}>
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

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
        <SecureBadge />
        <div className="w-10" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 pt-6 pb-12">
        {stage === "intro" && (
          <IntroStage
            aadhaar={aadhaar}
            setAadhaar={setAadhaar}
            name={name}
            setName={setName}
            profileName={profileName}
            inputRef={inputRef}
            feature={feature}
            onProceed={handleProceed}
            valid={aadhaarValid}
          />
        )}
        {stage === "tunnel" && <TunnelStage starting={starting} />}
        {stage === "success" && <SuccessStage />}
      </div>

      <style>{`
        @keyframes kyc-card-rise {
          0% { transform: translateY(120px) rotate(-12deg) scale(0.85); opacity: 0; }
          100% { transform: translateY(0) rotate(-3deg) scale(1); opacity: 1; }
        }
        @keyframes kyc-shimmer {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes kyc-shield-pulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(142 70% 45% / 0.5), inset 0 0 0 1px hsl(142 70% 45% / 0.4); }
          50% { box-shadow: 0 0 0 8px hsl(142 70% 45% / 0), inset 0 0 0 1px hsl(142 70% 45% / 0.6); }
        }
        @keyframes kyc-trust-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes kyc-packet-flow {
          0% { transform: translateX(0) scale(0.4); opacity: 0; }
          15% { transform: translateX(15%) scale(1); opacity: 1; }
          85% { transform: translateX(85%) scale(1); opacity: 1; }
          100% { transform: translateX(100%) scale(0.4); opacity: 0; }
        }
        @keyframes kyc-pipe-glow {
          0%, 100% { box-shadow: 0 0 24px hsl(42 78% 55% / 0.3), inset 0 0 12px hsl(42 78% 55% / 0.15); }
          50% { box-shadow: 0 0 36px hsl(42 78% 55% / 0.55), inset 0 0 16px hsl(42 78% 55% / 0.25); }
        }
        @keyframes kyc-flip {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }
        @keyframes kyc-stamp-in {
          0% { transform: scale(2.4) rotate(-18deg); opacity: 0; }
          60% { transform: scale(0.85) rotate(-14deg); opacity: 1; }
          100% { transform: scale(1) rotate(-12deg); opacity: 1; }
        }
        @keyframes kyc-seal-ring {
          0% { transform: scale(0.6); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes kyc-check-draw {
          from { stroke-dashoffset: 40; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes kyc-burst {
          0% { transform: scale(0.4); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/* ======================== SECURE BADGE ======================== */

const SecureBadge = () => (
  <div
    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
    style={{
      background: "linear-gradient(135deg, hsl(142 70% 45% / 0.15), hsl(142 70% 35% / 0.08))",
      border: "1px solid hsl(142 70% 45% / 0.4)",
      animation: "kyc-shield-pulse 2.4s ease-in-out infinite",
    }}
  >
    <ShieldCheck className="w-3.5 h-3.5" style={{ color: "hsl(142 70% 55%)" }} />
    <span className="text-[10px] font-bold tracking-[0.18em]" style={{ color: "hsl(142 70% 70%)" }}>
      100% SECURE
    </span>
  </div>
);

/* ======================== INTRO STAGE ======================== */

const IntroStage = ({
  aadhaar, setAadhaar, name, setName, profileName, inputRef, feature, onProceed, valid,
}: {
  aadhaar: string;
  setAadhaar: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  profileName: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  feature: string;
  onProceed: () => void;
  valid: boolean;
}) => {
  return (
    <div>
      {/* Aadhaar card illustration */}
      <div className="relative h-[200px] mb-8 flex items-center justify-center perspective-[1200px]">
        <AadhaarCard maskedNumber={aadhaar || "XXXX XXXX XXXX"} name={name || profileName || "YOUR NAME"} />
      </div>

      <h1 className="text-[24px] font-black text-white text-center leading-tight mb-2">
        Verify your Aadhaar
      </h1>
      <p className="text-[13px] text-white/55 text-center mb-8 px-4">
        Quick, government-grade verification to unlock <span className="text-white/85 font-semibold">{feature}</span>.
      </p>

      {/* Aadhaar input */}
      <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-2.5 block">
        AADHAAR NUMBER
      </label>
      <div
        className="relative rounded-2xl p-0.5 transition-all"
        style={{
          background: valid
            ? "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%), hsl(38 80% 45%))"
            : "hsl(0 0% 100% / 0.08)",
          boxShadow: valid ? "0 0 24px hsl(42 78% 55% / 0.3)" : "none",
        }}
      >
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          value={aadhaar}
          onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
          placeholder="XXXX XXXX XXXX"
          className="w-full h-14 rounded-[14px] px-5 text-[18px] tracking-[0.25em] font-bold text-white outline-none bg-[hsl(220_15%_7%)] placeholder:text-white/20 placeholder:tracking-[0.25em]"
        />
      </div>

      {!profileName && (
        <>
          <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-2.5 block mt-5">
            NAME ON AADHAAR (OPTIONAL)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="As printed on Aadhaar"
            className="w-full h-12 rounded-2xl px-4 text-[14px] text-white outline-none bg-[hsl(220_15%_7%)] placeholder:text-white/30"
            style={{ border: "1px solid hsl(0 0% 100% / 0.08)" }}
          />
        </>
      )}

      {/* Trust indicators */}
      <div className="mt-7 mb-7 space-y-2.5">
        {[
          { icon: BadgeCheck, label: "Verified by UIDAI", desc: "Direct integration with the official registry" },
          { icon: Lock, label: "256-bit encrypted", desc: "Bank-grade end-to-end encryption" },
          { icon: Eye, label: "Data never stored", desc: "We only verify — your number is never saved" },
        ].map((t, i) => {
          const Icon = t.icon;
          return (
            <div
              key={t.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{
                background: "hsl(0 0% 100% / 0.025)",
                border: "1px solid hsl(0 0% 100% / 0.05)",
                animation: `kyc-trust-in 0.5s ${0.1 + i * 0.08}s ease-out both`,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(142 70% 45% / 0.2), hsl(142 70% 35% / 0.1))",
                  border: "1px solid hsl(142 70% 45% / 0.3)",
                }}
              >
                <Icon className="w-4 h-4" style={{ color: "hsl(142 70% 60%)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-white">{t.label}</p>
                <p className="text-[10.5px] text-white/45 mt-0.5">{t.desc}</p>
              </div>
              <Check className="w-3.5 h-3.5" style={{ color: "hsl(142 70% 55%)" }} strokeWidth={3} />
            </div>
          );
        })}
      </div>

      <button
        onClick={onProceed}
        className="group relative w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] active:scale-[0.97] transition overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 70%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
          color: "hsl(220 15% 5%)",
          boxShadow: "0 14px 40px hsl(42 78% 55% / 0.4), inset 0 1px 0 hsl(45 100% 85% / 0.5)",
        }}
      >
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        <Shield className="relative z-10 w-4 h-4" />
        <span className="relative z-10">Verify Securely</span>
        <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>

      <p className="text-[10.5px] text-white/35 text-center mt-4 leading-relaxed">
        By continuing you agree to UIDAI's terms.<br />Verification is processed by our licensed partner Digio.
      </p>
    </div>
  );
};

/* ======================== AADHAAR CARD ILLUSTRATION ======================== */

const AadhaarCard = ({ maskedNumber, name, flipped = false, verified = false }: { maskedNumber: string; name: string; flipped?: boolean; verified?: boolean }) => {
  return (
    <div
      className="relative w-[300px] h-[180px]"
      style={{
        transformStyle: "preserve-3d",
        transition: "transform 0.9s cubic-bezier(0.65, 0, 0.35, 1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        animation: !flipped ? "kyc-card-rise 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both" : undefined,
      }}
    >
      {/* FRONT */}
      <div
        className="absolute inset-0 rounded-[18px] overflow-hidden"
        style={{
          backfaceVisibility: "hidden",
          background: "linear-gradient(135deg, hsl(35 30% 92%) 0%, hsl(35 25% 86%) 100%)",
          boxShadow: "0 30px 60px hsl(0 0% 0% / 0.5), 0 0 0 1px hsl(35 30% 70% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.6)",
          border: "1px solid hsl(35 30% 60% / 0.2)",
        }}
      >
        {/* Header bar */}
        <div className="h-7 px-3 flex items-center justify-between" style={{ background: "linear-gradient(90deg, hsl(20 80% 50%) 0%, hsl(120 50% 35%) 100%)" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full" style={{ background: "hsl(45 90% 55%)", boxShadow: "0 0 4px hsl(45 90% 55% / 0.6)" }} />
            <span className="text-[7px] font-bold text-white tracking-wider">GOVERNMENT OF INDIA</span>
          </div>
          <span className="text-[7px] font-bold text-white tracking-wider">भारत सरकार</span>
        </div>

        <div className="p-3 flex gap-3 h-[calc(100%-28px)]">
          {/* Photo placeholder */}
          <div
            className="w-[68px] h-[82px] rounded shrink-0 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(35 20% 75%), hsl(35 15% 65%))",
              border: "1px solid hsl(35 20% 55% / 0.5)",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-9 h-9" style={{ color: "hsl(35 15% 45%)" }} fill="currentColor">
              <circle cx="12" cy="8" r="4" />
              <path d="M12 14c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <p className="text-[7px] font-semibold tracking-wider" style={{ color: "hsl(220 30% 30%)" }}>NAME</p>
              <p className="text-[10px] font-bold leading-tight uppercase truncate" style={{ color: "hsl(220 30% 15%)" }}>{name}</p>
              <p className="text-[7px] font-semibold tracking-wider mt-1.5" style={{ color: "hsl(220 30% 30%)" }}>DOB / GENDER</p>
              <p className="text-[9px] font-bold" style={{ color: "hsl(220 30% 15%)" }}>•• / •• / ••••</p>
            </div>

            {/* Aadhaar number */}
            <div>
              <p className="text-[7px] font-semibold tracking-wider mb-0.5" style={{ color: "hsl(220 30% 30%)" }}>AADHAAR NO.</p>
              <p className="text-[14px] font-black tracking-[0.12em] tabular-nums" style={{ color: "hsl(220 30% 12%)", fontFamily: "ui-monospace, monospace" }}>
                {maskedNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Shimmer */}
        <div
          className="absolute inset-y-0 w-[40%] pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.55), transparent)",
            animation: "kyc-shimmer 2.6s ease-in-out infinite",
            animationDelay: "0.6s",
          }}
        />

        {/* Subtle UIDAI watermark */}
        <div className="absolute bottom-2 right-3 text-[8px] font-black tracking-widest opacity-15" style={{ color: "hsl(220 30% 15%)" }}>
          UIDAI
        </div>
      </div>

      {/* BACK (verified stamp) */}
      <div
        className="absolute inset-0 rounded-[18px] overflow-hidden flex items-center justify-center"
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "linear-gradient(135deg, hsl(220 15% 8%) 0%, hsl(220 15% 5%) 100%)",
          border: "1.5px solid hsl(142 70% 45% / 0.5)",
          boxShadow: "0 30px 60px hsl(0 0% 0% / 0.5), 0 0 40px hsl(142 70% 45% / 0.3)",
        }}
      >
        {verified && (
          <>
            {/* Burst rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[0, 0.2, 0.4].map((d, i) => (
                <div
                  key={i}
                  className="absolute w-32 h-32 rounded-full"
                  style={{
                    border: "2px solid hsl(142 70% 50% / 0.5)",
                    animation: `kyc-burst 1.6s ${d}s ease-out infinite`,
                  }}
                />
              ))}
            </div>

            {/* Stamp */}
            <div
              className="relative flex flex-col items-center justify-center w-[150px] h-[150px] rounded-full"
              style={{
                border: "4px double hsl(142 70% 50%)",
                animation: "kyc-stamp-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                background: "hsl(142 70% 8% / 0.4)",
              }}
            >
              {/* Animated check */}
              <svg width="48" height="48" viewBox="0 0 48 48" className="mb-1">
                <circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke="hsl(142 70% 50%)"
                  strokeWidth="2.5"
                  style={{
                    strokeDasharray: 130,
                    strokeDashoffset: 130,
                    animation: "kyc-check-draw 0.7s 0.2s ease-out forwards",
                  }}
                />
                <path
                  d="M14 24 L21 31 L34 17"
                  fill="none"
                  stroke="hsl(142 70% 55%)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 40,
                    strokeDashoffset: 40,
                    animation: "kyc-check-draw 0.5s 0.7s ease-out forwards",
                  }}
                />
              </svg>
              <span className="text-[16px] font-black tracking-[0.15em]" style={{ color: "hsl(142 70% 60%)" }}>
                VERIFIED
              </span>
              <span className="text-[8px] font-bold tracking-[0.2em] mt-0.5" style={{ color: "hsl(142 70% 45%)" }}>
                BY UIDAI
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ======================== TUNNEL STAGE ======================== */

const TunnelStage = ({ starting }: { starting: boolean }) => {
  const audioRef = useRef<TunnelAudio | null>(null);
  const [muted, setMuted] = useState<boolean>(getTunnelMuted());

  useEffect(() => {
    const a = createTunnelAudio();
    audioRef.current = a;
    a.start();
    return () => { a.stop(); audioRef.current = null; };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audioRef.current?.setMuted(next);
    haptic.light();
  };

  return (
    <div className="pt-6 flex flex-col items-center text-center relative">
      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute tunnel sound" : "Mute tunnel sound"}
        className="absolute top-0 right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
        style={{
          background: "hsl(0 0% 100% / 0.04)",
          border: "1px solid hsl(0 0% 100% / 0.08)",
          color: muted ? "hsl(0 0% 100% / 0.4)" : "hsl(42 90% 70%)",
        }}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      <div className="text-[10px] font-bold tracking-[0.25em] mb-2" style={{ color: "hsl(42 90% 70%)" }}>
        STEP 2 OF 2
      </div>
      <h2 className="text-[24px] font-black text-white mb-1.5">Sending OTP securely</h2>
      <p className="text-[13px] text-white/55 mb-10">Encrypting and routing through UIDAI's secure tunnel</p>

      {/* Tunnel pipe */}
      <div
        className="relative w-full h-[110px] rounded-full overflow-hidden mb-10"
        style={{
          background: "linear-gradient(180deg, hsl(220 15% 8%), hsl(220 15% 4%))",
          border: "1px solid hsl(42 78% 55% / 0.3)",
          animation: "kyc-pipe-glow 2s ease-in-out infinite",
        }}
      >
        {/* Inner walls */}
        <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.6), transparent)" }} />
        <div className="absolute inset-x-0 bottom-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.6), transparent)" }} />

        {/* Origin badge */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsl(220 15% 10%)", border: "1px solid hsl(42 78% 55% / 0.5)" }}>
          <Lock className="w-5 h-5" style={{ color: "hsl(42 90% 70%)" }} />
        </div>
        {/* Destination badge */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsl(220 15% 10%)", border: "1px solid hsl(142 70% 45% / 0.5)" }}>
          <ShieldCheck className="w-5 h-5" style={{ color: "hsl(142 70% 60%)" }} />
        </div>

        {/* Flowing packets */}
        <div className="absolute inset-x-[68px] top-1/2 -translate-y-1/2 h-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-9 h-1 rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(42 95% 70%), hsl(38 80% 50%), transparent)",
                boxShadow: "0 0 12px hsl(42 78% 55% / 0.7)",
                animation: `kyc-packet-flow 1.6s ${i * 0.25}s linear infinite`,
              }}
            />
          ))}
        </div>

        {/* Connecting line */}
        <div className="absolute inset-x-[68px] top-1/2 -translate-y-1/2 h-px" style={{ background: "linear-gradient(90deg, hsl(42 78% 55% / 0.15), hsl(42 78% 55% / 0.4), hsl(142 70% 45% / 0.15))" }} />
      </div>

      <div className="flex items-center gap-2 text-[12px] text-white/55">
        {starting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Establishing secure connection…
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5" style={{ color: "hsl(142 70% 60%)" }} strokeWidth={3} />
            Connection secured
          </>
        )}
      </div>

      {/* Security row */}
      <div className="mt-10 grid grid-cols-3 gap-3 w-full">
        {[
          { label: "AES-256", sub: "Encryption" },
          { label: "TLS 1.3", sub: "Transport" },
          { label: "UIDAI", sub: "Verified" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl py-2.5 text-center"
            style={{ background: "hsl(0 0% 100% / 0.025)", border: "1px solid hsl(0 0% 100% / 0.05)" }}
          >
            <p className="text-[11px] font-bold" style={{ color: "hsl(42 90% 70%)" }}>{s.label}</p>
            <p className="text-[9px] text-white/40 tracking-wider mt-0.5">{s.sub.toUpperCase()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ======================== SUCCESS STAGE ======================== */

const SuccessStage = () => {
  return (
    <div className="pt-2 flex flex-col items-center text-center">
      <div className="relative h-[220px] w-full mb-6 flex items-center justify-center perspective-[1200px]">
        <AadhaarCard maskedNumber="•••• •••• ••••" name="VERIFIED" flipped verified />
      </div>

      <h2 className="text-[24px] font-black text-white mb-1.5">Almost there</h2>
      <p className="text-[13px] text-white/55 mb-6 px-4">
        Opening UIDAI to capture your secure OTP. Complete the final step in the trusted partner window.
      </p>

      <div className="flex items-center gap-2 text-[12px] text-white/45">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Launching secure OTP screen…
      </div>
    </div>
  );
};

export default KycGate;
