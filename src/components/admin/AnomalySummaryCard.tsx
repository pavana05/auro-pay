import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, AlertTriangle, ArrowUpRight, RefreshCw } from "lucide-react";
import { Sparkline } from "@/components/admin/charts";

interface FlagRow {
  id: string;
  status: string;
  severity: string;
  created_at: string;
}

const C = {
  danger: "#ef4444",
  warning: "#f59e0b",
  primary: "#c8952e",
  text: "#f5f5f5",
  muted: "rgba(255,255,255,0.55)",
  border: "rgba(255,255,255,0.06)",
};

export default function AnomalySummaryCard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [openCount, setOpenCount] = useState(0);
  const [highCount, setHighCount] = useState(0);
  const [series, setSeries] = useState<number[]>([]);
  const [priorTotal, setPriorTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    // Pull 28 days so we can compute the prior 14d window for trend delta.
    const since28 = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await (supabase as any)
      .from("flagged_transactions")
      .select("id, status, severity, created_at")
      .gte("created_at", since28)
      .limit(4000);

    const rows: FlagRow[] = data || [];
    // Open/high counts are point-in-time across the full lookback (open flags don't expire daily).
    setOpenCount(rows.filter((r) => r.status === "open").length);
    setHighCount(rows.filter((r) => r.severity === "high" && r.status === "open").length);

    // Bucket per day for last 14 days; track prior 14d (days 14–27) for delta comparison.
    const buckets = new Array(14).fill(0);
    let prior = 0;
    const startDay = new Date(); startDay.setHours(0, 0, 0, 0);
    rows.forEach((r) => {
      const d = new Date(r.created_at); d.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((startDay.getTime() - d.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays < 14) {
        buckets[13 - diffDays] += 1;
      } else if (diffDays >= 14 && diffDays < 28) {
        prior += 1;
      }
    });
    setSeries(buckets);
    setPriorTotal(prior);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("anomaly-summary-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "flagged_transactions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const totalLast14 = series.reduce((a, b) => a + b, 0);
  // Tier sparkline color based on sustained anomaly volume over last 14 days.
  const sparkColor = totalLast14 > 50 ? C.danger : totalLast14 > 20 ? C.warning : C.primary;
  const tierLabel = totalLast14 > 50 ? "Critical spike" : totalLast14 > 20 ? "Elevated" : "Normal";
  const tierColor = sparkColor;

  // Trend delta vs prior 14d window. If prior is 0, show "new" when current > 0.
  let deltaLabel = "";
  let deltaColor = C.muted;
  if (priorTotal === 0 && totalLast14 === 0) {
    deltaLabel = "no change";
  } else if (priorTotal === 0) {
    deltaLabel = `+${totalLast14} new vs prior 14d`;
    deltaColor = C.danger;
  } else {
    const pct = Math.round(((totalLast14 - priorTotal) / priorTotal) * 100);
    const sign = pct > 0 ? "+" : "";
    deltaLabel = `${sign}${pct}% vs prior 14d`;
    deltaColor = pct >= 25 ? C.danger : pct >= 10 ? C.warning : pct <= -10 ? "#22c55e" : C.muted;
  }

  return (
    <button
      onClick={() => nav("/admin/flagged")}
      className="text-left rounded-[16px] border p-4 lg:p-5 space-y-3 transition hover:-translate-y-0.5"
      style={{
        background: "rgba(13,14,18,0.85)",
        borderColor: totalLast14 > 50 ? "rgba(239,68,68,0.35)" : totalLast14 > 20 ? "rgba(245,158,11,0.28)" : (openCount > 0 ? "rgba(239,68,68,0.22)" : C.border),
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center"
            style={{ background: `${C.danger}14`, border: `1px solid ${C.danger}30` }}
          >
            <ShieldAlert className="w-4 h-4" style={{ color: C.danger }} />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold font-sora" style={{ color: C.text }}>Anomalies · 14d</h3>
            <p className="text-[10px] font-sora" style={{ color: C.muted }}>{totalLast14} flagged</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: C.muted }}>
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowUpRight className="w-3 h-3" />}
          View all
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-[10px] p-2.5"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
        >
          <div className="text-[10px] font-sora" style={{ color: C.muted }}>Open flags</div>
          <div className="text-[18px] font-bold font-mono mt-0.5" style={{ color: C.text }}>{openCount}</div>
        </div>
        <div
          className="rounded-[10px] p-2.5"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="text-[10px] font-sora flex items-center gap-1" style={{ color: C.muted }}>
            <AlertTriangle className="w-2.5 h-2.5" /> High severity
          </div>
          <div className="text-[18px] font-bold font-mono mt-0.5" style={{ color: C.warning }}>{highCount}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-sora" style={{ color: C.muted }}>Flags / day</span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ color: tierColor, background: `${tierColor}14`, border: `1px solid ${tierColor}30` }}
            title={`14d total: ${totalLast14}`}
          >
            {tierLabel} · {totalLast14}
          </span>
        </div>
        <div className="h-12">
          <Sparkline data={series.length ? series : [0, 0, 0, 0, 0, 0, 0]} color={sparkColor} />
        </div>
      </div>
    </button>
  );
}
