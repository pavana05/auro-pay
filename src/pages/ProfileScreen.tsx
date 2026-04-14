import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Shield, Wallet, Users, Target, Bell, HelpCircle, Info, LogOut, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ProfileScreen = () => {
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [txCount, setTxCount] = useState(0);
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
      if (w.data) {
        const { count } = await supabase.from("transactions").select("*", { count: "exact", head: true }).eq("wallet_id", w.data.id);
        setTxCount(count || 0);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Logged out");
  };

  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  const menuItems = [
    { icon: User, label: "Personal Info" },
    { icon: Shield, label: "Security & PIN" },
    { icon: Wallet, label: "Spending Limits" },
    { icon: Users, label: "Linked Parents" },
    { icon: Target, label: "Savings Goals", path: "/savings" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: HelpCircle, label: "Help & Support" },
    { icon: Info, label: "About AuroPay" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-muted animate-pulse mb-3" />
          <div className="w-32 h-5 bg-muted rounded animate-pulse mb-2" />
          <div className="w-24 h-4 bg-muted rounded animate-pulse" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      {/* Avatar & Info */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground mb-3">
          {initials}
        </div>
        <h2 className="text-lg font-semibold">{profile?.full_name}</h2>
        <p className="text-sm text-muted-foreground">{profile?.phone}</p>
        <p className="text-xs text-muted-foreground mt-1">{profile?.phone?.replace("+91", "")}@auropay</p>
        <div className={`mt-2 px-3 py-1 rounded-pill text-xs font-medium ${
          profile?.kyc_status === "verified" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
        }`}>
          {profile?.kyc_status === "verified" ? "✓ KYC Verified" : "⏳ KYC Pending"}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-card border border-border card-glow text-center">
          <p className="text-lg font-bold">{formatAmount(wallet?.balance || 0)}</p>
          <p className="text-[10px] text-muted-foreground">Balance</p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border card-glow text-center">
          <p className="text-lg font-bold">{txCount}</p>
          <p className="text-[10px] text-muted-foreground">Transactions</p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border card-glow text-center">
          <p className="text-lg font-bold">0</p>
          <p className="text-[10px] text-muted-foreground">Goals</p>
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-1 mb-6">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => item.path && navigate(item.path)}
            className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-card transition-colors"
          >
            <item.icon className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-left text-sm">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">Log Out</span>
      </button>

      <BottomNav />
    </div>
  );
};

export default ProfileScreen;
