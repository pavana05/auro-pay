import { AlertTriangle, RefreshCw } from "lucide-react";
import { formatTimeAgo, useNow } from "@/hooks/useAdminQuery";

const C = {
  cardBg: "rgba(13,14,18,0.7)",
  border: "rgba(200,149,46,0.10)",
  primary: "#c8952e",
  success: "#22c55e",
  danger: "#ef4444",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.3)",
};

/**
 * Shared error/empty state for admin pages backed by `useAdminQuery`.
 * Renders an inline error card with a Retry button, so failures stop
 * showing a permanent skeleton.
 */
export function AdminQueryError({
  error,
  onRetry,
  label = "data",
}: {
  error: Error | unknown;
  onRetry: () => void;
  label?: string;
}) {
  const msg = error instanceof Error ? error.message : String(error || "Unknown error");
  return (
    <div
      className="rounded-[16px] p-6 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ background: `${C.danger}10`, border: `1px solid ${C.danger}33` }}
    >
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
        style={{ background: `${C.danger}20`, border: `1px solid ${C.danger}44` }}
      >
        <AlertTriangle className="w-5 h-5" style={{ color: C.danger }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>
          Failed to load {label}
        </p>
        <p className="text-xs mt-1 break-words" style={{ color: C.textSecondary }}>
          {msg}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shrink-0 transition-all hover:scale-[1.02] active:scale-95"
        style={{ background: C.primary, color: "#0a0c0f" }}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  );
}

export function AdminQueryLoading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-[12px] animate-pulse"
          style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}
        />
      ))}
    </div>
  );
}

/**
 * Pill that shows "Updated Xs ago" with a manual refresh button.
 * Re-renders every 5s so the relative time stays accurate.
 */
export function AdminQueryStatus({
  lastUpdatedAt,
  loading,
  onRefresh,
}: {
  lastUpdatedAt: number | null;
  loading?: boolean;
  onRefresh: () => void;
}) {
  useNow(5000);
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{ background: `${C.success}10`, color: C.success, border: `1px solid ${C.success}33` }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: C.success, boxShadow: `0 0 6px ${C.success}` }}
        />
        Updated {formatTimeAgo(lastUpdatedAt)}
      </span>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50"
        style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}33` }}
        title="Refresh now"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}
