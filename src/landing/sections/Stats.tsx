import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 253, suffix: "M+", label: "Teens in India" },
  { value: 0, prefix: "₹", label: "Cost to sign up" },
  { value: 2, suffix: " min", label: "Setup time" },
  { value: 300, suffix: "M+", label: "UPI merchants" },
];

function Counter({ end, duration = 1500 }: { end: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf: number; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setVal(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);
  return <span ref={ref}>{val}</span>;
}

export default function Stats() {
  return (
    <section className="relative py-20 lg:py-28 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="group relative rounded-3xl p-6 lg:p-8 overflow-hidden transition"
              style={{
                background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                border: "1px solid rgba(200,149,46,0.18)",
              }}
            >
              <div
                className="absolute -top-10 -right-10 w-36 h-36 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500"
                style={{ background: "rgba(200,149,46,0.4)" }}
              />
              <div className="relative">
                <div
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-3 tabular-nums"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    backgroundImage: "linear-gradient(135deg,#fff7e3,#e0b048,#c8952e)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {s.prefix}<Counter end={s.value} />{s.suffix}
                </div>
                <div className="text-[11px] sm:text-xs text-white/45 uppercase tracking-[0.18em] font-semibold">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
