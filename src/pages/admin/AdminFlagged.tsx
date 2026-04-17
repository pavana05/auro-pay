import { useEffect, useState, useCallback, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Flag, RefreshCw, AlertTriangle, ShieldCheck, X, Loader2, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const C = {
  bg: "rgba(13,14,18,0.7)",
  border: "rgba(200,149,46,0.10)",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.45)",
  primary: "#c8952e",
  danger: "#ef4444",
  warn: "#f59e0b",
  ok: "#10b981",
};

type Flagged = {
  id: string;
  transaction_id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  baseline_avg: number;
  baseline_stddev: number | null;
  zscore: number | null;
  multiplier: number;
  reason: string;
  detail: string;
  severity: "high" | "medium" | "low";
  status: "open" | "reviewed" | "dismissed" | "confirmed_fraud";
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  full_name?: string | null;
};

const STATUS_TABS: Array<{ key: Flagged["status"] | "all"; label: string }> = [
  { key: "open", label: "Open" },
  { key: "reviewed", label: "Reviewed" },
  { key: "dismissed", label: "Dismissed" },
  { key: "confirmed_fraud", label: "Fraud" },
  { key: "all", label: "All" },
];

const fmt = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function AdminFlagged() {
  const [rows, setRows] = useState<Flagged[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState<Flagged["status"] | "all">("open");
  const [selected, setSelected] = useState<Flagged | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q = supabase
      .from("flagged_transactions" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const { data, error } = await q;
    if (error) {
      toast.error("Failed to load flagged");
      setLoading(false);
      return;
    }
    const list = (data || []) as any as Flagged[];
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    let nameMap = new Map<string, string | null>();
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      nameMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
    }
    setRows(list.map((r) => ({ ...r, full_name: nameMap.get(r.user_id) ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: prepend new flags
  useEffect(() => {
    const ch = supabase
      .channel("flagged-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "flagged_transactions" }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("anomaly-scan", {
        body: { lookback_minutes: 1440 },
      });
      if (error) throw error;
      toast.success(`Scan complete · flagged ${data?.flagged_count ?? 0} of ${data?.scanned_count ?? 0}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const filtered = useMemo(
    () => (tab === "all" ? rows : rows.filter((r) => r.status === tab)),
    [rows, tab],
  );

  const counts = useMemo(() => ({
    open: rows.filter((r) => r.status === "open").length,
    high: rows.filter((r) => r.severity === "high" && r.status === "open").length,
    total: rows.length,
  }), [rows]);

  const updateStatus = async (id: string, status: Flagged["status"], note?: string) => {
    const { data: u } = await supabase.auth.getUser();
    const updates: any = {
      status,
      resolved_by: u.user?.id,
      resolved_at: new Date().toISOString(),
      resolution_note: note ?? null,
    };
    const { error } = await (supabase as any).from("flagged_transactions").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("audit_logs").insert({
      admin_user_id: u.user!.id,
      action: `flag_${status}`,
      target_type: "flagged_transaction",
      target_id: id,
      details: { note: note ?? null },
    } as any);
    toast.success(`Marked ${status.replace("_", " ")}`);
    setSelected(null);
    load();
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold font-sora" style={{ color: C.text }}>Flagged Transactions</h1>
            <p className="text-xs mt-1" style={{ color: C.muted }}>
              Anomaly engine · {counts.total} total · {counts.open} open · {counts.high} high-severity
            </p>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-xs font-semibold disabled:opacity-50"
            style={{ background: C.primary, color: "#0a0c0f" }}
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Run scan now
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-[10px] w-fit" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}>
          {STATUS_TABS.map((t) => {
            const n = t.key === "all" ? rows.length : rows.filter((r) => r.status === t.key).length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold transition"
                style={{
                  background: active ? C.primary : "transparent",
                  color: active ? "#0a0c0f" : C.muted,
                }}
              >
                {t.label} <span className="opacity-70">{n}</span>
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="rounded-[16px] overflow-hidden" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
          {loading ? (
            <div className="p-12 flex items-center justify-center" style={{ color: C.muted }}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <Flag className="w-10 h-10 mb-3" style={{ color: C.muted }} />
              <p className="text-sm font-medium" style={{ color: C.text }}>No flagged transactions</p>
              <p className="text-xs mt-1" style={{ color: C.muted }}>
                The engine scans hourly. Click "Run scan now" to scan the last 24h immediately.
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: C.border } as any}>
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full text-left p-4 hover:bg-white/[0.03] transition flex items-start gap-4"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: r.severity === "high" ? `${C.danger}20` : `${C.warn}20`,
                      border: `1px solid ${r.severity === "high" ? C.danger : C.warn}40`,
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" style={{ color: r.severity === "high" ? C.danger : C.warn }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold" style={{ color: C.text }}>{r.full_name || "Unknown"}</span>
                      <span className="text-[10px] font-mono" style={{ color: C.muted }}>{r.user_id.slice(0, 8)}…</span>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
                        style={{
                          background: r.severity === "high" ? `${C.danger}15` : `${C.warn}15`,
                          color: r.severity === "high" ? C.danger : C.warn,
                          border: `1px solid ${r.severity === "high" ? C.danger : C.warn}40`,
                        }}
                      >
                        {r.severity}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: C.muted }}>
                        {r.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>{r.reason}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: C.muted }}>{r.detail}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 text-[13px] font-bold font-mono" style={{ color: C.text }}>
                      <TrendingUp className="w-3 h-3" style={{ color: C.danger }} />
                      {fmt(r.amount)}
                    </div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: C.muted }}>
                      {r.multiplier}× avg
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>{fmtTime(r.created_at)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelected(null)} />
          <div
            className="fixed right-0 top-0 bottom-0 w-full max-w-[420px] z-50 overflow-y-auto p-5 space-y-4"
            style={{ background: "#0a0c0f", borderLeft: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-sora" style={{ color: C.text }}>Flag detail</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-[8px] hover:bg-white/[0.06]">
                <X className="w-4 h-4" style={{ color: C.muted }} />
              </button>
            </div>

            <div className="rounded-[12px] p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
              <div className="text-[11px] uppercase tracking-wider font-bold" style={{ color: C.muted }}>Reasoning</div>
              <div className="text-[13px] font-semibold" style={{ color: C.text }}>{selected.reason}</div>
              <div className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{selected.detail}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Amount" value={fmt(selected.amount)} accent={C.danger} />
              <Stat label="Multiplier" value={`${selected.multiplier}×`} />
              <Stat label="30d avg" value={fmt(selected.baseline_avg)} />
              <Stat label="Z-score" value={selected.zscore != null ? String(selected.zscore) : "—"} />
            </div>

            <div className="rounded-[12px] p-4 space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
              <Row k="User" v={selected.full_name || "Unknown"} />
              <Row k="User ID" v={selected.user_id} mono />
              <Row k="Txn ID" v={selected.transaction_id} mono />
              <Row k="Wallet" v={selected.wallet_id} mono />
              <Row k="Flagged at" v={fmtTime(selected.created_at)} />
              <Row k="Status" v={selected.status.replace("_", " ")} />
              {selected.resolved_at && <Row k="Resolved" v={fmtTime(selected.resolved_at)} />}
              {selected.resolution_note && <Row k="Note" v={selected.resolution_note} />}
            </div>

            {selected.status === "open" && (
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => updateStatus(selected.id, "confirmed_fraud", "Marked as fraud from flag review")}
                  className="w-full py-2.5 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-2"
                  style={{ background: C.danger, color: "#fff" }}
                >
                  <AlertTriangle className="w-4 h-4" /> Confirm fraud
                </button>
                <button
                  onClick={() => updateStatus(selected.id, "reviewed", "Reviewed, not fraudulent")}
                  className="w-full py-2.5 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-2"
                  style={{ background: C.primary, color: "#0a0c0f" }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark reviewed
                </button>
                <button
                  onClick={() => updateStatus(selected.id, "dismissed", "Dismissed as expected behavior")}
                  className="w-full py-2.5 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-2"
                  style={{ background: "rgba(255,255,255,0.06)", color: C.text, border: `1px solid ${C.border}` }}
                >
                  <ShieldCheck className="w-4 h-4" /> Dismiss
                </button>
              </div>
            )}
            {selected.status !== "open" && (
              <div className="flex items-center gap-2 text-[11px]" style={{ color: C.muted }}>
                <Clock className="w-3.5 h-3.5" /> Already resolved
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-[12px] p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: C.muted }}>{label}</div>
      <div className="text-sm font-bold font-mono mt-0.5" style={{ color: accent || C.text }}>{value}</div>
    </div>
  );
}
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span style={{ color: C.muted }}>{k}</span>
      <span className={mono ? "font-mono" : ""} style={{ color: C.text }}>
        {mono && v.length > 16 ? `${v.slice(0, 16)}…` : v}
      </span>
    </div>
  );
}
