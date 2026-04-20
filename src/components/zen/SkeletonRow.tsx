import { cn } from "@/lib/utils";

interface Props { className?: string; height?: number; rounded?: string; }

/** Skeleton block with gold-tinted shimmer (zen-skeleton CSS class). */
export const SkeletonRow = ({ className, height = 16, rounded = "rounded-[10px]" }: Props) => (
  <div
    className={cn("zen-skeleton", rounded, className)}
    style={{ height }}
    aria-hidden
  />
);

export const SkeletonBalanceCard = () => (
  <div className="zen-balance-card rounded-[24px] p-5 mx-5 mt-3">
    <SkeletonRow className="w-32" height={12} />
    <SkeletonRow className="w-48 mt-3" height={40} />
    <div className="flex gap-3 mt-4">
      <SkeletonRow className="flex-1" height={28} />
      <SkeletonRow className="flex-1" height={28} />
    </div>
  </div>
);

export default SkeletonRow;
