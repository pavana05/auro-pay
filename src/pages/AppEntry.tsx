import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SplashScreen from "@/components/SplashScreen";
import OnboardingScreen from "@/components/OnboardingScreen";
import AuthScreen from "@/components/AuthScreen";
import ProfileSetup from "@/components/ProfileSetup";
import { hasSeenGoogleLinkPrompt } from "@/pages/LinkGoogle";
import { useAuthReady } from "@/hooks/useAuthReady";
import {
  setDiagnosticsFetch,
  setDiagnosticsOnboarding,
  setDiagnosticsPhase,
  setDiagnosticsRoute,
  setDiagnosticsUser,
} from "@/lib/app-diagnostics";

type EntryView = "splash" | "onboarding" | "session-loading" | "auth" | "profile-setup" | "redirecting" | "error";

const ONBOARDED_KEY = "auropay_onboarded";

const RootLoadingScreen = ({ label }: { label: string }) => (
  <div className="fixed inset-0 flex min-h-[100dvh] items-center justify-center bg-background px-6">
    <div className="w-full max-w-sm rounded-md border border-border bg-card/90 p-6 text-center shadow-xl backdrop-blur-md">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <p className="text-sm font-medium text-card-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">Resolving app startup…</p>
    </div>
  </div>
);

export default function AppEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, ready, error } = useAuthReady();
  const [view, setView] = useState<EntryView>("splash");
  const [splashDone, setSplashDone] = useState(false);
  const [userId, setUserId] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const resolvedRef = useRef(false);

  const onboardingSeen = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const forceOnboarding = params.get("onboarding") === "1";
    if (forceOnboarding) {
      try { localStorage.removeItem(ONBOARDED_KEY); } catch {}
      return false;
    }
    try {
      return localStorage.getItem(ONBOARDED_KEY) === "1";
    } catch {
      return false;
    }
  }, [location.search]);

  useEffect(() => {
    setDiagnosticsRoute(location.pathname + location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    setDiagnosticsOnboarding(onboardingSeen);
  }, [onboardingSeen]);

  const routeSignedInUser = useCallback(async (uid: string, phone?: string | null) => {
    setDiagnosticsPhase("profile-routing");
    setDiagnosticsFetch("role-check", { state: "loading", detail: "Checking admin role" });

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (roleError) {
      setDiagnosticsFetch("role-check", { state: "error", detail: roleError.message });
      throw roleError;
    }

    setDiagnosticsFetch("role-check", { state: "success", detail: isAdmin ? "Admin user" : "Standard user" });

    if (isAdmin) {
      setView("redirecting");
      navigate("/admin", { replace: true });
      return;
    }

    setDiagnosticsFetch("profile", { state: "loading", detail: "Loading profile" });
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, haptics_enabled, kyc_status, pin_hash, permissions_completed_at")
      .eq("id", uid)
      .maybeSingle();

    if (profileError) {
      setDiagnosticsFetch("profile", { state: "error", detail: profileError.message });
      throw profileError;
    }

    setDiagnosticsFetch("profile", { state: "success", detail: profile ? `Role: ${profile.role ?? "unknown"}` : "No profile row" });

    if (profile && typeof (profile as any).haptics_enabled === "boolean") {
      const { setHapticsEnabled } = await import("@/lib/haptics");
      setHapticsEnabled((profile as any).haptics_enabled);
    }

    if (!profile) {
      setUserId(uid);
      setUserPhone(phone || "");
      setView("profile-setup");
      setDiagnosticsPhase("profile-setup");
      return;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const identities = (authUser as any)?.identities ?? [];
    const alreadyLinked = identities.some((identity: any) => identity.provider === "google");
    if (!alreadyLinked && !hasSeenGoogleLinkPrompt()) {
      setView("redirecting");
      navigate("/link-google", { replace: true });
      return;
    }

    if (!(profile as any).permissions_completed_at) {
      setView("redirecting");
      navigate("/permissions", { replace: true });
      return;
    }

    if ((profile as any).kyc_status !== "verified") {
      setView("redirecting");
      navigate("/verify-kyc", { replace: true });
      return;
    }

    if (!(profile as any).pin_hash) {
      setView("redirecting");
      navigate("/security?setup=1", { replace: true });
      return;
    }

    setView("redirecting");
    navigate(profile.role === "parent" ? "/parent" : "/home", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!splashDone) {
      setDiagnosticsPhase("splash");
      return;
    }

    if (!onboardingSeen) {
      setView("onboarding");
      setDiagnosticsPhase("onboarding");
      return;
    }

    if (!ready) {
      setView("session-loading");
      setDiagnosticsPhase("session-loading");
      return;
    }

    if (error) {
      setView("error");
      setDiagnosticsPhase("auth-error");
      return;
    }

    if (!session?.user) {
      resolvedRef.current = false;
      setView("auth");
      setDiagnosticsPhase("auth");
      return;
    }

    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setUserId(session.user.id);
    setUserPhone(session.user.phone || "");
    setDiagnosticsUser(session.user.id);
    setView("session-loading");

    routeSignedInUser(session.user.id, session.user.phone).catch((err: any) => {
      resolvedRef.current = false;
      setDiagnosticsPhase("route-error");
      setDiagnosticsFetch("profile", { state: "error", detail: err?.message || "Startup routing failed" });
      setView("auth");
    });
  }, [splashDone, onboardingSeen, ready, error, session, routeSignedInUser]);

  const handleSplashComplete = () => setSplashDone(true);

  const handleOnboardingComplete = () => {
    try { localStorage.setItem(ONBOARDED_KEY, "1"); } catch {}
    setDiagnosticsOnboarding(true);
    setView(ready && !session?.user ? "auth" : "session-loading");
    setDiagnosticsPhase("post-onboarding");
  };

  const handleAuth = async () => {
    resolvedRef.current = false;
    setDiagnosticsPhase("auth-success");
    const { data: { session: latestSession } } = await supabase.auth.getSession();
    if (latestSession?.user) {
      setUserId(latestSession.user.id);
      setUserPhone(latestSession.user.phone || "");
      await routeSignedInUser(latestSession.user.id, latestSession.user.phone);
      return;
    }
    setView("auth");
  };

  const handleProfileComplete = async () => {
    resolvedRef.current = false;
    if (userId) {
      await routeSignedInUser(userId, userPhone);
    }
  };

  if (view === "splash") return <SplashScreen onComplete={handleSplashComplete} />;
  if (view === "onboarding") return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  if (view === "session-loading" || view === "redirecting") return <RootLoadingScreen label={view === "redirecting" ? "Opening your app" : "Checking your account"} />;
  if (view === "profile-setup") return <ProfileSetup userId={userId} phone={userPhone} onComplete={handleProfileComplete} />;
  if (view === "error") return <RootLoadingScreen label={error || "Unable to start the app"} />;

  return <AuthScreen onAuth={handleAuth} />;
}