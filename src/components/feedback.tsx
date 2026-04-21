// Standardised loading + empty-state primitives so every screen has the same
// rhythm. All skeletons use the global `.zen-shimmer` keyframes from index.css.
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/** Generic shimmering block. Compose to build screen skeletons. */
export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn("zen-shimmer rounded-[12px] bg-white/[0.04]", className)} />
);

/** Pre-built row skeleton used in lists (transaction rows, contacts, etc.). */
export const SkeletonRow = ({ className }: SkeletonProps) => (
  <div className={cn("flex items-center gap-3 p-3 rounded-[14px] bg-white/[0.02]", className)}>
    <Skeleton className="w-10 h-10 rounded-[12px]" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-2.5 w-16" />
    </div>
    <Skeleton className="h-3 w-14" />
  </div>
);

/** Card-shaped skeleton for hero panels (wallet balance, summary cards). */
export const SkeletonCard = ({ className }: SkeletonProps) => (
  <Skeleton className={cn("h-[140px] rounded-[20px]", className)} />
);

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Standard empty-state used inside lists and screens. Centred icon, title,
 * sentence-case description, optional CTA. Replace ad-hoc empty markup with
 * this component for visual rhythm.
 */
export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      "rounded-[22px] p-8 text-center border border-white/[0.05] flex flex-col items-center",
      className,
    )}
    style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5%))" }}
  >
    {icon && (
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: "rgba(200,149,46,0.08)", border: "1px solid rgba(200,149,46,0.2)" }}
      >
        {icon}
      </div>
    )}
    <h3 className="text-[14px] font-semibold text-white/80 mb-1">{title}</h3>
    {description && (
      <p className="text-[11px] text-white/40 leading-relaxed max-w-[260px] mb-4">{description}</p>
    )}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
