import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 253, suffix: "M+", label: "Teens in India", live: true, liveStep: 1 },
  { value: 0, prefix: "₹", label: "Cost to sign up", live: false },
  { value: 2, suffix: " min", label: "Setup time", live: false },
  { value: 300, suffix: "M+", label: "UPI merchants", live: true, liveStep: 1 },
];

function Counter({
  end,
  duration = 1800,
  live = false,
  liveStep = 1,
}: { end: number; duration?: number; live?: boolean; liveStep?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const inViewLive = useInView(ref, { amount: 0.3 });
  const [val, setVal] = useState(0);
  const [pulse, setPulse] = useState(0);
  const settled = useRef(false);

  // Initial count-up
  useEffect(() => {
    if (!inView) return;
    let raf: number; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setVal(Math.round(end * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else settled.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);

  // Live drift while in view
  useEffect(() => {
    if (!live) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 5000 + Math.random() * 7000;
      timer = setTimeout(() => {
        if (!document.hidden && inViewLive && settled.current) {
          setVal((v) => v + liveStep);
          setPulse((p) => p + 1);
        }
        schedule();
      }, delay);
    };
    timer = setTimeout(schedule, 2200);
    return () => clearTimeout(timer);
  }, [live, liveStep, inViewLive]);

  return (
    <span ref={ref} className="relative inline-block">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={val}
          initial={pulse ? { y: -6, opacity: 0, color: "#e0b048" } : { opacity: 1 }}
          animate={{ y: 0, opacity: 1, color: "currentColor" }}
          exit={pulse ? { y: 6, opacity: 0, position: "absolute" } : { opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {val}
        </motion.span>
      </AnimatePresence>
    </span>
  );
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
              {/* Pulsing accent dot — green if live, gold otherwise */}
              <motion.span
                aria-hidden
                className="absolute top-5 right-5 w-1.5 h-1.5 rounded-full"
                style={{
                  background: s.live ? "#22c55e" : "#e0b048",
                  boxShadow: s.live
                    ? "0 0 10px rgba(34,197,94,0.85)"
                    : "0 0 10px rgba(224,176,72,0.8)",
                }}
                animate={reduceMotion ? {} : { opacity: [0.4, 1, 0.4], scale: [1, 1.4, 1] }}
                transition={{ duration: s.live ? 1.6 : 2.4, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
              />
              <div className="relative">
                <div
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 tabular-nums lux-text-platinum"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "-0.05em",
                  }}
                >
                  {s.prefix}
                  <Counter end={s.value} live={s.live} liveStep={s.liveStep} />
                  {s.suffix}
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
