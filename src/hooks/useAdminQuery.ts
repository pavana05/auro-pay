import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Shared admin data-fetching hook.
 *
 * Wraps any async fetcher (typically a Supabase query) with:
 *  - data / loading / error state
 *  - automatic toast on failure
 *  - manual `refetch()` for retry buttons
 *
 * Usage:
 *   const { data, loading, error, refetch } = useAdminQuery(
 *     async () => {
 *       const { data, error } = await supabase.from("foo").select("*");
 *       if (error) throw error;
 *       return data ?? [];
 *     },
 *     { label: "foo" }
 *   );
 */
export function useAdminQuery<T>(
  fetcher: () => Promise<T>,
  opts: { label?: string; deps?: ReadonlyArray<unknown>; enabled?: boolean } = {}
) {
  const { label = "data", deps = [], enabled = true } = opts;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);

  // Keep latest fetcher in a ref so we can refetch without forcing the consumer
  // to memoize their query function.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(e?.message || String(e));
      console.error(`[useAdminQuery:${label}]`, err);
      setError(err);
      toast.error(`Failed to load ${label}: ${err.message}`);
    } finally {
      setLoading(false);
    }
    // label is stable per-call-site; deps drive re-fetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);

  useEffect(() => {
    if (!enabled) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  return { data, loading, error, refetch: run, setData } as const;
}
