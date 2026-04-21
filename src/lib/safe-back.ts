// Safe back-navigation: navigate(-1) breaks for users who land on a page
// from a deep link, push notification, or hard refresh (no prior history).
// useSafeBack() returns a function that goes back when possible, otherwise
// routes to a sensible fallback (parent home for /parent/*, teen home elsewhere).
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Returns a `back()` function that:
 *  - calls navigate(-1) if the browser has prior in-app history
 *  - otherwise falls back to a route based on the current path:
 *      /parent/* → /parent
 *      /admin/*  → /admin
 *      everything else → /home
 *  - accepts an explicit fallback override.
 */
export function useSafeBack(fallback?: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    // window.history.length > 1 means there's at least one prior entry in this tab.
    // We also gate on the back-forward navigation type — a user that pasted a URL
    // into a fresh tab still has length === 1 here.
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;

    if (hasHistory) {
      navigate(-1);
      return;
    }

    if (fallback) {
      navigate(fallback, { replace: true });
      return;
    }

    const path = location.pathname;
    if (path.startsWith("/parent")) navigate("/parent", { replace: true });
    else if (path.startsWith("/admin")) navigate("/admin", { replace: true });
    else navigate("/home", { replace: true });
  }, [navigate, location.pathname, fallback]);
}
