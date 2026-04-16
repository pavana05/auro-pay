import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, ChevronRight, ArrowRight } from "lucide-react";
import welcomeImg from "@/assets/onboarding-welcome.png";
import heroImg from "@/assets/onboarding-hero.png";
import rewardsImg from "@/assets/onboarding-rewards.png";
import scanImg from "@/assets/onboarding-scan.png";
import parentImg from "@/assets/onboarding-parent.png";
import saveImg from "@/assets/onboarding-save.png";

const AUTOPLAY_DURATION = 8000; // ms per slide — slower, more premium pacing

const slides = [
  {
    title: "Welcome to",
    highlight: "AuroPay",
    subtitle: "India's premium digital wallet built for teens. Your money, your way.",
    image: welcomeImg,
    bg: "radial-gradient(ellipse at 50% 80%, hsl(42 78% 55% / 0.12), transparent 60%)",
  },
  {
    title: "Super Money\nApp & Card for",
    highlight: "Youngsters",
    subtitle: "Simplify Teen Finances, One Tap at a Time",
    image: heroImg,
    bg: "radial-gradient(ellipse at 50% 80%, hsl(250 60% 50% / 0.10), transparent 60%)",
  },
  {
    title: "Turn your\nspending into",
    highlight: "rewards",
    subtitle: "Every purchase earns you coins, cashback & exclusive brand rewards.",
    image: rewardsImg,
    bg: "radial-gradient(ellipse at 50% 80%, hsl(42 78% 55% / 0.10), transparent 60%)",
  },
  {
    title: "Scan. Pay.",
    highlight: "Done.",
    subtitle: "Pay at any shop in India by scanning their UPI QR code. No card needed.",
    image: scanImg,
    bg: "radial-gradient(ellipse at 50% 80%, hsl(170 60% 45% / 0.10), transparent 60%)",
  },
  {
    title: "Parents Stay\nin",
    highlight: "Control",
    subtitle: "Set spending limits, get instant alerts, and freeze the card anytime.",
    image: parentImg,
    bg: "radial-gradient(ellipse at 50% 80%, hsl(210 70% 50% / 0.10), transparent 60%)",
  },
  {
    title: "Save &",
    highlight: "Grow",
    subtitle: "Set savings goals, earn rewards, and learn smart money habits from day one.",
    image: saveImg,
    bg: "radial-gradient(ellipse at 50% 80%, hsl(140 50% 45% / 0.10), transparent 60%)",
  },
];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((idx: number) => {
    if (animating || idx === current) return;
    setAnimating(true);
    setProgress(0);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 250);
  }, [animating, current]);

  const next = useCallback(() => {
    if (current < slides.length - 1) goTo(current + 1);
    else onComplete();
  }, [current, goTo, onComplete]);

  const prev = useCallback(() => {
    if (current > 0) goTo(current - 1);
  }, [current, goTo]);

  // Parallax on touch/mouse move
  const handleParallaxMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
    setParallax({ x: x * 12, y: y * 8 });
  }, []);

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    handleParallaxMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold) next();
    else if (diff < -threshold) prev();
    setPaused(false);
    setParallax({ x: 0, y: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleParallaxMove(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0 });
  };

  // Gyroscope / Device Orientation effect
  useEffect(() => {
    let active = true;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!active) return;
      const gamma = Math.max(-30, Math.min(30, e.gamma || 0)); // left-right tilt
      const beta = Math.max(-30, Math.min(30, (e.beta || 0) - 45)); // front-back tilt (offset for holding angle)
      setParallax({
        x: (gamma / 30) * 14,
        y: (beta / 30) * 10,
      });
    };

    // Request permission on iOS 13+
    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        try {
          const perm = await (DeviceOrientationEvent as any).requestPermission();
          if (perm === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, true);
          }
        } catch {}
      } else {
        window.addEventListener("deviceorientation", handleOrientation, true);
      }
    };
    requestPermission();

    return () => {
      active = false;
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (paused) return;

    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / AUTOPLAY_DURATION) * 100, 100);
      setProgress(pct);
    }, 30);

    autoplayRef.current = setTimeout(() => {
      next();
    }, AUTOPLAY_DURATION);

    return () => {
      if (autoplayRef.current) clearTimeout(autoplayRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [current, paused, next]);

  const slide = slides[current];

  return (
    <div
      ref={containerRef}
      className="flex flex-col min-h-[100dvh] bg-background relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ambient glow per slide */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-700" style={{ background: slide.bg }} />
      
      {/* Subtle noise texture */}
      <div className="absolute inset-0 pointer-events-none noise-overlay" />

      {/* Auto-play progress bar */}
      <div className="absolute top-0 left-0 right-0 z-30 h-[3px] bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-primary to-amber-400 transition-[width] duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Skip button */}
      <div className="flex justify-end px-6 pt-5 relative z-20">
        {current < slides.length - 1 && (
          <button
            onClick={onComplete}
            className="text-[11px] text-muted-foreground/50 hover:text-primary transition-colors px-4 py-2 rounded-full border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
          >
            Skip
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Text section */}
        <div
          key={`text-${current}`}
          className={`px-8 pt-6 pb-4 ${animating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"} transition-all duration-300`}
        >
          <h2 className="text-[28px] font-black leading-[1.1] tracking-tight whitespace-pre-line">
            {slide.title}{" "}
            <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">
              {slide.highlight}
            </span>
          </h2>
          <p className="text-[13px] text-muted-foreground/50 mt-3 leading-relaxed max-w-[300px]">
            {slide.subtitle}
          </p>

          {current === 1 && (
            <div className="mt-5 w-12 h-12 rounded-full border-2 border-white/15 flex items-center justify-center animate-float">
              <ArrowRight className="w-4 h-4 text-foreground/60" />
            </div>
          )}
        </div>

        {/* Illustration section */}
        <div className="flex-1 flex items-end justify-center px-4 pb-0 relative">
          <div
            key={`img-${current}`}
            className={`relative w-full max-w-[320px] ${animating ? "opacity-0 scale-95 translate-y-6" : "opacity-100 scale-100 translate-y-0"} transition-all duration-400`}
          >
            {/* Parallax glow layer (moves opposite) */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-20 transition-transform duration-300 ease-out"
              style={{
                background: "hsl(42 78% 55%)",
                transform: `translate(${-parallax.x * 0.5}px, ${-parallax.y * 0.5}px)`,
              }}
            />
            {/* Main image with parallax */}
            <img
              src={slide.image}
              alt={slide.highlight}
              className="w-full h-auto object-contain drop-shadow-2xl relative z-10 transition-transform duration-200 ease-out"
              style={{ transform: `translate(${parallax.x}px, ${parallax.y}px) scale(1.02)` }}
              width={768}
              height={1024}
            />
            {/* Floating sparkle accents with deeper parallax */}
            <div
              className="absolute top-[15%] right-[10%] w-2 h-2 rounded-full z-20 transition-transform duration-300 ease-out"
              style={{
                background: "hsl(42 78% 55%)",
                boxShadow: "0 0 8px hsl(42 78% 55% / 0.6)",
                transform: `translate(${parallax.x * 2}px, ${parallax.y * 2}px)`,
                animation: "sparkle-twinkle 2s ease-in-out infinite",
              }}
            />
            <div
              className="absolute top-[25%] left-[8%] w-1.5 h-1.5 rounded-full z-20 transition-transform duration-300 ease-out"
              style={{
                background: "hsl(42 78% 65%)",
                boxShadow: "0 0 6px hsl(42 78% 55% / 0.4)",
                transform: `translate(${parallax.x * 1.5}px, ${parallax.y * 1.5}px)`,
                animation: "sparkle-twinkle 2.5s ease-in-out 0.5s infinite",
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-8 pt-4 relative z-20" style={{ background: "linear-gradient(to top, hsl(var(--background)) 60%, transparent)" }}>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-[5px] rounded-full transition-all duration-500 ${
                i === current
                  ? "w-8 gradient-primary shadow-[0_0_8px_hsl(42_78%_55%/0.3)]"
                  : i < current
                    ? "w-3 bg-primary/30"
                    : "w-[5px] bg-white/[0.08]"
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={next}
          className="w-full h-[54px] rounded-[16px] gradient-primary text-primary-foreground font-bold text-[14px] transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 shadow-[0_8px_32px_hsl(42_78%_55%/0.25)]"
        >
          {current === slides.length - 1 ? (
            <>Get Started <Sparkles className="w-4 h-4" /></>
          ) : (
            <>Continue <ChevronRight className="w-4 h-4" /></>
          )}
        </button>

        {/* Secondary link */}
        <button
          onClick={onComplete}
          className="w-full mt-3 text-[11px] text-muted-foreground/30 hover:text-foreground/50 transition-colors py-2"
        >
          I already have an account
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
