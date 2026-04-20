import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

/**
 * PremiumHeading — shared headline treatment for landing sections.
 * - Blur-reveal entrance per line on scroll-into-view
 * - Optional platinum→gold gradient on the accent line
 *
 * Usage:
 *   <PremiumHeading
 *     lines={[
 *       { text: "Bank-grade security." },
 *       { text: "Built for parents.", accent: "muted" }, // dim line
 *     ]}
 *   />
 *   <PremiumHeading
 *     lines={[
 *       { text: "Spend smart." },
 *       { text: "Track every rupee.", accent: "gold" }, // platinum→gold gradient
 *     ]}
 *   />
 */

export type HeadingLine = {
  text: ReactNode;
  /** "gold" = platinum→gold gradient, "muted" = dim white/40, undefined = solid white */
  accent?: "gold" | "muted";
};

const PLATINUM_GOLD: CSSProperties = {
  backgroundImage:
    "linear-gradient(180deg,#fff7e3 0%,#ffffff 30%,#e0b048 70%,#c8952e 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textShadow: "0 0 40px rgba(200,149,46,0.25)",
};

export default function PremiumHeading({
  lines,
  className = "",
  baseDelay = 0,
}: {
  lines: HeadingLine[];
  className?: string;
  baseDelay?: number;
}) {
  return (
    <h2
      className={
        "text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight " +
        className
      }
      style={{
        fontFamily: "Sora, sans-serif",
        letterSpacing: "-0.025em",
        lineHeight: 1.04,
      }}
    >
      {lines.map((line, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{
            delay: baseDelay + i * 0.12,
            duration: 0.85,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="block"
        >
          {line.accent === "gold" ? (
            <span style={PLATINUM_GOLD}>{line.text}</span>
          ) : line.accent === "muted" ? (
            <span className="text-white/40">{line.text}</span>
          ) : (
            line.text
          )}
        </motion.span>
      ))}
    </h2>
  );
}
