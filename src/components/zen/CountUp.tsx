import { useEffect, useRef, useState } from "react";

interface Props {
  /** Target value (already in display units, e.g. rupees not paise) */
  value: number;
  duration?: number;
  /** Format function — default: en-IN with 0 decimals */
  format?: (n: number) => string;
  className?: string;
}

/**
 * Animated number ticker. Counts from the previous value (or 0) to `value`
 * over `duration` ms using cubic-out easing. Respects prefers-reduced-motion.
 */
export const CountUp = ({ value, duration = 1000, format, className }: Props) => {
  const [n, setN] = useState(value);
  const fromRef = useRef(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(value); fromRef.current = value; return; }
    const from = fromRef.current;
    fromRef.current = value;
    startRef.current = undefined;
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const fmt = format ?? ((x: number) => x.toLocaleString("en-IN"));
  return <span className={className}>{fmt(n)}</span>;
};

export default CountUp;
