import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Snowflake, Settings, Info, Eye, EyeOff, ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CardScreen = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showCvv, setShowCvv] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [p, w] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
      ]);
      setProfile(p.data);
      setWallet(w.data);
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleFreeze = async () => {
    if (!wallet) return;
    const { error } = await supabase.from("wallets").update({ is_frozen: !wallet.is_frozen }).eq("id", wallet.id);
    if (error) { toast.error("Failed to update"); return; }
    setWallet({ ...wallet, is_frozen: !wallet.is_frozen });
    toast.success(wallet.is_frozen ? "Card unfrozen" : "Card frozen");
  };

  const last4 = wallet?.id?.slice(-4) || "0000";

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="w-full h-52 rounded-lg bg-muted animate-pulse mb-6" />
        <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold">My Card</h1>
      </div>

      {/* Card */}
      <button
        onClick={() => setFlipped(!flipped)}
        className={`w-full aspect-[1.6/1] rounded-lg p-6 mb-6 relative overflow-hidden transition-all duration-500 ${
          wallet?.is_frozen ? "grayscale opacity-60" : ""
        }`}
        style={{
          background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b69 50%, #7c3aed 100%)",
        }}
      >
        <div className="absolute inset-0 noise-overlay" />
        {wallet?.is_frozen && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-muted/30 backdrop-blur rounded-pill">
            <span className="text-xs font-medium">🔒 Frozen</span>
          </div>
        )}

        {!flipped ? (
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">AuroPay</span>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-destructive/80" />
                <div className="w-8 h-8 rounded-full bg-warning/80" />
              </div>
            </div>
            <div>
              <div className="w-10 h-7 rounded bg-gradient-to-br from-warning to-warning/60 mb-4" />
              <p className="text-lg tracking-[4px] font-medium mb-3">•••• •••• •••• {last4}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-muted-foreground">CARD HOLDER</p>
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">EXPIRES</p>
                  <p className="text-sm font-medium">12/28</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 h-full flex flex-col justify-center items-center">
            <p className="text-xs text-muted-foreground mb-2">CVV</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold tracking-[8px]">{showCvv ? "847" : "•••"}</p>
              <button onClick={(e) => { e.stopPropagation(); setShowCvv(!showCvv); }}>
                {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Tap to flip back</p>
          </div>
        )}
      </button>

      {/* Actions */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { icon: Plus, label: "Add Funds", action: () => navigate("/add-money") },
          { icon: Snowflake, label: wallet?.is_frozen ? "Unfreeze" : "Freeze", action: toggleFreeze },
          { icon: Settings, label: "Set Limit", action: () => {} },
          { icon: Info, label: "Details", action: () => setFlipped(!flipped) },
        ].map((item) => (
          <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card border border-border card-glow hover:border-border-active transition-all">
            <item.icon className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default CardScreen;
