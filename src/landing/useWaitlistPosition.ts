import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads the current waitlist count via the get_waitlist_count RPC and
 * returns a "position in line" number that's offset for marketing flair
 * (matches the same +12000 offset used on the landing counter).
 */
const POSITION_OFFSET = 12000;

export function useWaitlistPosition() {
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPosition = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_waitlist_count");
      if (error) throw error;
      if (typeof data === "number") {
        setPosition(data + POSITION_OFFSET);
        return data + POSITION_OFFSET;
      }
    } catch {
      /* swallow — we just won't show a position */
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  return { position, loading, fetchPosition };
}