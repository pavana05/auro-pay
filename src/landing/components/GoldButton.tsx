import { forwardRef, type ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost";

interface GoldButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: Variant;
  size?: "md" | "lg";
  shimmer?: boolean;
}

const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ variant = "primary", size = "md", shimmer = false, className, children, ...rest }, ref) => {
    const base =
      "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8952e]/60";
    const sizes = {
      md: "h-11 px-6 text-sm",
      lg: "h-[52px] px-8 text-base",
    };
    const variants: Record<Variant, string> = {
      primary:
        "text-[#1a1208] shadow-[0_8px_28px_rgba(200,149,46,0.45)] hover:shadow-[0_12px_36px_rgba(200,149,46,0.65)] hover:-translate-y-0.5",
      ghost:
        "border border-white/15 bg-white/[0.03] text-white backdrop-blur hover:bg-white/[0.08] hover:border-white/25",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={variant === "primary" ? { scale: 1.02 } : undefined}
        whileTap={{ scale: 0.97 }}
        className={cn(base, sizes[size], variants[variant], className)}
        style={
          variant === "primary"
            ? {
                background:
                  "linear-gradient(135deg, #c8952e 0%, #e6b347 50%, #ffd97a 100%)",
              }
            : undefined
        }
        {...(rest as React.ComponentProps<typeof motion.button>)}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
        {shimmer && variant === "primary" && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 w-1/2 -skew-x-12"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
            }}
            initial={{ x: "-150%" }}
            animate={{ x: "250%" }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
          />
        )}
      </motion.button>
    );
  },
);
GoldButton.displayName = "GoldButton";

export default GoldButton;
