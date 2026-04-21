// Standalone /profile-setup route. Wraps the existing ProfileSetup component
// so flows that redirect to /profile-setup (e.g. KYC enforcer, Index fallback)
// no longer hit a 404. Pulls userId/phone from the current Supabase session.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import ProfileSetup from "@/components/ProfileSetup";

const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserId(session.user.id);
      setPhone(session.user.phone || "");
    })();
  }, [navigate]);

  const handleComplete = async () => {
    if (!userId) return;
    // Re-route by role / KYC status after setup.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, kyc_status")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.kyc_status !== "verified") {
      navigate("/verify-kyc", { replace: true });
      return;
    }
    navigate(profile?.role === "parent" ? "/parent" : "/home", { replace: true });
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return <ProfileSetup userId={userId} phone={phone} onComplete={handleComplete} />;
};

export default ProfileSetupPage;
