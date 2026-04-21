import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Shield, Smartphone, Key, KeyRound, Sparkles, Link2, Unlink, Loader2, CheckCircle2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
  const [googleLinked, setGoogleLinked] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [identitiesLoaded, setIdentitiesLoaded] = useState(false);

  const refreshIdentities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const ids = (user as any)?.identities ?? [];
    const g = ids.find((i: any) => i.provider === "google");
    setGoogleLinked(!!g);
    setGoogleEmail(g?.identity_data?.email ?? null);
    setIdentitiesLoaded(true);
  };

  useEffect(() => { refreshIdentities(); }, []);
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

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/security",
      });
      if (result.error) {
        toast.error(result.error.message || "Couldn't link Google");
        setLinkingGoogle(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Google linked");
      await refreshIdentities();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't link Google");
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm("Unlink your Google account? You'll lose this account-recovery option.")) return;
    setLinkingGoogle(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ids = (user as any)?.identities ?? [];
      const g = ids.find((i: any) => i.provider === "google");
      if (!g) { toast.error("Google not linked"); return; }
      // @ts-ignore - unlinkIdentity exists on supabase-js v2
      const { error } = await supabase.auth.unlinkIdentity(g);
      if (error) throw error;
      toast.success("Google unlinked");
      await refreshIdentities();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't unlink Google");
    } finally {
      setLinkingGoogle(false);
    }
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

      {/* Linked Accounts — hidden during forced PIN setup */}
      {!isSetupMode && (
        <div className="rounded-xl bg-card border border-border card-glow p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--primary) / 0.12)" }}>
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Linked Accounts</p>
              <p className="text-xs text-muted-foreground">Account-recovery options</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/40">
            <svg width="22" height="22" viewBox="0 0 24 24" className="shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">Google</p>
                {googleLinked && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: "hsl(152 65% 42% / 0.15)", color: "hsl(152 65% 60%)" }}>
                    <CheckCircle2 className="w-2.5 h-2.5" /> Linked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {googleLinked ? (googleEmail || "Linked") : "Recover access if you lose your phone"}
              </p>
            </div>
            {!identitiesLoaded ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : googleLinked ? (
              <button
                onClick={handleUnlinkGoogle}
                disabled={linkingGoogle}
                className="h-9 px-3 rounded-full text-[12px] font-semibold border border-destructive/30 text-destructive flex items-center gap-1.5 active:scale-[0.97] disabled:opacity-50"
                style={{ background: "hsl(0 70% 50% / 0.08)" }}
              >
                {linkingGoogle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                Unlink
              </button>
            ) : (
              <button
                onClick={handleLinkGoogle}
                disabled={linkingGoogle}
                className="h-9 px-3 rounded-full text-[12px] font-semibold gradient-primary text-primary-foreground flex items-center gap-1.5 active:scale-[0.97] disabled:opacity-50"
              >
                {linkingGoogle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                Link
              </button>
            )}
          </div>
        </div>
      )}

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
