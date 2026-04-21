import { useEffect, useRef, useState, ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * MagneticChip — lightweight magnetic hover wrapper for inline pills/chips.
 * - Desktop pointer-fine only; gracefully no-ops on touch / reduced-motion.
 * - Subtle translate (max ~6px) + soft gold glow that grows with proximity.
 */
export default function MagneticChip({
  children,
  className = "",
  radius = 90,
  strength = 0.18,
  style,
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
  strength?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [proximity, setProximity] = useState(0);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !reduce);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        setPos({ x: 0, y: 0 });
        setProximity(0);
        return;
      }
      const f = 1 - dist / radius;
      setPos({ x: dx * strength * f, y: dy * strength * f });
      setProximity(f);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [enabled, radius, strength]);

  return (
    <motion.div
      ref={ref}
      className={`relative inline-block ${className}`}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.35 }}
      style={{ willChange: "transform", ...style }}
    >
      {enabled && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(224,176,72,${proximity * 0.32}) 0%, transparent 70%)`,
            filter: "blur(14px)",
            transform: `scale(${1.2 + proximity * 0.35})`,
            transition: "transform 0.3s ease, background 0.2s ease",
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
