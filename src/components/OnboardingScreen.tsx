import { useState } from "react";
import { QrCode, Shield, CreditCard, Sparkles } from "lucide-react";

const slides = [
  {
    icon: QrCode,
    title: "Scan. Pay. Done.",
    subtitle: "Pay at any shop in India by scanning their UPI QR code. No card needed.",
    accent: "from-primary to-accent",
  },
  {
    icon: Shield,
    title: "Parents Stay in Control",
    subtitle: "Set spending limits, get instant alerts, freeze the card anytime.",
    accent: "from-accent to-primary",
  },
  {
    icon: CreditCard,
    title: "Just Your Aadhaar",
    subtitle: "Sign up in 2 minutes with only your Aadhaar card. No PAN card needed.",
    accent: "from-primary to-warning",
  },
];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-background noise-overlay px-6 py-12">
      {/* Premium label */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full badge-premium text-[10px] tracking-wider uppercase">
        <Sparkles className="w-3 h-3" />
        Premium Experience
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up" key={current}>
        {/* Gold-bordered icon */}
        <div className="relative w-28 h-28 rounded-full flex items-center justify-center mb-8 shimmer-border"
          style={{ background: "hsl(42 78% 55% / 0.06)" }}
        >
          {(() => {
            const Icon = slides[current].icon;
            return <Icon className="w-12 h-12 text-primary" strokeWidth={1.5} />;
          })()}
        </div>

        <h2 className="text-[24px] font-semibold mb-4 tracking-tight">{slides[current].title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
          {slides[current].subtitle}
        </p>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2 mb-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current
                ? "w-8 gradient-primary"
                : "w-1.5 bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="w-full flex flex-col items-center gap-3">
        <button
          onClick={next}
          className="w-full h-14 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] shimmer-border relative overflow-hidden"
        >
          {current === slides.length - 1 ? "Get Started" : "Continue"}
        </button>
        {current < slides.length - 1 && (
          <button
            onClick={onComplete}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
