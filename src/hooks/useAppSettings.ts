import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppSettingKey =
  | "maintenance_mode"
  | "freeze_all_transactions"
  | "disable_new_signups"
  | "kyc_required"
  | "pin_required"
  | "fraud_detection"
  | "parent_approval"
  | "feature_quick_pay"
  | "feature_bill_split"
  | "feature_savings_goals"
  | "feature_chores"
  | "feature_referrals"
  | "feature_lessons"
  | "realtime_notifications"
  | "default_daily_limit"
  | "max_wallet_balance"
  | "min_transaction_amount"
  | "max_transaction_amount"
  | "razorpay_mode";

// Defaults must mirror SETTING_DEFS in AdminSettings so that absent rows
// behave consistently — toggles default ON for "core/safety/feature" flags
// and OFF for emergency flags.
const DEFAULTS: Record<string, string> = {
  maintenance_mode: "false",
  freeze_all_transactions: "false",
  disable_new_signups: "false",
  kyc_required: "true",
  pin_required: "true",
  fraud_detection: "true",
  parent_approval: "true",
  feature_quick_pay: "true",
  feature_bill_split: "true",
  feature_savings_goals: "true",
  feature_chores: "true",
  feature_referrals: "true",
  feature_lessons: "true",
  realtime_notifications: "true",
  default_daily_limit: "50000",
  max_wallet_balance: "1000000",
  min_transaction_amount: "100",
  max_transaction_amount: "5000000",
  razorpay_mode: "test",
};

/**
 * Live feed of app_settings values. Anyone authenticated can read (RLS allows it),
 * and we subscribe to realtime changes so emergency toggles propagate within ~1s.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("key,value");
      if (cancelled) return;
      const map: Record<string, string> = { ...DEFAULTS };
      (data || []).forEach((r: any) => { map[r.key] = r.value; });
      setSettings(map);
      setLoading(false);
    };
    load();

    const ch = supabase.channel(`app-settings-rt-${Math.random().toString(36).slice(2)}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (p: any) => {
      const row = (p.new || p.old) as { key: string; value: string };
      if (!row?.key) return;
      setSettings((prev) => ({ ...prev, [row.key]: p.new?.value ?? DEFAULTS[row.key] ?? "" }));
    });
    ch.subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);

  const isOn = (key: AppSettingKey) => (settings[key] ?? DEFAULTS[key]) === "true";
  const isOff = (key: AppSettingKey) => (settings[key] ?? DEFAULTS[key]) === "false";
  const getNumber = (key: AppSettingKey, fallback?: number) => {
    const v = Number(settings[key] ?? DEFAULTS[key]);
    return Number.isFinite(v) ? v : (fallback ?? 0);
  };
  const getMode = (key: AppSettingKey) => settings[key] ?? DEFAULTS[key] ?? "test";

  return { settings, loading, isOn, isOff, getNumber, getMode };
}
