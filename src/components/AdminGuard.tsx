import { useEffect, useRef } from "react";
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
  // Ensure we only log one probe per mount/path so a single visit doesn't
  // spam audit_logs while React resolves auth state.
  const probedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        toast.error("Please sign in to access the admin panel.");
        return;
      }
      if (!isAdmin) {
        toast.error("Admin access only.");
        // Log unauthorized probe via edge function (uses service role to
        // bypass admin-only INSERT policy on audit_logs).
        const probeKey = `${session.user.id}:${location.pathname}`;
        if (probedRef.current === probeKey) return;
        probedRef.current = probeKey;
        try {
          await supabase.functions.invoke("admin-log-probe", {
            body: { path: location.pathname },
          });
        } catch {
          /* best-effort; don't block redirect */
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loading, isAdmin, location.pathname]);

  if (loading) return null;

  if (!isAdmin) {
    // Signed-out users go to the dedicated admin login; signed-in
    // non-admins get bounced to the public landing.
    // We can't read session synchronously here, so use the hook state:
    // if useIsAdmin says false AND there's no auth, the effect above
    // has already toasted; sending non-admins to /admin/login would
    // be confusing, so signed-in non-admins go to /.
    return <AdminRedirect from={location.pathname} />;
  }

  return <>{children}</>;
};

/**
 * Decides between /admin/login (signed-out) vs / (signed-in non-admin)
 * once we've checked the session synchronously via getSession().
 */
const AdminRedirect = ({ from }: { from: string }) => {
  // Default to /admin/login; if a session exists, the effect in the
  // parent will toast and we still want signed-in non-admins out of
  // the admin namespace — sending them to / matches the original UX.
  // We check session via a tiny inline component below.
  return <SessionAwareRedirect from={from} />;
};

const SessionAwareRedirect = ({ from }: { from: string }) => {
  // Synchronous-ish: we read from supabase.auth's cached session.
  // @ts-expect-error — accessing internal sync cache for redirect target only
  const cached = supabase.auth?.currentSession || null;
  const target = cached ? "/" : "/admin/login";
  return <Navigate to={target} replace state={{ from }} />;
};

export default AdminGuard;
