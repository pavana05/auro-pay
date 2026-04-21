// Global enforcer: any signed-in non-admin user without verified KYC is bounced
// to /verify-kyc. Runs on every route change. Skips public/auth/admin routes.
//
// Honors the admin "KYC Required" toggle: when OFF, never force KYC.
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { setDiagnosticsFetch, setDiagnosticsGate } from "@/lib/app-diagnostics";

// Routes that must remain reachable even when KYC is not verified.
const ALLOWED_WITHOUT_KYC = new Set<string>([
  "/",
  "/auth",
  "/reset-password",
  "/verify-kyc",
  "/link-google",
  "/profile-setup",
  "/permissions",
  "/help",
  "/about",
  "/privacy",
  "/terms",
  "/data-safety",
  "/support",
  "/support-chat",
]);

const KycEnforcer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOn, loading } = useAppSettings();

  useEffect(() => {
    if (loading) {
      setDiagnosticsGate("kyc", { state: "loading", detail: "Waiting for settings" });
      return;
    }
    // Admin globally relaxed KYC → skip enforcement.
    if (!isOn("kyc_required")) {
      setDiagnosticsGate("kyc", { state: "skipped", detail: "KYC requirement disabled" });
      return;
    }

    const path = location.pathname;
    if (path.startsWith("/admin")) {
      setDiagnosticsGate("kyc", { state: "skipped", detail: "Admin route" });
      return;
    }
    if (ALLOWED_WITHOUT_KYC.has(path)) {
      setDiagnosticsGate("kyc", { state: "open", detail: `Public route: ${path}` });
      return;
    }

    let cancelled = false;
    (async () => {
      setDiagnosticsGate("kyc", { state: "checking", detail: `Checking ${path}` });
      setDiagnosticsFetch("kyc-profile", { state: "loading", detail: "Loading KYC status" });
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user || cancelled) {
          setDiagnosticsGate("kyc", { state: "open", detail: "No signed-in user" });
          setDiagnosticsFetch("kyc-profile", { state: "skipped", detail: "Anonymous user" });
          return;
        }
        const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (roleError) throw roleError;
        if (isAdmin || cancelled) {
          setDiagnosticsGate("kyc", { state: "open", detail: "Admin bypass" });
          setDiagnosticsFetch("kyc-profile", { state: "skipped", detail: "Admin user" });
          return;
        }
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("kyc_status")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (cancelled) return;
        setDiagnosticsFetch("kyc-profile", { state: "success", detail: profile?.kyc_status || "missing" });
        if (profile?.kyc_status !== "verified") {
          setDiagnosticsGate("kyc", { state: "redirected", detail: "Redirecting to /verify-kyc" });
          navigate("/verify-kyc", { replace: true });
          return;
        }
        setDiagnosticsGate("kyc", { state: "open", detail: "KYC verified" });
      } catch (err: any) {
        if (cancelled) return;
        setDiagnosticsFetch("kyc-profile", { state: "error", detail: err?.message || "KYC check failed" });
        setDiagnosticsGate("kyc", { state: "blocked", detail: err?.message || "KYC check failed" });
      }
    })();

    return () => { cancelled = true; };
  }, [location.pathname, navigate, loading, isOn]);

  return null;
};

export default KycEnforcer;
