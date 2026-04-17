import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import OnboardingScreen from "@/components/OnboardingScreen";
import AuthScreen from "@/components/AuthScreen";
import ProfileSetup from "@/components/ProfileSetup";

type AppState = "splash" | "onboarding" | "auth" | "profile-setup" | "ready";

const Index = () => {
  const [state, setState] = useState<AppState>("splash");
  const [userId, setUserId] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const navigate = useNavigate();

  const navigateByRole = useCallback(async (uid: string) => {
    // Check admin role first
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (isAdmin) { navigate("/admin"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, haptics_enabled, kyc_status, pin_hash")
      .eq("id", uid)
      .single();
    // Apply user's haptics preference globally before any page renders.
    if (profile && typeof (profile as any).haptics_enabled === "boolean") {
      const { setHapticsEnabled } = await import("@/lib/haptics");
      setHapticsEnabled((profile as any).haptics_enabled);
    }
    if (profile) {
      // Force PIN setup if KYC is verified but no payment PIN set yet.
      const needsPin = (profile as any).kyc_status === "verified" && !(profile as any).pin_hash;
      if (needsPin) { navigate("/security?setup=1"); return; }
      if (profile.role === "parent") navigate("/parent");
      else navigate("/home");
    } else {
      setState("profile-setup");
    }
  }, [navigate]);

  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      setUserPhone(session.user.phone || "");
      await navigateByRole(session.user.id);
    } else {
      // Allow forcing onboarding via ?onboarding=1 for QA / testing.
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const force = params?.get("onboarding") === "1";
      if (force) {
        try { localStorage.removeItem("auropay_onboarded"); } catch {}
      }
      const seen = !force && typeof window !== "undefined" && localStorage.getItem("auropay_onboarded") === "1";
      setState(seen ? "auth" : "onboarding");
    }
  }, [navigateByRole]);

  const handleSplashComplete = () => checkSession();
  const handleOnboardingComplete = () => {
    try { localStorage.setItem("auropay_onboarded", "1"); } catch {}
    setState("auth");
  };

  const handleAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      setUserPhone(session.user.phone || "");
      await navigateByRole(session.user.id);
    }
  };

  const handleProfileComplete = async () => {
    await navigateByRole(userId);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // On sign-out from anywhere in the app, surface the auth screen.
      if (event === "SIGNED_OUT" || !session) {
        setState("auth");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  switch (state) {
    case "splash":
      return <SplashScreen onComplete={handleSplashComplete} />;
    case "onboarding":
      return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    case "auth":
      return <AuthScreen onAuth={handleAuth} />;
    case "profile-setup":
      return <ProfileSetup userId={userId} phone={userPhone} onComplete={handleProfileComplete} />;
    default:
      return <SplashScreen onComplete={handleSplashComplete} />;
  }
};

export default Index;
