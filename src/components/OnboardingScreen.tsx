import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import Lottie from "lottie-react";
import { haptic } from "@/lib/haptics";
import VertoStage from "@/landing/VertoStage";

const AUTOPLAY_MS = 6500;

type Slide = {
  title: string;
  subtitle: string;
  hue: number;
  /** Public LottieFiles JSON URL (free, MIT) */
  lottieUrl: string;
  /** When set, renders a special variant instead of Lottie */
  variant?: "tilt-coin" | "verto";
};

// Curated free Lottie animations from lottiefiles.com (publicly hosted)
const slides: Slide[] = [
  {
    title: "One app. Smarter teen money.",
    subtitle: "Pocket money, UPI payments, savings and rewards — all parent-approved, in one beautiful app.",
    hue: 42,
    lottieUrl: "", // not used
    variant: "verto",
  },
  {
    title: "Parents stay in the loop.",
    subtitle: "Real-time alerts, smart limits, and instant top-ups — connected across both phones.",
    hue: 28,
    lottieUrl: "https://assets3.lottiefiles.com/packages/lf20_yfsb3a1d.json", // family / parent-child
  },
  {
    title: "Verified safe with Aadhaar.",
    subtitle: "Bank-grade KYC in under a minute. Your money is protected from day one.",
    hue: 50,
    lottieUrl: "https://assets9.lottiefiles.com/packages/lf20_xlmz9xwm.json", // shield / verified check
  },
  {
    title: "Tilt to reveal your reward.",
    subtitle: "Earn scratch cards, coins, and cashback every time you pay. Move your phone to flip the coin.",
    hue: 45,
    lottieUrl: "", // not used
    variant: "tilt-coin",
  },
];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lockedAxis = useRef<"x" | "y" | null>(null);
  const slideStartTime = useRef(Date.now());

  const slide = slides[current];

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx > slides.length - 1) return;
    haptic.selection();
    setCurrent(idx);
    setProgress(idx);
    slideStartTime.current = Date.now();
  }, []);

  const finish = useCallback(() => {
    try { localStorage.setItem("auropay_onboarded", "1"); } catch {}
    onComplete();
  }, [onComplete]);

  const next = useCallback(() => {
    haptic.light();
    if (current < slides.length - 1) goTo(current + 1);
    else finish();
  }, [current, goTo, finish]);

  const prev = useCallback(() => {
    if (current > 0) goTo(current - 1);
  }, [current, goTo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    lockedAxis.current = null;
    setPaused(true);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!lockedAxis.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
    }
    if (lockedAxis.current === "x") {
      let val = dx;
      if ((current === 0 && dx > 0) || (current === slides.length - 1 && dx < 0)) {
        val = dx * 0.35;
      }
      setDragX(val);
    }
  };

  const handleTouchEnd = () => {
    const width = containerRef.current?.offsetWidth ?? 360;
    const threshold = width * 0.22;
    if (dragX < -threshold && current < slides.length - 1) {
      goTo(current + 1);
    } else if (dragX > threshold && current > 0) {
      goTo(current - 1);
    }
    setDragX(0);
    setIsDragging(false);
    setPaused(false);
    lockedAxis.current = null;
  };

  useEffect(() => {
    if (paused) return;
    slideStartTime.current = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - slideStartTime.current;
      const pct = Math.min(elapsed / AUTOPLAY_MS, 1);
      setProgress(current + pct);
      if (pct >= 1) {
        clearInterval(tick);
        if (current < slides.length - 1) goTo(current + 1);
        else finish();
      }
    }, 30);
    return () => clearInterval(tick);
  }, [current, paused, goTo, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const titleWords = useMemo(() => slide.title.split(" "), [slide.title]);

  const bgStyle = useMemo(() => ({
    background: `
      radial-gradient(ellipse 80% 60% at 50% 15%, hsl(${slide.hue} 78% 55% / 0.18), transparent 70%),
      radial-gradient(ellipse 70% 50% at 50% 90%, hsl(${slide.hue} 80% 45% / 0.10), transparent 70%),
      hsl(220 15% 5%)
    `,
    transition: "background 900ms ease",
  }), [slide.hue]);

  const totalProgressPct = (progress / slides.length) * 100;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex flex-col overflow-hidden font-sora"
      style={bgStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drifting ambient particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[480px] h-[480px] rounded-full blur-[120px] opacity-30"
          style={{
            top: "-10%", left: "-15%",
            background: `radial-gradient(circle, hsl(${slide.hue} 78% 55% / 0.4), transparent 70%)`,
            animation: "onb-drift-a 16s ease-in-out infinite",
            transition: "background 900ms ease",
          }}
        />
        <div
          className="absolute w-[520px] h-[520px] rounded-full blur-[140px] opacity-25"
          style={{
            bottom: "-15%", right: "-10%",
            background: `radial-gradient(circle, hsl(${slide.hue + 8} 70% 50% / 0.35), transparent 70%)`,
            animation: "onb-drift-b 20s ease-in-out infinite",
            transition: "background 900ms ease",
          }}
        />
      </div>

      {/* CONTINUOUS progress line at top */}
      <div className="absolute top-0 left-0 right-0 z-30 h-[3px] bg-white/[0.06]">
        <div
          className="h-full rounded-r-full"
          style={{
            width: `${totalProgressPct}%`,
            background: `linear-gradient(90deg, hsl(42 95% 70%), hsl(42 78% 55%), hsl(38 80% 50%))`,
            boxShadow: "0 0 14px hsl(42 78% 55% / 0.7)",
            transition: isDragging ? "none" : "width 60ms linear",
          }}
        />
      </div>

      {/* Top bar: brand + Skip */}
      <div className="relative z-20 flex justify-between items-center px-6 pt-6">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[10px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
              boxShadow: "0 4px 14px hsl(42 78% 55% / 0.45)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(220 15% 5%)" }} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.22em] text-white/70">AUROPAY</span>
        </div>
        {current < slides.length - 1 && (
          <button
            onClick={finish}
            className="text-[11px] font-medium text-white/50 hover:text-white/90 transition-colors px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slides track */}
      <div className="flex-1 relative z-10 overflow-hidden" style={{ perspective: "1400px" }}>
        <div
          className="absolute inset-0 flex"
          style={{
            transform: `translateX(calc(${-current * 100}% + ${dragX}px))`,
            transition: isDragging ? "none" : "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {slides.map((s, i) => {
            const isActive = i === current;
            return (
              <div
                key={i}
                className="w-full h-full flex-shrink-0 flex flex-col items-center justify-center px-6"
                style={{ width: "100%" }}
              >
                {/* Animation area */}
                <div
                  className="relative w-full max-w-[320px] aspect-square mb-8 flex items-center justify-center"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {s.variant === "tilt-coin" ? (
                    <TiltCoin active={isActive} />
                  ) : s.variant === "verto" ? (
                    <div className="w-full h-full scale-[0.78] origin-center">
                      <VertoStage variant="compact" wordmark="AURO" screen="home" />
                    </div>
                  ) : (
                    <LottieSlide url={s.lottieUrl} active={isActive} hue={s.hue} />
                  )}
                </div>

                {/* Title */}
                <h2 className="text-[30px] font-black leading-[1.1] tracking-tight text-center max-w-[320px] mb-4">
                  {s.title.split(" ").map((word, wi) => (
                    <span
                      key={`${i}-${wi}`}
                      className="inline-block overflow-hidden align-bottom mr-[0.25em]"
                    >
                      <span
                        className="inline-block"
                        style={{
                          background: "linear-gradient(135deg, hsl(42 95% 78%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          color: "transparent",
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? "translateY(0)" : "translateY(110%)",
                          transition: `opacity 500ms ease ${300 + wi * 90}ms, transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${300 + wi * 90}ms`,
                          filter: "drop-shadow(0 2px 12px hsl(42 78% 55% / 0.3))",
                        }}
                      >
                        {word}
                      </span>
                    </span>
                  ))}
                </h2>

                {/* Subtitle */}
                <p
                  className="text-[14px] text-white/55 text-center leading-relaxed max-w-[300px] font-light"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(8px)",
                    transition: `opacity 600ms ease ${300 + titleWords.length * 90 + 150}ms, transform 600ms ease ${300 + titleWords.length * 90 + 150}ms`,
                  }}
                >
                  {s.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-20 px-6 pb-8 pt-4">
        <button
          onClick={next}
          className="group relative w-full h-[56px] rounded-full flex items-center justify-center gap-2 font-bold text-[15px] active:scale-[0.97] transition-transform duration-200 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(42 95% 70%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
            color: "hsl(220 15% 5%)",
            boxShadow: "0 14px 40px hsl(42 78% 55% / 0.4), inset 0 1px 0 hsl(45 100% 85% / 0.5)",
          }}
        >
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
          <span className="relative z-10 flex items-center gap-2">
            {current === slides.length - 1 ? (
              <>Get Started <Sparkles className="w-4 h-4" /></>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </span>
        </button>

        {/* Slide dots */}
        <div className="flex justify-center gap-1.5 mt-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === current ? 24 : 6,
                background: i === current
                  ? "linear-gradient(90deg, hsl(42 95% 70%), hsl(42 78% 55%))"
                  : i < current ? "hsl(42 78% 55% / 0.4)" : "hsl(0 0% 100% / 0.12)",
                boxShadow: i === current ? "0 0 10px hsl(42 78% 55% / 0.6)" : "none",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes onb-drift-a {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(50px, 40px); }
        }
        @keyframes onb-drift-b {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-60px, -30px); }
        }
        @keyframes onb-coin-spin-fallback {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes onb-coin-glow {
          0%, 100% { filter: drop-shadow(0 8px 24px hsl(42 78% 55% / 0.5)); }
          50% { filter: drop-shadow(0 12px 36px hsl(42 95% 65% / 0.85)); }
        }
        @keyframes onb-coin-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.6); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

/* ============= LOTTIE SLIDE ============= */

const LottieSlide = ({ url, active, hue }: { url: string; active: boolean; hue: number }) => {
  const [data, setData] = useState<any>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setErrored(false);
    fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("fetch failed")))
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setErrored(true); });
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Glow base */}
      <div
        className="absolute inset-[12%] rounded-full blur-3xl opacity-40"
        style={{ background: `radial-gradient(circle, hsl(${hue} 78% 55% / 0.55), transparent 70%)` }}
      />
      {data && !errored ? (
        <Lottie
          animationData={data}
          loop
          autoplay={active}
          className="relative w-full h-full"
          rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
        />
      ) : errored ? (
        // Fallback: minimal gold orb so the screen never looks empty
        <div
          className="relative w-32 h-32 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, hsl(${hue} 95% 78%), hsl(${hue} 78% 45%))`,
            boxShadow: `0 16px 48px hsl(${hue} 78% 55% / 0.5)`,
            animation: "onb-coin-glow 2.4s ease-in-out infinite",
          }}
        />
      ) : (
        <div className="text-[10px] text-white/30 tracking-widest">LOADING</div>
      )}
    </div>
  );
};

/* ============= TILT-TO-REVEAL COIN ============= */

const TiltCoin = ({ active }: { active: boolean }) => {
  const [tiltY, setTiltY] = useState(0);
  const [tiltX, setTiltX] = useState(0);
  const [orientationGranted, setOrientationGranted] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);

  // Detect if iOS-style permission is required
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    if (typeof w.DeviceOrientationEvent !== "undefined" &&
        typeof w.DeviceOrientationEvent.requestPermission === "function") {
      setNeedsPermission(true);
    } else if (typeof window.DeviceOrientationEvent !== "undefined") {
      // Auto-enable on Android / non-iOS
      setOrientationGranted(true);
    }
  }, []);

  // Listen for tilt
  useEffect(() => {
    if (!orientationGranted || !active) return;
    const onTilt = (e: DeviceOrientationEvent) => {
      // gamma: left-right tilt (-90..90), beta: front-back (-180..180)
      const g = e.gamma ?? 0;
      const b = e.beta ?? 0;
      setTiltY(Math.max(-45, Math.min(45, g * 1.4)));
      setTiltX(Math.max(-25, Math.min(25, (b - 30) * 0.5)));
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [orientationGranted, active]);

  const requestPermission = async () => {
    const w = window as any;
    try {
      const res = await w.DeviceOrientationEvent.requestPermission();
      if (res === "granted") {
        setOrientationGranted(true);
        setNeedsPermission(false);
      }
    } catch {
      // ignore — fall back to CSS auto-spin
    }
  };

  const useFallbackSpin = !orientationGranted;

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: 800 }}>
      {/* radial glow */}
      <div
        className="absolute inset-[10%] rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, hsl(42 95% 60% / 0.6), transparent 70%)" }}
      />

      {/* Sparkles */}
      {active && (
        <>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: "hsl(42 95% 80%)",
                boxShadow: "0 0 8px hsl(42 95% 70%)",
                transform: `rotate(${deg}deg) translateY(-110px)`,
                transformOrigin: "center",
                animation: `onb-coin-sparkle 2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* The coin */}
      <div
        className="relative w-44 h-44"
        style={{
          transformStyle: "preserve-3d",
          transform: useFallbackSpin
            ? undefined
            : `rotateY(${tiltY}deg) rotateX(${-tiltX}deg)`,
          transition: useFallbackSpin ? undefined : "transform 120ms ease-out",
          animation: useFallbackSpin && active
            ? "onb-coin-spin-fallback 5s linear infinite, onb-coin-glow 2.4s ease-in-out infinite"
            : "onb-coin-glow 2.4s ease-in-out infinite",
        }}
      >
        {/* Front face — ₹ */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 30% 25%, hsl(45 100% 88%), hsl(42 95% 60%) 45%, hsl(38 85% 38%) 100%)",
            boxShadow: "inset 0 -6px 20px hsl(30 80% 25% / 0.5), inset 0 4px 12px hsl(45 100% 85% / 0.6), 0 16px 40px hsl(42 78% 35% / 0.5)",
            backfaceVisibility: "hidden",
          }}
        >
          {/* ridges */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "repeating-conic-gradient(from 0deg, hsl(38 70% 35% / 0.25) 0deg 4deg, transparent 4deg 8deg)",
              maskImage: "radial-gradient(circle, transparent 70%, black 72%, black 100%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 70%, black 72%, black 100%)",
            }}
          />
          <span
            className="text-[68px] font-black select-none"
            style={{
              color: "hsl(30 80% 28%)",
              textShadow: "0 2px 0 hsl(45 100% 85%), 0 -2px 0 hsl(30 70% 22%)",
            }}
          >
            ₹
          </span>
        </div>

        {/* Back face — Star (visible when flipped) */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 30% 25%, hsl(45 100% 88%), hsl(42 95% 60%) 45%, hsl(38 85% 38%) 100%)",
            boxShadow: "inset 0 -6px 20px hsl(30 80% 25% / 0.5), inset 0 4px 12px hsl(45 100% 85% / 0.6)",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <Sparkles className="w-16 h-16" style={{ color: "hsl(30 80% 28%)" }} />
        </div>
      </div>

      {/* Permission prompt */}
      {needsPermission && active && (
        <button
          onClick={requestPermission}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap z-10"
          style={{
            background: "hsl(220 15% 10% / 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid hsl(42 78% 55% / 0.4)",
            color: "hsl(42 90% 75%)",
          }}
        >
          Enable motion to tilt
        </button>
      )}
    </div>
  );
};

export default OnboardingScreen;
