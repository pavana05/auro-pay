import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setDiagnosticsFetch, setDiagnosticsGate } from "@/lib/app-diagnostics";

/** Returns whether the currently signed-in user has the 'admin' role. */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setLoading(true);
      setDiagnosticsFetch("admin-role", { state: "loading", detail: "Checking admin role" });
      setDiagnosticsGate("admin-guard", { state: "checking", detail: "Resolving admin access" });
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) {
          if (!cancelled) {
            setIsAdmin(false);
            setLoading(false);
            setDiagnosticsFetch("admin-role", { state: "skipped", detail: "No signed-in user" });
            setDiagnosticsGate("admin-guard", { state: "blocked", detail: "Anonymous user" });
          }
          return;
        }
        const { data, error: roleError } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (roleError) throw roleError;
        if (!cancelled) {
          setIsAdmin(!!data);
          setLoading(false);
          setDiagnosticsFetch("admin-role", { state: "success", detail: !!data ? "Admin confirmed" : "Not an admin" });
          setDiagnosticsGate("admin-guard", { state: !!data ? "open" : "blocked", detail: !!data ? "Admin access granted" : "Admin role missing" });
        }
      } catch (err: any) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
          setDiagnosticsFetch("admin-role", { state: "error", detail: err?.message || "Admin check failed" });
          setDiagnosticsGate("admin-guard", { state: "blocked", detail: err?.message || "Admin check failed" });
        }
      }
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return { isAdmin, loading };
}
