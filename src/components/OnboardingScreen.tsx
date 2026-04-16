import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowRight, Sparkles, QrCode, Smartphone, Bell, ShieldCheck, Check } from "lucide-react";
import { haptic } from "@/lib/haptics";

const AUTOPLAY_MS = 6500;

type Slide = {
  title: string;
  subtitle: string;
  hue: number; // base hue tint for ambient bg
  illustration: "qr" | "link" | "aadhaar";
};

const slides: Slide[] = [
  {
    title: "Scan any QR. Pay in a tap.",
    subtitle: "Pay at any shop in India by scanning their UPI QR code — no card, no cash, no fuss.",
    hue: 42, // gold
    illustration: "qr",
  },
  {
    title: "Parents stay in the loop.",
    subtitle: "Real-time alerts, smart limits, and instant top-ups — connected across both phones.",
    hue: 28, // amber
    illustration: "link",
  },
  {
    title: "Verified safe with Aadhaar.",
    subtitle: "Bank-grade KYC in under a minute. Your money is protected from day one.",
    hue: 50, // warm gold
    illustration: "aadhaar",
  },
];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0); // 0..(slides.length) — continuous fill across whole bar
  const [paused, setPaused] = useState(false);
  const [dragX, setDragX] = useState(0); // current finger drag offset px
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

  const next = useCallback(() => {
    haptic.light();
    if (current < slides.length - 1) goTo(current + 1);
    else onComplete();
  }, [current, goTo, onComplete]);

  const prev = useCallback(() => {
    if (current > 0) goTo(current - 1);
  }, [current, goTo]);

  // Touch: follow finger
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
      // resistance at edges
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

  // Auto-advance + continuous progress
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
        else onComplete();
      }
    }, 30);
    return () => clearInterval(tick);
  }, [current, paused, goTo, onComplete]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const titleWords = useMemo(() => slide.title.split(" "), [slide.title]);

  // Hue-tinted background
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
            onClick={onComplete}
            className="text-[11px] font-medium text-white/50 hover:text-white/90 transition-colors px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slides track — translates X following finger */}
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
                {/* 3D illustration */}
                <div
                  className="relative w-full max-w-[320px] aspect-square mb-10"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {s.illustration === "qr" && <QrIllustration active={isActive} />}
                  {s.illustration === "link" && <LinkIllustration active={isActive} />}
                  {s.illustration === "aadhaar" && <AadhaarIllustration active={isActive} />}
                </div>

                {/* Title — word-by-word from bottom */}
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

                {/* Subtitle — fades in after title */}
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
          {/* shimmer */}
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

        {/* Slide dots indicator */}
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
        @keyframes onb-float-3d {
          0%, 100% { transform: translateY(0) rotateY(-8deg) rotateX(4deg); }
          50% { transform: translateY(-12px) rotateY(8deg) rotateX(-2deg); }
        }
        @keyframes onb-float-soft {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes onb-qr-scan {
          0% { top: 8%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 88%; opacity: 0; }
        }
        @keyframes onb-amount-rise {
          0% { opacity: 0; transform: translate(-50%, 30px) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -10px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -40px) scale(0.95); }
        }
        @keyframes onb-merchant-in {
          0%, 30% { opacity: 0; transform: translate(-50%, 8px); }
          50%, 90% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -4px); }
        }
        @keyframes onb-link-pulse {
          0%, 100% { stroke-dashoffset: 0; opacity: 0.7; }
          50% { stroke-dashoffset: -20; opacity: 1; }
        }
        @keyframes onb-alert-fly {
          0% { opacity: 0; transform: translate(-50%, -50%) translateX(-70px) scale(0.6); }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) translateX(70px) scale(0.6); }
        }
        @keyframes onb-alert-fly-rev {
          0% { opacity: 0; transform: translate(-50%, -50%) translateX(70px) scale(0.6); }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) translateX(-70px) scale(0.6); }
        }
        @keyframes onb-aadhaar-slide {
          0% { transform: translate(-120%, -50%) rotate(-8deg); opacity: 0; }
          60% { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
        }
        @keyframes onb-stamp-in {
          0%, 70% { opacity: 0; transform: translate(0, 0) scale(2.5) rotate(-25deg); }
          80% { opacity: 1; transform: translate(0, 0) scale(0.95) rotate(-12deg); }
          90% { transform: translate(0, 0) scale(1.05) rotate(-12deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(-12deg); }
        }
      `}</style>
    </div>
  );
};

/* ============= 3D ILLUSTRATIONS ============= */

const QrIllustration = ({ active }: { active: boolean }) => (
  <div
    className="relative w-full h-full flex items-center justify-center"
    style={{
      animation: active ? "onb-float-3d 6s ease-in-out infinite" : undefined,
      transformStyle: "preserve-3d",
    }}
  >
    {/* Glow under QR */}
    <div
      className="absolute inset-[15%] rounded-3xl blur-3xl opacity-40"
      style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.6), transparent 70%)" }}
    />

    {/* QR frame */}
    <div
      className="relative rounded-[28px] overflow-hidden"
      style={{
        width: "78%",
        aspectRatio: "1",
        background: "linear-gradient(135deg, hsl(220 15% 10%), hsl(220 15% 6%))",
        border: "1.5px solid hsl(42 78% 55% / 0.35)",
        boxShadow: "0 30px 60px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(42 78% 55% / 0.15)",
      }}
    >
      {/* Corner brackets */}
      {[
        { top: 10, left: 10, borders: "border-t-2 border-l-2", radius: "rounded-tl-xl" },
        { top: 10, right: 10, borders: "border-t-2 border-r-2", radius: "rounded-tr-xl" },
        { bottom: 10, left: 10, borders: "border-b-2 border-l-2", radius: "rounded-bl-xl" },
        { bottom: 10, right: 10, borders: "border-b-2 border-r-2", radius: "rounded-br-xl" },
      ].map((c, i) => (
        <div
          key={i}
          className={`absolute w-8 h-8 ${c.borders} ${c.radius}`}
          style={{
            ...c,
            borderColor: "hsl(42 78% 55%)",
            boxShadow: "0 0 12px hsl(42 78% 55% / 0.5)",
          }}
        />
      ))}

      {/* Mock QR pattern */}
      <div className="absolute inset-[18%] grid grid-cols-8 gap-[3px] opacity-90">
        {Array.from({ length: 64 }).map((_, i) => {
          const filled = (i * 7 + (i % 5)) % 3 !== 0;
          return (
            <div
              key={i}
              className="rounded-[2px]"
              style={{
                background: filled ? "hsl(42 90% 72%)" : "transparent",
                boxShadow: filled ? "0 0 4px hsl(42 78% 55% / 0.4)" : "none",
              }}
            />
          );
        })}
      </div>

      {/* QR center logo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
          boxShadow: "0 4px 16px hsl(42 78% 55% / 0.6)",
        }}
      >
        <QrCode className="w-5 h-5" style={{ color: "hsl(220 15% 5%)" }} />
      </div>

      {/* Scanning laser line */}
      {active && (
        <div
          className="absolute left-[12%] right-[12%] h-[2px] rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(42 95% 70%), transparent)",
            boxShadow: "0 0 16px hsl(42 78% 55% / 0.9), 0 0 32px hsl(42 78% 55% / 0.5)",
            animation: "onb-qr-scan 2.4s ease-in-out infinite",
          }}
        />
      )}
    </div>

    {/* Merchant name pop-up */}
    {active && (
      <div
        className="absolute bottom-[8%] left-1/2 px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
        style={{
          background: "hsl(220 15% 10% / 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid hsl(42 78% 55% / 0.3)",
          color: "hsl(42 90% 75%)",
          animation: "onb-merchant-in 4s ease-in-out infinite",
          animationDelay: "1.5s",
        }}
      >
        ☕ Cafe Aurora • Mumbai
      </div>
    )}

    {/* Floating ₹ amount */}
    {active && (
      <div
        className="absolute top-[2%] left-1/2 text-[26px] font-black"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 78%), hsl(42 78% 55%))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 4px 16px hsl(42 78% 55% / 0.6))",
          animation: "onb-amount-rise 4s ease-in-out infinite",
          animationDelay: "2s",
        }}
      >
        ₹ 249
      </div>
    )}
  </div>
);

const LinkIllustration = ({ active }: { active: boolean }) => (
  <div
    className="relative w-full h-full flex items-center justify-center"
    style={{
      animation: active ? "onb-float-soft 7s ease-in-out infinite" : undefined,
      transformStyle: "preserve-3d",
    }}
  >
    {/* Background glow */}
    <div
      className="absolute inset-[10%] rounded-full blur-3xl opacity-30"
      style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.6), transparent 70%)" }}
    />

    {/* Connecting curved line (SVG) */}
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="connectGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(42 95% 70%)" />
          <stop offset="100%" stopColor="hsl(38 80% 50%)" />
        </linearGradient>
      </defs>
      <path
        d="M 22 32 Q 50 50, 78 68"
        fill="none"
        stroke="url(#connectGrad)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        strokeLinecap="round"
        style={{
          filter: "drop-shadow(0 0 4px hsl(42 78% 55% / 0.6))",
          animation: active ? "onb-link-pulse 1.8s ease-in-out infinite" : undefined,
        }}
      />
    </svg>

    {/* Parent phone — top-left */}
    <div
      className="absolute"
      style={{
        top: "8%",
        left: "8%",
        width: "42%",
        aspectRatio: "9/16",
        transform: "perspective(800px) rotateY(-15deg) rotateX(8deg)",
        transformStyle: "preserve-3d",
      }}
    >
      <PhoneMockup label="Parent" icon="bell" />
    </div>

    {/* Teen phone — bottom-right */}
    <div
      className="absolute"
      style={{
        bottom: "8%",
        right: "8%",
        width: "42%",
        aspectRatio: "9/16",
        transform: "perspective(800px) rotateY(15deg) rotateX(-8deg)",
        transformStyle: "preserve-3d",
      }}
    >
      <PhoneMockup label="Teen" icon="phone" />
    </div>

    {/* Flying alerts between phones */}
    {active && (
      <>
        <div
          className="absolute top-1/2 left-1/2 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
            boxShadow: "0 6px 20px hsl(42 78% 55% / 0.6)",
            animation: "onb-alert-fly 3s ease-in-out infinite",
          }}
        >
          <Bell className="w-4 h-4" style={{ color: "hsl(220 15% 5%)" }} />
        </div>
        <div
          className="absolute top-1/2 left-1/2 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(38 80% 55%), hsl(42 78% 45%))",
            boxShadow: "0 6px 20px hsl(42 78% 55% / 0.5)",
            animation: "onb-alert-fly-rev 3s ease-in-out infinite",
            animationDelay: "1.5s",
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "hsl(220 15% 5%)" }} />
        </div>
      </>
    )}
  </div>
);

const PhoneMockup = ({ label, icon }: { label: string; icon: "bell" | "phone" }) => (
  <div
    className="relative w-full h-full rounded-[18px] overflow-hidden"
    style={{
      background: "linear-gradient(160deg, hsl(220 15% 12%), hsl(220 15% 6%))",
      border: "1.5px solid hsl(42 78% 55% / 0.3)",
      boxShadow: "0 16px 40px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(42 78% 55% / 0.15)",
    }}
  >
    {/* Notch */}
    <div
      className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1.5 rounded-full"
      style={{ background: "hsl(220 15% 4%)" }}
    />
    {/* Screen content */}
    <div className="absolute inset-2 top-4 rounded-[12px] flex flex-col items-center justify-center gap-1.5" style={{ background: "hsl(220 15% 4%)" }}>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
          boxShadow: "0 0 12px hsl(42 78% 55% / 0.5)",
        }}
      >
        {icon === "bell" ? (
          <Bell className="w-3.5 h-3.5" style={{ color: "hsl(220 15% 5%)" }} />
        ) : (
          <Smartphone className="w-3.5 h-3.5" style={{ color: "hsl(220 15% 5%)" }} />
        )}
      </div>
      <span className="text-[8px] font-bold tracking-widest" style={{ color: "hsl(42 90% 75%)" }}>
        {label.toUpperCase()}
      </span>
    </div>
  </div>
);

const AadhaarIllustration = ({ active }: { active: boolean }) => (
  <div
    className="relative w-full h-full flex items-center justify-center"
    style={{
      animation: active ? "onb-float-soft 7s ease-in-out infinite" : undefined,
      transformStyle: "preserve-3d",
    }}
  >
    {/* Background glow */}
    <div
      className="absolute inset-[15%] rounded-3xl blur-3xl opacity-40"
      style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.5), transparent 70%)" }}
    />

    {/* Aadhaar card — slides in */}
    <div
      className="absolute top-1/2 left-1/2 rounded-2xl overflow-hidden"
      style={{
        width: "82%",
        aspectRatio: "1.6",
        background: "linear-gradient(135deg, hsl(42 30% 95%), hsl(42 25% 88%))",
        border: "1px solid hsl(42 50% 70%)",
        boxShadow: "0 20px 50px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.6)",
        transform: "translate(-50%, -50%) perspective(800px) rotateY(-6deg)",
        animation: active ? "onb-aadhaar-slide 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards" : undefined,
        opacity: active ? undefined : 0,
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-3 pt-2.5">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(15 80% 55%), hsl(42 80% 55%), hsl(140 50% 45%))",
            }}
          >
            <span className="text-[8px] font-black text-white">आ</span>
          </div>
          <span className="text-[8px] font-bold tracking-wider" style={{ color: "hsl(220 15% 25%)" }}>
            आधार • AADHAAR
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="w-6 h-1 rounded-sm" style={{ background: "hsl(220 15% 30%)" }} />
          <div className="w-4 h-1 rounded-sm" style={{ background: "hsl(220 15% 50%)" }} />
        </div>
      </div>

      {/* Card body */}
      <div className="flex gap-2.5 px-3 pt-2">
        {/* Photo */}
        <div
          className="w-12 h-14 rounded-md shrink-0"
          style={{
            background: "linear-gradient(135deg, hsl(220 15% 65%), hsl(220 15% 45%))",
            border: "1px solid hsl(220 15% 35%)",
          }}
        />
        {/* Info */}
        <div className="flex-1 flex flex-col gap-1 pt-1">
          <div className="text-[10px] font-bold" style={{ color: "hsl(220 20% 15%)" }}>
            Arjun Sharma
          </div>
          <div className="text-[7px]" style={{ color: "hsl(220 15% 35%)" }}>
            DOB: 12/08/2007
          </div>
          <div className="text-[7px] font-mono tracking-wider mt-0.5" style={{ color: "hsl(220 20% 20%)" }}>
            **** **** 4829
          </div>
        </div>
      </div>

      {/* Verified stamp */}
      <div
        className="absolute"
        style={{
          bottom: 8,
          right: 12,
          opacity: active ? undefined : 0,
          animation: active ? "onb-stamp-in 2.5s ease-out forwards" : undefined,
        }}
      >
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border-2"
          style={{
            borderColor: "hsl(140 65% 40%)",
            color: "hsl(140 65% 30%)",
            background: "hsl(140 50% 95% / 0.5)",
            boxShadow: "0 0 16px hsl(140 65% 40% / 0.3)",
          }}
        >
          <ShieldCheck className="w-3 h-3" />
          <span className="text-[9px] font-black tracking-wider">VERIFIED</span>
          <Check className="w-3 h-3" strokeWidth={3} />
        </div>
      </div>
    </div>
  </div>
);

export default OnboardingScreen;
