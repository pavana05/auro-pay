import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

/**
 * PremiumHeading — shared headline treatment for landing sections.
 * - Blur-reveal entrance per line on scroll-into-view
 * - Optional platinum→gold gradient on the accent line
 * - Optional gold-glow underline that draws in + shimmer sweep
 * - Optional ambient halo that pulses gently behind the heading
 */

export type HeadingLine = {
  text: ReactNode;
  /** "gold" = platinum→gold gradient, "muted" = dim foreground/40, undefined = solid foreground */
  accent?: "gold" | "muted";
};

const PLATINUM_GOLD: CSSProperties = {
  backgroundImage:
    "linear-gradient(180deg, hsl(var(--platinum)) 0%, hsl(var(--foreground)) 30%, hsl(var(--primary)) 70%, hsl(var(--accent)) 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textShadow: "0 0 40px hsl(var(--primary) / 0.25)",
};

export default function PremiumHeading({
  lines,
  className = "",
  baseDelay = 0,
  underline = true,
  underlineAlign = "left",
}: {
  lines: HeadingLine[];
  className?: string;
  baseDelay?: number;
  underline?: boolean;
  underlineAlign?: "left" | "center" | "right";
}) {
  const totalRevealDelay = baseDelay + lines.length * 0.12 + 0.55;
  const alignClass =
    underlineAlign === "center"
      ? "mx-auto"
      : underlineAlign === "right"
      ? "ml-auto"
      : "";

  const haloAlignClass =
    underlineAlign === "center"
      ? "left-1/2 -translate-x-1/2"
      : underlineAlign === "right"
      ? "right-0"
      : "left-0";

  return (
    <h2
      className={
        "relative text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight " +
        className
      }
      style={{
        fontFamily: "Sora, sans-serif",
        letterSpacing: "-0.025em",
        lineHeight: 1.04,
      }}
    >
      {/* Soft gold halo — fades in after shimmer, then pulses gently forever */}
      <motion.span
        aria-hidden
        className={`pointer-events-none absolute -z-10 top-1/2 -translate-y-1/2 ${haloAlignClass}`}
        style={{
          width: "min(560px, 90%)",
          height: "min(280px, 110%)",
          background:
            "radial-gradient(ellipse at center, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.10) 35%, transparent 70%)",
          filter: "blur(28px)",
        }}
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{
          opacity: [0, 1, 0.7, 1, 0.75],
          scale: [0.85, 1.02, 0.98, 1.04, 1],
        }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{
          delay: baseDelay + lines.length * 0.12 + 0.55 + 1.6,
          duration: 6,
          times: [0, 0.18, 0.45, 0.72, 1],
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      />

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
            <span className="text-foreground/40">{line.text}</span>
          ) : (
            line.text
          )}
        </motion.span>
      ))}

      {underline && (
        <motion.span
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{
            delay: totalRevealDelay,
            duration: 1.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={`relative block h-[2px] mt-5 rounded-full overflow-hidden ${alignClass}`}
          style={{
            transformOrigin:
              underlineAlign === "right"
                ? "right center"
                : underlineAlign === "center"
                ? "center"
                : "left center",
            width: "min(180px, 35%)",
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.55) 30%, hsl(var(--primary-bright)) 55%, hsl(var(--primary) / 0.55) 80%, transparent 100%)",
            boxShadow:
              "0 0 18px hsl(var(--primary) / 0.55), 0 0 36px hsl(var(--primary) / 0.35)",
          }}
        >
          {/* One-shot shimmer sweep */}
          <motion.span
            aria-hidden
            initial={{ x: "-120%", opacity: 0 }}
            whileInView={{ x: "120%", opacity: [0, 1, 1, 0] }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{
              delay: totalRevealDelay + 0.95,
              duration: 1.2,
              ease: [0.4, 0, 0.2, 1],
              times: [0, 0.15, 0.85, 1],
            }}
            className="absolute inset-y-0 w-1/2 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, hsl(var(--platinum) / 0.95) 50%, transparent 100%)",
              filter: "blur(1px)",
            }}
          />
        </motion.span>
      )}
    </h2>
  );
}
