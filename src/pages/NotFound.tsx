import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, Home, Search, Compass } from "lucide-react";
import { haptic } from "@/lib/haptics";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    setTimeout(() => setMounted(true), 50);
  }, [location.pathname]);

  const particles = useMemo(() => ({
    orbs: Array.from({ length: 6 }, (_, i) => ({
      size: 3 + Math.random() * 4,
      x: Math.random() * 100,
      y: Math.random() * 100,
      dur: 5 + Math.random() * 6,
      delay: i * 0.8,
    })),
    sparkles: Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      dur: 2 + Math.random() * 3,
      delay: Math.random() * 4,
    })),
  }), []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-6">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.06), transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(270 60% 55% / 0.03), transparent 70%)" }} />
      </div>

      {/* Floating orbs */}
      {particles.orbs.map((o, i) => (
        <div key={`orb-${i}`} className="absolute rounded-full pointer-events-none"
          style={{
            width: o.size, height: o.size,
            left: `${o.x}%`, top: `${o.y}%`,
            background: `hsl(42 78% ${55 + i * 5}%)`,
            boxShadow: `0 0 ${o.size * 3}px hsl(42 78% 55% / 0.3)`,
            animation: `particle-float ${o.dur}s ease-in-out ${o.delay}s infinite, glow-pulse ${o.dur * 0.6}s ease-in-out ${o.delay}s infinite`,
          }} />
      ))}

      {/* Sparkle dots */}
      {particles.sparkles.map((s, i) => (
        <div key={`sp-${i}`} className="absolute rounded-full pointer-events-none"
          style={{
            width: 1, height: 1,
            left: `${s.x}%`, top: `${s.y}%`,
            background: "hsl(42 78% 70%)",
            boxShadow: "0 0 3px hsl(42 78% 65% / 0.5)",
            animation: `sparkle-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
      ))}

      <div className="relative z-10 text-center max-w-md w-full">
        {/* 404 number with premium styling */}
        <div className={`mb-8 transition-all duration-700 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <div className="relative inline-block">
            <h1 className="text-[120px] font-black tracking-[-8px] leading-none gradient-text select-none"
              style={{ filter: "drop-shadow(0 0 40px hsl(42 78% 55% / 0.15))" }}>
              404
            </h1>
            {/* Glowing underline */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-[2px] rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(42 78% 55%), transparent)",
                boxShadow: "0 0 12px hsl(42 78% 55% / 0.4)",
              }} />
          </div>
        </div>

        {/* Message */}
        <div className={`mb-10 transition-all duration-700 delay-150 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/[0.06] border border-primary/[0.1] mb-5"
            style={{ animation: mounted ? "badge-haptic 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both" : "none" }}>
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Lost in space</span>
          </div>
          <h2 className="text-[22px] font-bold mb-3 tracking-[-0.5px]">Page not found</h2>
          <p className="text-[14px] text-muted-foreground/60 leading-relaxed">
            The page <span className="text-foreground/40 font-mono text-[12px] bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/[0.05]">{location.pathname}</span> doesn't exist or has been moved.
          </p>
        </div>

        {/* Action buttons */}
        <div className={`space-y-3 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <button
            onClick={() => { haptic.medium(); navigate("/home"); }}
            className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-bold text-[14px] active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2.5"
            style={{ boxShadow: "0 8px 32px hsl(42 78% 55% / 0.25), 0 2px 8px hsl(42 78% 55% / 0.15)" }}>
            <Home className="w-4.5 h-4.5" />
            Go Home
          </button>

          <button
            onClick={() => { haptic.light(); navigate(-1); }}
            className="w-full py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-foreground/70 font-semibold text-[14px] active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2.5 hover:bg-white/[0.05]">
            <ChevronLeft className="w-4.5 h-4.5" />
            Go Back
          </button>
        </div>

        {/* Footer */}
        <p className={`mt-10 text-[11px] text-muted-foreground/30 transition-all duration-700 delay-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
          AuroPay • Secure Digital Payments
        </p>
      </div>
    </div>
  );
};

export default NotFound;