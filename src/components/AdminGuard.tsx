import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/**
 * Wraps every /admin/* route. Allows admins through; redirects everyone
 * else. RLS is still the source of truth — this is UX hardening so
 * non-admins never see an empty admin shell.
 *
 * Behavior:
 *  - Loading: render nothing (avoids a flash of admin chrome).
 *  - Signed-out: redirect to /admin/login.
 *  - Signed-in non-admin: log a probe attempt to audit_logs, toast,
 *    and redirect to /.
 *  - Admin: render children.
 */
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useIsAdmin();
  const location = useLocation();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  // Only log one probe per signed-in user per path per mount.
  const probedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!session);

      if (!session) {
        toast.error("Please sign in to access the admin panel.");
        return;
      }
      if (!isAdmin) {
        toast.error("Admin access only.");
        const probeKey = `${session.user.id}:${location.pathname}`;
        if (probedRef.current === probeKey) return;
        probedRef.current = probeKey;
        // Best-effort audit log via edge function (uses service role to
        // bypass admin-only INSERT policy on audit_logs).
        try {
          await supabase.functions.invoke("admin-log-probe", {
            body: { path: location.pathname },
          });
        } catch {
          /* ignore — never block the redirect */
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loading, isAdmin, location.pathname]);

  if (loading || hasSession === null) return null;

  if (!isAdmin) {
    // Signed-out → dedicated admin login. Signed-in non-admin → public root.
    const target = hasSession ? "/" : "/admin/login";
    return <Navigate to={target} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default AdminGuard;
