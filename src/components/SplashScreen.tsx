import { useEffect, useState } from "react";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"enter" | "glow" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("glow"), 400);
    const t2 = setTimeout(() => setPhase("exit"), 2000);
    const t3 = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background noise-overlay transition-opacity duration-500 ${phase === "exit" ? "opacity-0" : "opacity-100"}`}>
      {/* Ambient gold glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-64 h-64 rounded-full transition-all duration-1000 ${phase === "glow" ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
          style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.08) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative">
        {/* Pulsing gold rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border border-primary/20 animate-pulse-ring" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border border-primary/10 animate-pulse-ring [animation-delay:0.5s]" />
        </div>

        {/* Logo */}
        <h1 className={`relative text-5xl font-bold z-10 transition-all duration-700 ${phase === "enter" ? "opacity-0 scale-90" : "opacity-100 scale-100"}`}>
          <span className="gradient-text">Auro</span>
          <span className="text-foreground">Pay</span>
        </h1>
      </div>

      <p className={`mt-4 text-sm tracking-[0.2em] uppercase transition-all duration-700 delay-200 ${phase === "enter" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
        style={{ color: "hsl(42 40% 50% / 0.6)" }}
      >
        Premium Banking
      </p>

      {/* Bottom shimmer line */}
      <div className="absolute bottom-16 w-32 h-px overflow-hidden">
        <div className="w-full h-full shimmer-glow" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.3), transparent)" }} />
      </div>
    </div>
  );
};

export default SplashScreen;
