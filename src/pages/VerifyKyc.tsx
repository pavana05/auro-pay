// Mandatory KYC gate shown after login until profiles.kyc_status === 'verified'.
// Reuses the existing KycGate (Digio Aadhaar flow). When KYC flips to verified,
// KycGate renders children — we then redirect to the role-appropriate home.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import KycGate from "@/components/KycGate";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

const VerifyKyc = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) { navigate("/", { replace: true }); return; }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          toast.fail("Couldn't load your profile", {
            description: "Pull down to refresh and try again.",
          });
        }
        setRole(profile?.role ?? "teen");
      } catch (err: any) {
        if (!cancelled) {
          toast.fail("Something went wrong", { description: err?.message });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center font-sora"
        style={{ background: "hsl(220 15% 5%)" }}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "hsl(42 90% 70%)" }} />
        <p className="mt-4 text-[12px] text-white/40 tracking-wider">Loading verification…</p>
      </div>
    );
  }

  return (
    <ErrorBoundary label="Aadhaar verification">
      <KycGate feature="your AuroPay account">
        <KycCompleteRedirect role={role} />
      </KycGate>
    </ErrorBoundary>
  );
};

const KycCompleteRedirect = ({ role }: { role: string | null }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(role === "parent" ? "/parent" : "/home", { replace: true });
  }, [navigate, role]);
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center font-sora"
      style={{ background: "hsl(220 15% 5%)" }}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: "hsl(42 90% 70%)" }} />
      <p className="mt-4 text-[12px] text-white/40 tracking-wider">Taking you home…</p>
    </div>
  );
};

export default VerifyKyc;
