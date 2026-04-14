import { useState } from "react";
import { QrCode, Shield, CreditCard } from "lucide-react";

const slides = [
  {
    icon: QrCode,
    title: "Scan. Pay. Done.",
    subtitle: "Pay at any shop in India by scanning their UPI QR code. No card needed.",
  },
  {
    icon: Shield,
    title: "Parents Stay in Control",
    subtitle: "Set spending limits, get instant alerts, freeze the card anytime.",
  },
  {
    icon: CreditCard,
    title: "Just Your Aadhaar",
    subtitle: "Sign up in 2 minutes with only your Aadhaar card. No PAN card needed.",
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
      <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up" key={current}>
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
          {(() => {
            const Icon = slides[current].icon;
            return <Icon className="w-12 h-12 text-primary" />;
          })()}
        </div>
        <h2 className="text-[22px] font-semibold mb-4">{slides[current].title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
          {slides[current].subtitle}
        </p>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2 mb-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i === current ? "w-6 bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="w-full flex flex-col items-center gap-3">
        <button
          onClick={next}
          className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          {current === slides.length - 1 ? "Get Started" : "Next"}
        </button>
        {current < slides.length - 1 && (
          <button
            onClick={onComplete}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
