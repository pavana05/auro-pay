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

  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      setUserPhone(session.user.phone || "");
      // Check if profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        navigate("/home");
      } else {
        setState("profile-setup");
      }
    } else {
      setState("onboarding");
    }
  }, [navigate]);

  const handleSplashComplete = () => {
    checkSession();
  };

  const handleOnboardingComplete = () => setState("auth");

  const handleAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      setUserPhone(session.user.phone || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        navigate("/home");
      } else {
        setState("profile-setup");
      }
    }
  };

  const handleProfileComplete = () => navigate("/home");

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
