// Optional second-factor step shown right after a successful phone OTP login.
// Lets the user link a Google identity to their account for extra security,
// or skip and continue to the normal post-login flow (KYC → home).
//
// Flow:
//   AuthScreen (phone+OTP success) → /link-google → /verify-kyc → /home or /parent
//
// We mark the step as "seen" in localStorage so returning users aren't nagged
// every session — they only see it once after first phone login (or until they
// explicitly link).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { ShieldCheck, Loader2, ArrowRight } from "lucide-react";

const SEEN_KEY = "auropay_google_link_seen";

const LinkGoogle = () => {
  const navigate = useNavigate();
  const [linking, setLinking] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);

  // If the user already has a Google identity linked (e.g. previously linked,
  // or signed up with Google), skip this screen entirely.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth", { replace: true }); return; }
      const identities = (user as any).identities ?? [];
      if (identities.some((i: any) => i.provider === "google")) {
        setHasGoogle(true);
        proceed();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const proceed = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    navigate("/auth", { replace: true }); // Index will re-route by role/KYC.
  };

  const linkGoogle = async () => {
    setLinking(true);
    try {
      // The Lovable OAuth helper will redirect; on return Supabase merges the
      // Google identity into the existing phone-authenticated session.
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        toast.error(result.error.message || "Couldn't link Google");
        setLinking(false);
        return;
      }
      if (result.redirected) return; // browser is redirecting
      toast.success("Google linked — your account is now extra secure");
      proceed();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't link Google");
      setLinking(false);
    }
  };

  if (hasGoogle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6 font-sora"
      style={{ background: "hsl(220 15% 5%)" }}
    >
      <div
        className="w-full max-w-sm rounded-[24px] p-6"
        style={{
          background: "hsl(220 15% 8% / 0.7)",
          backdropFilter: "blur(24px) saturate(140%)",
          border: "1px solid hsl(42 78% 55% / 0.18)",
          boxShadow: "0 24px 60px hsl(0 0% 0% / 0.6)",
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(38 80% 45%))",
            boxShadow: "0 10px 30px hsl(42 78% 55% / 0.4)",
          }}
        >
          <ShieldCheck className="w-7 h-7" style={{ color: "hsl(220 15% 5%)" }} />
        </div>

        <h2 className="text-[20px] font-bold text-white text-center mb-1">
          Add extra security
        </h2>
        <p className="text-[12px] text-white/60 text-center mb-6">
          Link your Google account so you can recover access if you lose your phone.
        </p>

        <button
          onClick={linkGoogle}
          disabled={linking}
          className="w-full h-12 rounded-full bg-white text-black font-semibold text-[13px] flex items-center justify-center gap-2 mb-3 hover:opacity-95 active:scale-[0.98] transition disabled:opacity-50"
        >
          {linking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Link Google account
            </>
          )}
        </button>

        <button
          onClick={proceed}
          disabled={linking}
          className="w-full h-11 flex items-center justify-center gap-1 text-[12px] text-white/50 hover:text-white/80 transition disabled:opacity-50"
        >
          Skip for now <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <p className="mt-4 text-[10px] text-white/30 text-center">
          You can link it later from Profile → Security.
        </p>
      </div>
    </div>
  );
};

export default LinkGoogle;

export const hasSeenGoogleLinkPrompt = () => {
  try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
};
