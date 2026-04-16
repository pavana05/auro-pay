import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase puts recovery tokens in URL hash; the client picks them up automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else {
        // Listen for the recovery event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
        });
        return () => subscription.unsubscribe();
      }
    });
  }, []);

  const handleReset = async () => {
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated! Logging you in...");
      setTimeout(() => navigate("/"), 1200);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <h1 className="text-3xl font-bold gradient-text mb-2">Reset Password</h1>
      <p className="text-sm text-muted-foreground mb-8">Choose a new password</p>

      <div className="w-full max-w-sm">
        {!ready ? (
          <p className="text-sm text-muted-foreground text-center">Verifying reset link...</p>
        ) : (
          <>
            <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">NEW PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="input-auro w-full mb-4"
              autoFocus
            />
            <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">CONFIRM</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="input-auro w-full mb-6"
              onKeyDown={(e) => e.key === "Enter" && handleReset()}
            />
            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
