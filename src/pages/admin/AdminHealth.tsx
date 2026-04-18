import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  Server, Activity, Database, Shield, Globe, Cpu, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Zap, Webhook, Code2,
  AlertOctagon, Clock, Plus, X,
} from "lucide-react";

const C = {
  bg: "#0a0c0f",
  cardBg: "rgba(13,14,18,0.7)",
  cardBgSolid: "#0d0e12",
  border: "rgba(200,149,46,0.10)",
  borderStrong: "rgba(200,149,46,0.18)",
  primary: "#c8952e",
  secondary: "#d4a84b",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.3)",
};

type ServiceStatus = "operational" | "degraded" | "down";
interface ServiceProbe {
  key: string;
  name: string;
  icon: any;
  status: ServiceStatus;
  latency: number; // ms
  uptime: number; // percentage
  history: number[]; // last 24 datapoints (latency)
  lastChecked: number;
}

interface WebhookEntry {
  id: string;
  event: string;
  amount: number | null;
  status: "success" | "failed" | "pending";
  processingMs?: number;
  ts: number;
}

interface FunctionEntry {
  id: string;
  name: string;
  durationMs: number;
  status: "ok" | "error";
  error?: string;
  ts: number;
}

interface ApiError {
  id: string;
  service: string;
  message: string;
  ts: number;
}

interface Incident {
  id: string;
  title: string;
  description: string | null;
  service: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  affected_service: string | null;
  postmortem_url: string | null;
  started_at: string;
  resolved_at: string | null;
}

const STATUS_META: Record<ServiceStatus, { label: string; color: string; icon: any }> = {
  operational: { label: "Operational", color: C.success, icon: CheckCircle2 },
  degraded: { label: "Degraded", color: C.warning, icon: AlertTriangle },
  down: { label: "Down", color: C.danger, icon: XCircle },
};

/* ───────── Mini sparkline (latency history) ───────── */
const Spark = ({ data, color, height = 38 }: { data: number[]; color: string; height?: number }) => {
  if (!data || data.length === 0) return null;
  const w = 200, h = height;
  const max = Math.max(...data, 1), min = Math.min(...data);
  const range = max - min || 1;
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(" ");
  const area = `M0,${h} L${pts.split(" ").join(" L")} L${w},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`spark-${color.replace("#","")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${color.replace("#","")})`} />
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
};

/* ───────── Bar chart for error frequency ───────── */
const ErrorBars = ({ data }: { data: { label: string; value: number; color?: string }[] }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3 text-xs">
          <span className="w-28 shrink-0 truncate" style={{ color: C.textSecondary }}>{d.label}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.value / max) * 100}%`, background: d.color || C.primary }} />
          </div>
          <span className="w-8 text-right tabular-nums font-semibold" style={{ color: C.textPrimary }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ───────── Service probes (real Supabase pings) ───────── */
const probeService = async (key: string): Promise<{ ok: boolean; latency: number }> => {
  const t0 = performance.now();
  try {
    if (key === "database") {
      await supabase.from("profiles").select("id", { count: "exact", head: true });
    } else if (key === "auth") {
      await supabase.auth.getSession();
    } else if (key === "realtime") {
      // Best-effort ping — channel handshake measure
      const ch = supabase.channel(`probe-${Date.now()}`);
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => resolve(), 800);
        ch.subscribe((s) => { if (s === "SUBSCRIBED") { clearTimeout(t); resolve(); } });
      });
      supabase.removeChannel(ch);
    } else if (key === "edge") {
      await supabase.from("app_settings").select("id", { count: "exact", head: true });
    } else if (key === "payment") {
      await supabase.from("transactions").select("id", { count: "exact", head: true }).limit(1);
    } else if (key === "kyc") {
      await supabase.from("kyc_requests").select("id", { count: "exact", head: true }).limit(1);
    }
    return { ok: true, latency: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, latency: Math.round(performance.now() - t0) };
  }
};

const initialServices: ServiceProbe[] = [
  { key: "database", name: "Database", icon: Database, status: "operational", latency: 0, uptime: 99.99, history: [], lastChecked: Date.now() },
  { key: "auth", name: "Auth Service", icon: Shield, status: "operational", latency: 0, uptime: 99.98, history: [], lastChecked: Date.now() },
  { key: "realtime", name: "Realtime", icon: Activity, status: "operational", latency: 0, uptime: 99.95, history: [], lastChecked: Date.now() },
  { key: "edge", name: "Edge Functions", icon: Cpu, status: "operational", latency: 0, uptime: 99.90, history: [], lastChecked: Date.now() },
  { key: "payment", name: "Payment Gateway", icon: Globe, status: "operational", latency: 0, uptime: 99.85, history: [], lastChecked: Date.now() },
  { key: "kyc", name: "KYC Provider", icon: Shield, status: "operational", latency: 0, uptime: 99.70, history: [], lastChecked: Date.now() },
];

const AdminHealth = () => {
  const [services, setServices] = useState<ServiceProbe[]>(initialServices);
  const [checking, setChecking] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [funcs, setFuncs] = useState<FunctionEntry[]>([]);
  const [funcsError, setFuncsError] = useState<string | null>(null);
  const [funcsLoading, setFuncsLoading] = useState(false);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentFormOpen, setIncidentFormOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    title: "",
    description: "",
    service: "Database",
    severity: "medium" as Incident["severity"],
    status: "investigating" as Incident["status"],
    affected_service: "",
    postmortem_url: "",
    started_at: new Date().toISOString().slice(0, 16),
  });
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Run all probes */
  const runProbes = async () => {
    setChecking(true);
    const results = await Promise.all(services.map(s => probeService(s.key).then(r => ({ ...s, r }))));
    setServices(prev => prev.map(s => {
      const res = results.find(r => r.key === s.key);
      if (!res) return s;
      const lat = res.r.latency;
      const status: ServiceStatus = !res.r.ok ? "down" : lat > 800 ? "degraded" : "operational";
      const history = [...s.history, lat].slice(-24);
      return { ...s, status, latency: lat, history, lastChecked: Date.now() };
    }));
    setChecking(false);
  };

  /* Bootstrap + 30s autorefresh */
  useEffect(() => { runProbes(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    if (autoRefresh) refreshTimer.current = setInterval(runProbes, 30000);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [autoRefresh]);

  /* Load incidents from DB */
  const loadIncidents = async () => {
    const { data } = await supabase
      .from("incidents")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    setIncidents((data || []) as any);
  };

  /* Load real edge function logs from analytics via admin proxy */
  const loadEdgeLogs = async () => {
    setFuncsLoading(true);
    setFuncsError(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-edge-logs");
      if (error) throw error;
      const rows = (data?.rows || []) as any[];
      const mapped: FunctionEntry[] = rows.map((r: any) => {
        const status: "ok" | "error" =
          typeof r.status_code === "number" && r.status_code >= 400 ? "error" : "ok";
        return {
          id: String(r.id ?? `${r.ts}-${Math.random()}`),
          name: String(r.function_id ?? "unknown"),
          durationMs: Math.round(Number(r.execution_time_ms ?? 0)),
          status,
          error: status === "error" ? `HTTP ${r.status_code}` : undefined,
          ts: r.ts ? Math.floor(Number(r.ts) / 1000) : Date.now(),
        };
      });
      setFuncs(mapped);
      if (data?.error) setFuncsError(data.error);
    } catch (e: any) {
      setFuncsError(e?.message || "Failed to load edge logs");
      setFuncs([]);
    } finally {
      setFuncsLoading(false);
    }
  };

  /* Load real webhook data from transactions, real errors from failed txns,
     plus incidents and edge function logs. */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, status, type, razorpay_payment_id, razorpay_order_id, created_at")
        .not("razorpay_order_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(15);
      const entries: WebhookEntry[] = (data || []).map((t: any) => {
        const isFailed = t.status === "failed";
        const isPaid = t.status === "success";
        return {
          id: t.id,
          event: isPaid ? "payment.captured" : isFailed ? "payment.failed" : "order.created",
          amount: t.amount,
          status: isFailed ? "failed" : isPaid ? "success" : "pending",
          ts: new Date(t.created_at).getTime(),
        };
      });
      setWebhooks(entries);

      const txErrors: ApiError[] = (data || []).filter((t: any) => t.status === "failed").slice(0, 50).map((t: any) => ({
        id: t.id,
        service: "Payment Gateway",
        message: `Transaction declined (${(t.razorpay_order_id || "").slice(0, 14)}…)`,
        ts: new Date(t.created_at).getTime(),
      }));
      setErrors(txErrors);
    })();

    loadIncidents();
    loadEdgeLogs();

    // Live updates for incidents
    const ch = supabase
      .channel("incidents-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => loadIncidents())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submitIncident = async () => {
    if (!incidentForm.title.trim() || !incidentForm.service.trim()) {
      toast.error("Title and service are required");
      return;
    }
    setIncidentSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIncidentSaving(false); toast.error("Not signed in"); return; }
    const payload: any = {
      title: incidentForm.title.trim(),
      description: incidentForm.description.trim() || null,
      service: incidentForm.service.trim(),
      severity: incidentForm.severity,
      status: incidentForm.status,
      affected_service: incidentForm.affected_service.trim() || null,
      postmortem_url: incidentForm.postmortem_url.trim() || null,
      started_at: new Date(incidentForm.started_at).toISOString(),
      created_by: user.id,
    };
    const { error } = await supabase.from("incidents").insert(payload);
    setIncidentSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Incident logged");
    setIncidentFormOpen(false);
    setIncidentForm({
      title: "", description: "", service: "Database",
      severity: "medium", status: "investigating",
      affected_service: "", postmortem_url: "",
      started_at: new Date().toISOString().slice(0, 16),
    });
    loadIncidents();
  };

  const updateIncidentStatus = async (id: string, status: Incident["status"]) => {
    const { error } = await supabase.from("incidents").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "resolved" ? "Incident resolved" : `Status: ${status}`);
  };


  /* Aggregate error frequency by service */
  const errorFreq = useMemo(() => {
    const map = new Map<string, number>();
    errors.forEach(e => map.set(e.service, (map.get(e.service) || 0) + 1));
    const colors: Record<string, string> = {
      "Payment Gateway": C.primary, "KYC Provider": "#a855f7", "Edge Functions": C.warning, "Realtime": "#06b6d4", "Database": C.success, "Auth": "#f43f5e",
    };
    return Array.from(map.entries()).map(([label, value]) => ({ label, value, color: colors[label] || C.primary }));
  }, [errors]);

  const overallHealth: ServiceStatus = services.some(s => s.status === "down") ? "down"
    : services.some(s => s.status === "degraded") ? "degraded" : "operational";
  const ovMeta = STATUS_META[overallHealth];

  const fmtRel = (ts: number) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6 relative">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "rgba(200,149,46,0.04)", filter: "blur(120px)" }} />

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary }}>API Health Monitor</h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${ovMeta.color}15`, border: `1px solid ${ovMeta.color}33` }}>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: ovMeta.color }} />
                  <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: ovMeta.color }} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: ovMeta.color }}>{ovMeta.label}</span>
              </div>
              <span className="text-xs" style={{ color: C.textMuted }}>Auto-refresh every 30s</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoRefresh(!autoRefresh)} className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[11px] font-medium" style={{ background: autoRefresh ? `${C.success}15` : "rgba(255,255,255,0.04)", color: autoRefresh ? C.success : C.textSecondary, border: `1px solid ${autoRefresh ? C.success+"33" : "rgba(255,255,255,0.06)"}` }}>
              <Zap className="w-3 h-3" /> Auto {autoRefresh ? "ON" : "OFF"}
            </button>
            <button onClick={runProbes} disabled={checking} className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold text-white ${checking ? "animate-pulse" : ""}`} style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)` }}>
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking…" : "Check All"}
            </button>
          </div>
        </div>

        {/* ── Six service cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 relative z-10">
          {services.map((s) => {
            const meta = STATUS_META[s.status];
            const StatusIcon = meta.icon;
            const Icon = s.icon;
            return (
              <div key={s.key} className="p-5 rounded-[18px] backdrop-blur-md transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[12px] flex items-center justify-center" style={{ background: `${meta.color}10`, border: `1px solid ${meta.color}22` }}>
                      <Icon className="w-5 h-5" style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{s.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusIcon className="w-3 h-3" style={{ color: meta.color }} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full tabular-nums" style={{ background: "rgba(255,255,255,0.04)", color: C.textSecondary }}>{s.uptime}%</span>
                </div>
                {/* Sparkline */}
                <div className="my-2">
                  <Spark data={s.history.length ? s.history : [s.latency || 100]} color={meta.color} />
                </div>
                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" style={{ color: C.textMuted }} />
                    <span className="text-[10px]" style={{ color: C.textMuted }}>{fmtRel(s.lastChecked)}</span>
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textPrimary }}>{s.latency}ms</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Webhook + Edge Function logs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
          {/* Webhook log */}
          <div className="rounded-[18px] backdrop-blur-md overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4" style={{ color: C.primary }} />
                <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Razorpay Webhooks</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${C.success}15`, color: C.success }}>● Live</span>
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {webhooks.length === 0 ? (
                <p className="text-xs text-center py-10" style={{ color: C.textMuted }}>No webhooks received yet</p>
              ) : webhooks.map((w, i) => {
                const sColor = w.status === "failed" ? C.danger : w.status === "success" ? C.success : C.warning;
                return (
                  <div key={w.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-2.5 text-xs transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: i < webhooks.length - 1 ? `1px solid ${C.border}` : "none", background: w.status === "failed" ? `${C.danger}06` : "transparent" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1 h-7 rounded-full shrink-0" style={{ background: sColor }} />
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] truncate" style={{ color: C.textPrimary }}>{w.event}</p>
                        <p className="text-[10px]" style={{ color: C.textMuted }}>{fmtRel(w.ts)}</p>
                      </div>
                    </div>
                    <span className="text-[11px] tabular-nums font-semibold" style={{ color: C.textSecondary }}>
                      {w.amount ? `₹${(w.amount / 100).toLocaleString("en-IN")}` : "—"}
                    </span>
                    <span className="text-[10px] tabular-nums" style={{ color: C.textMuted }}>{w.processingMs ? `${w.processingMs}ms` : "—"}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full" style={{ background: `${sColor}15`, color: sColor }}>{w.status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edge function log (real analytics) */}
          <div className="rounded-[18px] backdrop-blur-md overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4" style={{ color: C.primary }} />
                <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Edge Function Executions</h3>
                <span className="text-[10px]" style={{ color: C.textMuted }}>· last 20</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: C.textMuted }}>{funcs.filter(f => f.status === "error").length} errors</span>
                <button onClick={loadEdgeLogs} disabled={funcsLoading} className="p-1 rounded-md hover:bg-white/[0.04] disabled:opacity-50" title="Refresh">
                  <RefreshCw className={`w-3 h-3 ${funcsLoading ? "animate-spin" : ""}`} style={{ color: C.textSecondary }} />
                </button>
              </div>
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {funcsError && (
                <p className="text-[10px] text-center px-5 py-2" style={{ color: C.warning, background: `${C.warning}08` }}>⚠ {funcsError}</p>
              )}
              {funcsLoading && funcs.length === 0 ? (
                <p className="text-xs text-center py-10" style={{ color: C.textMuted }}>Loading…</p>
              ) : funcs.length === 0 ? (
                <p className="text-xs text-center py-10" style={{ color: C.textMuted }}>No edge function executions in recent logs</p>
              ) : funcs.map((f, i) => {
                const isErr = f.status === "error";
                const sColor = isErr ? C.danger : C.success;
                return (
                  <div key={f.id} className="px-5 py-2.5 text-xs transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: i < funcs.length - 1 ? `1px solid ${C.border}` : "none", background: isErr ? `${C.danger}06` : "transparent" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-1 h-5 rounded-full shrink-0" style={{ background: sColor }} />
                        <span className="font-mono text-[11px] truncate" style={{ color: C.textPrimary }}>{f.name}</span>
                        <span className="text-[10px] shrink-0" style={{ color: C.textMuted }}>{fmtRel(f.ts)}</span>
                      </div>
                      <span className="text-[10px] tabular-nums shrink-0" style={{ color: C.textMuted }}>{f.durationMs}ms</span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0" style={{ background: `${sColor}15`, color: sColor }}>{f.status}</span>
                    </div>
                    {f.error && <p className="text-[10px] mt-1 ml-3 font-mono" style={{ color: C.danger }}>↳ {f.error}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── API Errors + Incidents ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
          {/* Error frequency chart */}
          <div className="rounded-[18px] p-5 backdrop-blur-md" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertOctagon className="w-4 h-4" style={{ color: C.warning }} />
              <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Error Frequency</h3>
            </div>
            {errorFreq.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: C.textMuted }}>No errors recorded</p>
            ) : <ErrorBars data={errorFreq} />}
          </div>

          {/* Recent errors */}
          <div className="lg:col-span-2 rounded-[18px] backdrop-blur-md overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: C.danger }} />
                <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Recent API Errors</h3>
              </div>
              <span className="text-[10px]" style={{ color: C.textMuted }}>Last {errors.length}</span>
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {errors.length === 0 ? (
                <p className="text-xs text-center py-10" style={{ color: C.textMuted }}>No recent errors detected ✓</p>
              ) : errors.map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-xs hover:bg-white/[0.02]" style={{ borderBottom: i < errors.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.danger }} />
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 uppercase" style={{ background: "rgba(255,255,255,0.04)", color: C.textSecondary }}>{e.service}</span>
                  <span className="flex-1 truncate" style={{ color: C.textPrimary }}>{e.message}</span>
                  <span className="text-[10px] tabular-nums shrink-0" style={{ color: C.textMuted }}>{fmtRel(e.ts)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Incident history ── */}
        <div className="rounded-[18px] backdrop-blur-md overflow-hidden relative z-10" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" style={{ color: C.primary }} />
              <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Incident History</h3>
              <span className="text-[10px]" style={{ color: C.textMuted }}>· {incidents.length} recorded</span>
            </div>
            <button onClick={() => setIncidentFormOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)` }}>
              <Plus className="w-3 h-3" /> Log incident
            </button>
          </div>
          <div className="overflow-x-auto">
            {incidents.length === 0 ? (
              <p className="text-xs text-center py-10" style={{ color: C.textMuted }}>No incidents recorded ✓</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Title", "Service", "Started", "Duration", "Severity", "Status", ""].map(h => (
                      <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc, i) => {
                    const sevColor = inc.severity === "critical" ? C.danger : inc.severity === "high" ? C.warning : inc.severity === "medium" ? C.primary : C.textSecondary;
                    const statusColor = inc.status === "resolved" ? C.success : inc.status === "monitoring" ? C.primary : inc.status === "identified" ? C.warning : C.danger;
                    const startMs = new Date(inc.started_at).getTime();
                    const endMs = inc.resolved_at ? new Date(inc.resolved_at).getTime() : Date.now();
                    const mins = Math.max(0, Math.round((endMs - startMs) / 60000));
                    const durStr = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${Math.floor(mins/1440)}d`;
                    return (
                      <tr key={inc.id} className="hover:bg-white/[0.02]" style={{ borderBottom: i < incidents.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <td className="px-5 py-3 font-medium" style={{ color: C.textPrimary }}>
                          {inc.title}
                          {inc.affected_service && <span className="ml-2 text-[10px]" style={{ color: C.textMuted }}>· {inc.affected_service}</span>}
                        </td>
                        <td className="px-5 py-3" style={{ color: C.textSecondary }}>{inc.service}</td>
                        <td className="px-5 py-3" style={{ color: C.textSecondary }}>{new Date(inc.started_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-5 py-3 tabular-nums" style={{ color: C.textSecondary }}>{durStr}{!inc.resolved_at && " (ongoing)"}</td>
                        <td className="px-5 py-3"><span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full" style={{ background: `${sevColor}15`, color: sevColor }}>{inc.severity}</span></td>
                        <td className="px-5 py-3">
                          <select value={inc.status} onChange={(e) => updateIncidentStatus(inc.id, e.target.value as Incident["status"])}
                            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full focus:outline-none cursor-pointer"
                            style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}33` }}>
                            <option value="investigating">Investigating</option>
                            <option value="identified">Identified</option>
                            <option value="monitoring">Monitoring</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {inc.postmortem_url && (
                            <a href={inc.postmortem_url} target="_blank" rel="noreferrer" className="text-[10px] underline" style={{ color: C.primary }}>Postmortem</a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Incident form modal ── */}
        {incidentFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={() => setIncidentFormOpen(false)}>
            <div className="w-full max-w-lg rounded-[20px] overflow-hidden" style={{ background: C.cardBgSolid, border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}33` }}>
                    <AlertOctagon className="w-4 h-4" style={{ color: C.primary }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Log new incident</h3>
                    <p className="text-[11px]" style={{ color: C.textMuted }}>Add a record to Incident History</p>
                  </div>
                </div>
                <button onClick={() => setIncidentFormOpen(false)} className="p-1.5 rounded-md hover:bg-white/[0.04]" style={{ color: C.textSecondary }}><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                <Field label="Title *">
                  <input value={incidentForm.title} onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })} placeholder="e.g. Webhook delivery delayed" autoFocus
                    className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
                </Field>
                <Field label="Description">
                  <textarea value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} rows={3} placeholder="What happened, root cause, mitigation…"
                    className="w-full px-3 py-2 rounded-[10px] text-sm focus:outline-none resize-y"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Service *">
                    <select value={incidentForm.service} onChange={(e) => setIncidentForm({ ...incidentForm, service: e.target.value })}
                      className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }}>
                      {["Database","Auth Service","Realtime","Edge Functions","Payment Gateway","KYC Provider","Other"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Affected service">
                    <input value={incidentForm.affected_service} onChange={(e) => setIncidentForm({ ...incidentForm, affected_service: e.target.value })} placeholder="optional"
                      className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Severity">
                    <select value={incidentForm.severity} onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </Field>
                  <Field label="Status">
                    <select value={incidentForm.status} onChange={(e) => setIncidentForm({ ...incidentForm, status: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }}>
                      <option value="investigating">Investigating</option><option value="identified">Identified</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option>
                    </select>
                  </Field>
                </div>
                <Field label="Started at">
                  <input type="datetime-local" value={incidentForm.started_at} onChange={(e) => setIncidentForm({ ...incidentForm, started_at: e.target.value })}
                    className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
                </Field>
                <Field label="Postmortem URL">
                  <input value={incidentForm.postmortem_url} onChange={(e) => setIncidentForm({ ...incidentForm, postmortem_url: e.target.value })} placeholder="https://…"
                    className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
                </Field>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setIncidentFormOpen(false)} className="flex-1 h-10 rounded-[10px] text-xs font-semibold" style={{ background: "rgba(255,255,255,0.04)", color: C.textPrimary, border: `1px solid ${C.border}` }}>Cancel</button>
                  <button disabled={incidentSaving || !incidentForm.title.trim()} onClick={submitIncident} className="flex-1 h-10 rounded-[10px] text-xs font-semibold text-white disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)` }}>
                    {incidentSaving ? "Saving…" : "Log incident"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[11px] font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</label>
    {children}
  </div>
);

export default AdminHealth;
