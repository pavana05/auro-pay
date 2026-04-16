import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"enter" | "glow" | "shine" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("glow"), 400);
    const t2 = setTimeout(() => setPhase("shine"), 1600);
    const t3 = setTimeout(() => setPhase("exit"), 2800);
    const t4 = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden transition-all duration-500 ${
        phase === "exit" ? "opacity-0 scale-110" : "opacity-100 scale-100"
      }`}
      style={{ minHeight: "100dvh" }}
    >
      {/* Subtle noise */}
      <div className="absolute inset-0 pointer-events-none noise-overlay opacity-50" />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, hsl(var(--background)) 90%)" }}
      />

      {/* Multi-layer ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full blur-3xl transition-all duration-[2s] ease-out ${
            phase !== "enter" ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
          style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.25) 0%, hsl(42 78% 55% / 0.06) 40%, transparent 70%)" }}
        />
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl transition-all duration-[2.5s] delay-300 ease-out ${
            phase !== "enter" ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
          style={{ background: "radial-gradient(circle, hsl(36 80% 42% / 0.1) 0%, transparent 60%)" }}
        />
      </div>

      {/* Floating sparkle particles */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 110 + (i % 3) * 20;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <div
            key={i}
            className={`absolute left-1/2 top-1/2 w-1 h-1 rounded-full transition-all duration-[1.5s] ${
              phase !== "enter" ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background: "hsl(42 90% 70%)",
              boxShadow: "0 0 8px hsl(42 78% 55% / 0.8), 0 0 16px hsl(42 78% 55% / 0.4)",
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              animation: `sparkle-twinkle ${2 + (i % 3) * 0.5}s ease-in-out ${i * 0.15}s infinite`,
              transitionDelay: `${0.4 + i * 0.08}s`,
            }}
          />
        );
      })}

      {/* Logo + rings */}
      <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
        {/* Rotating conic gold ring */}
        <div
          className={`absolute inset-0 rounded-full transition-opacity duration-1000 ${
            phase !== "enter" ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, hsl(42 78% 55% / 0.7) 25%, transparent 50%, hsl(42 78% 55% / 0.5) 75%, transparent 100%)",
            animation: "spin 8s linear infinite",
            mask: "radial-gradient(circle, transparent 62%, black 64%, black 66%, transparent 68%)",
            WebkitMask: "radial-gradient(circle, transparent 62%, black 64%, black 66%, transparent 68%)",
          }}
        />

        {/* Pulsing rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-44 h-44 rounded-full border border-primary/20 animate-pulse-ring" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-44 h-44 rounded-full border border-primary/10 animate-pulse-ring [animation-delay:0.5s]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-44 h-44 rounded-full border border-primary/[0.05] animate-pulse-ring [animation-delay:1s]" />
        </div>

        {/* Brand mark badge */}
        <div
          className={`absolute -top-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-[0_8px_24px_hsl(42_78%_55%/0.5)] transition-all duration-700 ${
            phase !== "enter" ? "opacity-100 scale-100 -translate-y-0" : "opacity-0 scale-75 -translate-y-4"
          }`}
        >
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>

        {/* Logo text with shine sweep */}
        <div
          className={`relative z-10 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            phase === "enter" ? "opacity-0 scale-90 translate-y-3 blur-sm" : "opacity-100 scale-100 translate-y-0 blur-0"
          }`}
        >
          <h1 className="relative text-[56px] font-black tracking-tight overflow-hidden">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, hsl(42 95% 75%) 0%, hsl(42 78% 55%) 45%, hsl(38 80% 45%) 100%)",
                filter: "drop-shadow(0 4px 16px hsl(42 78% 55% / 0.4))",
              }}
            >
              Auro
            </span>
            <span
              className="text-foreground"
              style={{ filter: "drop-shadow(0 2px 8px hsl(0 0% 100% / 0.1))" }}
            >
              Pay
            </span>
            {/* Shine sweep */}
            <div
              className={`absolute inset-0 pointer-events-none transition-transform ease-out ${
                phase === "shine" || phase === "exit" ? "translate-x-full duration-[1200ms]" : "-translate-x-full duration-0"
              }`}
              style={{
                background: "linear-gradient(110deg, transparent 35%, hsl(45 100% 90% / 0.6) 50%, transparent 65%)",
                mixBlendMode: "overlay",
              }}
            />
          </h1>
        </div>
      </div>

      {/* Tagline */}
      <p
        className={`mt-6 text-[10px] tracking-[0.4em] uppercase font-bold transition-all duration-1000 delay-300 ${
          phase === "enter" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
        style={{ color: "hsl(42 50% 60% / 0.7)" }}
      >
        Premium · Banking · Reimagined
      </p>

      {/* Animated bottom hairline */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div
          className={`h-px overflow-hidden transition-all duration-[1200ms] delay-500 ease-out ${
            phase !== "enter" ? "w-20 opacity-100" : "w-0 opacity-0"
          }`}
          style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.6), transparent)" }}
        />
        <div
          className={`w-1 h-1 rounded-full transition-all duration-700 delay-700 ${
            phase !== "enter" ? "opacity-100 scale-100" : "opacity-0 scale-0"
          }`}
          style={{ background: "hsl(42 78% 55%)", boxShadow: "0 0 8px hsl(42 78% 55% / 0.8)" }}
        />
        <div
          className={`h-px overflow-hidden transition-all duration-[1200ms] delay-500 ease-out ${
            phase !== "enter" ? "w-20 opacity-100" : "w-0 opacity-0"
          }`}
          style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.6), transparent)" }}
        />
      </div>

      {/* Loading text */}
      <p
        className={`absolute bottom-12 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.3em] uppercase font-medium transition-opacity duration-700 delay-1000 ${
          phase !== "enter" ? "opacity-50" : "opacity-0"
        }`}
        style={{ color: "hsl(42 30% 55% / 0.4)" }}
      >
        Loading your wallet
      </p>
    </div>
  );
};

export default SplashScreen;
