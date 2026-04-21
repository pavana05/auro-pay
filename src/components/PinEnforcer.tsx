// Global guard: any signed-in user opening a payment screen without a Payment
// PIN set is bounced to /security?setup=1 so they can create one. After the PIN
// is set, SecurityPin redirects them on to /home (or /parent for parents).
//
// Honors the admin "PIN Required" toggle: when OFF, never force a PIN setup.
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { setDiagnosticsFetch, setDiagnosticsGate } from "@/lib/app-diagnostics";

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
  if (path.startsWith("/parent/add-money")) return true;
  return false;
};

const PinEnforcer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOn, loading } = useAppSettings();
  const pinSetRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (loading) {
      setDiagnosticsGate("pin", { state: "loading", detail: "Waiting for settings" });
      return;
    }
    // Admin globally disabled PIN requirement → skip enforcement.
    if (!isOn("pin_required")) {
      setDiagnosticsGate("pin", { state: "skipped", detail: "PIN requirement disabled" });
      return;
    }
    const path = location.pathname;
    if (!isPinProtected(path)) {
      setDiagnosticsGate("pin", { state: "open", detail: `Unprotected route: ${path}` });
      return;
    }
    if (pinSetRef.current === true) {
      setDiagnosticsGate("pin", { state: "open", detail: "Cached PIN present" });
      return;
    }

    let cancelled = false;
    (async () => {
      setDiagnosticsGate("pin", { state: "checking", detail: `Checking ${path}` });
      setDiagnosticsFetch("pin-profile", { state: "loading", detail: "Loading PIN status" });
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user || cancelled) {
          setDiagnosticsGate("pin", { state: "open", detail: "No signed-in user" });
          setDiagnosticsFetch("pin-profile", { state: "skipped", detail: "Anonymous user" });
          return;
        }
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("pin_hash")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (cancelled) return;
        const hasPin = !!profile?.pin_hash;
        pinSetRef.current = hasPin;
        setDiagnosticsFetch("pin-profile", { state: "success", detail: hasPin ? "PIN set" : "PIN missing" });
        if (!hasPin) {
          setDiagnosticsGate("pin", { state: "redirected", detail: "Redirecting to /security?setup=1" });
          navigate("/security?setup=1", { replace: true });
          return;
        }
        setDiagnosticsGate("pin", { state: "open", detail: "PIN verified" });
      } catch (err: any) {
        if (cancelled) return;
        setDiagnosticsFetch("pin-profile", { state: "error", detail: err?.message || "PIN check failed" });
        setDiagnosticsGate("pin", { state: "blocked", detail: err?.message || "PIN check failed" });
      }
    })();

    return () => { cancelled = true; };
  }, [location.pathname, navigate, loading, isOn]);

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
