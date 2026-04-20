import { forwardRef, useState, MouseEvent, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: "primary" | "soft" | "ghost";
}

interface Ripple { id: number; x: number; y: number; size: number; }

/**
 * Premium primary button with click ripple, scale-press, and haptic feedback.
 * Use anywhere a CTA needs maximum tactile feel.
 */
export const RippleButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", className, onClick, children, disabled, ...rest }, ref) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const handle = (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      haptic.light();
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const id = Date.now();
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      setRipples(prev => [...prev, { id, x, y, size }]);
      window.setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 550);
      onClick?.(e);
    };

    const styles = {
      primary: "zen-action-primary text-primary-foreground",
      soft: "zen-action-soft text-primary",
      ghost: "zen-action-neutral text-foreground",
    }[variant];

    return (
      <button
        ref={ref}
        onClick={handle}
        disabled={disabled}
        className={cn(
          "relative overflow-hidden inline-flex items-center justify-center gap-2 font-semibold rounded-[14px] px-5 h-12 text-sm transition-transform active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
          styles,
          className,
        )}
        {...rest}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
        {ripples.map(r => (
          <span
            key={r.id}
            className="absolute rounded-full bg-white/25 pointer-events-none"
            style={{
              left: r.x, top: r.y, width: r.size, height: r.size,
              animation: "zen-ripple 0.5s ease-out forwards",
            }}
          />
        ))}
        <style>{`@keyframes zen-ripple { to { transform: scale(2.6); opacity: 0; } }`}</style>
      </button>
    );
  },
);
RippleButton.displayName = "RippleButton";

export default RippleButton;
