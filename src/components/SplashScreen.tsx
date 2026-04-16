import { useEffect, useState } from "react";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"enter" | "glow" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("glow"), 400);
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    const t3 = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background noise-overlay transition-all duration-500 ${
        phase === "exit" ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
      style={{ minHeight: "100dvh" }}
    >
      {/* Multi-layer ambient glow — centered absolutely */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full transition-all duration-[1.5s] ${
            phase === "glow" ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
          style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.1) 0%, hsl(42 78% 55% / 0.03) 40%, transparent 70%)" }}
        />
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full transition-all duration-[2s] delay-300 ${
            phase === "glow" ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
          style={{ background: "radial-gradient(circle, hsl(36 80% 42% / 0.05) 0%, transparent 60%)" }}
        />
      </div>

      {/* Logo + rings — centered via flex parent */}
      <div className="relative flex items-center justify-center" style={{ width: 144, height: 144 }}>
        {/* Pulsing gold rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-36 h-36 rounded-full border border-primary/15 animate-pulse-ring" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-36 h-36 rounded-full border border-primary/[0.08] animate-pulse-ring [animation-delay:0.5s]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-36 h-36 rounded-full border border-primary/[0.04] animate-pulse-ring [animation-delay:1s]" />
        </div>

        {/* Logo text */}
        <h1
          className={`relative text-5xl font-bold z-10 transition-all duration-700 ${
            phase === "enter" ? "opacity-0 scale-90 translate-y-2" : "opacity-100 scale-100 translate-y-0"
          }`}
        >
          <span className="gradient-text">Auro</span>
          <span className="text-foreground">Pay</span>
        </h1>
      </div>

      <p
        className={`mt-5 text-[11px] tracking-[0.25em] uppercase transition-all duration-700 delay-200 font-medium ${
          phase === "enter" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
        style={{ color: "hsl(42 40% 50% / 0.5)" }}
      >
        Premium Banking
      </p>

      {/* Animated bottom line */}
      <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 h-px overflow-hidden transition-all duration-1000 ${phase === "glow" ? "w-32" : "w-0"}`}>
        <div className="w-full h-full" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.4), transparent)" }} />
      </div>
    </div>
  );
};

export default SplashScreen;
