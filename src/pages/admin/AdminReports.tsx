import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  FileText, Users, Wallet, AlertTriangle, UserPlus, ShieldCheck,
  Calendar, Target, Sparkles, Download, Play, Mail, Plus, X, Save, Clock,
  TrendingUp, ChevronRight,
} from "lucide-react";

/* ───────────────────── Types & helpers ───────────────────── */
type ColumnDef = { key: string; label: string };
type ReportResult = { columns: ColumnDef[]; rows: Record<string, any>[]; meta?: string };

const fmtINR = (paise: number | null | undefined) => {
  if (paise == null) return "—";
  if (paise >= 10000000) return `₹${(paise / 10000000).toFixed(2)}Cr`;
  if (paise >= 100000) return `₹${(paise / 100000).toFixed(2)}L`;
  if (paise >= 1000) return `₹${(paise / 1000).toFixed(1)}K`;
  return `₹${(paise / 100).toFixed(2)}`;
};
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

/* ───────────────────── Pre-built report definitions ───────────────────── */
interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  run: () => Promise<ReportResult>;
}

const REPORTS: ReportDef[] = [
  {
    id: "monthly-summary",
    title: "Monthly Summary",
    description: "Users, txns, volume & success rate this month",
    icon: Calendar,
    color: "primary",
    run: async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [{ data: tx }, { count: newUsers }, { count: kycVerified }] = await Promise.all([
        supabase.from("transactions").select("amount, status, type").gte("created_at", monthStart.toISOString()),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("kyc_status", "verified").gte("created_at", monthStart.toISOString()),
      ]);
      const txns = tx || [];
      const success = txns.filter((t) => t.status === "success");
      const credits = success.filter((t) => t.type === "credit");
      const debits = success.filter((t) => t.type === "debit");
      const totalVol = success.reduce((s, t) => s + (t.amount || 0), 0);
      const successRate = txns.length ? ((success.length / txns.length) * 100).toFixed(1) + "%" : "—";
      return {
        columns: [{ key: "metric", label: "Metric" }, { key: "value", label: "Value" }],
        rows: [
          { metric: "New users", value: newUsers ?? 0 },
          { metric: "KYC verified", value: kycVerified ?? 0 },
          { metric: "Total transactions", value: txns.length },
          { metric: "Successful", value: success.length },
          { metric: "Success rate", value: successRate },
          { metric: "Credits volume", value: fmtINR(credits.reduce((s, t) => s + t.amount, 0)) },
          { metric: "Debits volume", value: fmtINR(debits.reduce((s, t) => s + t.amount, 0)) },
          { metric: "Total volume", value: fmtINR(totalVol) },
        ],
        meta: `Since ${fmtDate(monthStart.toISOString())}`,
      };
    },
  },
  {
    id: "top-teens",
    title: "Top 100 Teens by Volume",
    description: "Highest-spending teens by debit volume",
    icon: TrendingUp,
    color: "warning",
    run: async () => {
      const [{ data: teens }, { data: wallets }, { data: txns }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").eq("role", "teen"),
        supabase.from("wallets").select("id, user_id"),
        supabase.from("transactions").select("amount, wallet_id, type, status").eq("status", "success").eq("type", "debit").limit(5000),
      ]);
      const w2u: Record<string, string> = {};
      (wallets || []).forEach((w: any) => (w2u[w.id] = w.user_id));
      const byUser: Record<string, { volume: number; count: number }> = {};
      (txns || []).forEach((t: any) => {
        const uid = w2u[t.wallet_id]; if (!uid) return;
        byUser[uid] ||= { volume: 0, count: 0 };
        byUser[uid].volume += t.amount; byUser[uid].count++;
      });
      const teenMap = new Map((teens || []).map((t: any) => [t.id, t]));
      const rows = Object.entries(byUser)
        .filter(([uid]) => teenMap.has(uid))
        .map(([uid, v]) => ({
          name: (teenMap.get(uid) as any)?.full_name || "—",
          phone: (teenMap.get(uid) as any)?.phone || "—",
          volume: fmtINR(v.volume),
          txns: v.count,
        }))
        .sort((a, b) => b.txns - a.txns)
        .slice(0, 100);
      return {
        columns: [
          { key: "name", label: "Teen" }, { key: "phone", label: "Phone" },
          { key: "volume", label: "Volume" }, { key: "txns", label: "Transactions" },
        ],
        rows,
      };
    },
  },
  {
    id: "zero-balance",
    title: "Zero Balance Wallets",
    description: "Active accounts with ₹0 balance",
    icon: Wallet,
    color: "muted",
    run: async () => {
      const { data: wallets } = await supabase.from("wallets").select("id, user_id, balance, is_frozen, created_at").eq("balance", 0);
      const userIds = (wallets || []).map((w: any) => w.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone, role").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const rows = (wallets || []).map((w: any) => {
        const p = pMap.get(w.user_id);
        return {
          name: p?.full_name || "—",
          phone: p?.phone || "—",
          role: p?.role || "—",
          frozen: w.is_frozen ? "Yes" : "No",
          created: fmtDate(w.created_at),
        };
      });
      return {
        columns: [
          { key: "name", label: "User" }, { key: "phone", label: "Phone" },
          { key: "role", label: "Role" }, { key: "frozen", label: "Frozen" }, { key: "created", label: "Created" },
        ],
        rows,
      };
    },
  },
  {
    id: "failed-txns",
    title: "Failed Transaction Analysis",
    description: "Why transactions failed this month",
    icon: AlertTriangle,
    color: "destructive",
    run: async () => {
      const monthStart = new Date(); monthStart.setDate(1);
      const { data } = await supabase.from("transactions")
        .select("amount, type, category, created_at, merchant_name")
        .eq("status", "failed").gte("created_at", monthStart.toISOString()).limit(1000);
      const byCat: Record<string, { count: number; volume: number }> = {};
      (data || []).forEach((t: any) => {
        const k = t.category || "uncategorized";
        byCat[k] ||= { count: 0, volume: 0 };
        byCat[k].count++; byCat[k].volume += t.amount;
      });
      const rows = Object.entries(byCat)
        .map(([category, v]) => ({ category, count: v.count, volume: fmtINR(v.volume) }))
        .sort((a, b) => b.count - a.count);
      return {
        columns: [{ key: "category", label: "Category" }, { key: "count", label: "Failures" }, { key: "volume", label: "Volume" }],
        rows,
        meta: `${data?.length || 0} failed txns analyzed`,
      };
    },
  },
  {
    id: "new-cohort",
    title: "New User Cohort",
    description: "Last 30 days of signups by week",
    icon: UserPlus,
    color: "success",
    run: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data } = await supabase.from("profiles").select("id, full_name, role, created_at, kyc_status").gte("created_at", since.toISOString()).order("created_at", { ascending: false });
      return {
        columns: [
          { key: "name", label: "Name" }, { key: "role", label: "Role" },
          { key: "kyc", label: "KYC" }, { key: "joined", label: "Joined" },
        ],
        rows: (data || []).map((u: any) => ({
          name: u.full_name || "—", role: u.role || "—", kyc: u.kyc_status || "—", joined: fmtDate(u.created_at),
        })),
      };
    },
  },
  {
    id: "kyc-completion",
    title: "KYC Completion",
    description: "KYC status breakdown across all users",
    icon: ShieldCheck,
    color: "primary",
    run: async () => {
      const { data } = await supabase.from("profiles").select("kyc_status, role");
      const total = data?.length || 0;
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => { counts[p.kyc_status || "pending"] = (counts[p.kyc_status || "pending"] || 0) + 1; });
      return {
        columns: [{ key: "status", label: "Status" }, { key: "count", label: "Users" }, { key: "pct", label: "%" }],
        rows: Object.entries(counts).map(([status, count]) => ({
          status, count, pct: total ? ((count / total) * 100).toFixed(1) + "%" : "0%",
        })),
        meta: `${total} total users`,
      };
    },
  },
  {
    id: "pocket-money",
    title: "Pocket Money Summary",
    description: "Active allowances by frequency & total monthly cost",
    icon: DollarSignAlias,
    color: "accent",
    run: async () => {
      const { data } = await supabase.from("parent_teen_links")
        .select("pocket_money_amount, pocket_money_frequency, is_active").eq("is_active", true);
      const byFreq: Record<string, { count: number; total: number }> = {};
      (data || []).forEach((l: any) => {
        const f = l.pocket_money_frequency || "monthly";
        byFreq[f] ||= { count: 0, total: 0 };
        byFreq[f].count++; byFreq[f].total += l.pocket_money_amount || 0;
      });
      const monthlyMultiplier: Record<string, number> = { weekly: 4, monthly: 1, daily: 30 };
      let monthlyCost = 0;
      Object.entries(byFreq).forEach(([f, v]) => { monthlyCost += v.total * (monthlyMultiplier[f] || 1); });
      return {
        columns: [{ key: "frequency", label: "Frequency" }, { key: "active", label: "Active" }, { key: "amount", label: "Total per cycle" }],
        rows: [
          ...Object.entries(byFreq).map(([f, v]) => ({ frequency: f, active: v.count, amount: fmtINR(v.total) })),
          { frequency: "— Monthly equivalent —", active: "", amount: fmtINR(monthlyCost) },
        ],
      };
    },
  },
  {
    id: "savings-progress",
    title: "Savings Goals Progress",
    description: "All teen savings goals & completion progress",
    icon: Target,
    color: "success",
    run: async () => {
      const { data } = await supabase.from("savings_goals")
        .select("title, target_amount, current_amount, deadline, is_completed, teen_id, profiles:teen_id(full_name)")
        .order("created_at", { ascending: false });
      return {
        columns: [
          { key: "teen", label: "Teen" }, { key: "title", label: "Goal" },
          { key: "progress", label: "Progress" }, { key: "deadline", label: "Deadline" }, { key: "status", label: "Status" },
        ],
        rows: (data || []).map((g: any) => {
          const pct = g.target_amount ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
          return {
            teen: g.profiles?.full_name || "—",
            title: g.title,
            progress: `${fmtINR(g.current_amount)} / ${fmtINR(g.target_amount)} (${pct}%)`,
            deadline: fmtDate(g.deadline),
            status: g.is_completed ? "Completed" : pct >= 100 ? "Reached" : "In progress",
          };
        }),
      };
    },
  },
];

// Avoid lucide name clash with imported icons
function DollarSignAlias(props: any) {
  return <FileText {...props} />;
}

/* ───────────────────── Custom builder fields ───────────────────── */
const BUILDER_TABLES = {
  profiles: {
    label: "Users (Profiles)",
    fields: [
      { key: "id", label: "ID" }, { key: "full_name", label: "Name" }, { key: "phone", label: "Phone" },
      { key: "role", label: "Role" }, { key: "kyc_status", label: "KYC" }, { key: "created_at", label: "Joined", isDate: true },
    ],
  },
  wallets: {
    label: "Wallets",
    fields: [
      { key: "id", label: "Wallet ID" }, { key: "user_id", label: "User" }, { key: "balance", label: "Balance", isMoney: true },
      { key: "is_frozen", label: "Frozen" }, { key: "daily_limit", label: "Daily limit", isMoney: true }, { key: "created_at", label: "Created", isDate: true },
    ],
  },
  transactions: {
    label: "Transactions",
    fields: [
      { key: "id", label: "Txn ID" }, { key: "amount", label: "Amount", isMoney: true }, { key: "type", label: "Type" },
      { key: "status", label: "Status" }, { key: "category", label: "Category" }, { key: "merchant_name", label: "Merchant" },
      { key: "created_at", label: "Date", isDate: true },
    ],
  },
} as const;
type BuilderTable = keyof typeof BUILDER_TABLES;

/* ───────────────────── Component ───────────────────── */
const AdminReports = () => {
  const [activeReport, setActiveReport] = useState<ReportDef | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [running, setRunning] = useState(false);

  // Builder state
  const [builderTable, setBuilderTable] = useState<BuilderTable>("transactions");
  const [selectedFields, setSelectedFields] = useState<string[]>(["id", "amount", "status", "created_at"]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDays, setFilterDays] = useState<number | "">(30);
  const [savedTemplates, setSavedTemplates] = useState<{ name: string; table: BuilderTable; fields: string[]; status: string; days: number | "" }[]>([]);
  const [builderResult, setBuilderResult] = useState<ReportResult | null>(null);
  const [builderRunning, setBuilderRunning] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Scheduling state
  const [schedules, setSchedules] = useState<{ id: string; reportId: string; cron: string; recipient: string }[]>([]);
  const [scheduleReport, setScheduleReport] = useState("");
  const [scheduleCron, setScheduleCron] = useState("monday-9am");
  const [scheduleEmail, setScheduleEmail] = useState("");

  // Load saved from localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem("admin_report_templates");
      if (t) setSavedTemplates(JSON.parse(t));
      const s = localStorage.getItem("admin_report_schedules");
      if (s) setSchedules(JSON.parse(s));
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("admin_report_templates", JSON.stringify(savedTemplates)); }, [savedTemplates]);
  useEffect(() => { localStorage.setItem("admin_report_schedules", JSON.stringify(schedules)); }, [schedules]);

  const runReport = async (def: ReportDef) => {
    setActiveReport(def); setRunning(true); setResult(null);
    try {
      const res = await def.run();
      setResult(res);
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally { setRunning(false); }
  };

  const runBuilder = async () => {
    if (selectedFields.length === 0) { toast.error("Select at least one field"); return; }
    setBuilderRunning(true); setBuilderResult(null);
    try {
      let q = supabase.from(builderTable).select(selectedFields.join(",")).limit(10);
      if (filterStatus && BUILDER_TABLES[builderTable].fields.find((f) => f.key === "status")) {
        q = q.eq("status" as any, filterStatus);
      }
      if (filterDays && BUILDER_TABLES[builderTable].fields.find((f) => f.key === "created_at")) {
        const since = new Date(); since.setDate(since.getDate() - Number(filterDays));
        q = q.gte("created_at", since.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      const fieldDefs = BUILDER_TABLES[builderTable].fields.filter((f) => selectedFields.includes(f.key));
      const rows = (data || []).map((r: any) => {
        const row: Record<string, any> = {};
        fieldDefs.forEach((f) => {
          let v = r[f.key];
          if (f.isMoney && typeof v === "number") v = fmtINR(v);
          else if (f.isDate) v = fmtDate(v);
          else if (typeof v === "boolean") v = v ? "Yes" : "No";
          row[f.key] = v ?? "—";
        });
        return row;
      });
      setBuilderResult({ columns: fieldDefs.map((f) => ({ key: f.key, label: f.label })), rows });
    } catch (e: any) { toast.error(e.message); }
    finally { setBuilderRunning(false); }
  };

  const downloadCSV = (res: ReportResult, name: string) => {
    const header = res.columns.map((c) => `"${c.label}"`).join(",");
    const body = res.rows.map((r) => res.columns.map((c) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${name}-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };
  const downloadPDF = (res: ReportResult, name: string) => {
    const html = `<html><head><title>${name}</title><style>body{font-family:Arial;padding:24px;color:#222}h1{color:#c8952e}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:8px 10px;border-bottom:1px solid #eee;text-align:left;font-size:12px}th{background:#faf6ec;color:#8a6614}</style></head><body><h1>${name}</h1><p style="color:#666;font-size:11px">Generated ${new Date().toLocaleString("en-IN")}</p><table><thead><tr>${res.columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead><tbody>${res.rows.map((r) => `<tr>${res.columns.map((c) => `<td>${String(r[c.key] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300);
  };

  const saveTemplate = () => {
    if (!templateName.trim()) { toast.error("Name your template"); return; }
    setSavedTemplates([...savedTemplates, { name: templateName.trim(), table: builderTable, fields: selectedFields, status: filterStatus, days: filterDays }]);
    setTemplateName(""); toast.success("Template saved");
  };

  const addSchedule = () => {
    if (!scheduleReport || !scheduleEmail) { toast.error("Pick a report and email"); return; }
    setSchedules([...schedules, { id: crypto.randomUUID(), reportId: scheduleReport, cron: scheduleCron, recipient: scheduleEmail }]);
    setScheduleEmail(""); toast.success("Scheduled");
  };

  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    success: "bg-success/10 text-success border-success/20",
    accent: "bg-accent/10 text-accent border-accent/20",
    muted: "bg-white/[0.05] text-muted-foreground border-white/[0.06]",
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-xs text-muted-foreground mt-1">One-click intelligence • {REPORTS.length} pre-built reports + custom builder</p>
        </div>

        {/* Pre-built report grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {REPORTS.map((r, i) => {
            const isActive = activeReport?.id === r.id;
            return (
              <button key={r.id} onClick={() => runReport(r)}
                className={`group p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? "bg-primary/[0.06] border-primary/30 shadow-[0_0_24px_hsl(42_78%_55%/0.12)]"
                    : "bg-white/[0.02] border-white/[0.04] hover:border-primary/20 hover:bg-white/[0.03]"
                }`}
                style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.05 + i * 0.04}s both` }}>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${colorClasses[r.color]}`}>
                  <r.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{r.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-snug">{r.description}</p>
                <div className="mt-3 flex items-center gap-1 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-2.5 h-2.5 fill-current" /> Run report
                </div>
              </button>
            );
          })}
        </div>

        {/* Result preview */}
        {activeReport && (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] relative overflow-hidden" style={{ animation: "slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <activeReport.icon className="w-4 h-4 text-primary" /> {activeReport.title}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {result ? `${result.rows.length.toLocaleString()} rows` : "Loading…"}
                  {result?.meta ? ` · ${result.meta}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => result && downloadCSV(result, activeReport.id)} disabled={!result}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs flex items-center gap-1.5 hover:bg-white/[0.06] disabled:opacity-40">
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button onClick={() => result && downloadPDF(result, activeReport.title)} disabled={!result}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs flex items-center gap-1.5 hover:bg-white/[0.06] disabled:opacity-40">
                  <Download className="w-3 h-3" /> PDF
                </button>
              </div>
            </div>
            {running ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-lg overflow-hidden relative">
                    <div className="absolute inset-0 bg-white/[0.02]" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" style={{ animation: "admin-shimmer 2s infinite" }} />
                  </div>
                ))}
              </div>
            ) : result && result.rows.length === 0 ? (
              <p className="text-center py-12 text-xs text-muted-foreground">No data</p>
            ) : result && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {result.columns.map((c) => (
                        <th key={c.key} className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                        style={{ animation: `slide-up-spring 0.3s ${Math.min(i * 0.015, 0.3)}s both` }}>
                        {result.columns.map((c) => (
                          <td key={c.key} className="py-2.5 px-3 font-mono text-[11px]">{String(row[c.key] ?? "—")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows.length > 50 && (
                  <p className="text-center text-[10px] text-muted-foreground mt-3">Showing first 50 of {result.rows.length} rows · download for full data</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom builder + Scheduled side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Builder */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.2s both" }}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Custom Report Builder</h3>
            </div>

            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Source table</label>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(Object.keys(BUILDER_TABLES) as BuilderTable[]).map((t) => (
                <button key={t} onClick={() => { setBuilderTable(t); setSelectedFields(BUILDER_TABLES[t].fields.slice(0, 4).map((f) => f.key)); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    builderTable === t ? "bg-primary/15 text-primary border border-primary/25" : "bg-white/[0.03] text-muted-foreground border border-white/[0.04] hover:bg-white/[0.05]"
                  }`}>
                  {BUILDER_TABLES[t].label}
                </button>
              ))}
            </div>

            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Fields ({selectedFields.length} selected)</label>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {BUILDER_TABLES[builderTable].fields.map((f) => {
                const sel = selectedFields.includes(f.key);
                return (
                  <button key={f.key}
                    onClick={() => setSelectedFields(sel ? selectedFields.filter((s) => s !== f.key) : [...selectedFields, f.key])}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                      sel ? "bg-primary/15 text-primary border-primary/25" : "bg-white/[0.02] text-muted-foreground border-white/[0.04] hover:border-white/[0.08]"
                    }`}>
                    {sel ? "✓ " : "+ "}{f.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Status filter</label>
                <input value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} placeholder="success / failed / pending"
                  className="w-full h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-xs focus:outline-none focus:border-primary/40" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Last N days</label>
                <input type="number" value={filterDays} onChange={(e) => setFilterDays(e.target.value === "" ? "" : Number(e.target.value))} placeholder="30"
                  className="w-full h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-xs focus:outline-none focus:border-primary/40" />
              </div>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={runBuilder} disabled={builderRunning}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:shadow-[0_0_20px_hsl(42_78%_55%/0.2)] transition-all disabled:opacity-40">
                <Play className="w-3 h-3 fill-current" /> {builderRunning ? "Running…" : "Run preview"}
              </button>
              <button onClick={() => builderResult && downloadCSV(builderResult, "custom-report")} disabled={!builderResult}
                className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs flex items-center gap-1.5 hover:bg-white/[0.06] disabled:opacity-40">
                <Download className="w-3 h-3" /> CSV
              </button>
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name"
                className="h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs flex-1 min-w-[140px] focus:outline-none focus:border-primary/40" />
              <button onClick={saveTemplate} className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs flex items-center gap-1.5 hover:bg-white/[0.06]">
                <Save className="w-3 h-3" /> Save
              </button>
            </div>

            {/* Builder result */}
            {builderResult && (
              <div className="overflow-x-auto rounded-xl bg-white/[0.01] border border-white/[0.04]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {builderResult.columns.map((c) => (
                        <th key={c.key} className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {builderResult.rows.length === 0 ? (
                      <tr><td colSpan={builderResult.columns.length} className="text-center py-8 text-muted-foreground text-xs">No rows</td></tr>
                    ) : builderResult.rows.map((row, i) => (
                      <tr key={i} className="border-b border-white/[0.03]">
                        {builderResult.columns.map((c) => (
                          <td key={c.key} className="py-2 px-3 font-mono text-[11px]">{String(row[c.key] ?? "—")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Saved templates */}
            {savedTemplates.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Saved templates</p>
                <div className="flex flex-wrap gap-1.5">
                  {savedTemplates.map((t, i) => (
                    <div key={i} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.04] text-[11px]">
                      <button onClick={() => { setBuilderTable(t.table); setSelectedFields(t.fields); setFilterStatus(t.status); setFilterDays(t.days); toast.success("Loaded"); }}
                        className="text-foreground hover:text-primary">{t.name}</button>
                      <button onClick={() => setSavedTemplates(savedTemplates.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive ml-1">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedules */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.25s both" }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Scheduled Reports</h3>
            </div>

            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Report</label>
            <select value={scheduleReport} onChange={(e) => setScheduleReport(e.target.value)}
              className="w-full h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-xs focus:outline-none focus:border-primary/40 mb-3">
              <option value="">Pick a report…</option>
              {REPORTS.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>

            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">When</label>
            <select value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)}
              className="w-full h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-xs focus:outline-none focus:border-primary/40 mb-3">
              <option value="monday-9am">Every Monday 9 AM</option>
              <option value="daily-9am">Every day 9 AM</option>
              <option value="month-1st">1st of every month</option>
              <option value="friday-5pm">Every Friday 5 PM</option>
            </select>

            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Email recipient</label>
            <input type="email" value={scheduleEmail} onChange={(e) => setScheduleEmail(e.target.value)} placeholder="ops@payvibe.in"
              className="w-full h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-xs focus:outline-none focus:border-primary/40 mb-3" />

            <button onClick={addSchedule}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:shadow-[0_0_20px_hsl(42_78%_55%/0.2)] transition-all">
              <Plus className="w-3 h-3" /> Add schedule
            </button>

            <div className="mt-4 space-y-2">
              {schedules.length === 0 ? (
                <p className="text-center text-[11px] text-muted-foreground py-4">No schedules</p>
              ) : schedules.map((s) => {
                const r = REPORTS.find((x) => x.id === s.reportId);
                return (
                  <div key={s.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
                    <Mail className="w-3 h-3 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{r?.title || s.reportId}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.cron} → {s.recipient}</p>
                    </div>
                    <button onClick={() => setSchedules(schedules.filter((x) => x.id !== s.id))} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground leading-snug">Schedules are stored locally. Wire to an edge function + cron to deliver via email.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
