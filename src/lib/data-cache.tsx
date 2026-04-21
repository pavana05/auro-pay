// In-memory TTL cache + useScreenData hook.
// Lets repeat visits to a screen render the previous payload immediately
// while a fresh fetch runs in the background. Cleared on auth changes.
import {
  createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

type Entry = { data: unknown; expires: number };

interface CacheCtx {
  get: <T,>(key: string) => T | null;
  set: <T,>(key: string, data: T, ttlMs?: number) => void;
  clear: (key?: string) => void;
}

const Ctx = createContext<CacheCtx | null>(null);

export const DataCacheProvider = ({ children }: { children: ReactNode }) => {
  const store = useRef<Record<string, Entry>>({});

  const get = useCallback(<T,>(key: string): T | null => {
    const e = store.current[key];
    if (!e) return null;
    if (Date.now() > e.expires) { delete store.current[key]; return null; }
    return e.data as T;
  }, []);

  const set = useCallback(<T,>(key: string, data: T, ttlMs = 30_000) => {
    store.current[key] = { data, expires: Date.now() + ttlMs };
  }, []);

  const clear = useCallback((key?: string) => {
    if (key) delete store.current[key];
    else store.current = {};
  }, []);

  // Drop everything on sign-out so a different user can't see cached data.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "USER_UPDATED") store.current = {};
    });
    return () => subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ get, set, clear }}>{children}</Ctx.Provider>;
};

export const useDataCache = (): CacheCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDataCache must be used inside <DataCacheProvider>");
  return ctx;
};

/**
 * Hook: read-through cache for a screen.
 * - Renders cached data instantly if present (skipping skeleton).
 * - Fetches fresh data in the background and updates state.
 * - `refetch()` forces a network call and refreshes the cache.
 */
export function useScreenData<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T>,
  ttlMs = 30_000,
) {
  const { get, set } = useDataCache();
  const cached = cacheKey ? get<T>(cacheKey) : null;
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState<boolean>(!cached && !!cacheKey);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (force = false) => {
    if (!cacheKey) return;
    if (!force) {
      const fresh = get<T>(cacheKey);
      if (fresh) { setData(fresh); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const res = await fetcher();
      set(cacheKey, res, ttlMs);
      setData(res);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [cacheKey]);

  return { data, loading, error, refetch: () => run(true), setData };
}
