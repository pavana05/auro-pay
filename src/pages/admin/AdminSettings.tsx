import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: string;
}

const settingLabels: Record<string, { label: string; type: "number" | "toggle" }> = {
  default_daily_limit: { label: "Default Daily Limit (paise)", type: "number" },
  max_wallet_balance: { label: "Maximum Wallet Balance (paise)", type: "number" },
  min_transaction_amount: { label: "Minimum Transaction Amount (paise)", type: "number" },
  maintenance_mode: { label: "Maintenance Mode", type: "toggle" },
  kyc_required: { label: "KYC Required for Payments", type: "toggle" },
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
    else toast.success(`${key} updated`);
  };

  const toggleSetting = async (key: string) => {
    const newVal = editValues[key] === "true" ? "false" : "true";
    setEditValues({ ...editValues, [key]: newVal });
    await supabase.from("app_settings").update({ value: newVal, updated_at: new Date().toISOString() }).eq("key", key);
    toast.success(`${key} ${newVal === "true" ? "enabled" : "disabled"}`);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-[22px] font-semibold mb-6">Settings</h1>

        <div className="max-w-xl space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)
          ) : (
            settings.map((s) => {
              const meta = settingLabels[s.key] || { label: s.key, type: "number" };
              return (
                <div key={s.key} className="p-4 rounded-lg bg-card border border-border card-glow">
                  <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">
                    {meta.label}
                  </label>
                  {meta.type === "toggle" ? (
                    <button
                      onClick={() => toggleSetting(s.key)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        editValues[s.key] === "true" ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${
                        editValues[s.key] === "true" ? "translate-x-6" : "translate-x-0.5"
                      }`} />
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={editValues[s.key] || ""}
                        onChange={(e) => setEditValues({ ...editValues, [s.key]: e.target.value })}
                        className="input-auro flex-1"
                      />
                      <button onClick={() => saveSetting(s.key)} className="w-12 h-[52px] rounded-[14px] gradient-primary flex items-center justify-center hover:opacity-90 transition-colors">
                        <Save className="w-4 h-4 text-primary-foreground" />
                      </button>
                    </div>
                  )}
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
