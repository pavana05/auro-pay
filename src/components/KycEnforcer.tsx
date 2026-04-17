// Global enforcer: any signed-in non-admin user without verified KYC is bounced
// to /verify-kyc. Runs on every route change. Skips public/auth/admin routes.
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Routes that must remain reachable even when KYC is not verified.
const ALLOWED_WITHOUT_KYC = new Set<string>([
  "/",
  "/auth",
  "/reset-password",
  "/verify-kyc",
  "/profile-setup", // not a real route, but defensive
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

  useEffect(() => {
    const path = location.pathname;
    // Admin pages have their own role gate.
    if (path.startsWith("/admin")) return;
    if (ALLOWED_WITHOUT_KYC.has(path)) return;

    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      // Skip enforcement for admins.
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (isAdmin || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("kyc_status")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.kyc_status !== "verified") {
        navigate("/verify-kyc", { replace: true });
      }
    })();

    return () => { cancelled = true; };
  }, [location.pathname, navigate]);

  return null;
};

export default KycEnforcer;
