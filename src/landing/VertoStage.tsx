import { motion, useReducedMotion } from "framer-motion";
import PhoneMockup from "./PhoneMockup";

/**
 * Verto-inspired hero stage:
 *  - Giant ghost wordmark behind the phone
 *  - Tilted PhoneMockup (home screen) as the centerpiece
 *  - 4 floating "feature" chips orbiting the phone
 *
 * Palette stays in the project's dark + gold scheme — no green/lime.
 *
 * Used by Landing Hero, OnboardingScreen, and AuthScreen for a consistent
 * brand-forward visual identity.
 */
type Variant = "hero" | "compact";

type ChipDef = {
  label: string;
  /** "dark" = inverted gold-on-black filled chip, "light" = white pill, "outline" = ghost */
  tone: "dark" | "light" | "outline";
  /** position relative to stage as percentages */
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotate?: number;
  delay?: number;
};

const CHIPS: ChipDef[] = [
  { label: "pocket money", tone: "light",   top: "12%",    left: "2%",   rotate: -4, delay: 1.4 },
  { label: "UPI",          tone: "dark",    top: "30%",    right: "4%",  rotate: 5,  delay: 1.55 },
  { label: "rewards",      tone: "light",   bottom: "26%", right: "0%",  rotate: -3, delay: 1.7 },
  { label: "parent-approved", tone: "outline", bottom: "10%", left: "4%", rotate: 4, delay: 1.85 },
];

export default function VertoStage({
  variant = "hero",
  wordmark = "AURO",
  screen = "home",
  className = "",
}: {
  variant?: Variant;
  wordmark?: string;
  screen?: "home" | "scan" | "kyc" | "parent" | "send" | "savings" | "analytics";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const isHero = variant === "hero";

  const wordmarkSize = isHero
    ? "clamp(140px, 22vw, 280px)"
    : "clamp(96px, 28vw, 180px)";

  const phoneScale = isHero ? 1 : 0.78;

  return (
    <div
      className={`relative w-full flex items-center justify-center ${className}`}
      style={{ minHeight: isHero ? 560 : 420 }}
    >
      {/* Ambient gold radial — anchors the composition */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,149,46,0.18), transparent 70%)",
        }}
      />

      {/* GIANT GHOST WORDMARK — behind the phone */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
      >
        <span
          className="font-black tracking-tighter leading-none"
          style={{
            fontFamily: "Sora, sans-serif",
            fontSize: wordmarkSize,
            // Dark + gold: subtle gold gradient against the dark bg, very low opacity
            background:
              "linear-gradient(180deg, rgba(255,231,170,0.10) 0%, rgba(200,149,46,0.18) 50%, rgba(200,149,46,0.04) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.06em",
            // Very faint outline to keep the ghost legible against gradients
            WebkitTextStroke: "1px rgba(200,149,46,0.06)",
          }}
        >
          {wordmark}
        </span>
      </div>

      {/* TILTED PHONE — the centerpiece */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: -2, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, rotate: -8, scale: 1 }}
        transition={{
          delay: 0.3,
          duration: 1.0,
          type: "spring",
          stiffness: 60,
          damping: 16,
        }}
        className="relative z-10"
        style={{ perspective: 1400 }}
      >
        <motion.div
          animate={reduceMotion ? {} : { y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            transformStyle: "preserve-3d",
            // Static editorial tilt (matches reference image)
            transform: "rotateY(-12deg) rotateX(6deg) rotateZ(-6deg)",
            // Long dramatic shadow under the phone, gold tinted
            filter:
              "drop-shadow(0 50px 60px rgba(0,0,0,0.65)) drop-shadow(0 20px 30px rgba(200,149,46,0.18))",
          }}
        >
          <PhoneMockup screen={screen} scale={phoneScale} />
        </motion.div>
      </motion.div>

      {/* FLOATING CHIPS — orbit the phone */}
      {CHIPS.map((chip, i) => (
        <FloatingChip key={i} chip={chip} reduceMotion={reduceMotion} index={i} />
      ))}
    </div>
  );
}

function FloatingChip({
  chip,
  reduceMotion,
  index,
}: {
  chip: ChipDef;
  reduceMotion: boolean | null;
  index: number;
}) {
  const styles = chipStyles(chip.tone);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.85, rotate: chip.rotate ?? 0 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: chip.rotate ?? 0 }}
      transition={{
        delay: chip.delay ?? 1.2 + index * 0.12,
        type: "spring",
        stiffness: 220,
        damping: 16,
      }}
      whileHover={{ scale: 1.06, y: -3 }}
      className="absolute z-20 pointer-events-auto"
      style={{
        top: chip.top,
        bottom: chip.bottom,
        left: chip.left,
        right: chip.right,
      }}
    >
      <motion.div
        animate={
          reduceMotion ? {} : { y: [0, -6, 0, 4, 0] }
        }
        transition={{
          duration: 6 + index * 0.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.4,
        }}
        className="px-4 py-2 rounded-full text-[12px] sm:text-[13px] font-semibold whitespace-nowrap"
        style={styles}
      >
        {chip.label}
      </motion.div>
    </motion.div>
  );
}

function chipStyles(tone: ChipDef["tone"]): React.CSSProperties {
  switch (tone) {
    case "dark":
      // Deep ink + gold border, gold text — feels like a coin
      return {
        background:
          "linear-gradient(135deg, rgba(15,14,12,0.98), rgba(26,18,6,0.98))",
        color: "#e0b048",
        border: "1px solid rgba(200,149,46,0.55)",
        boxShadow:
          "0 12px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,231,170,0.12)",
        backdropFilter: "blur(8px)",
      };
    case "light":
      // Bright cream pill with gold ink — high-contrast accent
      return {
        background:
          "linear-gradient(180deg, #fffaf0, #f5e6c5)",
        color: "#1a1206",
        border: "1px solid rgba(200,149,46,0.35)",
        boxShadow:
          "0 12px 28px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.4) inset",
      };
    case "outline":
    default:
      // Glassy outline with gold ring
      return {
        background: "rgba(20,20,25,0.55)",
        color: "rgba(255,231,170,0.92)",
        border: "1px solid rgba(200,149,46,0.4)",
        boxShadow:
          "0 10px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,231,170,0.08)",
        backdropFilter: "blur(12px)",
      };
  }
}
