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
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", uid)
      .single();
    if (profile) {
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
      setState("onboarding");
    }
  }, [navigateByRole]);

  const handleSplashComplete = () => checkSession();
  const handleOnboardingComplete = () => setState("auth");

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && state === "ready") {
        setState("auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [state]);

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
