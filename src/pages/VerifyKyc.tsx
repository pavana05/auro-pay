// Mandatory KYC gate shown after login until profiles.kyc_status === 'verified'.
// Reuses the existing KycGate (Digio Aadhaar flow). When KYC flips to verified,
// KycGate renders children — we then redirect to the role-appropriate home.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import KycGate from "@/components/KycGate";
import { Loader2 } from "lucide-react";

const VerifyKyc = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/", { replace: true }); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setRole(profile?.role ?? "teen");
    })();
  }, [navigate]);

  return (
    <KycGate feature="your AuroPay account">
      <KycCompleteRedirect role={role} />
    </KycGate>
  );
};

const KycCompleteRedirect = ({ role }: { role: string | null }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(role === "parent" ? "/parent" : "/home", { replace: true });
  }, [navigate, role]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
};

export default VerifyKyc;
