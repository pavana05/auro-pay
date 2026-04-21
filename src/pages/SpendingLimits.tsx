import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const SpendingLimits = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const back = useSafeBack();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      if (data) {
        setWallet(data);
        setDailyLimit(String((data.daily_limit || 0) / 100));
        setMonthlyLimit(String((data.monthly_limit || 0) / 100));
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    if (!wallet) return;
    setSaving(true);
    const { error } = await supabase.from("wallets").update({
      daily_limit: parseInt(dailyLimit || "0") * 100,
      monthly_limit: parseInt(monthlyLimit || "0") * 100,
    }).eq("id", wallet.id);
    if (error) toast.error(error.message);
    else toast.success("Spending limits updated!");
    setSaving(false);
  };

  const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;
  const dailyPct = wallet ? Math.min(((wallet.spent_today || 0) / (wallet.daily_limit || 1)) * 100, 100) : 0;
  const monthlyPct = wallet ? Math.min(((wallet.spent_this_month || 0) / (wallet.monthly_limit || 1)) * 100, 100) : 0;

  if (loading) return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="space-y-4 mt-16">{[1,2].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}</div>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <PageHeader title="Spending Limits" fallback="/profile" sticky={false} />

      {/* Current Usage */}
      {wallet && (
        <div className="space-y-4 mb-8">
          <div className="rounded-xl bg-card border border-border card-glow p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-muted-foreground">Daily Spending</p>
              <p className="text-xs font-medium">{fmt(wallet.spent_today || 0)} / {fmt(wallet.daily_limit || 0)}</p>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all ${dailyPct > 80 ? "bg-destructive" : "gradient-primary"}`} style={{ width: `${dailyPct}%` }} />
            </div>
            {dailyPct > 80 && (
              <div className="flex items-center gap-1 mt-2">
                <AlertTriangle className="w-3 h-3 text-warning" />
                <p className="text-xs text-warning">Approaching daily limit</p>
              </div>
            )}
          </div>
          <div className="rounded-xl bg-card border border-border card-glow p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-muted-foreground">Monthly Spending</p>
              <p className="text-xs font-medium">{fmt(wallet.spent_this_month || 0)} / {fmt(wallet.monthly_limit || 0)}</p>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all ${monthlyPct > 80 ? "bg-destructive" : "gradient-primary"}`} style={{ width: `${monthlyPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Set Limits */}
      <h2 className="text-sm font-semibold mb-4">Set Limits</h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Daily Limit (₹)</label>
          <input value={dailyLimit} onChange={e => setDailyLimit(e.target.value.replace(/\D/g, ""))} className="input-auro w-full" placeholder="500" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Monthly Limit (₹)</label>
          <input value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value.replace(/\D/g, ""))} className="input-auro w-full" placeholder="5000" />
        </div>
        <button onClick={save} disabled={saving} className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm">
          {saving ? "Saving..." : "Update Limits"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default SpendingLimits;
