import { useState } from "react";
import { ArrowLeft, Lock, Eye, EyeOff, Shield, Smartphone, Key, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import ForgotPinModal from "@/components/ForgotPinModal";

const SecurityPin = () => {
  const navigate = useNavigate();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changing, setChanging] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);

  const handleChangePin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("PINs don't match");
      return;
    }
    setChanging(true);
    // Simulated - in production this would be a secure backend call
    setTimeout(() => {
      toast.success("PIN updated successfully!");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setChanging(false);
    }, 1000);
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
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold">Security & PIN</h1>
      </div>

      {/* Change PIN */}
      <div className="rounded-xl bg-card border border-border card-glow p-5 mb-6">
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
          <button onClick={handleChangePin} disabled={changing} className="w-full h-11 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm">
            {changing ? "Updating..." : "Update PIN"}
          </button>
          <button
            onClick={() => setShowForgotPin(true)}
            className="w-full h-11 rounded-pill bg-white/[0.04] border border-white/[0.08] text-primary font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition"
          >
            <KeyRound className="w-4 h-4" /> Forgot PIN? Reset via OTP
          </button>
        </div>
      </div>

      {/* Security Options */}
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

      <ForgotPinModal
        open={showForgotPin}
        onClose={() => setShowForgotPin(false)}
        onSuccess={() => toast.success("PIN reset — you can now use your new PIN")}
      />

      <BottomNav />
    </div>
  );
};

export default SecurityPin;
