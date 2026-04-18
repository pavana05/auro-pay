import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/**
 * Ultra-premium cinematic entry — five acts (~3.0s):
 *  1. Black void with aurora bloom (0.0–0.4s)
 *  2. Particles converge from deep space (0.3–1.2s)
 *  3. Gold nucleus ignites with shockwave + light shafts (1.0–1.8s)
 *  4. Wordmark reveals letter-by-letter with platinum sheen (1.3–2.4s)
 *  5. Light sweep & cinematic lift-off (2.2–3.0s)
 */
export default function EntryAnimation({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setShow(false); onDone(); }, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  // Stable particle field — converging from deep space
  const particles = useMemo(
    () => Array.from({ length: 90 }).map((_, i) => {
      const angle = (i / 90) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 280 + Math.random() * 320;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: 0.8 + Math.random() * 2.6,
        delay: Math.random() * 0.45,
        gold: i % 3 !== 0,
        bright: Math.random() > 0.7,
      };
    }),
    []
  );

  // Shockwave burst on ignition
  const burst = useMemo(
    () => Array.from({ length: 40 }).map((_, i) => {
      const angle = (i / 40) * Math.PI * 2;
      const dist = 160 + Math.random() * 80;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: 2 + Math.random() * 2,
      };
    }),
    []
  );

  // Light shafts (god-rays from nucleus)
  const shafts = [0, 60, 120, 180, 240, 300];

  const word = "AUROPAY".split("");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] overflow-hidden pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background:
              "radial-gradient(ellipse at center, #0d0a05 0%, #030305 75%)",
          }}
        >
          {/* Act 1: Aurora bloom backdrop */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0.3, 0.15] }}
            transition={{ duration: 2.4, times: [0, 0.35, 0.7, 1], ease: "easeOut" }}
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(200,149,46,0.4) 0%, rgba(140,90,20,0.15) 25%, transparent 55%)",
            }}
          />

          {/* Aurora swirl - subtle rotating gradient */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: [0, 0.25, 0.1], rotate: 30 }}
            transition={{ duration: 3, ease: "easeOut" }}
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(200,149,46,0.18) 60deg, transparent 120deg, rgba(255,247,227,0.12) 200deg, transparent 280deg)",
              filter: "blur(40px)",
            }}
          />

          {/* Film grain overlay */}
          <div
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          {/* Centered stage */}
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="relative flex flex-col items-center">
              {/* Light shafts (god-rays) — emerge from nucleus on ignition */}
              {shafts.map((deg, i) => (
                <motion.div
                  key={`s-${i}`}
                  className="absolute"
                  style={{
                    top: 48,
                    left: "50%",
                    width: 2,
                    height: 600,
                    transformOrigin: "top center",
                    transform: `translateX(-50%) rotate(${deg}deg)`,
                    background:
                      "linear-gradient(180deg, rgba(255,247,227,0.6) 0%, rgba(200,149,46,0.3) 30%, transparent 70%)",
                    filter: "blur(2px)",
                  }}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: [0, 0.7, 0], scaleY: [0, 1, 1] }}
                  transition={{ duration: 1.4, delay: 0.95 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}

              {/* Act 2: Converging particles */}
              {particles.map((p, i) => (
                <motion.div
                  key={`p-${i}`}
                  className="absolute rounded-full"
                  style={{
                    top: 48,
                    left: "50%",
                    width: p.size,
                    height: p.size,
                    background: p.gold ? "#e0b048" : "#fff7e3",
                    boxShadow: p.bright
                      ? p.gold
                        ? "0 0 12px #c8952e, 0 0 4px #fff7e3"
                        : "0 0 10px #fff, 0 0 4px #e0b048"
                      : p.gold
                      ? "0 0 6px #c8952e"
                      : "0 0 4px #fff",
                  }}
                  initial={{ x: p.x, y: p.y, opacity: 0, scale: 0.5 }}
                  animate={{
                    x: [p.x, 0, 0],
                    y: [p.y, 0, 0],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.8, 0],
                  }}
                  transition={{
                    duration: 1.6,
                    delay: 0.3 + p.delay,
                    times: [0, 0.65, 1],
                    ease: [0.6, 0.05, 0.3, 1],
                  }}
                />
              ))}

              {/* Expanding shockwave rings */}
              {[0, 0.18, 0.36, 0.54].map((d, i) => (
                <motion.div
                  key={`r-${i}`}
                  className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{
                    top: 48,
                    left: "50%",
                    borderWidth: i === 0 ? 2 : 1,
                    borderStyle: "solid",
                    borderColor: i === 0 ? "rgba(255,247,227,0.7)" : "rgba(200,149,46,0.5)",
                  }}
                  initial={{ width: 60, height: 60, opacity: 0 }}
                  animate={{
                    width: [60, 520, 880],
                    height: [60, 520, 880],
                    opacity: [0, 0.85, 0],
                  }}
                  transition={{ duration: 1.8, delay: 0.95 + d, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}

              {/* Act 3: Logo nucleus */}
              <motion.div
                className="relative"
                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                animate={{
                  scale: [0, 1.25, 1, 1, 1, 1.3],
                  opacity: [0, 1, 1, 1, 1, 0],
                  rotate: [-45, 0, 0, 0, 0, 15],
                  y: [0, 0, 0, 0, 0, -160],
                  filter: [
                    "blur(8px)",
                    "blur(0px)",
                    "blur(0px)",
                    "blur(0px)",
                    "blur(0px)",
                    "blur(6px)",
                  ],
                }}
                transition={{
                  duration: 2.8,
                  times: [0, 0.32, 0.45, 0.7, 0.85, 1],
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div
                  className="relative w-28 h-28 rounded-[32px] overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg,#fff7e3 0%,#e0b048 35%,#c8952e 65%,#7a5818 100%)",
                    boxShadow:
                      "0 0 80px rgba(200,149,46,1), 0 0 160px rgba(200,149,46,0.6), 0 0 240px rgba(200,149,46,0.3), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -3px 10px rgba(0,0,0,0.4)",
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="text-6xl font-black leading-none"
                      style={{
                        fontFamily: "Sora, sans-serif",
                        color: "#1a1206",
                        textShadow:
                          "0 1px 0 rgba(255,255,255,0.5), 0 -1px 0 rgba(0,0,0,0.15)",
                      }}
                    >
                      A
                    </span>
                  </div>
                  {/* Sheen sweep across logo */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.95) 50%, transparent 70%)",
                    }}
                    initial={{ x: "-160%" }}
                    animate={{ x: "160%" }}
                    transition={{ duration: 1.0, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>

                {/* Burst sparks on ignition */}
                {burst.map((b, i) => (
                  <motion.div
                    key={`b-${i}`}
                    className="absolute top-1/2 left-1/2 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      width: b.size,
                      height: b.size,
                      background: i % 2 ? "#fff7e3" : "#e0b048",
                      boxShadow: "0 0 10px #c8952e",
                    }}
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{ x: b.x, y: b.y, opacity: [0, 1, 0], scale: [0.5, 1.2, 0] }}
                    transition={{ duration: 1.0, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                ))}
              </motion.div>

              {/* Act 4: Wordmark — letter-by-letter reveal */}
              <motion.div
                className="text-center"
                style={{ marginTop: 64 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.7, delay: 1.3, times: [0, 0.18, 0.75, 1] }}
              >
                <div
                  className="flex items-center justify-center gap-[0.04em] sm:gap-[0.06em]"
                  style={{ paddingLeft: "0.35em" }}
                >
                  {word.map((ch, i) => (
                    <motion.span
                      key={i}
                      className="text-2xl sm:text-3xl font-bold inline-block"
                      style={{
                        fontFamily: "Sora, sans-serif",
                        letterSpacing: "0.32em",
                        backgroundImage:
                          "linear-gradient(180deg,#fff7e3 0%,#ffffff 35%,#e0b048 75%,#c8952e 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        color: "transparent",
                        textShadow: "0 0 24px rgba(200,149,46,0.4)",
                      }}
                      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{
                        duration: 0.7,
                        delay: 1.35 + i * 0.06,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {ch}
                    </motion.span>
                  ))}
                </div>
                <motion.div
                  className="text-[9px] sm:text-[10px] text-white/45 mt-4 uppercase whitespace-nowrap"
                  style={{ letterSpacing: "0.42em", paddingLeft: "0.42em" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.85, ease: [0.16, 1, 0.3, 1] }}
                >
                  Premium · Teen · Payments
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Act 5: Final cinematic light sweep */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.7, 0] }}
            transition={{ duration: 0.85, delay: 2.15, times: [0, 0.15, 0.5, 1] }}
            style={{
              background:
                "linear-gradient(115deg, transparent 30%, rgba(255,247,227,0.5) 50%, transparent 70%)",
              mixBlendMode: "screen",
            }}
          />

          {/* Final iris-out vignette */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8] }}
            transition={{ duration: 0.6, delay: 2.4, ease: "easeIn" }}
            style={{
              background:
                "radial-gradient(circle at center, transparent 30%, #050507 80%)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
