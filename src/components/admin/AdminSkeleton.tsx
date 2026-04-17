import { Skeleton } from "@/components/ui/skeleton";

/** Shape-matching skeletons for common admin layouts. */

export const StatCardSkeleton = () => (
  <div className="rounded-[14px] p-4" style={{ background: "rgba(13,14,18,0.7)", border: "1px solid rgba(200,149,46,0.1)" }}>
    <Skeleton className="h-3 w-20 mb-3 bg-white/[0.04]" />
    <Skeleton className="h-7 w-24 bg-white/[0.06]" />
  </div>
);

export const StatRowSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-3`}>
    {Array.from({ length: count }).map((_, i) => <StatCardSkeleton key={i} />)}
  </div>
);

export const TableSkeleton = ({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="rounded-[16px] overflow-hidden"
    style={{ background: "rgba(13,14,18,0.7)", border: "1px solid rgba(200,149,46,0.1)" }}>
    <div className="px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, borderBottom: "1px solid rgba(200,149,46,0.1)" }}>
      {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 bg-white/[0.04]" />)}
    </div>
    <div className="divide-y" style={{ borderColor: "rgba(200,149,46,0.06)" }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-4 py-3.5 grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="flex items-center gap-2">
              {c === 0 && <Skeleton className="w-8 h-8 rounded-full bg-white/[0.05] shrink-0" />}
              <Skeleton className="h-3 w-full bg-white/[0.04]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const CardGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-[16px] p-5" style={{ background: "rgba(13,14,18,0.7)", border: "1px solid rgba(200,149,46,0.1)" }}>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-full bg-white/[0.05]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3 bg-white/[0.05]" />
            <Skeleton className="h-2.5 w-1/2 bg-white/[0.03]" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-[10px] bg-white/[0.03] mb-3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1 rounded-[8px] bg-white/[0.03]" />
          <Skeleton className="h-8 flex-1 rounded-[8px] bg-white/[0.03]" />
        </div>
      </div>
    ))}
  </div>
);

export const ChartSkeleton = ({ height = 240 }: { height?: number }) => (
  <div className="rounded-[16px] p-5" style={{ background: "rgba(13,14,18,0.7)", border: "1px solid rgba(200,149,46,0.1)" }}>
    <Skeleton className="h-3 w-32 mb-4 bg-white/[0.05]" />
    <div className="flex items-end gap-2" style={{ height }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="flex-1 bg-white/[0.04]" style={{ height: `${30 + Math.random() * 70}%` }} />
      ))}
    </div>
  </div>
);
