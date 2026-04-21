import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/**
 * Wraps every /admin/* route. Allows admins through; redirects everyone
 * else to / with a toast. RLS is still the source of truth — this is UX
 * hardening so non-admins never see an empty admin shell.
 *
 * Behavior:
 *  - Loading: render nothing (avoids a flash of admin chrome).
 *  - Signed-out: redirect to /auth.
 *  - Signed-in non-admin: toast + redirect to /.
 *  - Admin: render children.
 */
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useIsAdmin();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        toast.error("Please sign in to access the admin panel.");
      } else if (!isAdmin) {
        toast.error("Admin access only.");
      }
    })();
    return () => { cancelled = true; };
  }, [loading, isAdmin]);

  if (loading) return null;

  if (!isAdmin) {
    // Send signed-out users to /auth, signed-in non-admins to /.
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default AdminGuard;
