import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Polls the public get_waitlist_count() RPC. Adds a baseline of 12,500 so the
 * "Join X others" social-proof number always feels alive, even with low signups.
 */
const BASELINE = 12500;

export function useWaitlistCount(pollMs = 30_000) {
  const [count, setCount] = useState<number>(BASELINE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      const { data, error } = await supabase.rpc("get_waitlist_count");
      if (cancelled) return;
      if (!error && typeof data === "number") {
        setCount(BASELINE + data);
      }
      setLoaded(true);
    };
    fetchCount();
    const id = window.setInterval(fetchCount, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { count, loaded };
}
