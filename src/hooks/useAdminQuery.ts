import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Shared admin data-fetching hook.
 *
 * Wraps any async fetcher (typically a Supabase query) with:
 *  - data / loading / error state
 *  - automatic toast on failure
 *  - manual `refetch()` for retry buttons
 *  - `lastUpdatedAt` timestamp (ms) of the last successful fetch
 *  - optional `refetchInterval` (ms) to auto-poll for fresh data
 *
 * Usage:
 *   const { data, loading, error, refetch, lastUpdatedAt } = useAdminQuery(
 *     async () => {
 *       const { data, error } = await supabase.from("foo").select("*");
 *       if (error) throw error;
 *       return data ?? [];
 *     },
 *     { label: "foo", refetchInterval: 30_000 }
 *   );
 */
export function useAdminQuery<T>(
  fetcher: () => Promise<T>,
  opts: {
    label?: string;
    deps?: ReadonlyArray<unknown>;
    enabled?: boolean;
    /** Auto-poll interval in ms. 0 / undefined disables polling. */
    refetchInterval?: number;
    /** Pause polling when document is hidden. Default: true. */
    pauseWhenHidden?: boolean;
  } = {}
) {
  const { label = "data", deps = [], enabled = true, refetchInterval = 0, pauseWhenHidden = true } = opts;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Track in-flight requests so background polls don't clobber a manual refetch.
  const reqIdRef = useRef(0);

  const run = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const myReq = ++reqIdRef.current;
      if (!opts.silent) setLoading(true);
      setError(null);
      try {
        const result = await fetcherRef.current();
        if (reqIdRef.current !== myReq) return; // stale
        setData(result);
        setLastUpdatedAt(Date.now());
      } catch (e: any) {
        if (reqIdRef.current !== myReq) return;
        const err = e instanceof Error ? e : new Error(e?.message || String(e));
        console.error(`[useAdminQuery:${label}]`, err);
        setError(err);
        if (!opts.silent) toast.error(`Failed to load ${label}: ${err.message}`);
      } finally {
        if (reqIdRef.current === myReq && !opts.silent) setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [label]
  );

  // Initial + dep-driven fetch
  useEffect(() => {
    if (!enabled) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  // Auto-poll
  useEffect(() => {
    if (!enabled || !refetchInterval || refetchInterval <= 0) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (pauseWhenHidden && typeof document !== "undefined" && document.hidden) return;
        run({ silent: true });
      }, refetchInterval);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };

    start();

    const onVis = () => {
      if (!pauseWhenHidden) return;
      if (document.hidden) {
        stop();
      } else {
        // Refresh immediately on return, then resume polling.
        run({ silent: true });
        start();
      }
    };
    if (pauseWhenHidden && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
    return () => {
      stop();
      if (pauseWhenHidden && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }, [enabled, refetchInterval, pauseWhenHidden, run]);

  return { data, loading, error, refetch: run, setData, lastUpdatedAt } as const;
}

/** Format a timestamp as "Xs ago" / "Xm ago" / "Xh ago". */
export function formatTimeAgo(ts: number | null): string {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Re-renders every `intervalMs` so relative timestamps stay fresh. */
export function useNow(intervalMs = 5000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(i);
  }, [intervalMs]);
}
