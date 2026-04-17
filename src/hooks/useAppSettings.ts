import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppSettingKey =
  | "maintenance_mode"
  | "freeze_all_transactions"
  | "disable_new_signups"
  | "kyc_required"
  | "pin_required"
  | "fraud_detection";

/**
 * Live feed of app_settings values. Anyone authenticated can read (RLS allows it),
 * and we subscribe to realtime changes so emergency toggles propagate within ~1s.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("key,value");
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value; });
      setSettings(map);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel("app-settings-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (p: any) => {
        const row = (p.new || p.old) as { key: string; value: string };
        if (!row?.key) return;
        setSettings((prev) => ({ ...prev, [row.key]: p.new?.value ?? "" }));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);

  const isOn = (key: AppSettingKey) => settings[key] === "true";

  return { settings, loading, isOn };
}
