// Global guard: any signed-in user opening a payment screen without a Payment
// PIN set is bounced to /security?setup=1 so they can create one. After the PIN
// is set, SecurityPin redirects them on to /home (or /parent for parents).
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Routes that move money or initiate a charge — must require a PIN.
const PIN_PROTECTED_ROUTES = new Set<string>([
  "/pay",
  "/scan",
  "/quick-pay",
  "/add-money",
  "/parent/add-money",
  "/bill-payments",
  "/bill-split",
  "/recurring",
]);

const isPinProtected = (path: string) => {
  if (PIN_PROTECTED_ROUTES.has(path)) return true;
  // Nested money routes (e.g. /parent/add-money/x) — match by prefix on known parents.
  if (path.startsWith("/parent/add-money")) return true;
  return false;
};

const PinEnforcer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Cache PIN status per session so we don't refetch on every navigation.
  const pinSetRef = useRef<boolean | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (!isPinProtected(path)) return;
    if (pinSetRef.current === true) return; // already known to be set

    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("pin_hash")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const hasPin = !!profile?.pin_hash;
      pinSetRef.current = hasPin;
      if (!hasPin) {
        navigate("/security?setup=1", { replace: true });
      }
    })();

    return () => { cancelled = true; };
  }, [location.pathname, navigate]);

  // Reset cache on sign-out so a new user is re-checked.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        pinSetRef.current = null;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
};

export default PinEnforcer;
