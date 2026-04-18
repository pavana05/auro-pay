import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { useAdminQuery } from "@/hooks/useAdminQuery";
import { AdminQueryError, AdminQueryStatus } from "@/components/admin/AdminQueryState";
import {
  Settings, Shield, Sliders, CreditCard, Zap, AlertTriangle, Lock,
  CheckCircle2, Power, UserX, Ban, Activity, Wrench, Globe, Bell, Sparkles, Clock, X,
} from "lucide-react";

const C = {
  cardBg: "rgba(13,14,18,0.7)",
  cardSolid: "#0d0e12",
  border: "rgba(200,149,46,0.10)",
  borderStrong: "rgba(200,149,46,0.20)",
  primary: "#c8952e",
  secondary: "#d4a84b",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.3)",
};

interface Setting { id: string; key: string; value: string; updated_at?: string | null }

type Section = "payment" | "core" | "safety" | "advanced" | "emergency";

const SETTING_DEFS: Record<string, {
  label: string;
  desc: string;
  effect: string; // What flipping this actually does — surfaced under each row.
  type: "money" | "number" | "toggle" | "mode";
  section: Section;
  icon: any;
  default: string;
}> = {
  default_daily_limit:    { label: "Default Daily Limit",       desc: "Spending limit for new wallets",          effect: "Sets the daily spending cap applied to newly created wallets.",                                                                          type: "money",  section: "payment", icon: Sliders, default: "50000" },
  max_wallet_balance:     { label: "Maximum Wallet Balance",    desc: "Cap on wallet balance",                   effect: "Top-ups & transfers fail if they would push a wallet above this amount.",                                                                  type: "money",  section: "payment", icon: Sliders, default: "1000000" },
  min_transaction_amount: { label: "Minimum Transaction",       desc: "Lowest allowed transaction amount",       effect: "Edge functions reject any payment under this amount with HTTP 400.",                                                                       type: "money",  section: "payment", icon: Sliders, default: "100" },
  max_transaction_amount: { label: "Maximum Transaction",       desc: "Per-transaction cap",                     effect: "Edge functions reject any single payment over this amount with HTTP 400.",                                                                 type: "money",  section: "payment", icon: Sliders, default: "5000000" },
  razorpay_mode:          { label: "Razorpay Mode",              desc: "Test or Live payment processing",         effect: "LIVE mode processes real money via Razorpay live keys. TEST mode uses sandbox keys; no real money moves.",                               type: "mode",   section: "payment", icon: CreditCard, default: "test" },

  feature_quick_pay:      { label: "Quick Pay",                  desc: "P2P transfers between users",             effect: "OFF → tile hidden on /home, /quick-pay shows 'unavailable', and p2p-transfer returns 403.",                                              type: "toggle", section: "core", icon: Zap, default: "true" },
  feature_bill_split:     { label: "Bill Split",                 desc: "Split expenses across friends",           effect: "OFF → tile hidden on /home, /bill-split shows 'unavailable', and bill-split-pay returns 403.",                                           type: "toggle", section: "core", icon: Activity, default: "true" },
  feature_savings_goals:  { label: "Savings Goals",              desc: "Goal-based saving for teens",             effect: "OFF → tile hidden on /home and /savings shows 'unavailable'.",                                                                            type: "toggle", section: "core", icon: Activity, default: "true" },
  feature_chores:         { label: "Chores & Rewards",           desc: "Parent-assigned earn-and-do tasks",       effect: "OFF → chores tile hidden on /home and /chores shows 'unavailable'.",                                                                       type: "toggle", section: "core", icon: Activity, default: "true" },

  kyc_required:           { label: "KYC Required",               desc: "Verify Aadhaar before payments",          effect: "ON → unverified users are forced to /verify-kyc; payment edge functions reject unverified users with 403.",                                type: "toggle", section: "safety", icon: Shield, default: "true" },
  pin_required:           { label: "PIN Required",               desc: "Force payment PIN on every transaction",  effect: "ON → payment screens redirect users without a PIN to /security?setup=1; process-scan-payment rejects calls missing the PIN.",                type: "toggle", section: "safety", icon: Lock, default: "true" },
  fraud_detection:        { label: "Fraud Detection",            desc: "Auto-flag suspicious patterns",           effect: "ON → anomaly-scan continues writing to flagged_transactions for admin review and auto-freezes wallets on confirmed fraud.",                  type: "toggle", section: "safety", icon: Shield, default: "true" },
  parent_approval:        { label: "Parent Approval (Large Tx)", desc: "Require parent approval over ₹2,000",     effect: "ON → teen payments above ₹2,000 are paused; a notification is sent to the parent and the payment only completes when they approve.",         type: "toggle", section: "safety", icon: Shield, default: "true" },

  feature_referrals:      { label: "Referral Program",           desc: "Allow users to invite & earn",            effect: "OFF → /referrals shows 'unavailable' and the referral tile is hidden.",                                                                     type: "toggle", section: "advanced", icon: Sparkles, default: "true" },
  feature_lessons:        { label: "Financial Lessons",          desc: "In-app financial education modules",      effect: "OFF → /learn shows 'unavailable' and the lessons tile is hidden.",                                                                          type: "toggle", section: "advanced", icon: Sparkles, default: "true" },
  realtime_notifications: { label: "Realtime Notifications",     desc: "Push notifications via WebSocket",        effect: "OFF → no live notification toasts; users still see notifications by reloading /notifications.",                                              type: "toggle", section: "advanced", icon: Bell, default: "true" },

  maintenance_mode:        { label: "Maintenance Mode",           desc: "Temporarily disable all user features",   effect: "ON → every non-admin user sees a fullscreen maintenance splash. Admin routes & /reset-password remain accessible.",                          type: "toggle", section: "emergency", icon: Wrench, default: "false" },
  freeze_all_transactions: { label: "Freeze ALL Transactions",    desc: "Emergency stop on every payment",         effect: "ON → all payment edge functions return 503. No money moves anywhere on the platform.",                                                       type: "toggle", section: "emergency", icon: Ban, default: "false" },
  disable_new_signups:     { label: "Disable New Signups",        desc: "Block new user registration",             effect: "ON → a database trigger blocks all new auth.users inserts with an explicit error. Existing users are unaffected.",                            type: "toggle", section: "emergency", icon: UserX, default: "false" },
};

const SECTION_META: Record<Section, { title: string; subtitle: string; icon: any; color: string; danger?: boolean }> = {
  payment:   { title: "Payment Settings",  subtitle: "Limits and gateway mode",        icon: CreditCard,    color: C.primary },
  core:      { title: "Core Features",     subtitle: "Primary product features",       icon: Sparkles,      color: C.primary },
  safety:    { title: "Safety Features",   subtitle: "Verification & fraud controls",  icon: Shield,        color: C.success },
  advanced:  { title: "Advanced Features", subtitle: "Optional & experimental",        icon: Settings,      color: C.secondary },
  emergency: { title: "Emergency Actions", subtitle: "DANGER — system-wide controls",  icon: AlertTriangle, color: C.danger, danger: true },
};

const formatINR = (paise: string) => {
  const n = Number(paise || 0);
  return (n / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

/* Tiny toggle */
const Toggle = ({ on, onChange, color = C.primary, danger }: { on: boolean; onChange: () => void; color?: string; danger?: boolean }) => (
  <button onClick={onChange} role="switch" aria-checked={on}
    className="relative w-12 h-7 rounded-full transition-all duration-300 active:scale-95 shrink-0"
    style={{
      background: on ? (danger ? `linear-gradient(135deg, ${C.danger}, #dc2626)` : `linear-gradient(135deg, ${color}, ${color}cc)`) : "rgba(255,255,255,0.06)",
      boxShadow: on ? `0 0 16px ${danger ? C.danger : color}55` : "inset 0 1px 2px rgba(0,0,0,0.4)",
      border: `1px solid ${on ? "transparent" : "rgba(255,255,255,0.06)"}`,
    }}>
    <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300"
      style={{ transform: on ? "translateX(20px)" : "translateX(0)" }} />
  </button>
);

const AdminSettings = () => {
  // Seed with hardcoded defaults so the UI is never blank, even if the DB
  // fetch is slow or fails. Live values overwrite these on load.
  const initialDefaults = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(SETTING_DEFS).forEach(([k, def]) => { m[k] = def.default; });
    return m;
  }, []);
  const [settings, setSettings] = useState<Record<string, string>>(initialDefaults);
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>(initialDefaults);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [recentlySavedKeys, setRecentlySavedKeys] = useState<Set<string>>(new Set());
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* Modals */
  const [modeChangeOpen, setModeChangeOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceText, setMaintenanceText] = useState("");
  const [emergencyOpen, setEmergencyOpen] = useState<{ key: string; phase: 1 | 2 } | null>(null);
  const [emergencyText, setEmergencyText] = useState("");

  /* Load all settings via shared admin query (with retry, polling, timestamp) */
  const { loading, error, refetch, lastUpdatedAt } = useAdminQuery<Record<string, string>>(
    async () => {
      const { data, error } = await supabase.from("app_settings").select("key,value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => { map[s.key] = s.value; });
      // Merge in defaults for any keys not yet in DB so the UI always renders.
      Object.entries(SETTING_DEFS).forEach(([k, def]) => {
        if (map[k] === undefined) map[k] = def.default;
      });
      setSettings(map);
      setOriginalSettings(map);
      return map;
    },
    { label: "app settings", refetchInterval: 60_000 }
  );

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => { Object.values(debounceTimers.current).forEach(clearTimeout); };
  }, []);

  /* Persist a single setting (upsert) */
  const persist = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      const { data: existing, error: selErr } = await supabase.from("app_settings").select("id").eq("key", key).maybeSingle();
      if (selErr) throw selErr;
      if (existing) {
        const { error } = await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings").insert({ key, value });
        if (error) throw error;
      }
      setSavedAt(Date.now());
      setOriginalSettings(prev => ({ ...prev, [key]: value }));
      setRecentlySavedKeys(prev => new Set(prev).add(key));
      setTimeout(() => setRecentlySavedKeys(prev => { const n = new Set(prev); n.delete(key); return n; }), 1500);
    } catch (e: any) {
      console.error("[AdminSettings] persist error:", e);
      toast.error(`Failed to save ${key}: ${e?.message || "unknown error"}`);
    } finally {
      setSavingKey(null);
    }
  };

  /* Update value with 600ms debounce */
  const updateSetting = (key: string, value: string, immediate = false) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    if (immediate) {
      persist(key, value);
    } else {
      debounceTimers.current[key] = setTimeout(() => persist(key, value), 600);
    }
  };

  /* "Last saved X ago" rolling time */
  const [, forceTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => forceTick(t => t + 1), 5000);
    return () => clearInterval(i);
  }, []);
  const savedLabel = useMemo(() => {
    if (!savedAt) return "Not yet saved";
    const s = Math.floor((Date.now() - savedAt) / 1000);
    if (s < 5) return "Saved just now";
    if (s < 60) return `Saved ${s}s ago`;
    return `Saved ${Math.floor(s / 60)}m ago`;
  }, [savedAt]);

  const grouped = useMemo(() => {
    const g: Record<Section, string[]> = { payment: [], core: [], safety: [], advanced: [], emergency: [] };
    Object.entries(SETTING_DEFS).forEach(([k, d]) => g[d.section].push(k));
    return g;
  }, []);

  const isLive = settings.razorpay_mode === "live";
  const maintenanceOn = settings.maintenance_mode === "true";

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "rgba(200,149,46,0.04)", filter: "blur(120px)" }} />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary }}>App Settings</h1>
            <p className="text-xs mt-1.5" style={{ color: C.textSecondary }}>
              Full control panel · changes auto-save with debounce
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {savingKey ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px]" style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}33` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.primary }} />
                Saving…
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px]" style={{ background: `${C.success}10`, color: C.success, border: `1px solid ${C.success}33` }}>
                <CheckCircle2 className="w-3 h-3" />
                {savedLabel}
              </div>
            )}
            <AdminQueryStatus lastUpdatedAt={lastUpdatedAt} loading={loading} onRefresh={() => refetch()} />
          </div>
        </div>

        {/* Maintenance banner */}
        {maintenanceOn && (
          <div className="relative z-10 flex items-center gap-3 px-4 py-3 rounded-[12px]" style={{ background: `${C.warning}15`, border: `1px solid ${C.warning}44` }}>
            <Wrench className="w-4 h-4" style={{ color: C.warning }} />
            <span className="text-xs flex-1" style={{ color: C.textPrimary }}>
              <span className="font-semibold">Maintenance Mode is active.</span>{" "}
              <span style={{ color: C.textSecondary }}>All user features are disabled.</span>
            </span>
            <button onClick={() => updateSetting("maintenance_mode", "false", true)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-md" style={{ background: C.warning, color: "#0a0c0f" }}>
              Disable now
            </button>
          </div>
        )}

        {error && !lastUpdatedAt && (
          <div className="relative z-10">
            <AdminQueryError error={error} onRetry={refetch} label="app settings" />
          </div>
        )}

        {(
          // Always render the form — settings is seeded with defaults so the
          // page is never blank. Live values overlay these on first successful load.
          <div className="space-y-6 relative z-10">
            {(Object.keys(SECTION_META) as Section[]).map(sec => {
              const meta = SECTION_META[sec];
              const SecIcon = meta.icon;
              const keys = grouped[sec];
              return (
                <section key={sec} className="rounded-[18px] backdrop-blur-md overflow-hidden"
                  style={{
                    background: meta.danger ? `linear-gradient(180deg, rgba(239,68,68,0.04), ${C.cardBg})` : C.cardBg,
                    border: `1px solid ${meta.danger ? `${C.danger}33` : C.border}`,
                  }}>
                  <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${meta.danger ? `${C.danger}22` : C.border}` }}>
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                      style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}33` }}>
                      <SecIcon className="w-4 h-4" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>{meta.title}</h2>
                      <p className="text-[11px] mt-0.5" style={{ color: meta.danger ? `${C.danger}cc` : C.textMuted }}>{meta.subtitle}</p>
                    </div>
                    {meta.danger && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1.5"
                        style={{ background: `${C.danger}20`, color: C.danger, border: `1px solid ${C.danger}44` }}>
                        <AlertTriangle className="w-3 h-3" /> Danger Zone
                      </span>
                    )}
                  </div>

                  <div className="divide-y" style={{ borderColor: C.border }}>
                    {keys.map(key => {
                      const def = SETTING_DEFS[key];
                      const Icon = def.icon;
                      const val = settings[key] ?? def.default;
                      const flash = recentlySavedKeys.has(key);
                      return (
                        <div key={key} className="px-5 py-4 flex items-center gap-4 transition-all"
                          style={{ background: flash ? `${C.success}08` : "transparent", borderColor: meta.danger ? `${C.danger}10` : C.border }}>
                          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                            <Icon className="w-4 h-4" style={{ color: meta.danger ? C.danger : meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{def.label}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: C.textSecondary }}>{def.desc}</p>
                            <div
                              className="mt-2 inline-flex items-start gap-1.5 px-2 py-1 rounded-md max-w-full"
                              style={{
                                background: meta.danger ? `${C.danger}10` : `${meta.color}0d`,
                                border: `1px solid ${meta.danger ? `${C.danger}33` : `${meta.color}22`}`,
                              }}
                            >
                              <Zap className="w-3 h-3 mt-[1px] shrink-0" style={{ color: meta.danger ? C.danger : meta.color }} />
                              <span className="text-[10.5px] leading-snug font-medium" style={{ color: meta.danger ? `${C.danger}dd` : C.textSecondary }}>
                                <span className="uppercase tracking-wider mr-1" style={{ color: meta.danger ? C.danger : meta.color }}>Effect:</span>
                                {def.effect}
                              </span>
                            </div>
                          </div>

                          {/* Money input */}
                          {def.type === "money" && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center rounded-[10px] overflow-hidden"
                                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                                <span className="px-2.5 text-xs font-semibold border-r" style={{ color: C.primary, borderColor: C.border }}>₹</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatINR(val)}
                                  onChange={(e) => {
                                    const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                                    const paise = String(Math.round(Number(cleaned || 0) * 100));
                                    updateSetting(key, paise);
                                  }}
                                  className="w-32 h-9 px-3 text-xs text-right font-mono tabular-nums focus:outline-none"
                                  style={{ background: "transparent", color: C.textPrimary }}
                                />
                              </div>
                              {flash && <CheckCircle2 className="w-4 h-4 animate-in fade-in zoom-in" style={{ color: C.success }} />}
                            </div>
                          )}

                          {/* Plain number input */}
                          {def.type === "number" && (
                            <input
                              type="number"
                              value={val}
                              onChange={(e) => updateSetting(key, e.target.value)}
                              className="w-28 h-9 px-3 rounded-[10px] text-xs text-right font-mono focus:outline-none"
                              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }}
                            />
                          )}

                          {/* Toggle */}
                          {def.type === "toggle" && (
                            <Toggle
                              on={val === "true"}
                              danger={meta.danger}
                              color={meta.color}
                              onChange={() => {
                                if (key === "maintenance_mode" && val !== "true") { setMaintenanceOpen(true); return; }
                                if ((key === "freeze_all_transactions" || key === "disable_new_signups") && val !== "true") {
                                  setEmergencyOpen({ key, phase: 1 });
                                  return;
                                }
                                updateSetting(key, val === "true" ? "false" : "true", true);
                              }}
                            />
                          )}

                          {/* Razorpay mode (test/live) */}
                          {def.type === "mode" && (
                            <button
                              onClick={() => setModeChangeOpen(true)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                              style={{
                                background: isLive ? `linear-gradient(135deg, ${C.danger}, #dc2626)` : "rgba(255,255,255,0.04)",
                                color: isLive ? "#fff" : C.textPrimary,
                                border: `1px solid ${isLive ? C.danger : C.border}`,
                                boxShadow: isLive ? `0 0 20px ${C.danger}55` : "none",
                              }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isLive ? "#fff" : C.success, boxShadow: isLive ? "0 0 4px #fff" : `0 0 4px ${C.success}` }} />
                              {isLive ? "LIVE" : "TEST"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* ─── Razorpay Mode change modal ─── */}
        {modeChangeOpen && (
          <ConfirmModal
            title={isLive ? "Switch back to Test Mode?" : "Switch to LIVE Mode?"}
            danger={!isLive}
            description={isLive
              ? "Test mode uses sandbox transactions only. No real money will be moved."
              : "LIVE mode will process real transactions with real money. This affects all users immediately."}
            confirmText={isLive ? "Switch to Test" : "Type LIVE to confirm"}
            requireText={!isLive ? "LIVE" : undefined}
            onCancel={() => setModeChangeOpen(false)}
            onConfirm={() => {
              updateSetting("razorpay_mode", isLive ? "test" : "live", true);
              setModeChangeOpen(false);
              toast.success(`Razorpay switched to ${isLive ? "TEST" : "LIVE"} mode`);
            }}
          />
        )}

        {/* ─── Maintenance modal (typing required) ─── */}
        {maintenanceOpen && (
          <ConfirmModal
            title="Activate Maintenance Mode?"
            danger
            description="All user-facing features will be disabled until you turn this off. Users will see a maintenance screen when they open the app."
            confirmText="Type MAINTENANCE to confirm"
            requireText="MAINTENANCE"
            value={maintenanceText}
            onValueChange={setMaintenanceText}
            onCancel={() => { setMaintenanceOpen(false); setMaintenanceText(""); }}
            onConfirm={() => {
              updateSetting("maintenance_mode", "true", true);
              setMaintenanceOpen(false); setMaintenanceText("");
              toast.warning("⚠️ Maintenance mode activated");
            }}
          />
        )}

        {/* ─── Emergency two-phase confirm ─── */}
        {emergencyOpen && (
          <ConfirmModal
            title={emergencyOpen.phase === 1
              ? `Phase 1 of 2 — ${SETTING_DEFS[emergencyOpen.key].label}`
              : `Phase 2 of 2 — Final confirmation`}
            danger
            description={emergencyOpen.phase === 1
              ? `You are about to ${SETTING_DEFS[emergencyOpen.key].label.toLowerCase()}. This is a system-wide emergency action. Continue to the second confirmation.`
              : `Type CONFIRM EMERGENCY to execute. This action takes effect IMMEDIATELY.`}
            confirmText={emergencyOpen.phase === 1 ? "Continue to Phase 2" : "Type CONFIRM EMERGENCY"}
            requireText={emergencyOpen.phase === 2 ? "CONFIRM EMERGENCY" : undefined}
            value={emergencyOpen.phase === 2 ? emergencyText : undefined}
            onValueChange={emergencyOpen.phase === 2 ? setEmergencyText : undefined}
            onCancel={() => { setEmergencyOpen(null); setEmergencyText(""); }}
            onConfirm={() => {
              if (emergencyOpen.phase === 1) {
                setEmergencyOpen({ ...emergencyOpen, phase: 2 });
              } else {
                updateSetting(emergencyOpen.key, "true", true);
                toast.error(`🚨 ${SETTING_DEFS[emergencyOpen.key].label} ACTIVATED`);
                setEmergencyOpen(null); setEmergencyText("");
              }
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

/* ─── Reusable confirm modal with type-to-confirm ─── */
const ConfirmModal = ({
  title, description, confirmText, requireText, value, onValueChange, onCancel, onConfirm, danger,
}: {
  title: string; description: string; confirmText: string;
  requireText?: string; value?: string; onValueChange?: (v: string) => void;
  onCancel: () => void; onConfirm: () => void; danger?: boolean;
}) => {
  const [internalText, setInternalText] = useState("");
  const text = value !== undefined ? value : internalText;
  const setText = onValueChange || setInternalText;
  const valid = !requireText || text === requireText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={onCancel}>
      <div className="w-full max-w-md rounded-[20px] overflow-hidden" style={{ background: C.cardSolid, border: `1px solid ${danger ? C.danger + "55" : C.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: `${danger ? C.danger : C.primary}15`, border: `1px solid ${danger ? C.danger : C.primary}33` }}>
              <AlertTriangle className="w-5 h-5" style={{ color: danger ? C.danger : C.primary }} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>{title}</h3>
              <p className="text-xs mt-1.5" style={{ color: C.textSecondary }}>{description}</p>
            </div>
            <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-white/[0.04]" style={{ color: C.textSecondary }}><X className="w-4 h-4" /></button>
          </div>
          {requireText && (
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={requireText}
              className="w-full h-11 px-3 rounded-[10px] font-mono text-sm focus:outline-none mb-4"
              style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${valid ? C.success + "55" : C.border}`, color: valid ? C.success : C.textPrimary }} />
          )}
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 h-10 rounded-[10px] text-xs font-semibold" style={{ background: "rgba(255,255,255,0.04)", color: C.textPrimary, border: `1px solid ${C.border}` }}>Cancel</button>
            <button disabled={!valid} onClick={onConfirm} className="flex-1 h-10 rounded-[10px] text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: danger ? `linear-gradient(135deg, ${C.danger}, #dc2626)` : `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)` }}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
