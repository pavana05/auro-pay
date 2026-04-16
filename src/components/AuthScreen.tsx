import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const AuthScreen = ({ onAuth }: { onAuth: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [searchParams] = useSearchParams();
  const [refCode, setRefCode] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref);
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      onAuth();
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { toast.error("Enter your email"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
      setForgotMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (forgotMode) return handleForgotPassword();
    if (!email.trim() || !password.trim()) {
      toast.error("Enter email and password");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        if (refCode && signUpData.user) {
          const refUserId = refCode.replace("AURO", "").toLowerCase();
          const { data: profiles } = await supabase.from("profiles").select("id").ilike("id", `${refUserId}%`).limit(1);
          if (profiles && profiles.length > 0) {
            await supabase.from("referrals").insert({
              referrer_id: profiles[0].id,
              referred_id: signUpData.user.id,
              referral_code: refCode,
            });
          }
        }
        if (!signUpData.session) {
          toast.success("Check your email to verify your account!", { duration: 6000 });
        } else {
          toast.success("Account created!");
          onAuth();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        onAuth();
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background noise-overlay px-6">
      <h1 className="text-4xl font-bold gradient-text mb-2">AuroPay</h1>
      <p className="text-sm text-muted-foreground mb-12">Money freedom for teens</p>

      <div className="w-full max-w-sm animate-fade-in-up">
        <h2 className="text-[22px] font-semibold mb-2">
          {forgotMode ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {forgotMode ? "We'll email you a reset link" : isSignUp ? "Sign up to get started" : "Log in to your account"}
        </p>

        {!forgotMode && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-12 rounded-pill bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 mb-4 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-muted-foreground tracking-widest">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </>
        )}

        <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">EMAIL</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input-auro w-full mb-4"
          autoFocus
        />

        {!forgotMode && (
          <>
            <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="input-auro w-full mb-2"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            {!isSignUp && (
              <button
                onClick={() => setForgotMode(true)}
                className="text-xs text-primary hover:underline mb-4 block ml-auto"
              >
                Forgot password?
              </button>
            )}
            {isSignUp && <div className="mb-4" />}
          </>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Please wait..." : forgotMode ? "Send Reset Link" : isSignUp ? "Sign Up" : "Log In"}
        </button>

        {forgotMode ? (
          <button
            onClick={() => setForgotMode(false)}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to login
          </button>
        ) : (
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? "Already have an account? Log in" : "Don't have an account? Sign up"}
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
