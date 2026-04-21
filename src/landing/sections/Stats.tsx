import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 253, suffix: "M+", label: "Teens in India" },
  { value: 0, prefix: "₹", label: "Cost to sign up" },
  { value: 2, suffix: " min", label: "Setup time" },
  { value: 300, suffix: "M+", label: "UPI merchants" },
];

function Counter({ end, duration = 1800 }: { end: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf: number; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setVal(Math.round(end * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);
  return <span ref={ref}>{val}</span>;
}

export default function Stats() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="relative py-20 lg:py-28 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="group relative rounded-3xl p-7 lg:p-9 lux-glass lux-rise overflow-hidden"
            >
              {/* Breathing gold halo */}
              <motion.div
                aria-hidden
                className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none"
                style={{ background: "rgba(200,149,46,0.35)" }}
                animate={reduceMotion ? { opacity: 0.18 } : { opacity: [0.14, 0.32, 0.14], scale: [1, 1.12, 1] }}
                transition={{ duration: 5 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
              />
              {/* Top hairline */}
              <div className="absolute inset-x-6 top-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.5), transparent)" }} />
              {/* Shimmer sweep on hover */}
              {!reduceMotion && (
                <motion.div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(110deg, transparent 35%, rgba(255,231,170,0.18) 50%, transparent 65%)",
                    backgroundSize: "200% 100%",
                  }}
                  initial={{ backgroundPositionX: "200%" }}
                  whileHover={{ backgroundPositionX: "-100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              )}
              {/* Pulsing accent dot */}
              <motion.span
                aria-hidden
                className="absolute top-5 right-5 w-1.5 h-1.5 rounded-full"
                style={{ background: "#e0b048", boxShadow: "0 0 10px rgba(224,176,72,0.8)" }}
                animate={reduceMotion ? {} : { opacity: [0.4, 1, 0.4], scale: [1, 1.4, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
              />
              <div className="relative">
                <div
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 tabular-nums lux-text-platinum"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "-0.05em",
                  }}
                >
                  {s.prefix}<Counter end={s.value} />{s.suffix}
                </div>
                <div className="text-[10px] sm:text-[11px] text-white/45 uppercase tracking-[0.22em] font-semibold">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
