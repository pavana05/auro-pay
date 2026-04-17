import { useRef, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

interface PressTooltipProps {
  /** Tooltip content. Pass null/empty string to disable. */
  label: ReactNode;
  /** Wrapped child (the bubble being long-pressed) */
  children: ReactNode;
  /** Optional className for the outer wrapper */
  className?: string;
  /** Long-press duration in ms (default 500) */
  delay?: number;
  /** Auto-dismiss after this many ms (default 1800) */
  visibleMs?: number;
}

/**
 * Long-press to reveal a small tooltip above the target.
 * - Mobile: 500 ms long-press triggers the tooltip and suppresses the
 *   subsequent click so users don't accidentally pay.
 * - Desktop: keyboard / mouse events still fire normally.
 */
const PressTooltip = ({ label, children, className, delay = 500, visibleMs = 1800 }: PressTooltipProps) => {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const triggered = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  const start = useCallback(() => {
    if (!label) return;
    triggered.current = false;
    clear();
    timer.current = window.setTimeout(() => {
      triggered.current = true;
      haptic.medium();
      setOpen(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setOpen(false), visibleMs);
    }, delay);
  }, [clear, delay, visibleMs, label]);

  const end = useCallback(() => clear(), [clear]);

  // Suppress click after a long-press triggered the tooltip
  const onClickCapture = (e: React.MouseEvent) => {
    if (triggered.current) {
      e.preventDefault();
      e.stopPropagation();
      triggered.current = false;
    }
  };

  return (
    <div
      className={`relative ${className || ""}`}
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={end}
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={end}
      onContextMenu={(e) => e.preventDefault()}
      onClickCapture={onClickCapture}
    >
      {children}
      <AnimatePresence>
        {open && label && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 360, damping: 24 }}
            className="absolute left-1/2 -top-1 -translate-x-1/2 -translate-y-full z-50 pointer-events-none"
          >
            <div
              className="px-3 py-1.5 rounded-[10px] text-[10px] font-bold whitespace-nowrap font-sora"
              style={{
                background: "linear-gradient(135deg, hsl(220 22% 10%), hsl(220 25% 6%))",
                color: "hsl(42 78% 55%)",
                border: "1px solid hsl(42 78% 55% / 0.4)",
                boxShadow: "0 8px 24px -8px hsl(42 78% 55% / 0.5), 0 0 0 1px hsl(42 78% 55% / 0.15)",
              }}
            >
              {label}
              {/* Caret */}
              <span
                className="absolute left-1/2 -bottom-[5px] -translate-x-1/2 w-2 h-2 rotate-45"
                style={{
                  background: "hsl(220 25% 6%)",
                  borderRight: "1px solid hsl(42 78% 55% / 0.4)",
                  borderBottom: "1px solid hsl(42 78% 55% / 0.4)",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PressTooltip;
