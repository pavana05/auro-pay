import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Loader2, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";

const G = {
  bg: "#0a0c0f",
  card: "#0d0e12",
  primary: "#c8952e",
  secondary: "#d4a84b",
  border: "rgba(200,149,46,0.12)",
  accent10: "rgba(200,149,46,0.1)",
  danger: "#ef4444",
};

/**
 * Standalone admin login at /admin/login.
 * Kept intentionally minimal so the public /auth screen never hints that
 * an admin panel exists. Only email + password — no signup, no OAuth, no
 * SMS OTP. After successful sign-in we verify the admin role server-side
 * via has_role(); non-admins are bounced back to / with a generic error.
 */
const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in as admin, jump straight to dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (isAdmin) navigate("/admin", { replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        // Generic message — never reveal whether the email exists.
        toast.error("Invalid credentials");
        haptic.error();
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        // Don't keep a non-admin signed in on the admin login screen.
        await supabase.auth.signOut();
        toast.error("Invalid credentials");
        haptic.error();
        return;
      }
      haptic.success();
      navigate("/admin", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Sign-in failed");
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: G.bg }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{ background: "rgba(200,149,46,0.05)" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div
          className="rounded-3xl border p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
          style={{ borderColor: G.border, background: G.card }}
        >
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: G.accent10, border: `1px solid rgba(200,149,46,0.2)` }}
            >
              <KeyRound
                className="w-9 h-9 drop-shadow-[0_0_12px_rgba(200,149,46,0.5)]"
                style={{ color: G.primary }}
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Admin Sign-in</h1>
            <p className="text-sm mt-1.5 flex items-center gap-1.5 text-white/55">
              <Sparkles className="w-3.5 h-3.5" style={{ color: G.secondary }} />
              Authorized personnel only
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/60 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                spellCheck={false}
                className="w-full h-11 rounded-xl px-4 text-sm bg-white/[0.03] border text-white placeholder:text-white/30 outline-none focus:border-[rgba(200,149,46,0.5)] transition-colors"
                style={{ borderColor: G.border }}
                placeholder="you@auropay.app"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/60 mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-11 rounded-xl px-4 text-sm bg-white/[0.03] border text-white placeholder:text-white/30 outline-none focus:border-[rgba(200,149,46,0.5)] transition-colors"
                style={{ borderColor: G.border }}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${G.primary}, ${G.secondary})`,
                boxShadow: "0 8px 24px rgba(200,149,46,0.25)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-[11px] text-white/35 text-center mt-6 leading-relaxed">
            All sign-in attempts are logged and monitored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
