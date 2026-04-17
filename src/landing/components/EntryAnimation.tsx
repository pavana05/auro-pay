import { motion } from "framer-motion";

interface EntryAnimationProps {
  /** Called once the cinematic intro completes. */
  onComplete: () => void;
}

/**
 * Cinematic entry sequence — black void → logo emerges with pulse → particle
 * burst → background materialises. Uses framer-motion only (no JS particle
 * physics) for a buttery-smooth 60fps cold-start.
 */
export default function EntryAnimation({ onComplete }: EntryAnimationProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#050608]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6, delay: 1.6 }}
      onAnimationComplete={onComplete}
      style={{ pointerEvents: "none" }}
    >
      {/* Background reveal */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(42 60% 18% / 0.6) 0%, hsl(220 25% 4%) 60%, #050608 100%)",
        }}
      />

      {/* Particle burst */}
      <div className="absolute left-1/2 top-1/2 h-1 w-1">
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * Math.PI * 2 + Math.random() * 0.4;
          const dist = 200 + Math.random() * 280;
          const tx = Math.cos(angle) * dist;
          const ty = Math.sin(angle) * dist;
          const size = 2 + Math.random() * 3;
          const isGold = i % 3 !== 0;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                background: isGold ? "#ffd97a" : "#fff4d6",
                boxShadow: `0 0 ${size * 2}px ${isGold ? "#c8952e" : "#ffffff"}`,
                left: -size / 2,
                top: -size / 2,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: tx, y: ty, opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
            />
          );
        })}
      </div>

      {/* Logo */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="grid h-20 w-20 place-items-center rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, #c8952e 0%, #e6b347 50%, #ffd97a 100%)",
          }}
          animate={{
            boxShadow: [
              "0 0 0px rgba(200,149,46,0)",
              "0 0 80px rgba(200,149,46,0.85)",
              "0 0 40px rgba(200,149,46,0.4)",
            ],
          }}
          transition={{ duration: 1.2, times: [0, 0.55, 1] }}
        >
          <span className="font-display text-3xl font-extrabold text-[#1a1208]">A</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
