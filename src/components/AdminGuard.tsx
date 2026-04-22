import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wraps every /admin/* route. Allows admins through; redirects everyone
 * else. RLS is still the source of truth — this is UX hardening so
 * non-admins never see an empty admin shell.
 *
 * Behavior:
 *  - Loading: render a visible spinner (avoids flash of admin chrome).
 *  - Signed-out: redirect to /admin/login.
 *  - Signed-in non-admin: log a probe attempt, toast, redirect to /.
 *  - Admin: render children.
 *
 * Uses getSession() (local, cheap, never hangs) instead of getUser()
 * (network call that can stall), and runs the role RPC inline so we
 * don't depend on a separate hook that might never resolve.
 */
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "no-session" | "not-admin" | "admin">("loading");
  const probedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // getSession is synchronous against localStorage — never hangs.
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session?.user) {
          setState("no-session");
          return;
        }

        // We have a session — check the admin role.
        const { data: isAdmin, error } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        });
        if (cancelled) return;

        if (error || !isAdmin) {
          setState("not-admin");
          // Best-effort probe log — don't block redirect.
          const probeKey = `${session.user.id}:${location.pathname}`;
          if (probedRef.current !== probeKey) {
            probedRef.current = probeKey;
            supabase.functions
              .invoke("admin-log-probe", { body: { path: location.pathname } })
              .catch(() => {});
          }
          toast.error("Admin access only.");
          return;
        }

        setState("admin");
      } catch (err) {
        if (cancelled) return;
        // Fail closed on any unexpected error.
        console.error("[AdminGuard] check failed", err);
        setState("no-session");
      }
    };

    check();

    // Re-check on auth state changes (sign-in/sign-out from another tab).
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) check();
    });

    // Hard timeout: if for any reason the check never resolves within 8s,
    // bounce to the login screen instead of leaving the user on a spinner.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setState((prev) => (prev === "loading" ? "no-session" : prev));
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [location.pathname]);

  if (state === "loading") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ background: "#0a0c0f", color: "#c8952e" }}
      >
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(200,149,46,0.2)", borderTopColor: "#c8952e" }}
        />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          Verifying admin access…
        </p>
      </div>
    );
  }

  if (state === "no-session") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (state === "not-admin") {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default AdminGuard;
