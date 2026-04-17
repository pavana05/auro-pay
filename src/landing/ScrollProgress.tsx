import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Thin gold scroll-progress bar fixed at the very top of the page.
 * Decorative, non-interactive. Spring-smoothed for buttery motion.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.4,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] origin-left pointer-events-none"
      style={{
        scaleX,
        background:
          "linear-gradient(90deg, transparent 0%, #c8952e 20%, #f0cc6a 50%, #c8952e 80%, transparent 100%)",
        boxShadow: "0 0 12px rgba(224,176,72,0.6), 0 0 24px rgba(200,149,46,0.4)",
      }}
    />
  );
}
