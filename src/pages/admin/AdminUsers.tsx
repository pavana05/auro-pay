import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { useContextPanel } from "@/components/admin/AdminContextPanel";
import { Sparkline } from "@/components/admin/charts";
import { toast } from "sonner";
import {
  Search, Snowflake, ShieldCheck, Flag, Bell, KeyRound, Trash2, FileText,
  MoreHorizontal, Download, Filter, X, Users as UsersIcon, Eye,
  ArrowLeftRight, Shield, Wallet, Clock, RefreshCw, ChevronDown,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
  Bookmark, Plus as PlusIcon, Star,
} from "lucide-react";

const C = {
  primary: "#c8952e", secondary: "#d4a84b",
  success: "#22c55e", danger: "#ef4444", warning: "#f59e0b",
  info: "#3b82f6", cyan: "#06b6d4",
};

const fmtPaise = (p: number) =>
  p >= 10000000 ? `₹${(p / 10000000).toFixed(2)}Cr` :
  p >= 100000 ? `₹${(p / 100000).toFixed(2)}L` :
  p >= 1000 ? `₹${(p / 100).toLocaleString("en-IN")}` :
  `₹${(p / 100).toFixed(2)}`;

const PAGE_SIZE = 25;

interface UserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  kyc_status: string | null;
  created_at: string | null;
  avatar_url: string | null;
  // joined
  balance: number;
  walletId: string | null;
  isFrozen: boolean;
  txnCount: number;
  lastActiveAt: string | null;
  totalVolume: number;
  spark: number[];
}

const AdminUsers = () => {
  const ctxPanel = useContextPanel();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [kycFilter, setKycFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [advOpen, setAdvOpen] = useState(false);
  const [balMin, setBalMin] = useState("");
  const [balMax, setBalMax] = useState("");
  const [txnMin, setTxnMin] = useState("");
  const [lastActiveDays, setLastActiveDays] = useState<string>("any");

  // Sort
  type SortKey = "name" | "balance" | "txnCount" | "lastActiveAt" | "created_at";
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "name" ? "asc" : "desc"); }
    setPage(0);
  };

  // Presets
  type Preset = { id: string; name: string; built?: boolean; filters: any };
  const BUILT_IN_PRESETS: Preset[] = [
    { id: "p-hv-frozen", name: "High-value frozen", built: true,
      filters: { search:"", roleFilter:"all", kycFilter:"all", statusFilter:"frozen", dateFrom:"", dateTo:"", balMin:"5000", balMax:"", txnMin:"", lastActiveDays:"any", sortKey:"balance", sortDir:"desc" } },
    { id: "p-pending-7d", name: "Pending KYC > 7 days", built: true,
      filters: { search:"", roleFilter:"all", kycFilter:"pending", statusFilter:"all", dateFrom:"", dateTo: new Date(Date.now() - 7*86400000).toISOString().slice(0,10), balMin:"", balMax:"", txnMin:"", lastActiveDays:"any", sortKey:"created_at", sortDir:"asc" } },
    { id: "p-new-today", name: "New today", built: true,
      filters: { search:"", roleFilter:"all", kycFilter:"all", statusFilter:"all", dateFrom: new Date().toISOString().slice(0,10), dateTo:"", balMin:"", balMax:"", txnMin:"", lastActiveDays:"any", sortKey:"created_at", sortDir:"desc" } },
    { id: "p-inactive-30d", name: "Inactive 30+ days", built: true,
      filters: { search:"", roleFilter:"all", kycFilter:"all", statusFilter:"all", dateFrom:"", dateTo:"", balMin:"", balMax:"", txnMin:"1", lastActiveDays:"any", sortKey:"lastActiveAt", sortDir:"asc" } },
    { id: "p-power", name: "Power users (50+ txns)", built: true,
      filters: { search:"", roleFilter:"all", kycFilter:"all", statusFilter:"all", dateFrom:"", dateTo:"", balMin:"", balMax:"", txnMin:"50", lastActiveDays:"any", sortKey:"txnCount", sortDir:"desc" } },
  ];

  const [userPresets, setUserPresets] = useState<Preset[]>(() => {
    try { return JSON.parse(localStorage.getItem("admin-user-presets") || "[]"); } catch { return []; }
  });
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const applyPreset = (p: Preset) => {
    const f = p.filters;
    setSearch(f.search ?? ""); setRoleFilter(f.roleFilter ?? "all"); setKycFilter(f.kycFilter ?? "all");
    setStatusFilter(f.statusFilter ?? "all"); setDateFrom(f.dateFrom ?? ""); setDateTo(f.dateTo ?? "");
    setBalMin(f.balMin ?? ""); setBalMax(f.balMax ?? ""); setTxnMin(f.txnMin ?? "");
    setLastActiveDays(f.lastActiveDays ?? "any");
    if (f.sortKey) setSortKey(f.sortKey); if (f.sortDir) setSortDir(f.sortDir);
    setPage(0); setActivePresetId(p.id);
    toast.success(`Applied "${p.name}"`);
  };
  const saveCurrentAsPreset = () => {
    const name = window.prompt("Name this filter preset:");
    if (!name) return;
    const p: Preset = {
      id: `u-${Date.now()}`, name,
      filters: { search, roleFilter, kycFilter, statusFilter, dateFrom, dateTo, balMin, balMax, txnMin, lastActiveDays, sortKey, sortDir },
    };
    const next = [...userPresets, p];
    setUserPresets(next);
    localStorage.setItem("admin-user-presets", JSON.stringify(next));
    setActivePresetId(p.id);
    toast.success(`Preset "${name}" saved`);
  };
  const deletePreset = (id: string) => {
    const next = userPresets.filter((p) => p.id !== id);
    setUserPresets(next);
    localStorage.setItem("admin-user-presets", JSON.stringify(next));
    if (activePresetId === id) setActivePresetId(null);
  };

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [actionsRowId, setActionsRowId] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim().toLowerCase()); setPage(0); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [p, w, t] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("id, user_id, balance, is_frozen"),
      supabase.from("transactions").select("id, wallet_id, amount, status, created_at, type").order("created_at", { ascending: false }).limit(2000),
    ]);
    setProfiles(p.data || []);
    setWallets(w.data || []);
    setTxns(t.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("admin-users-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  // Click outside actions menu
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsRowId(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Build joined rows
  const rows: UserRow[] = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return profiles.map((p) => {
      const w = wallets.find((w) => w.user_id === p.id);
      const userTxns = w ? txns.filter((t) => t.wallet_id === w.id) : [];
      const lastActiveAt = userTxns[0]?.created_at || p.created_at;
      const totalVolume = userTxns.filter((t) => t.status === "success").reduce((s, t) => s + (t.amount || 0), 0);

      // 7-day sparkline of txn counts
      const spark: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const next = new Date(d.getTime() + 86400000);
        spark.push(userTxns.filter((t) => t.created_at && new Date(t.created_at) >= d && new Date(t.created_at) < next).length);
      }
      return {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        role: p.role,
        kyc_status: p.kyc_status,
        created_at: p.created_at,
        avatar_url: p.avatar_url,
        balance: w?.balance || 0,
        walletId: w?.id || null,
        isFrozen: !!w?.is_frozen,
        txnCount: userTxns.length,
        lastActiveAt,
        totalVolume,
        spark,
      };
    });
  }, [profiles, wallets, txns]);

  // Filter
  const filtered = useMemo(() => {
    const now = Date.now();
    return rows.filter((r) => {
      if (debouncedSearch) {
        const hay = `${r.full_name || ""} ${r.phone || ""} ${r.id}`.toLowerCase();
        if (!hay.includes(debouncedSearch)) return false;
      }
      if (roleFilter !== "all" && (r.role || "user") !== roleFilter) return false;
      if (kycFilter !== "all" && (r.kyc_status || "pending") !== kycFilter) return false;
      if (statusFilter === "frozen" && !r.isFrozen) return false;
      if (statusFilter === "active" && r.isFrozen) return false;
      if (dateFrom && r.created_at && new Date(r.created_at) < new Date(dateFrom)) return false;
      if (dateTo && r.created_at && new Date(r.created_at) > new Date(`${dateTo}T23:59:59`)) return false;
      if (balMin && r.balance < parseInt(balMin, 10) * 100) return false;
      if (balMax && r.balance > parseInt(balMax, 10) * 100) return false;
      if (txnMin && r.txnCount < parseInt(txnMin, 10)) return false;
      if (lastActiveDays !== "any" && r.lastActiveAt) {
        const days = parseInt(lastActiveDays, 10);
        if (now - new Date(r.lastActiveAt).getTime() > days * 86400000) return false;
      }
      return true;
    });
  }, [rows, debouncedSearch, roleFilter, kycFilter, statusFilter, dateFrom, dateTo, balMin, balMax, txnMin, lastActiveDays]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "name": av = (a.full_name || "").toLowerCase(); bv = (b.full_name || "").toLowerCase(); break;
        case "balance": av = a.balance; bv = b.balance; break;
        case "txnCount": av = a.txnCount; bv = b.txnCount; break;
        case "lastActiveAt": av = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0; bv = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0; break;
        case "created_at":
        default: av = a.created_at ? new Date(a.created_at).getTime() : 0; bv = b.created_at ? new Date(b.created_at).getTime() : 0; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetFilters = () => {
    setSearch(""); setRoleFilter("all"); setKycFilter("all"); setStatusFilter("all");
    setDateFrom(""); setDateTo(""); setBalMin(""); setBalMax(""); setTxnMin("");
    setLastActiveDays("any"); setPage(0);
  };

  const exportCsv = () => {
    const header = ["id","name","phone","role","kyc_status","balance_paise","txn_count","frozen","joined","last_active"];
    const data = filtered.map((r) => [r.id, r.full_name || "", r.phone || "", r.role || "user", r.kyc_status || "pending", r.balance, r.txnCount, r.isFrozen, r.created_at || "", r.lastActiveAt || ""]);
    const csv = [header, ...data].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `users-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} users`);
  };

  // Selection helpers
  const allChecked = paged.length > 0 && paged.every((r) => selected.has(r.id));
  const toggleAllPage = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (allChecked) paged.forEach((r) => n.delete(r.id));
      else paged.forEach((r) => n.add(r.id));
      return n;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  /* ─────────── Row actions ─────────── */
  const freezeUser = async (r: UserRow, freeze: boolean) => {
    if (!r.walletId) { toast.error("No wallet"); return; }
    const { error } = await supabase.from("wallets").update({ is_frozen: freeze }).eq("id", r.walletId);
    if (error) toast.error(error.message);
    else { toast.success(freeze ? "Wallet frozen" : "Wallet unfrozen"); fetchAll(); }
    setActionsRowId(null);
  };
  const verifyKyc = async (r: UserRow) => {
    const { error } = await supabase.from("profiles").update({ kyc_status: "verified", aadhaar_verified: true }).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("KYC verified"); fetchAll(); }
    setActionsRowId(null);
  };
  const sendNotification = async (r: UserRow) => {
    const body = window.prompt(`Send notification to ${r.full_name || "user"}:`);
    if (!body) { setActionsRowId(null); return; }
    const { error } = await supabase.from("notifications").insert({ user_id: r.id, title: "Message from admin", body, type: "admin_message" });
    if (error) toast.error(error.message); else toast.success("Notification sent");
    setActionsRowId(null);
  };
  const flagAccount = async (r: UserRow) => {
    const reason = window.prompt(`Flag ${r.full_name || "user"} – reason:`);
    if (!reason) { setActionsRowId(null); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({ admin_user_id: user.id, target_type: "user", target_id: r.id, action: "flag_account", details: { reason } });
    toast.success("Account flagged in audit log");
    setActionsRowId(null);
  };
  const resetPin = async (r: UserRow) => {
    const { error } = await supabase.from("profiles").update({ pin_hash: null, pin_set_at: null }).eq("id", r.id);
    if (error) toast.error(error.message); else toast.success("PIN reset – user must set a new one");
    setActionsRowId(null);
  };
  const deleteAccount = async (r: UserRow) => {
    if (!window.confirm(`Permanently delete ${r.full_name || "this user"}? This cannot be undone.`)) { setActionsRowId(null); return; }
    const { error } = await supabase.functions.invoke("delete-user", { body: { user_id: r.id } });
    if (error) toast.error(error.message); else { toast.success("User deleted"); fetchAll(); }
    setActionsRowId(null);
  };

  /* ─────────── Bulk ─────────── */
  const bulk = async (action: "freeze" | "unfreeze" | "verify_kyc" | "notify") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (action === "freeze" || action === "unfreeze") {
      const walletIds = wallets.filter((w) => ids.includes(w.user_id)).map((w) => w.id);
      const { error } = await supabase.from("wallets").update({ is_frozen: action === "freeze" }).in("id", walletIds);
      if (error) toast.error(error.message); else { toast.success(`${ids.length} wallets ${action === "freeze" ? "frozen" : "unfrozen"}`); fetchAll(); }
    } else if (action === "verify_kyc") {
      const { error } = await supabase.from("profiles").update({ kyc_status: "verified", aadhaar_verified: true }).in("id", ids);
      if (error) toast.error(error.message); else { toast.success(`${ids.length} users verified`); fetchAll(); }
    } else if (action === "notify") {
      const body = window.prompt(`Send notification to ${ids.length} users:`);
      if (!body) return;
      const inserts = ids.map((id) => ({ user_id: id, title: "Message from admin", body, type: "admin_message" }));
      const { error } = await supabase.from("notifications").insert(inserts);
      if (error) toast.error(error.message); else toast.success("Notifications sent");
    }
    setSelected(new Set());
  };
  const bulkExport = () => {
    const ids = selected;
    const rowsExp = filtered.filter((r) => ids.has(r.id));
    if (rowsExp.length === 0) return;
    const header = ["id","name","phone","role","kyc_status","balance_paise","txn_count","frozen"];
    const data = rowsExp.map((r) => [r.id, r.full_name || "", r.phone || "", r.role || "user", r.kyc_status || "pending", r.balance, r.txnCount, r.isFrozen]);
    const csv = [header, ...data].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `users-selected-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rowsExp.length} users`);
  };

  /* ─────────── Context panel ─────────── */
  const openUserPanel = (r: UserRow) => {
    ctxPanel.show({
      title: r.full_name || "Unknown",
      subtitle: r.phone || r.id,
      body: <UserPanelBody row={r} wallets={wallets} txns={txns} onChange={fetchAll} />,
    });
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-4 min-h-full pb-32 relative">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl lg:text-[22px] font-bold text-white font-sora flex items-center gap-2">
              <UsersIcon className="w-5 h-5" style={{ color: C.primary }} /> Users
            </h1>
            <p className="text-[11px] text-white/40 font-sora mt-0.5">{filtered.length.toLocaleString("en-IN")} of {rows.length.toLocaleString("en-IN")} matching</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.04] border border-white/[0.06]" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[11px] font-medium text-white border border-primary/20"
              style={{ background: "rgba(200,149,46,0.12)", color: C.primary }}
            >
              <Download className="w-3.5 h-3.5" /> Export {filtered.length}
            </button>
          </div>
        </div>

        {/* Presets bar */}
        <div className="rounded-[14px] border p-2.5 flex items-center gap-2 overflow-x-auto" style={{ background: "rgba(13,14,18,0.55)", borderColor: "rgba(255,255,255,0.04)" }}>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-sora flex items-center gap-1.5 shrink-0 pr-1">
            <Bookmark className="w-3 h-3" /> Presets
          </span>
          {BUILT_IN_PRESETS.map((p) => (
            <PresetChip key={p.id} active={activePresetId === p.id} onClick={() => applyPreset(p)} icon={Star} label={p.name} built />
          ))}
          {userPresets.map((p) => (
            <PresetChip key={p.id} active={activePresetId === p.id} onClick={() => applyPreset(p)} label={p.name}
              onDelete={() => deletePreset(p.id)} />
          ))}
          <button onClick={saveCurrentAsPreset} title="Save current filters as preset"
            className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[10px] font-medium font-sora text-primary border border-primary/25 hover:bg-primary/10 shrink-0">
            <PlusIcon className="w-3 h-3" /> Save current
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-[16px] border p-3 lg:p-4 space-y-3" style={{ background: "rgba(13,14,18,0.7)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, ID…"
                className="w-full h-9 pl-9 pr-8 rounded-[10px] text-[12px] text-white placeholder:text-white/30 focus:outline-none font-sora"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <FilterSelect value={roleFilter} onChange={(v) => { setRoleFilter(v); setPage(0); }} options={[
              { v: "all", l: "All roles" }, { v: "teen", l: "Teen" }, { v: "parent", l: "Parent" }, { v: "user", l: "User" },
            ]} />
            <FilterSelect value={kycFilter} onChange={(v) => { setKycFilter(v); setPage(0); }} options={[
              { v: "all", l: "All KYC" }, { v: "verified", l: "Verified" }, { v: "pending", l: "Pending" }, { v: "rejected", l: "Rejected" },
            ]} />
            <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={[
              { v: "all", l: "All status" }, { v: "active", l: "Active" }, { v: "frozen", l: "Frozen" },
            ]} />
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} className="h-9 px-2.5 rounded-[10px] text-[11px] text-white font-sora focus:outline-none" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" }} title="Joined from" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} className="h-9 px-2.5 rounded-[10px] text-[11px] text-white font-sora focus:outline-none" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" }} title="Joined to" />

            <button
              onClick={() => setAdvOpen((o) => !o)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[11px] font-medium font-sora"
              style={{ background: advOpen ? "rgba(200,149,46,0.12)" : "rgba(255,255,255,0.025)", color: advOpen ? C.primary : "rgba(255,255,255,0.7)", border: `1px solid ${advOpen ? "rgba(200,149,46,0.2)" : "rgba(255,255,255,0.06)"}` }}
            >
              <Filter className="w-3 h-3" /> Advanced <ChevronDown className={`w-3 h-3 transition-transform ${advOpen ? "rotate-180" : ""}`} />
            </button>

            <button onClick={resetFilters} className="h-9 px-3 rounded-[10px] text-[11px] font-medium font-sora text-white/50 hover:text-white">Reset</button>
          </div>

          {advOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.04)", animation: "kpi-in 0.2s ease-out" }}>
              <FilterField label="Min balance (₹)"><input type="number" value={balMin} onChange={(e) => { setBalMin(e.target.value); setPage(0); }} className="filter-input" placeholder="0" /></FilterField>
              <FilterField label="Max balance (₹)"><input type="number" value={balMax} onChange={(e) => { setBalMax(e.target.value); setPage(0); }} className="filter-input" placeholder="∞" /></FilterField>
              <FilterField label="Min transactions"><input type="number" value={txnMin} onChange={(e) => { setTxnMin(e.target.value); setPage(0); }} className="filter-input" placeholder="0" /></FilterField>
              <FilterField label="Last active">
                <select value={lastActiveDays} onChange={(e) => { setLastActiveDays(e.target.value); setPage(0); }} className="filter-input">
                  <option value="any">Any time</option>
                  <option value="1">Today</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </FilterField>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-[16px] border overflow-hidden" style={{ background: "rgba(13,14,18,0.7)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.05)" }}>
          {/* Header */}
          <div className="hidden md:grid grid-cols-[36px_1.6fr_1fr_80px_90px_120px_70px_120px_80px_60px] gap-3 px-4 h-11 items-center border-b text-[9px] uppercase tracking-wider text-white/30 font-sora" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <input type="checkbox" checked={allChecked} onChange={toggleAllPage} className="rounded accent-primary" />
            <SortHeader label="User" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
            <span>Phone</span>
            <span>Role</span>
            <span>KYC</span>
            <SortHeader label="Balance" k="balance" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
            <SortHeader label="Txns" k="txnCount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
            <SortHeader label="Last active" k="lastActiveAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
            <span>Status</span>
            <span></span>
          </div>

          {loading ? (
            <div className="py-16 text-center"><div className="w-8 h-8 mx-auto rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>
          ) : paged.length === 0 ? (
            <div className="py-16 text-center text-[12px] text-white/40 font-sora">No users match your filters.</div>
          ) : paged.map((r) => {
            const isSel = selected.has(r.id);
            const initials = (r.full_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div key={r.id} className="group relative grid grid-cols-1 md:grid-cols-[36px_1.6fr_1fr_80px_90px_120px_70px_120px_80px_60px] gap-3 px-4 py-3 items-center border-b text-[12px] hover:bg-white/[0.025] transition-colors" style={{ borderColor: "rgba(255,255,255,0.025)", background: isSel ? "rgba(200,149,46,0.04)" : "transparent" }}>
                <input type="checkbox" checked={isSel} onChange={() => toggleOne(r.id)} onClick={(e) => e.stopPropagation()} className="rounded accent-primary" />

                <button onClick={() => openUserPanel(r)} className="flex items-center gap-2.5 text-left min-w-0 group/avatar relative">
                  <div className="relative shrink-0">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt={r.full_name || ""} className="w-8 h-8 rounded-[8px] object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[10px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{initials}</div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: r.isFrozen ? C.danger : C.success, borderColor: "#0d0e12" }} />
                    <span className="absolute left-full ml-2 top-0 hidden group-hover/avatar:block z-20 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap font-sora pointer-events-none" style={{ background: "rgba(20,22,28,0.98)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", boxShadow: "0 8px 20px rgba(0,0,0,0.5)" }}>
                      {r.full_name || "Unnamed"}<br />
                      <span className="text-white/50">{r.phone || r.id}</span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate font-sora">{r.full_name || "Unnamed"}</p>
                    <p className="text-[10px] text-white/40 font-mono truncate md:hidden">{r.phone || "—"}</p>
                  </div>
                </button>

                <span className="text-white/70 font-mono truncate hidden md:block">{r.phone || "—"}</span>

                <span className="hidden md:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider w-fit" style={{ background: r.role === "parent" ? "rgba(34,197,94,0.1)" : r.role === "teen" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.04)", color: r.role === "parent" ? C.success : r.role === "teen" ? C.info : "rgba(255,255,255,0.6)" }}>
                  {r.role || "user"}
                </span>

                <span className="hidden md:inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider w-fit" style={{
                  background: r.kyc_status === "verified" ? "rgba(34,197,94,0.1)" : r.kyc_status === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                  color: r.kyc_status === "verified" ? C.success : r.kyc_status === "rejected" ? C.danger : C.warning,
                }}>{r.kyc_status || "pending"}</span>

                <span className="hidden md:block text-white font-mono font-semibold">{fmtPaise(r.balance)}</span>
                <span className="hidden md:block text-white/60 font-mono">{r.txnCount}</span>
                <span className="hidden md:block text-[10px] text-white/40 font-mono truncate">{r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</span>

                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold w-fit" style={{ color: r.isFrozen ? C.danger : C.success }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.isFrozen ? C.danger : C.success, boxShadow: `0 0 4px ${r.isFrozen ? C.danger : C.success}` }} />
                  {r.isFrozen ? "Frozen" : "Active"}
                </span>

                <div className="relative" ref={actionsRowId === r.id ? actionsRef : undefined}>
                  <button onClick={(e) => { e.stopPropagation(); setActionsRowId(actionsRowId === r.id ? null : r.id); }} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 ml-auto block">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {actionsRowId === r.id && (
                    <div className="absolute right-0 top-full mt-1 w-[200px] rounded-xl border overflow-hidden z-30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ background: "rgba(20,22,28,0.98)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.08)", animation: "scale-in 0.15s ease-out" }}>
                      <ActionItem icon={Eye} label="View profile" onClick={() => { openUserPanel(r); setActionsRowId(null); }} />
                      <ActionItem icon={Snowflake} label={r.isFrozen ? "Unfreeze wallet" : "Freeze wallet"} onClick={() => freezeUser(r, !r.isFrozen)} />
                      <ActionItem icon={ShieldCheck} label="Verify KYC" onClick={() => verifyKyc(r)} disabled={r.kyc_status === "verified"} />
                      <ActionItem icon={Flag} label="Flag account" onClick={() => flagAccount(r)} />
                      <ActionItem icon={Bell} label="Send notification" onClick={() => sendNotification(r)} />
                      <ActionItem icon={KeyRound} label="Reset PIN" onClick={() => resetPin(r)} />
                      <ActionItem icon={FileText} label="Add admin note" onClick={() => { openUserPanel(r); setActionsRowId(null); setTimeout(() => document.getElementById("admin-note-input")?.focus(), 350); }} />
                      <ActionItem icon={Trash2} label="Delete account" danger onClick={() => deleteAccount(r)} />
                    </div>
                  )}
                </div>

                {/* Mobile sparkline */}
                <div className="md:hidden mt-2 col-span-full -mx-1">
                  <Sparkline data={r.spark} color={C.primary} height={20} />
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 text-[11px] font-sora" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-white/40">Page {page + 1} of {totalPages} · {paged.length} on this page</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:pointer-events-none">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:pointer-events-none">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div
            className="fixed left-1/2 bottom-4 -translate-x-1/2 z-40 max-w-[calc(100vw-32px)]"
            style={{ animation: "bulk-up 0.3s cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <div
              className="flex items-center gap-1 rounded-2xl border p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex-wrap"
              style={{ background: "rgba(15,17,22,0.98)", backdropFilter: "blur(24px)", borderColor: "rgba(200,149,46,0.2)" }}
            >
              <span className="text-[11px] font-semibold text-white px-3 py-1.5 font-sora">{selected.size} selected</span>
              <span className="w-px h-6 bg-white/10 mx-1" />
              <BulkBtn icon={Snowflake} onClick={() => bulk("freeze")} label="Freeze" />
              <BulkBtn icon={ShieldCheck} onClick={() => bulk("unfreeze")} label="Unfreeze" />
              <BulkBtn icon={Bell} onClick={() => bulk("notify")} label="Notify" />
              <BulkBtn icon={CheckCircle2} onClick={() => bulk("verify_kyc")} label="Verify KYC" />
              <BulkBtn icon={Download} onClick={bulkExport} label="Export" />
              <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-[11px] font-medium text-white/60 hover:text-white font-sora">
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes kpi-in { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes bulk-up { 0% { opacity: 0; transform: translate(-50%, 100%); } 100% { opacity: 1; transform: translate(-50%, 0); } }
        .filter-input { width: 100%; height: 32px; padding: 0 10px; border-radius: 8px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); color: #fff; font-size: 11px; font-family: 'Sora', sans-serif; outline: none; color-scheme: dark; }
      `}</style>
    </AdminLayout>
  );
};

const FilterSelect = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 px-2.5 pr-7 rounded-[10px] text-[11px] text-white font-sora focus:outline-none cursor-pointer" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" }}>
    {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);
const FilterField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[9px] uppercase tracking-wider text-white/40 font-sora block mb-1">{label}</label>
    {children}
  </div>
);
const ActionItem = ({ icon: Icon, label, onClick, danger = false, disabled = false }: { icon: any; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-sora text-left transition-colors disabled:opacity-30 disabled:pointer-events-none" style={{ color: danger ? C.danger : "rgba(255,255,255,0.75)" }} onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = danger ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);
const BulkBtn = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors font-sora">
    <Icon className="w-3 h-3" /> <span className="hidden sm:inline">{label}</span>
  </button>
);

/* ─────────── Context Panel Body with tabs ─────────── */
const UserPanelBody = ({ row, wallets, txns, onChange }: { row: UserRow; wallets: any[]; txns: any[]; onChange: () => void }) => {
  const [tab, setTab] = useState<"overview" | "transactions" | "limits" | "notes" | "audit">("overview");
  const wallet = wallets.find((w) => w.user_id === row.id);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl p-4 border" style={{ background: `linear-gradient(135deg, rgba(200,149,46,0.08), rgba(255,255,255,0.01))`, borderColor: "rgba(200,149,46,0.18)" }}>
        <div className="flex items-center gap-3">
          {row.avatar_url ? <img src={row.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" /> :
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>
              {(row.full_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white truncate font-sora">{row.full_name || "Unnamed"}</p>
            <p className="text-[11px] text-white/50 font-mono truncate">{row.phone || row.id}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
        {(["overview","transactions","limits","notes","audit"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider font-sora transition-all" style={{ background: tab === t ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : "transparent", color: tab === t ? "#fff" : "rgba(255,255,255,0.5)" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab row={row} wallet={wallet} />}
      {tab === "transactions" && <TransactionsTab row={row} wallet={wallet} txns={txns} />}
      {tab === "limits" && <LimitsTab wallet={wallet} onChange={onChange} />}
      {tab === "notes" && <NotesTab userId={row.id} />}
      {tab === "audit" && <AuditTab userId={row.id} />}
    </div>
  );
};

const OverviewTab = ({ row, wallet }: { row: UserRow; wallet: any }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2">
      <Stat k="Balance" v={fmtPaise(row.balance)} color={C.primary} />
      <Stat k="Total volume" v={fmtPaise(row.totalVolume)} color={C.success} />
      <Stat k="Transactions" v={row.txnCount.toString()} color={C.info} />
      <Stat k="Joined" v={row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} color={C.cyan} />
    </div>
    <div className="rounded-xl p-3 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-sora mb-2">Activity (7d)</p>
      <Sparkline data={row.spark} color={C.primary} height={50} />
    </div>
    <div className="space-y-1.5">
      <Detail k="Wallet" v={wallet?.id || "—"} mono />
      <Detail k="Status" v={wallet?.is_frozen ? "Frozen" : "Active"} />
      <Detail k="KYC" v={row.kyc_status || "pending"} />
      <Detail k="Role" v={row.role || "user"} />
    </div>
  </div>
);

const TransactionsTab = ({ row, wallet, txns }: { row: UserRow; wallet: any; txns: any[] }) => {
  const [q, setQ] = useState("");
  const userTxns = wallet ? txns.filter((t) => t.wallet_id === wallet.id) : [];
  const filtered = userTxns.filter((t) => !q || (t.merchant_name || "").toLowerCase().includes(q.toLowerCase()) || String(t.amount / 100).includes(q));
  return (
    <div className="space-y-2">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search merchant or amount…" className="w-full h-9 px-3 rounded-[10px] text-[11px] text-white placeholder:text-white/30 focus:outline-none font-sora" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }} />
      <div className="max-h-[400px] overflow-y-auto space-y-1">
        {filtered.length === 0 ? <p className="text-[11px] text-white/30 text-center py-6 font-sora">No transactions</p> :
          filtered.slice(0, 100).map((t) => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.015)" }}>
              <div className="min-w-0">
                <p className="text-[11px] text-white truncate font-sora">{t.merchant_name || t.type}</p>
                <p className="text-[9px] text-white/40 font-mono">{t.created_at ? new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}</p>
              </div>
              <p className="text-[11px] font-mono font-semibold shrink-0 ml-2" style={{ color: t.type === "credit" ? C.success : "#fff" }}>
                {t.type === "credit" ? "+" : "-"}{fmtPaise(t.amount || 0)}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

const LimitsTab = ({ wallet, onChange }: { wallet: any; onChange: () => void }) => {
  const [daily, setDaily] = useState(wallet?.daily_limit ? String(wallet.daily_limit / 100) : "");
  const [monthly, setMonthly] = useState(wallet?.monthly_limit ? String(wallet.monthly_limit / 100) : "");

  const save = async (field: "daily_limit" | "monthly_limit", value: string) => {
    if (!wallet?.id) return;
    const paise = Math.round(parseFloat(value || "0") * 100);
    const update = field === "daily_limit" ? { daily_limit: paise } : { monthly_limit: paise };
    const { error } = await supabase.from("wallets").update(update).eq("id", wallet.id);
    if (error) toast.error(error.message); else { toast.success("Limit updated"); onChange(); }
  };

  if (!wallet) return <p className="text-[11px] text-white/30 text-center py-6 font-sora">No wallet</p>;
  return (
    <div className="space-y-3">
      <LimitField label="Daily limit (₹)" value={daily} onChange={setDaily} onSave={() => save("daily_limit", daily)} />
      <LimitField label="Monthly limit (₹)" value={monthly} onChange={setMonthly} onSave={() => save("monthly_limit", monthly)} />
      <p className="text-[10px] text-white/40 font-sora">Press Enter to save each field.</p>
    </div>
  );
};
const LimitField = ({ label, value, onChange, onSave }: { label: string; value: string; onChange: (v: string) => void; onSave: () => void }) => (
  <div>
    <label className="text-[10px] uppercase tracking-wider text-white/40 font-sora block mb-1">{label}</label>
    <input type="number" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSave(); } }} onBlur={onSave} className="w-full h-10 px-3 rounded-[10px] text-[12px] text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }} />
  </div>
);

const NotesTab = ({ userId }: { userId: string }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("admin_user_notes").select("*").eq("target_user_id", userId).order("created_at", { ascending: false });
    setNotes(data || []);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!text.trim()) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAdding(false); return; }
    const { error } = await supabase.from("admin_user_notes").insert({ target_user_id: userId, admin_user_id: user.id, note: text.trim() });
    if (error) toast.error(error.message); else { toast.success("Note added"); setText(""); load(); }
    setAdding(false);
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("admin_user_notes").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Note deleted"); load(); }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <textarea id="admin-note-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an internal note about this user…" rows={3} className="w-full p-3 rounded-[10px] text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40 font-sora resize-none" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }} />
        <button onClick={add} disabled={!text.trim() || adding} className="w-full h-9 rounded-[10px] text-[11px] font-semibold text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{adding ? "Saving…" : "Add note"}</button>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {notes.length === 0 ? <p className="text-[11px] text-white/30 text-center py-6 font-sora">No notes yet</p> :
          notes.map((n) => (
            <div key={n.id} className="p-3 rounded-[10px] border" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.04)" }}>
              <p className="text-[11px] text-white/85 font-sora whitespace-pre-wrap">{n.note}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[9px] text-white/40 font-mono">{new Date(n.created_at).toLocaleString("en-IN")}</p>
                <button onClick={() => del(n.id)} className="text-[9px] text-white/40 hover:text-destructive">Delete</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

const AuditTab = ({ userId }: { userId: string }) => {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_logs").select("*").eq("target_id", userId).order("created_at", { ascending: false }).limit(100);
      setLogs(data || []);
    })();
  }, [userId]);
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {logs.length === 0 ? <p className="text-[11px] text-white/30 text-center py-6 font-sora">No admin actions on this user</p> :
        logs.map((l) => (
          <div key={l.id} className="p-2.5 rounded-[10px] border flex items-start gap-2" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.04)" }}>
            <Clock className="w-3 h-3 text-white/40 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-white font-sora">{l.action}</p>
              {l.details && <p className="text-[9px] text-white/50 font-mono break-all">{JSON.stringify(l.details)}</p>}
              <p className="text-[9px] text-white/40 font-mono mt-0.5">{new Date(l.created_at).toLocaleString("en-IN")}</p>
            </div>
          </div>
        ))}
    </div>
  );
};

const Stat = ({ k, v, color }: { k: string; v: string; color: string }) => (
  <div className="rounded-xl p-3 border" style={{ background: `${color}06`, borderColor: `${color}20` }}>
    <p className="text-[9px] uppercase tracking-wider text-white/40 font-sora">{k}</p>
    <p className="text-[14px] font-bold font-mono text-white mt-0.5 truncate">{v}</p>
  </div>
);
const Detail = ({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-3 px-1">
    <span className="text-[10px] uppercase tracking-wider text-white/40 font-sora shrink-0 pt-0.5">{k}</span>
    <span className={`text-[11px] text-white text-right ${mono ? "font-mono break-all" : "font-sora"}`}>{v}</span>
  </div>
);

export default AdminUsers;
