import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Save, Settings, ToggleLeft, ToggleRight, Shield, Sliders } from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: string;
}

const settingLabels: Record<string, { label: string; type: "number" | "toggle"; desc: string; icon: typeof Shield }> = {
  default_daily_limit: { label: "Default Daily Limit", type: "number", desc: "Daily spending limit for new wallets (in paise)", icon: Sliders },
  max_wallet_balance: { label: "Maximum Wallet Balance", type: "number", desc: "Maximum balance a wallet can hold (in paise)", icon: Sliders },
  min_transaction_amount: { label: "Minimum Transaction", type: "number", desc: "Minimum transaction amount allowed (in paise)", icon: Sliders },
  maintenance_mode: { label: "Maintenance Mode", type: "toggle", desc: "Temporarily disable all user-facing features", icon: Settings },
  kyc_required: { label: "KYC Required", type: "toggle", desc: "Require KYC verification before allowing payments", icon: Shield },
};

const AdminSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("app_settings").select("*").order("key");
      const s = (data || []) as Setting[];
      setSettings(s);
      const vals: Record<string, string> = {};
      s.forEach((setting) => { vals[setting.key] = setting.value; });
      setEditValues(vals);
      setLoading(false);
    };
    fetch();
  }, []);

  const saveSetting = async (key: string) => {
    const { error } = await supabase.from("app_settings").update({ value: editValues[key], updated_at: new Date().toISOString() }).eq("key", key);
    if (error) toast.error(error.message);
    else toast.success(`${settingLabels[key]?.label || key} updated`);
  };

  const toggleSetting = async (key: string) => {
    const newVal = editValues[key] === "true" ? "false" : "true";
    setEditValues({ ...editValues, [key]: newVal });
    await supabase.from("app_settings").update({ value: newVal, updated_at: new Date().toISOString() }).eq("key", key);
    toast.success(`${settingLabels[key]?.label || key} ${newVal === "true" ? "enabled" : "disabled"}`);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[350px] h-[350px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure global platform parameters</p>
        </div>

        <div className="max-w-2xl space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />)
          ) : settings.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-white/[0.02] border border-white/[0.04] backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">No settings configured</p>
            </div>
          ) : (
            settings.map((s, i) => {
              const meta = settingLabels[s.key] || { label: s.key, type: "number" as const, desc: "", icon: Settings };
              const Icon = meta.icon;
              return (
                <div key={s.key} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 backdrop-blur-sm group"
                  style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06}s both` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{meta.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{meta.desc}</p>
                      </div>
                    </div>

                    {meta.type === "toggle" ? (
                      <button onClick={() => toggleSetting(s.key)} className="mt-1 transition-all duration-300 active:scale-90">
                        {editValues[s.key] === "true" ? (
                          <ToggleRight className="w-10 h-10 text-primary" />
                        ) : (
                          <ToggleLeft className="w-10 h-10 text-muted-foreground" />
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          value={editValues[s.key] || ""}
                          onChange={(e) => setEditValues({ ...editValues, [s.key]: e.target.value })}
                          className="w-32 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 text-sm text-right font-mono focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all duration-200"
                        />
                        <button onClick={() => saveSetting(s.key)} className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all duration-200 active:scale-90 hover:shadow-[0_0_15px_hsl(42_78%_55%/0.1)]">
                          <Save className="w-4 h-4 text-primary" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;