import { useState, useEffect } from "react";
import { QrCode, Shield, CreditCard, Sparkles, Target, ChevronRight } from "lucide-react";

const slides = [
  {
    icon: Sparkles,
    title: "Welcome to AuroPay",
    subtitle: "India's premium digital wallet built for teens. Your money, your way.",
    accent: "from-primary to-accent",
    emoji: "✨",
  },
  {
    icon: QrCode,
    title: "Scan. Pay. Done.",
    subtitle: "Pay at any shop in India by scanning their UPI QR code. No card needed, no hassle.",
    accent: "from-accent to-primary",
    emoji: "⚡",
  },
  {
    icon: Shield,
    title: "Parents Stay in Control",
    subtitle: "Set spending limits, get instant alerts, and freeze the card anytime for peace of mind.",
    accent: "from-primary to-warning",
    emoji: "🛡️",
  },
  {
    icon: Target,
    title: "Save & Grow",
    subtitle: "Set savings goals, earn rewards, and learn smart money habits from day one.",
    accent: "from-warning to-primary",
    emoji: "🎯",
  },
];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  const goTo = (idx: number) => {
    if (animating || idx === current) return;
    setDirection(idx > current ? "next" : "prev");
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
        <div key={current} className={`flex flex-col items-center text-center ${animating ? "opacity-0 scale-95" : "opacity-100 scale-100"} transition-all duration-300`}>
          {/* Icon container with rings */}
          <div className="relative mb-10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border border-primary/10 animate-pulse-ring" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border border-primary/5 animate-pulse-ring [animation-delay:0.7s]" />
            </div>
            <div className="w-28 h-28 rounded-full flex items-center justify-center shimmer-border relative" style={{ background: "hsl(42 78% 55% / 0.06)" }}>
              <span className="text-4xl">{slides[current].emoji}</span>
            </div>
          </div>

          <h2 className="text-[26px] font-bold mb-4 tracking-tight leading-tight max-w-[280px]">
            {slides[current].title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px]">
            {slides[current].subtitle}
          </p>
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
      </div>
    </div>
  );
};

export default OnboardingScreen;
