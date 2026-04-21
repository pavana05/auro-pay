import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Shield, Smartphone, Key, KeyRound, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import ForgotPinModal from "@/components/ForgotPinModal";

const SecurityPin = () => {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [searchParams] = useSearchParams();
  const isSetupMode = searchParams.get("setup") === "1";
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changing, setChanging] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);

  useEffect(() => {
    if (isSetupMode) {
      toast.info("Set up your 4-digit Payment PIN to continue", { duration: 5000 });
      // Scroll to PIN section
      setTimeout(() => {
        document.getElementById("pin-setup-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [isSetupMode]);

  const handleChangePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("PINs don't match");
      return;
    }
    setChanging(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-pin", {
        body: { action: "set", pin: newPin, current_pin: currentPin || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(isSetupMode ? "PIN created — you're all set!" : "PIN updated successfully!");
      setCurrentPin(""); setNewPin(""); setConfirmPin("");

      if (isSetupMode) {
        // After setup, send the user on to their home (parent or teen).
        const { data: { user } } = await supabase.auth.getUser();
        let dest = "/home";
        if (user) {
          const { data: profile } = await supabase
            .from("profiles").select("role").eq("id", user.id).maybeSingle();
          if (profile?.role === "parent") dest = "/parent";
        }
        navigate(dest, { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update PIN");
    } finally {
      setChanging(false);
    }
  };

  const handleChangePassword = async () => {
    toast.info("A password reset link will be sent to your email");
    const { error } = await supabase.auth.resetPasswordForEmail(
      (await supabase.auth.getUser()).data.user?.email || "",
      { redirectTo: window.location.origin }
    );
    if (error) toast.error(error.message);
    else toast.success("Reset link sent!");
  };

  const securityOptions = [
    { icon: Smartphone, label: "Two-Factor Authentication", desc: "Add extra security to your account", action: () => toast.info("2FA setup coming soon") },
    { icon: Key, label: "Change Password", desc: "Update your login password", action: handleChangePassword },
    { icon: Shield, label: "Login Activity", desc: "View recent login sessions", action: () => toast.info("Login activity coming soon") },
  ];

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <PageHeader title={isSetupMode ? "Create Payment PIN" : "Security & PIN"} hideBack={isSetupMode} fallback="/profile" sticky={false} />

      {isSetupMode && (
        <div className="rounded-xl p-4 mb-5 flex items-start gap-3"
          style={{ background: "rgba(200,149,46,0.08)", border: "1px solid rgba(200,149,46,0.3)" }}>
          <Sparkles className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
          <div className="flex-1">
            <p className="text-sm font-semibold">One last step</p>
            <p className="text-xs text-muted-foreground mt-1">
              Set a 4-digit PIN below — you'll use it to authorise every payment.
            </p>
          </div>
        </div>
      )}

      {/* Change PIN */}
      <div id="pin-setup-section" className="rounded-xl bg-card border border-border card-glow p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">Transaction PIN</p>
            <p className="text-xs text-muted-foreground">4-digit PIN for payments</p>
          </div>
        </div>

        <div className="space-y-3">
          {!isSetupMode && (
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Current PIN"
                className="input-auro w-full pr-10"
                maxLength={4}
              />
              <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="New PIN"
              className="input-auro w-full pr-10"
              maxLength={4}
            />
            <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type="password"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Confirm New PIN"
            className="input-auro w-full"
            maxLength={4}
          />
          <button onClick={handleChangePin} disabled={changing} className="w-full h-11 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
            {changing ? (isSetupMode ? "Creating..." : "Updating...") : (isSetupMode ? "Create PIN & Continue" : "Update PIN")}
          </button>
          <button
            onClick={() => setShowForgotPin(true)}
            className="w-full h-11 rounded-pill bg-white/[0.04] border border-white/[0.08] text-primary font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition"
          >
            <KeyRound className="w-4 h-4" /> Forgot PIN? Reset via OTP
          </button>
        </div>
      </div>

      {/* Security Options — hidden during forced PIN setup */}
      {!isSetupMode && (
        <div className="space-y-2">
          {securityOptions.map(opt => (
            <button key={opt.label} onClick={opt.action} className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border card-glow hover:border-primary/30 transition-all">
              <opt.icon className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <ForgotPinModal
        open={showForgotPin}
        onClose={() => setShowForgotPin(false)}
        onSuccess={() => toast.success("PIN reset — you can now use your new PIN")}
      />

      {!isSetupMode && <BottomNav />}
    </div>
  );
};

export default SecurityPin;
