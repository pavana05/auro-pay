import { useState } from "react";
import { QrCode, Shield, Target, Sparkles, ChevronRight, Gift, ArrowRight } from "lucide-react";
import rewardsImg from "@/assets/onboarding-rewards.png";
import heroImg from "@/assets/onboarding-hero.png";

const slides = [
  {
    icon: Sparkles,
    title: "Welcome to AuroPay",
    subtitle: "India's premium digital wallet built for teens. Your money, your way.",
    accent: "from-primary to-accent",
    emoji: "✨",
    type: "standard" as const,
  },
  {
    icon: Gift,
    title: "Super Money\nApp & Card for\nYoungsters",
    subtitle: "Simplify Teen Finances, One Tap at a Time",
    accent: "from-indigo-500 to-violet-600",
    emoji: "",
    type: "hero" as const,
  },
  {
    icon: Gift,
    title: "Turn your\nspending into\nrewards",
    subtitle: "",
    accent: "from-primary to-accent",
    emoji: "",
    type: "rewards" as const,
  },
  {
    icon: QrCode,
    title: "Scan. Pay. Done.",
    subtitle: "Pay at any shop in India by scanning their UPI QR code. No card needed, no hassle.",
    accent: "from-accent to-primary",
    emoji: "⚡",
    type: "standard" as const,
  },
  {
    icon: Shield,
    title: "Parents Stay in Control",
    subtitle: "Set spending limits, get instant alerts, and freeze the card anytime for peace of mind.",
    accent: "from-primary to-warning",
    emoji: "🛡️",
    type: "standard" as const,
  },
  {
    icon: Target,
    title: "Save & Grow",
    subtitle: "Set savings goals, earn rewards, and learn smart money habits from day one.",
    accent: "from-warning to-primary",
    emoji: "🎯",
    type: "standard" as const,
  },
];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = (idx: number) => {
    if (animating || idx === current) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 200);
  };

  const next = () => {
    if (current < slides.length - 1) goTo(current + 1);
    else onComplete();
  };

  const slide = slides[current];

  return (
    <div className="flex flex-col min-h-screen bg-background noise-overlay relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-[0.04] animate-float" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, hsl(36 80% 42%), transparent)" }} />
      </div>

      {/* Skip */}
      <div className="flex justify-end px-6 pt-8 relative z-10">
        {current < slides.length - 1 && (
          <button onClick={onComplete} className="text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-full border border-border/50">
            Skip
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <div key={current} className={`flex flex-col items-center text-center w-full ${animating ? "opacity-0 scale-95" : "opacity-100 scale-100"} transition-all duration-300`}>
          
          {slide.type === "hero" ? (
            /* ── Hero "Super Money App" slide ── */
            <div className="flex flex-col items-center w-full">
              {/* Title section */}
              <h2 className="text-[30px] font-black leading-[1.1] tracking-tight mb-3 whitespace-pre-line text-center">
                Super Money{"\n"}App & Card for{"\n"}
                <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">Youngsters</span>
              </h2>
              <p className="text-[13px] text-muted-foreground/60 mb-6 text-center max-w-[260px] leading-relaxed">
                Simplify Teen Finances, One Tap at a Time
              </p>

              {/* Arrow CTA circle */}
              <div className="w-14 h-14 rounded-full border-2 border-white/20 flex items-center justify-center mb-8 animate-float">
                <ArrowRight className="w-5 h-5 text-foreground" />
              </div>

              {/* Hero illustration */}
              <div className="relative w-72 h-56">
                {/* Gradient background glow */}
                <div className="absolute inset-0 rounded-[32px] opacity-30" style={{ background: "radial-gradient(ellipse at center, hsl(42 78% 55% / 0.3), transparent 70%)" }} />
                
                {/* Floating clouds */}
                <div className="absolute top-2 left-4 w-16 h-6 rounded-full bg-white/[0.04] blur-sm animate-float [animation-delay:0.3s]" />
                <div className="absolute top-8 right-6 w-12 h-5 rounded-full bg-white/[0.03] blur-sm animate-float [animation-delay:0.8s]" />

                {/* Hero image */}
                <img
                  src={heroImg}
                  alt="Teen with card"
                  className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl"
                  width={768}
                  height={1024}
                />

                {/* Floating shield badge */}
                <div className="absolute bottom-2 left-4 w-12 h-12 rounded-full bg-gradient-to-br from-primary/80 to-amber-600/80 shadow-lg shadow-primary/30 flex items-center justify-center animate-float [animation-delay:0.5s]">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>

                {/* Floating card element */}
                <div className="absolute top-12 left-0 w-16 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/20 flex items-center justify-center animate-float [animation-delay:1s] rotate-[-12deg]">
                  <div className="w-4 h-3 rounded-sm bg-yellow-400/80" />
                </div>
              </div>
            </div>
          ) : slide.type === "rewards" ? (
            /* ── Rewards slide (reference-inspired) ── */
            <div className="flex flex-col items-center w-full">
              {/* Floating cards & coins */}
              <div className="relative w-64 h-52 mb-8">
                {/* Floating golden coins */}
                <div className="absolute -top-2 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-amber-500/30 animate-float" />
                <div className="absolute top-8 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-md shadow-amber-400/20 animate-float [animation-delay:0.5s]" />
                <div className="absolute bottom-4 right-0 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-md shadow-amber-400/20 animate-float [animation-delay:1s]" />
                <div className="absolute -bottom-2 left-8 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-lg shadow-amber-400/25 animate-float [animation-delay:0.3s]" />
                
                {/* Main reward card image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src={rewardsImg} 
                    alt="Rewards" 
                    className="w-44 h-44 object-contain drop-shadow-2xl animate-float [animation-delay:0.2s]" 
                    width={176} 
                    height={176}
                  />
                </div>

                {/* Mini Starbucks-style card */}
                <div className="absolute bottom-2 right-2 w-14 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-500/20 flex items-center justify-center animate-float [animation-delay:0.7s]">
                  <span className="text-[8px] font-bold text-white">☕</span>
                </div>

                {/* Receipt icon */}
                <div className="absolute top-4 left-4 w-12 h-16 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg flex flex-col items-center justify-center gap-1 animate-float [animation-delay:1.2s]">
                  <div className="w-6 h-0.5 bg-white/30 rounded" />
                  <div className="w-5 h-0.5 bg-white/20 rounded" />
                  <div className="w-4 h-0.5 bg-white/15 rounded" />
                  <div className="w-6 h-0.5 bg-primary/50 rounded mt-1" />
                </div>
              </div>

              {/* Big bold title */}
              <h2 className="text-[32px] font-black leading-[1.1] tracking-tight mb-6 whitespace-pre-line">
                Turn your{"\n"}spending into{"\n"}
                <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">rewards</span>
              </h2>

              {/* Subtitle */}
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                Every purchase earns you coins, cashback & exclusive brand rewards.
              </p>
            </div>
          ) : (
            /* ── Standard slides ── */
            <>
              <div className="relative mb-10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-36 h-36 rounded-full border border-primary/10 animate-pulse-ring" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-36 h-36 rounded-full border border-primary/5 animate-pulse-ring [animation-delay:0.7s]" />
                </div>
                <div className="w-28 h-28 rounded-full flex items-center justify-center shimmer-border relative" style={{ background: "hsl(42 78% 55% / 0.06)" }}>
                  <span className="text-4xl">{slide.emoji}</span>
                </div>
              </div>

              <h2 className="text-[26px] font-bold mb-4 tracking-tight leading-tight max-w-[280px]">
                {slide.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px]">
                {slide.subtitle}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-10 relative z-10">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === current ? "w-8 gradient-primary" : i < current ? "w-3 bg-primary/30" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={next}
          className="w-full h-14 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] shimmer-border relative overflow-hidden flex items-center justify-center gap-2"
        >
          {current === slides.length - 1 ? (
            <>Get Started <Sparkles className="w-4 h-4" /></>
          ) : (
            <>Continue <ChevronRight className="w-4 h-4" /></>
          )}
        </button>

        {/* Secondary link on rewards slide */}
        {slide.type === "rewards" && (
          <button onClick={onComplete} className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
            I already have an account
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
