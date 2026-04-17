import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Cinematic entry overlay — three acts (~2.4s):
 *  1. Particle field converges to a glowing nucleus
 *  2. Gold logo emerges with shimmer + ring expansion
 *  3. Light sweep, lift-off, fade
 */
export default function EntryAnimation({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setShow(false); onDone(); }, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  // Pre-compute particle positions for stability across renders.
  const particles = Array.from({ length: 60 }).map((_, i) => {
    const angle = (i / 60) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 220 + Math.random() * 240;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 0.3,
      gold: i % 3 !== 0,
    };
  });

  const burst = Array.from({ length: 32 }).map((_, i) => {
    const angle = (i / 32) * Math.PI * 2;
    return { x: Math.cos(angle) * 180, y: Math.sin(angle) * 180 };
  });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background:
              "radial-gradient(ellipse at center, #0d0a05 0%, #050507 70%)",
          }}
        >
          {/* Soft golden vignette pulse */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.2] }}
            transition={{ duration: 1.6, times: [0, 0.4, 1] }}
            style={{
              background: "radial-gradient(circle at center, rgba(200,149,46,0.35), transparent 55%)",
            }}
          />

          {/* Converging particles */}
          {particles.map((p, i) => (
            <motion.div
              key={`p-${i}`}
              className="absolute top-1/2 left-1/2 rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: p.gold ? "#e0b048" : "#fff7e3",
                boxShadow: p.gold ? "0 0 6px #c8952e" : "0 0 4px #fff",
              }}
              initial={{ x: p.x, y: p.y, opacity: 0 }}
              animate={{
                x: [p.x, 0, 0],
                y: [p.y, 0, 0],
                opacity: [0, 1, 0],
                scale: [1, 1.6, 0],
              }}
              transition={{
                duration: 1.4,
                delay: p.delay,
                times: [0, 0.7, 1],
                ease: [0.6, 0.05, 0.3, 1],
              }}
            />
          ))}

          {/* Expanding rings */}
          {[0, 0.25, 0.5].map((d, i) => (
            <motion.div
              key={`r-${i}`}
              className="absolute rounded-full"
              style={{ borderWidth: 1, borderStyle: "solid", borderColor: "rgba(200,149,46,0.5)" }}
              initial={{ width: 80, height: 80, opacity: 0 }}
              animate={{
                width: [80, 480, 720],
                height: [80, 480, 720],
                opacity: [0, 0.7, 0],
              }}
              transition={{ duration: 1.6, delay: 0.7 + d, ease: "easeOut" }}
            />
          ))}

          {/* Logo nucleus */}
          <motion.div
            className="relative"
            initial={{ scale: 0, opacity: 0, rotate: -45 }}
            animate={{
              scale: [0, 1.15, 1, 1, 1.2],
              opacity: [0, 1, 1, 1, 0],
              rotate: [-45, 0, 0, 0, 12],
              y: [0, 0, 0, 0, -120],
            }}
            transition={{
              duration: 2.2,
              times: [0, 0.35, 0.5, 0.85, 1],
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div
              className="relative w-24 h-24 rounded-[28px] overflow-hidden"
              style={{
                background: "linear-gradient(135deg,#fff7e3 0%,#e0b048 40%,#c8952e 70%,#8a6520 100%)",
                boxShadow:
                  "0 0 60px rgba(200,149,46,0.9), 0 0 120px rgba(200,149,46,0.5), inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {/* Inner glyph — stylized "A" */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-5xl font-black"
                  style={{
                    fontFamily: "Sora, sans-serif",
                    color: "#1a1206",
                    textShadow: "0 1px 0 rgba(255,255,255,0.4)",
                  }}
                >
                  A
                </span>
              </div>
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.85) 50%, transparent 65%)",
                }}
                initial={{ x: "-150%" }}
                animate={{ x: "150%" }}
                transition={{ duration: 0.9, delay: 0.7, ease: "easeInOut" }}
              />
            </div>

            {/* Burst spokes */}
            {burst.map((b, i) => (
              <motion.div
                key={`b-${i}`}
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{
                  width: 3,
                  height: 3,
                  background: i % 2 ? "#fff7e3" : "#e0b048",
                  boxShadow: "0 0 8px #c8952e",
                }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{ x: b.x, y: b.y, opacity: [0, 1, 0], scale: [0.5, 1, 0] }}
                transition={{ duration: 0.8, delay: 0.55, ease: "easeOut" }}
              />
            ))}
          </motion.div>

          {/* Wordmark */}
          <motion.div
            className="absolute bottom-[28%] left-1/2 -translate-x-1/2 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -10] }}
            transition={{ duration: 1.6, delay: 0.9, times: [0, 0.3, 0.7, 1] }}
          >
            <div
              className="text-3xl font-bold tracking-[0.4em]"
              style={{
                fontFamily: "Sora, sans-serif",
                backgroundImage: "linear-gradient(90deg,#c8952e,#fff7e3,#c8952e)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundSize: "200% 100%",
              }}
            >
              AUROPAY
            </div>
            <div className="text-[10px] text-white/40 tracking-[0.5em] mt-2 uppercase">
              Premium · Teen · Payments
            </div>
          </motion.div>

          {/* Final sweep */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.6, 0] }}
            transition={{ duration: 0.7, delay: 1.7, times: [0, 0.2, 0.5, 1] }}
            style={{
              background:
                "linear-gradient(115deg, transparent 35%, rgba(255,247,227,0.4) 50%, transparent 65%)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
