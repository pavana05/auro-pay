import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setDiagnosticsAuth, setDiagnosticsSessionResolved, setDiagnosticsUser } from "@/lib/app-diagnostics";

export function useAuthReady() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolveSession = async () => {
      setDiagnosticsAuth({ state: "loading", detail: "Resolving session" });
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessionError) throw sessionError;
        setSession(data.session ?? null);
        setReady(true);
        setError(null);
        setDiagnosticsSessionResolved(true);
        setDiagnosticsUser(data.session?.user?.id ?? null);
        setDiagnosticsAuth({
          state: data.session?.user ? "authenticated" : "unauthenticated",
          detail: data.session?.user ? "Session restored" : "No active session",
        });
      } catch (err: any) {
        if (!mounted) return;
        const message = err?.message || "Failed to resolve session";
        setError(message);
        setReady(true);
        setSession(null);
        setDiagnosticsSessionResolved(true);
        setDiagnosticsUser(null);
        setDiagnosticsAuth({ state: "error", detail: message });
      }
    };

    resolveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setReady(true);
      setError(null);
      setDiagnosticsSessionResolved(true);
      setDiagnosticsUser(nextSession?.user?.id ?? null);
      setDiagnosticsAuth({
        state: nextSession?.user ? "authenticated" : "unauthenticated",
        detail: event,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, ready, error };
}