import { useEffect, useState } from "react";

const TAGLINE = ["Money", "freedom", "for", "teens"];

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(true);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    // Logo finishes drawing at ~1.2s → trigger glow pulse
    const t1 = setTimeout(() => setPulse(true), 1200);
    // Auto navigate at 2.5s
    const t2 = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0a0c0f", minHeight: "100dvh" }}
    >
      {/* Drifting ambient gold lights — northern-lights style, very subtle */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-[120px]"
          style={{
            width: 520, height: 520, top: "10%", left: "15%",
            background: "radial-gradient(circle, hsl(42 78% 55% / 0.18), transparent 70%)",
            animation: "splash-drift-1 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full blur-[140px]"
          style={{
            width: 600, height: 600, bottom: "5%", right: "10%",
            background: "radial-gradient(circle, hsl(38 80% 45% / 0.14), transparent 70%)",
            animation: "splash-drift-2 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full blur-[100px]"
          style={{
            width: 380, height: 380, top: "45%", left: "55%",
            background: "radial-gradient(circle, hsl(42 95% 70% / 0.1), transparent 70%)",
            animation: "splash-drift-3 22s ease-in-out infinite",
          }}
        />
      </div>

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 35%, #0a0c0f 90%)" }}
      />

      {/* Logo container */}
      <div className="relative flex items-center justify-center">
        {/* Glow pulse ring (fires once after draw completes) */}
        {pulse && (
          <div
            className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: 320, height: 320,
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, hsl(42 78% 55% / 0.5) 0%, hsl(42 78% 55% / 0.15) 35%, transparent 65%)",
              animation: "splash-glow-pulse 1.3s ease-out forwards",
            }}
          />
        )}

        {/* SVG stroke-draw logo */}
        <svg
          width="280"
          height="64"
          viewBox="0 0 280 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
          style={{ filter: "drop-shadow(0 4px 24px hsl(42 78% 55% / 0.4))" }}
        >
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(42 95% 75%)" />
              <stop offset="50%" stopColor="hsl(42 78% 55%)" />
              <stop offset="100%" stopColor="hsl(38 80% 45%)" />
            </linearGradient>
          </defs>
          {/* AuroPay wordmark — outlined letters that stroke in */}
          <text
            x="50%"
            y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="'Sora', system-ui, sans-serif"
            fontSize="48"
            fontWeight="900"
            letterSpacing="-1.5"
            fill="url(#goldGrad)"
            stroke="hsl(42 95% 70%)"
            strokeWidth="0.6"
            style={{
              strokeDasharray: 800,
              strokeDashoffset: 800,
              animation: "splash-stroke-draw 1.2s cubic-bezier(0.65, 0, 0.35, 1) forwards, splash-fill-in 0.5s ease-out 0.9s forwards",
              fillOpacity: 0,
            }}
          >
            AuroPay
          </text>
        </svg>
      </div>

      {/* Tagline — staggered word fade-in (after logo draws) */}
      <div className="mt-8 flex items-center gap-1.5 relative z-10">
        {TAGLINE.map((word, i) => (
          <span
            key={word}
            className="text-[13px] tracking-[0.05em] font-medium font-sora"
            style={{
              color: "hsl(42 50% 70% / 0.85)",
              opacity: 0,
              animation: `splash-word-in 0.5s ease-out forwards`,
              animationDelay: `${1300 + i * 100}ms`,
            }}
          >
            {word}
          </span>
        ))}
      </div>

      {/* Inline keyframes scoped to this splash */}
      <style>{`
        @keyframes splash-stroke-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes splash-fill-in {
          to { fill-opacity: 1; }
        }
        @keyframes splash-glow-pulse {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          40% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.8); }
        }
        @keyframes splash-word-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-drift-1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(60px, 40px); }
        }
        @keyframes splash-drift-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-50px, -30px); }
        }
        @keyframes splash-drift-3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-40px, 50px); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
