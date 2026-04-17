import { useEffect, useRef, useState, ReactNode, MouseEvent } from "react";
import { motion } from "framer-motion";

/**
 * Magnetic CTA wrapper.
 * - On desktop: button gently translates toward the cursor when within `radius`px.
 * - Soft gold glow intensifies as the cursor approaches.
 * - Disabled on touch / reduced-motion (renders plain button).
 */
export default function MagneticCTA({
  onClick,
  children,
  className = "",
  radius = 140,
  strength = 0.35,
  variant = "primary",
}: {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  radius?: number;
  strength?: number;
  variant?: "primary" | "ghost";
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [proximity, setProximity] = useState(0); // 0..1 (1 = touching)

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !reduce);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: globalThis.MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        setPos({ x: 0, y: 0 });
        setProximity(0);
        return;
      }
      const falloff = 1 - dist / radius; // 0..1
      setPos({ x: dx * strength * falloff, y: dy * strength * falloff });
      setProximity(falloff);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [enabled, radius, strength]);

  const isPrimary = variant === "primary";

  // Glow ramps from base to intense as proximity → 1
  const glow = isPrimary
    ? `0 ${10 + proximity * 14}px ${30 + proximity * 40}px rgba(200,149,46,${0.35 + proximity * 0.45}),
       0 0 ${20 + proximity * 50}px rgba(224,176,72,${0.2 + proximity * 0.45}),
       inset 0 1px 0 rgba(255,255,255,0.45)`
    : `0 ${4 + proximity * 8}px ${16 + proximity * 24}px rgba(200,149,46,${0.15 + proximity * 0.3})`;

  const baseStyle: React.CSSProperties = isPrimary
    ? {
        background: "linear-gradient(135deg, #c8952e 0%, #e0b048 50%, #c8952e 100%)",
        color: "#1a1206",
        border: "1px solid rgba(255,247,227,0.25)",
        boxShadow: glow,
      }
    : {
        background: "rgba(255,255,255,0.04)",
        color: "#fff",
        border: `1px solid rgba(224,176,72,${0.25 + proximity * 0.5})`,
        boxShadow: glow,
        backdropFilter: "blur(12px)",
      };

  return (
    <motion.div
      ref={wrapRef}
      className="relative inline-block"
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.4 }}
      style={{ willChange: "transform" }}
    >
      {/* Halo aura — extra glow that pulses with proximity */}
      {enabled && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(224,176,72,${proximity * 0.35}) 0%, transparent 70%)`,
            filter: "blur(20px)",
            transform: `scale(${1.3 + proximity * 0.4})`,
            transition: "transform 0.3s ease, background 0.2s ease",
          }}
        />
      )}
      <motion.button
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
          onClick?.();
        }}
        whileTap={{ scale: 0.96 }}
        className={`relative inline-flex items-center gap-2 rounded-full font-semibold transition-shadow duration-200 ${className}`}
        style={baseStyle}
        data-cursor="hover"
      >
        {/* Inner shimmer layer for primary — brightens with proximity */}
        {isPrimary && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
            style={{ opacity: 0.4 + proximity * 0.5 }}
          >
            <span
              className="absolute inset-0"
              style={{
                background: "linear-gradient(115deg, transparent 35%, rgba(255,247,227,0.55) 50%, transparent 65%)",
                transform: `translateX(${-100 + proximity * 200}%)`,
                transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          </span>
        )}
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </motion.button>
    </motion.div>
  );
}
