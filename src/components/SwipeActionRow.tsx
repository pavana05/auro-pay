import { ReactNode, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Eye, AlertTriangle } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface SwipeActionRowProps {
  children: ReactNode;
  onDetails: () => void;
  onDispute: () => void;
  /** Optional class for inner row container */
  className?: string;
}

const ACTION_WIDTH = 76; // each button width
const TOTAL = ACTION_WIDTH * 2;
const SNAP_THRESHOLD = ACTION_WIDTH; // distance after which row snaps open

/**
 * Swipe-left to reveal Details (gold) + Dispute (red) action buttons.
 * - Touch + mouse drag supported.
 * - Tap when open closes the row instead of triggering the inner click.
 */
const SwipeActionRow = ({ children, onDetails, onDispute, className }: SwipeActionRowProps) => {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);

  // Action buttons fade-in as the user swipes
  const actionsOpacity = useTransform(x, [-TOTAL, -10, 0], [1, 0.2, 0]);

  const snapTo = useCallback((target: number) => {
    animate(x, target, { type: "spring", stiffness: 320, damping: 32 });
    setOpen(target !== 0);
  }, [x]);

  const onDragEnd = (_e: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    draggingRef.current = false;
    const current = x.get();
    // Velocity-aware snap
    if (info.velocity.x < -300 || current < -SNAP_THRESHOLD) {
      haptic.light();
      snapTo(-TOTAL);
    } else if (info.velocity.x > 300 || current > -SNAP_THRESHOLD / 2) {
      snapTo(0);
    } else {
      snapTo(current < -SNAP_THRESHOLD ? -TOTAL : 0);
    }
  };

  // Suppress accidental taps while open or after a drag
  const onClickCapture = (e: React.MouseEvent) => {
    if (open || draggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      snapTo(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons (under) */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-stretch z-0"
        style={{ opacity: actionsOpacity }}
        aria-hidden={!open}
      >
        <button
          onClick={(e) => { e.stopPropagation(); haptic.light(); snapTo(0); onDetails(); }}
          className="flex flex-col items-center justify-center gap-0.5 font-sora active:opacity-80"
          style={{
            width: ACTION_WIDTH,
            background: "linear-gradient(135deg, hsl(42 78% 55%), hsl(36 80% 48%))",
            color: "hsl(220 25% 6%)",
          }}
        >
          <Eye className="w-4 h-4" strokeWidth={2.4} />
          <span className="text-[9px] font-bold tracking-wide">Details</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); haptic.medium(); snapTo(0); onDispute(); }}
          className="flex flex-col items-center justify-center gap-0.5 font-sora active:opacity-80"
          style={{
            width: ACTION_WIDTH,
            background: "linear-gradient(135deg, hsl(0 72% 51%), hsl(0 70% 42%))",
            color: "white",
          }}
        >
          <AlertTriangle className="w-4 h-4" strokeWidth={2.4} />
          <span className="text-[9px] font-bold tracking-wide">Dispute</span>
        </button>
      </motion.div>

      {/* Foreground row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -TOTAL, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        onDragStart={(e) => {
          draggingRef.current = true;
          startXRef.current = (e as TouchEvent).touches?.[0]?.clientX ?? (e as MouseEvent).clientX ?? 0;
        }}
        onDragEnd={onDragEnd}
        style={{ x }}
        className={`relative z-10 ${className || ""}`}
        onClickCapture={onClickCapture}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeActionRow;
