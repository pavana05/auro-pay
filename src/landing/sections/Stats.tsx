import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 253, suffix: "M+", label: "Teens in India" },
  { value: 0, suffix: "₹", prefix: true, label: "Cost to sign up" },
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
    <section className="relative py-24 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center lg:text-left"
            >
              <div
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  backgroundImage: "linear-gradient(135deg,#c8952e,#e0b048,#fff7e3)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}
              >
                {s.prefix && s.suffix}<Counter end={s.value} />{!s.prefix && s.suffix}
              </div>
              <div className="text-sm text-white/50 uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
