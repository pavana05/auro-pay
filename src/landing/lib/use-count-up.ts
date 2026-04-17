import { useEffect, useState } from "react";

/**
 * Animates a number from 0 to `target` over `durationMs` once `active` becomes true.
 */
export function useCountUp(target: number, active: boolean, durationMs = 1800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (target <= 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / durationMs, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);

  return value;
}

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-IN").format(n);
