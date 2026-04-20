import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Stagger delay between children, seconds */
  stagger?: number;
  /** Initial Y offset, px */
  y?: number;
  className?: string;
}

/**
 * Wrap a list / grid in motion stagger. Each direct child becomes a
 * <motion.div> with fade-up animation. Honors prefers-reduced-motion via
 * Framer's MotionConfig (set globally in Landing/page roots).
 */
export const StaggerList = ({ children, stagger = 0.05, y = 16, className }: Props) => (
  <motion.div
    initial="hidden"
    animate="show"
    variants={{
      hidden: {},
      show: { transition: { staggerChildren: stagger } },
    }}
    className={className}
  >
    {Array.isArray(children) ? children.map((c, i) => (
      <motion.div
        key={i}
        variants={{
          hidden: { opacity: 0, y },
          show: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 320, damping: 26 },
          },
        }}
      >
        {c}
      </motion.div>
    )) : (
      <motion.div
        variants={{
          hidden: { opacity: 0, y },
          show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 26 } },
        }}
      >
        {children}
      </motion.div>
    )}
  </motion.div>
);

export default StaggerList;
