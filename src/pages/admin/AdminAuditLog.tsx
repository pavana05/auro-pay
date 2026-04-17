import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  FileText, Clock, Filter, User, Shield, Wallet, Trash2, RefreshCw,
  Search, Download, X, ChevronDown, Lock, Eye, Calendar, Layers,
  TableIcon, GitBranch, Globe, Zap,
} from "lucide-react";
import VirtualTable, { VirtualColumn } from "@/components/admin/VirtualTable";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

const C = {
  cardBg: "rgba(13,14,18,0.7)",
  border: "rgba(200,149,46,0.10)",
  primary: "#c8952e",
  secondary: "#d4a84b",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.3)",
};

const actionMeta: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  role_change: { icon: Shield, color: C.primary, bg: `${C.primary}15`, label: "Role Change" },
  wallet_freeze: { icon: Wallet, color: C.warning, bg: `${C.warning}15`, label: "Wallet Frozen" },
  wallet_unfreeze: { icon: Wallet, color: C.success, bg: `${C.success}15`, label: "Wallet Unfrozen" },
  wallet_auto_freeze: { icon: Lock, color: C.danger, bg: `${C.danger}25`, label: "Wallet Auto-Frozen (Fraud)" },
  wallet_account_unlock: { icon: Wallet, color: C.success, bg: `${C.success}25`, label: "Account Unlocked" },
  wallet_balance_updated: { icon: Wallet, color: C.primary, bg: `${C.primary}15`, label: "Balance Updated" },
  wallet_funds_added: { icon: Wallet, color: C.success, bg: `${C.success}15`, label: "Funds Added" },
  wallet_funds_deducted: { icon: Wallet, color: C.danger, bg: `${C.danger}15`, label: "Funds Deducted" },
  wallet_force_credit: { icon: Wallet, color: C.success, bg: `${C.success}25`, label: "Force Credit" },
  wallet_force_debit: { icon: Wallet, color: C.danger, bg: `${C.danger}25`, label: "Force Debit" },
  kyc_approve: { icon: Shield, color: C.success, bg: `${C.success}15`, label: "KYC Approved" },
  kyc_reject: { icon: Shield, color: C.danger, bg: `${C.danger}15`, label: "KYC Rejected" },
  user_delete: { icon: Trash2, color: C.danger, bg: `${C.danger}15`, label: "User Deleted" },
  transaction_refund: { icon: RefreshCw, color: C.warning, bg: `${C.warning}15`, label: "Refund Issued" },
  transaction_refunded: { icon: RefreshCw, color: C.warning, bg: `${C.warning}15`, label: "Refund Issued" },
  transaction_flag: { icon: Shield, color: C.warning, bg: `${C.warning}15`, label: "Transaction Flagged" },
  default: { icon: FileText, color: C.textSecondary, bg: "rgba(255,255,255,0.05)", label: "Action" },
};

const FORCE_ACTIONS = new Set(["wallet_force_credit", "wallet_force_debit"]);
const UNLOCK_ACTION = "wallet_account_unlock";

const humanize = (a: string) => actionMeta[a]?.label || a.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const AdminAuditLog = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminFilter, setAdminFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [view, setView] = useState<"timeline" | "table" | "compact">("timeline");
  const [detailOf, setDetailOf] = useState<AuditEntry | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [forceActionsOnly, setForceActionsOnly] = useState(false);
  const [unlocksOnly, setUnlocksOnly] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (actionFilter !== "all") query = query.eq("action", actionFilter);
    if (adminFilter !== "all") query = query.eq("admin_user_id", adminFilter);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");
    if (targetUser) query = query.ilike("target_id", `%${targetUser}%`);
    const { data } = await query;
    const entries = (data || []) as AuditEntry[];
    setLogs(entries);

    const adminIds = [...new Set(entries.map(e => e.admin_user_id))];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", adminIds);
      const names: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { names[p.id] = p.full_name || "Unknown Admin"; });
      setAdminNames(names);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); /* eslint-disable-next-line */ }, [actionFilter, adminFilter, dateFrom, dateTo, targetUser]);

  /* Search across all fields client-side + force-actions / unlocks quick filters */
  const filtered = useMemo(() => {
    let base = logs;
    if (forceActionsOnly) base = base.filter(l => FORCE_ACTIONS.has(l.action));
    if (unlocksOnly) base = base.filter(l => l.action === UNLOCK_ACTION);
    if (!search.trim()) return base;
    const s = search.toLowerCase();
    return base.filter(l =>
      l.action.toLowerCase().includes(s) ||
      l.target_type.toLowerCase().includes(s) ||
      (l.target_id || "").toLowerCase().includes(s) ||
      (adminNames[l.admin_user_id] || "").toLowerCase().includes(s) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(s) ||
      (l.ip_address || "").includes(s)
    );
  }, [logs, search, adminNames, forceActionsOnly, unlocksOnly]);

  const adminList = useMemo(() => {
    const m = new Map<string, string>();
    logs.forEach(l => m.set(l.admin_user_id, adminNames[l.admin_user_id] || "Admin"));
    return Array.from(m.entries());
  }, [logs, adminNames]);

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const isYest = d.toDateString() === yest.toDateString();
    if (isToday) return `Today, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    if (isYest) return `Yesterday, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  const initialsOf = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  /* Group by day for timeline */
  const grouped = useMemo(() => {
    const groups = new Map<string, AuditEntry[]>();
    filtered.forEach(l => {
      const day = new Date(l.created_at).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(l);
    });
    return Array.from(groups.entries());
  }, [filtered]);

  /* Export */
  const exportCSV = () => {
    const rows = [["Timestamp", "Admin", "Action", "Target Type", "Target ID", "IP", "Details"]];
    filtered.forEach(l => {
      rows.push([
        new Date(l.created_at).toISOString(),
        adminNames[l.admin_user_id] || l.admin_user_id,
        humanize(l.action),
        l.target_type,
        l.target_id || "",
        l.ip_address || "",
        JSON.stringify(l.details || {}),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} records to CSV`);
    setExportOpen(false);
  };

  const exportPDF = () => {
    // Open formatted printable HTML page → user can save as PDF
    const html = `<!DOCTYPE html><html><head><title>Audit Log Export</title>
      <style>
        body{font-family:-apple-system,system-ui,sans-serif;color:#111;padding:24px;font-size:11px}
        h1{font-size:18px;margin:0 0 4px} .sub{color:#666;font-size:11px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:10px}
        th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #ddd;vertical-align:top}
        th{background:#f5f5f5;font-weight:600;text-transform:uppercase;font-size:9px;letter-spacing:.05em}
        .action{font-weight:600;color:#c8952e}
        .meta{color:#666;font-size:9px}
        .footer{margin-top:24px;padding-top:12px;border-top:1px solid #ddd;color:#666;font-size:9px;display:flex;justify-content:space-between}
      </style></head><body>
      <h1>AuroPay Audit Log</h1>
      <div class="sub">Exported ${new Date().toLocaleString("en-IN")} • ${filtered.length} records${dateFrom||dateTo?` • Range: ${dateFrom||"…"} – ${dateTo||"…"}`:""}</div>
      <table><thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Target</th><th>IP</th></tr></thead><tbody>
      ${filtered.map(l => `<tr>
        <td>${new Date(l.created_at).toLocaleString("en-IN")}</td>
        <td>${adminNames[l.admin_user_id] || "Admin"}</td>
        <td><span class="action">${humanize(l.action)}</span><div class="meta">${Object.entries(l.details||{}).map(([k,v])=>`${k}: ${v}`).join(" • ")}</div></td>
        <td>${l.target_type}${l.target_id ? `<div class="meta">${l.target_id}</div>` : ""}</td>
        <td>${l.ip_address || "—"}</td>
      </tr>`).join("")}
      </tbody></table>
      <div class="footer"><span>AuroPay Compliance Report — Immutable Audit Trail</span><span>Page 1</span></div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    setExportOpen(false);
  };

  const knownActions = useMemo(() => Array.from(new Set(logs.map(l => l.action))), [logs]);
  const hasFilters = !!(search || dateFrom || dateTo || targetUser || actionFilter !== "all" || adminFilter !== "all" || forceActionsOnly);
  const forceCount = useMemo(() => logs.filter(l => FORCE_ACTIONS.has(l.action)).length, [logs]);

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6 relative">
        {/* Ambient */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "rgba(200,149,46,0.04)", filter: "blur(120px)" }} />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary }}>Audit Logs</h1>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}33` }}>
                <Lock className="w-3 h-3" /> IMMUTABLE
              </span>
            </div>
            <p className="text-xs mt-1.5" style={{ color: C.textSecondary }}>Complete accountability — every admin action timestamped & traceable</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex p-1 rounded-[10px]" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
              <button onClick={() => setView("timeline")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-medium transition-all"
                style={{ background: view === "timeline" ? `${C.primary}25` : "transparent", color: view === "timeline" ? C.primary : C.textSecondary }}>
                <GitBranch className="w-3 h-3" /> Timeline
              </button>
              <button onClick={() => setView("table")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-medium transition-all"
                style={{ background: view === "table" ? `${C.primary}25` : "transparent", color: view === "table" ? C.primary : C.textSecondary }}>
                <TableIcon className="w-3 h-3" /> Table
              </button>
              <button onClick={() => setView("compact")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-medium transition-all"
                style={{ background: view === "compact" ? `${C.primary}25` : "transparent", color: view === "compact" ? C.primary : C.textSecondary }}
                title="Virtualized — handles 10k+ rows">
                <Zap className="w-3 h-3" /> Compact
              </button>
            </div>
            <button onClick={fetchLogs} className="p-2 rounded-[10px] transition-colors" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textSecondary }}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="relative">
              <button onClick={() => setExportOpen(!exportOpen)} className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold text-white" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)` }}>
                <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3 h-3" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-2 rounded-[12px] py-1.5 z-50 min-w-[160px] shadow-2xl" style={{ background: "#15171c", border: `1px solid ${C.border}` }}>
                  <button onClick={exportCSV} className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.04]" style={{ color: C.textPrimary }}>Export as CSV</button>
                  <button onClick={exportPDF} className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.04]" style={{ color: C.textPrimary }}>Export as PDF</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters bar */}
        <div className="rounded-[16px] p-4 backdrop-blur-md relative z-10 space-y-3" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: C.textMuted }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search across all fields…"
                className="w-full h-9 pl-9 pr-3 rounded-[10px] text-xs focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
            </div>
            {/* Admin */}
            <select value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)}
              className="h-9 px-3 rounded-[10px] text-xs focus:outline-none"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }}>
              <option value="all">All admins</option>
              {adminList.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            {/* Action */}
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 px-3 rounded-[10px] text-xs focus:outline-none"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }}>
              <option value="all">All actions</option>
              {knownActions.map(a => <option key={a} value={a}>{humanize(a)}</option>)}
            </select>
            {/* Target user */}
            <input value={targetUser} onChange={(e) => setTargetUser(e.target.value)} placeholder="Target user ID"
              className="h-9 px-3 rounded-[10px] text-xs focus:outline-none"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
          </div>
          {/* Quick filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setForceActionsOnly(v => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{
                background: forceActionsOnly ? `${C.danger}25` : "rgba(255,255,255,0.04)",
                color: forceActionsOnly ? C.danger : C.textSecondary,
                border: `1px solid ${forceActionsOnly ? C.danger + "55" : C.border}`,
              }}
              title="Show only wallet_force_credit / wallet_force_debit entries"
            >
              <Shield className="w-3 h-3" /> Force actions {forceCount > 0 && <span className="opacity-70">({forceCount})</span>}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" style={{ color: C.textMuted }} />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 px-2 rounded-[8px] text-[11px] focus:outline-none"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary, colorScheme: "dark" }} />
              <span className="text-xs" style={{ color: C.textMuted }}>→</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="h-8 px-2 rounded-[8px] text-[11px] focus:outline-none"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary, colorScheme: "dark" }} />
            </div>
            {hasFilters && (
              <button onClick={() => { setSearch(""); setActionFilter("all"); setAdminFilter("all"); setDateFrom(""); setDateTo(""); setTargetUser(""); setForceActionsOnly(false); }}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full" style={{ color: C.textSecondary, background: "rgba(255,255,255,0.04)" }}>
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
            <span className="ml-auto text-[11px]" style={{ color: C.textMuted }}>
              <span style={{ color: C.textPrimary }}>{filtered.length}</span> of {logs.length} entries
            </span>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="space-y-3 relative z-10">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-[12px] animate-pulse" style={{ background: "rgba(255,255,255,0.02)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[18px] p-16 text-center relative z-10" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <FileText className="w-7 h-7" style={{ color: C.textMuted }} />
            </div>
            <p className="text-sm" style={{ color: C.textSecondary }}>No audit log entries found</p>
            <p className="text-xs mt-1" style={{ color: C.textMuted }}>Adjust filters to see more results</p>
          </div>
        ) : view === "timeline" ? (
          /* ───── TIMELINE VIEW ───── */
          <div className="space-y-8 relative z-10">
            {grouped.map(([day, entries]) => (
              <div key={day}>
                <div className="sticky top-0 z-20 mb-4 flex items-center gap-3" style={{ background: `linear-gradient(180deg, #0a0c0f 60%, transparent)`, paddingTop: 4, paddingBottom: 12 }}>
                  <div className="px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}22` }}>{day}</div>
                  <div className="flex-1 h-px" style={{ background: C.border }} />
                  <span className="text-[10px]" style={{ color: C.textMuted }}>{entries.length} {entries.length === 1 ? "action" : "actions"}</span>
                </div>
                <div className="relative pl-10">
                  {/* Vertical line */}
                  <div className="absolute left-[18px] top-1 bottom-1 w-px" style={{ background: `linear-gradient(180deg, ${C.primary}33, ${C.border}, transparent)` }} />
                  {entries.map((log, idx) => {
                    const meta = actionMeta[log.action] || actionMeta.default;
                    const Icon = meta.icon;
                    const adminName = adminNames[log.admin_user_id] || "Admin";
                    return (
                      <div key={log.id} className="relative mb-4 group" style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(idx * 0.03, 0.4)}s both` }}>
                        {/* Dot */}
                        <div className="absolute -left-[28px] top-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: meta.bg, border: `2px solid #0a0c0f`, boxShadow: `0 0 0 1px ${meta.color}55` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                        </div>
                        {/* Card */}
                        <div className="rounded-[14px] p-4 transition-all hover:translate-x-1 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                              <Icon className="w-4 h-4" style={{ color: meta.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{humanize(log.action)}</p>
                                  <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap" style={{ color: C.textSecondary }}>
                                    {/* Admin avatar */}
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{initialsOf(adminName)}</span>
                                      <span>{adminName}</span>
                                    </span>
                                    {log.target_type && (
                                      <>
                                        <span style={{ color: C.textMuted }}>•</span>
                                        <span>on <span style={{ color: C.textPrimary }}>{log.target_type}</span>{log.target_id ? <code className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(255,255,255,0.05)", color: C.primary }}>{log.target_id.slice(0,8)}…</code> : ""}</span>
                                      </>
                                    )}
                                    {log.ip_address && (
                                      <>
                                        <span style={{ color: C.textMuted }}>•</span>
                                        <span className="flex items-center gap-1"><Globe className="w-2.5 h-2.5" />{log.ip_address}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] tabular-nums" style={{ color: C.textMuted }}>{formatDate(log.created_at)}</span>
                                  <button onClick={() => setDetailOf(log)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-opacity" style={{ background: `${C.primary}15`, color: C.primary }} title="View details">
                                    <Eye className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {FORCE_ACTIONS.has(log.action) && log.details?.reason && (
                                <div className="mt-2.5 rounded-[10px] p-2.5 border flex items-start gap-2"
                                  style={{ background: `${C.danger}10`, borderColor: `${C.danger}33` }}>
                                  <Shield className="w-3 h-3 mt-0.5 shrink-0" style={{ color: C.danger }} />
                                  <div className="min-w-0">
                                    <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: C.danger }}>
                                      Reason {log.details.amount_paise ? `· ₹${(Number(log.details.amount_paise)/100).toLocaleString("en-IN")}` : ""}
                                    </p>
                                    <p className="text-[11px] mt-0.5" style={{ color: C.textPrimary }}>{log.details.reason}</p>
                                  </div>
                                </div>
                              )}
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {Object.entries(log.details).slice(0, 4).map(([k, v]) => (
                                    <span key={k} className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: C.textSecondary }}>
                                      <span style={{ color: C.primary }}>{k}:</span> {String(v).slice(0, 24)}{String(v).length > 24 ? "…" : ""}
                                    </span>
                                  ))}
                                  {Object.keys(log.details).length > 4 && <span className="text-[10px] px-2 py-0.5" style={{ color: C.textMuted }}>+{Object.keys(log.details).length - 4} more</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : view === "table" ? (
          /* ───── TABLE VIEW ───── */
          <div className="rounded-[16px] overflow-hidden relative z-10" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)" }}>
                    {["Timestamp", "Admin", "Action", "Target", "IP", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const meta = actionMeta[log.action] || actionMeta.default;
                    const adminName = adminNames[log.admin_user_id] || "Admin";
                    const Icon = meta.icon;
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <td className="px-4 py-3 tabular-nums" style={{ color: C.textSecondary }}>{formatDate(log.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{initialsOf(adminName)}</span>
                            <span style={{ color: C.textPrimary }}>{adminName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md" style={{ background: meta.bg, color: meta.color }}>
                            <Icon className="w-3 h-3" />{humanize(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ color: C.textSecondary }}>
                          <div>{log.target_type}</div>
                          {log.target_id && <code className="text-[10px] font-mono" style={{ color: C.textMuted }}>{log.target_id.slice(0, 12)}…</code>}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]" style={{ color: C.textMuted }}>{log.ip_address || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setDetailOf(log)} className="p-1.5 rounded-md" style={{ background: `${C.primary}15`, color: C.primary }}>
                            <Eye className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ───── COMPACT VIRTUALIZED VIEW ───── */
          <div className="relative z-10">
            <VirtualTable
              rows={filtered}
              rowKey={(l) => l.id}
              rowHeight={44}
              height={640}
              onRowClick={(l) => setDetailOf(l)}
              empty="No audit log entries"
              columns={[
                {
                  key: "ts", header: "Timestamp", width: "180px",
                  render: (l) => <span className="tabular-nums text-white/55">{formatDate(l.created_at)}</span>,
                },
                {
                  key: "admin", header: "Admin", width: "180px",
                  render: (l) => {
                    const name = adminNames[l.admin_user_id] || "Admin";
                    return (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{initialsOf(name)}</span>
                        <span className="text-white truncate">{name}</span>
                      </span>
                    );
                  },
                },
                {
                  key: "action", header: "Action", width: "200px",
                  render: (l) => {
                    const m = actionMeta[l.action] || actionMeta.default;
                    const Icon = m.icon;
                    return (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: m.bg, color: m.color }}>
                        <Icon className="w-3 h-3" />{humanize(l.action)}
                      </span>
                    );
                  },
                },
                {
                  key: "target", header: "Target",
                  render: (l) => (
                    <span className="text-white/55">
                      {l.target_type}
                      {l.target_id && <code className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(255,255,255,0.04)", color: C.primary }}>{l.target_id.slice(0, 8)}…</code>}
                    </span>
                  ),
                },
                {
                  key: "ip", header: "IP", width: "120px",
                  render: (l) => <span className="font-mono text-[10px] text-white/30">{l.ip_address || "—"}</span>,
                },
              ]}
            />
          </div>
        )}

        {/* Detail modal */}
        {detailOf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={() => setDetailOf(null)}>
            <div className="w-full max-w-2xl rounded-[20px] overflow-hidden" style={{ background: "#0d0e12", border: `1px solid ${C.border}`, animation: "admin-slide-up 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-3">
                  {(() => { const m = actionMeta[detailOf.action] || actionMeta.default; const Icon = m.icon; return (
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: m.bg }}>
                      <Icon className="w-4 h-4" style={{ color: m.color }} />
                    </div>); })()}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{humanize(detailOf.action)}</p>
                    <p className="text-[11px]" style={{ color: C.textMuted }}>{formatDate(detailOf.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => setDetailOf(null)} className="p-2 rounded-lg hover:bg-white/[0.04]" style={{ color: C.textSecondary }}><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ["Admin", adminNames[detailOf.admin_user_id] || detailOf.admin_user_id],
                    ["Admin ID", detailOf.admin_user_id],
                    ["Target Type", detailOf.target_type],
                    ["Target ID", detailOf.target_id || "—"],
                    ["IP Address", detailOf.ip_address || "—"],
                    ["Entry ID", detailOf.id],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-[10px] p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: C.textMuted }}>{k}</p>
                      <p className="font-mono text-[11px] break-all" style={{ color: C.textPrimary }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: C.textMuted }}>Full Action Data (JSON)</p>
                  <pre className="rounded-[10px] p-4 text-[11px] font-mono overflow-auto max-h-[280px]" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`, color: C.textPrimary }}>
{JSON.stringify(detailOf.details || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLog;
