import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { useContextPanel } from "@/components/admin/AdminContextPanel";
import {
  Search, Download, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, XCircle,
  SlidersHorizontal, Copy, Check, Flag, RefreshCcw, AlertTriangle, ChevronDown,
  Radio, Play, MessageSquareWarning, MapPin, Globe2, Satellite, Wifi
} from "lucide-react";
import { toast } from "sonner";
import RequestInfoModal from "@/components/admin/RequestInfoModal";
import PaymentLocationMap from "@/components/admin/PaymentLocationMap";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  merchant_name: string | null;
  merchant_upi_id: string | null;
  category: string | null;
  status: string | null;
  created_at: string | null;
  wallet_id: string;
  description: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  location_source: string | null;
  location_captured_at: string | null;
}

interface WalletInfo {
  id: string;
  user_id: string;
  full_name?: string | null;
  phone?: string | null;
}

const STATUSES = ["success", "pending", "failed"];
const TYPES = ["credit", "debit"];
const METHODS = ["razorpay", "upi", "wallet", "card"];
const ALL_CATEGORIES = ["food", "shopping", "transport", "entertainment", "education", "transfer", "topup", "other"];

const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const AdminTransactions = () => {
  const { show, hide } = useContextPanel();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Record<string, WalletInfo>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());
  const [realtimeOn, setRealtimeOn] = useState(true);
  const [infoTarget, setInfoTarget] = useState<Transaction | null>(null);
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [amountMin, setAmountMin] = useState(0);
  const [amountMax, setAmountMax] = useState(100000);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch transactions + wallets/profiles
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const txs = (tx || []) as Transaction[];

      const walletIds = Array.from(new Set(txs.map((t) => t.wallet_id)));
      const map: Record<string, WalletInfo> = {};
      if (walletIds.length) {
        const { data: ws } = await supabase.from("wallets").select("id, user_id").in("id", walletIds);
        const userIds = Array.from(new Set((ws || []).map((w) => w.user_id)));
        const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", userIds);
        const profMap = new Map((profs || []).map((p) => [p.id, p]));
        (ws || []).forEach((w) => {
          const p = profMap.get(w.user_id);
          map[w.id] = { id: w.id, user_id: w.user_id, full_name: p?.full_name, phone: p?.phone };
        });
      }
      if (cancelled) return;
      setWallets(map);
      setTransactions(txs);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime: prepend new transactions and flash
  useEffect(() => {
    if (!realtimeOn) return;
    const ch = supabase
      .channel("admin-tx-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, async (payload) => {
        const newTx = payload.new as Transaction;
        // Hydrate wallet info if missing
        if (!wallets[newTx.wallet_id]) {
          const { data: w } = await supabase.from("wallets").select("id, user_id").eq("id", newTx.wallet_id).maybeSingle();
          if (w) {
            const { data: p } = await supabase.from("profiles").select("full_name, phone").eq("id", w.user_id).maybeSingle();
            setWallets((prev) => ({ ...prev, [w.id]: { id: w.id, user_id: w.user_id, full_name: p?.full_name, phone: p?.phone } }));
          }
        }
        setTransactions((prev) => prev.some((t) => t.id === newTx.id) ? prev : [newTx, ...prev]);
        setFlashedIds((prev) => new Set(prev).add(newTx.id));
        setTimeout(() => setFlashedIds((prev) => { const n = new Set(prev); n.delete(newTx.id); return n; }), 2200);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "transactions" }, (payload) => {
        const upd = payload.new as Transaction;
        setTransactions((prev) => prev.map((t) => t.id === upd.id ? upd : t));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [realtimeOn, wallets]);


  // Per-user average for anomaly detection
  const userAverages = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    for (const t of transactions) {
      const uid = wallets[t.wallet_id]?.user_id;
      if (!uid) continue;
      sums[uid] ||= { total: 0, count: 0 };
      sums[uid].total += t.amount;
      sums[uid].count++;
    }
    const out: Record<string, number> = {};
    Object.entries(sums).forEach(([uid, s]) => (out[uid] = s.count ? s.total / s.count : 0));
    return out;
  }, [transactions, wallets]);

  const isAnomaly = (t: Transaction) => {
    const uid = wallets[t.wallet_id]?.user_id;
    if (!uid) return false;
    const avg = userAverages[uid];
    return avg > 0 && t.amount > avg * 3;
  };

  const guessMethod = (t: Transaction): string => {
    if (t.razorpay_payment_id || t.razorpay_order_id) return "razorpay";
    if (t.merchant_upi_id) return "upi";
    if (t.type === "credit") return "wallet";
    return "wallet";
  };

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return transactions.filter((t) => {
      const w = wallets[t.wallet_id];
      if (q) {
        const hit =
          t.id.toLowerCase().includes(q) ||
          (t.razorpay_payment_id || "").toLowerCase().includes(q) ||
          (t.razorpay_order_id || "").toLowerCase().includes(q) ||
          (t.merchant_name || "").toLowerCase().includes(q) ||
          (w?.phone || "").includes(q) ||
          (w?.full_name || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (statuses.length && !statuses.includes(t.status || "")) return false;
      if (types.length && !types.includes(t.type)) return false;
      if (categories.length && !categories.includes(t.category || "other")) return false;
      if (methods.length && !methods.includes(guessMethod(t))) return false;
      const amtR = t.amount / 100;
      if (amtR < amountMin || amtR > amountMax) return false;
      if (dateFrom && t.created_at && new Date(t.created_at) < new Date(dateFrom)) return false;
      if (dateTo && t.created_at && new Date(t.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [transactions, wallets, debouncedSearch, statuses, types, categories, methods, amountMin, amountMax, dateFrom, dateTo]);

  const totalVolume = filtered.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0);
  const successCount = filtered.filter((t) => t.status === "success").length;
  const failedCount = filtered.filter((t) => t.status === "failed").length;

  const copyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Copied");
    setTimeout(() => setCopiedId(null), 1200);
  };

  const exportCSV = () => {
    const headers = "ID,Type,Amount,Merchant,Category,Method,Status,Date,User,Phone,City,Region,Country,Lat,Lng,LocSource\n";
    const rows = filtered.map((t) => {
      const w = wallets[t.wallet_id];
      return `${t.id},${t.type},${t.amount / 100},"${t.merchant_name || ""}",${t.category || ""},${guessMethod(t)},${t.status},${t.created_at},"${w?.full_name || ""}",${w?.phone || ""},"${t.location_city || ""}","${t.location_region || ""}","${t.location_country || ""}",${t.latitude ?? ""},${t.longitude ?? ""},${t.location_source || ""}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const logAudit = async (action: string, t: Transaction, details: Record<string, any> = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({
      admin_user_id: user.id,
      action,
      target_type: "transaction",
      target_id: t.id,
      details: { amount: t.amount, ...details },
    });
  };

  const flagTransaction = async (t: Transaction) => {
    await logAudit("transaction_flagged", t, { reason: "manual_review" });
    toast.success("Transaction flagged for review");
  };

  // Refund: opens typed-CONFIRM modal; the modal calls the admin-refund-transaction edge fn.
  const refundTransaction = (t: Transaction) => {
    if (t.status !== "success") {
      toast.error("Only successful transactions can be refunded");
      return;
    }
    if (t.type === "credit") {
      toast.error("Cannot refund a credit transaction");
      return;
    }
    setRefundTarget(t);
    hide();
  };

  const onRefundComplete = (txId: string) => {
    // Refresh: mark refunded visually by refetching that transaction's wallet activity is enough
    // (the refund row will appear via realtime). We'll also pull the latest status quickly.
    setRefundTarget(null);
    toast.success("Refund issued");
  };

  const retryTransaction = async (t: Transaction) => {
    if (t.status !== "failed" && t.status !== "pending") {
      toast.error("Only failed or pending transactions can be retried");
      return;
    }
    if (!confirm(`Retry transaction for ${formatAmount(t.amount)}?`)) return;
    const { error } = await supabase.from("transactions").update({ status: "success" }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("transaction_retried", t, { previous_status: t.status });
    toast.success("Transaction marked as success");
    setTransactions((prev) => prev.map((x) => x.id === t.id ? { ...x, status: "success" } : x));
    hide();
  };

  const openDetail = (t: Transaction) => {
    setSelectedId(t.id);
    const w = wallets[t.wallet_id];
    show({
      title: "Transaction Detail",
      subtitle: t.id.slice(0, 16) + "…",
      body: <DetailPanel t={t} wallet={w} all={transactions} onFlag={flagTransaction} onRefund={refundTransaction} onRetry={retryTransaction} onRequestInfo={() => { setInfoTarget(t); hide(); }} />,
    });
  };

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const summaryCards = [
    { label: "Total Volume", value: formatAmount(totalVolume), icon: DollarSign, color: "text-primary" },
    { label: "Successful", value: successCount, icon: TrendingUp, color: "text-success" },
    { label: "Failed", value: failedCount, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-xs text-muted-foreground mt-1">Deep investigation • {filtered.length} of {transactions.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRealtimeOn((v) => !v)}
              className={`flex items-center gap-2 px-3 h-10 rounded-xl border text-xs font-medium transition-all ${realtimeOn ? "bg-success/10 text-success border-success/30" : "bg-white/[0.03] text-muted-foreground border-white/[0.06]"}`}
              title={realtimeOn ? "Realtime on — new transactions appear instantly" : "Realtime paused"}>
              <Radio className={`w-3.5 h-3.5 ${realtimeOn ? "animate-pulse" : ""}`} /> {realtimeOn ? "Live" : "Paused"}
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-medium hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300 active:scale-95">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {summaryCards.map((s, i) => (
            <div key={s.label}
              className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/15 transition-all duration-500 relative overflow-hidden"
              style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.08 + i * 0.06}s both` }}>
              <div className={`w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center ${s.color} mb-2`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Smart Search */}
        <div className="flex gap-3" style={{ animation: "slide-up-spring 0.5s 0.25s both" }}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search TXN ID, Razorpay ID, merchant, user phone or name…"
              className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-11 pr-4 text-sm focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all duration-300" />
          </div>
          <button onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 h-11 rounded-xl border text-sm font-medium transition-all ${showFilters ? "bg-primary/15 text-primary border-primary/30" : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]"}`}>
            <SlidersHorizontal className="w-4 h-4" /> Filters
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4" style={{ animation: "slide-up-spring 0.3s both" }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">From date</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-sm focus:outline-none focus:border-primary/40" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">To date</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-sm focus:outline-none focus:border-primary/40" />
              </div>
            </div>
            <FilterChips label="Status" options={STATUSES} selected={statuses} onToggle={(v) => toggle(statuses, v, setStatuses)} />
            <FilterChips label="Type" options={TYPES} selected={types} onToggle={(v) => toggle(types, v, setTypes)} />
            <FilterChips label="Method" options={METHODS} selected={methods} onToggle={(v) => toggle(methods, v, setMethods)} />
            <FilterChips label="Category" options={ALL_CATEGORIES} selected={categories} onToggle={(v) => toggle(categories, v, setCategories)} />
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount range (₹{amountMin} – ₹{amountMax})</label>
              <div className="flex items-center gap-3 mt-2">
                <input type="number" value={amountMin} onChange={(e) => setAmountMin(+e.target.value || 0)}
                  className="w-24 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2 text-xs focus:outline-none focus:border-primary/40" />
                <input type="range" min={0} max={100000} step={100} value={amountMax}
                  onChange={(e) => setAmountMax(+e.target.value)} className="flex-1 accent-primary" />
                <input type="number" value={amountMax} onChange={(e) => setAmountMax(+e.target.value || 0)}
                  className="w-24 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2 text-xs focus:outline-none focus:border-primary/40" />
              </div>
            </div>
            <button onClick={() => {
              setStatuses([]); setTypes([]); setCategories([]); setMethods([]);
              setAmountMin(0); setAmountMax(100000); setDateFrom(""); setDateTo("");
            }} className="text-xs text-muted-foreground hover:text-foreground">Reset all filters</button>
          </div>
        )}

        {/* Table — frozen first 3 cols via sticky positioning */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden backdrop-blur-sm" style={{ animation: "slide-up-spring 0.5s 0.3s both" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                  <th className="sticky left-0 bg-card/95 backdrop-blur z-10 text-left py-4 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-12"></th>
                  <th className="sticky left-12 bg-card/95 backdrop-blur z-10 text-left py-4 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">TXN ID</th>
                  <th className="sticky left-[220px] bg-card/95 backdrop-blur z-10 text-left py-4 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  {["Type", "Amount", "Merchant", "Category", "Method", "Location", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="text-left py-4 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td colSpan={13} className="py-4 px-5">
                        <div className="h-5 rounded-lg overflow-hidden relative">
                          <div className="absolute inset-0 bg-white/[0.03]" />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" style={{ animation: "admin-shimmer 2s infinite" }} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm text-muted-foreground">No transactions match your filters</p>
                  </td></tr>
                ) : (
                  filtered.map((t, i) => {
                    const w = wallets[t.wallet_id];
                    const anomaly = isAnomaly(t);
                    const isSelected = selectedId === t.id;
                    const highlight = (val: string) => {
                      const q = debouncedSearch.toLowerCase();
                      if (!q || !val.toLowerCase().includes(q)) return val;
                      const idx = val.toLowerCase().indexOf(q);
                      return (<>
                        {val.slice(0, idx)}
                        <mark className="bg-primary/30 text-primary rounded px-0.5">{val.slice(idx, idx + q.length)}</mark>
                        {val.slice(idx + q.length)}
                      </>) as any;
                    };
                    return (
                      <tr key={t.id} onClick={() => openDetail(t)}
                        className={`border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-all duration-200 group ${isSelected ? "bg-primary/[0.04]" : ""} ${flashedIds.has(t.id) ? "tx-flash" : ""}`}
                        style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i * 0.02, 0.3)}s both` }}>
                        <td className="sticky left-0 bg-card/95 backdrop-blur z-10 py-3.5 px-5 group-hover:bg-card">
                          <input type="checkbox" onClick={(e) => e.stopPropagation()} className="accent-primary" />
                        </td>
                        <td className="sticky left-12 bg-card/95 backdrop-blur z-10 py-3.5 px-5 font-mono text-xs text-muted-foreground group-hover:bg-card">
                          <div className="flex items-center gap-2">
                            <span>{highlight(t.id.slice(0, 12))}…</span>
                            <button onClick={(e) => copyId(t.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/[0.06]">
                              {copiedId === t.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="sticky left-[220px] bg-card/95 backdrop-blur z-10 py-3.5 px-5 group-hover:bg-card">
                          <div className="text-xs">
                            <div className="font-medium">{w?.full_name ? highlight(w.full_name) : "—"}</div>
                            <div className="text-muted-foreground text-[10px]">{w?.phone ? highlight(w.phone) : ""}</div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`text-xs font-semibold capitalize flex items-center gap-1.5 ${t.type === "credit" ? "text-success" : "text-destructive"}`}>
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${t.type === "credit" ? "bg-success/10" : "bg-destructive/10"}`}>
                              {t.type === "credit" ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            </span>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-semibold whitespace-nowrap">
                          {formatAmount(t.amount)}
                          {anomaly && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                              <AlertTriangle className="w-2.5 h-2.5" />Unusual
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-muted-foreground text-xs whitespace-nowrap">{t.merchant_name ? highlight(t.merchant_name) : "—"}</td>
                        <td className="py-3.5 px-5 capitalize text-muted-foreground text-xs">{t.category || "—"}</td>
                        <td className="py-3.5 px-5 text-xs uppercase text-muted-foreground">{guessMethod(t)}</td>
                        <td className="py-3.5 px-5">
                          {t.location_city || t.location_country ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/[0.08] border border-primary/20 text-[10px] font-medium text-primary whitespace-nowrap"
                              title={[
                                t.location_city, t.location_region, t.location_country,
                                t.latitude && t.longitude ? `(${t.latitude.toFixed(3)}, ${t.longitude.toFixed(3)})` : null,
                                t.location_source ? `via ${t.location_source.toUpperCase()}` : null,
                              ].filter(Boolean).join(" • ")}
                            >
                              {t.location_source === "gps" ? <Satellite className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                              <span className="max-w-[110px] truncate">{t.location_city || t.location_country}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                            t.status === "success" ? "bg-success/10 text-success border border-success/20" :
                            t.status === "failed" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                            "bg-warning/10 text-warning border border-warning/20"
                          }`}>{t.status}</span>
                        </td>
                        <td className="py-3.5 px-5 text-xs text-muted-foreground whitespace-nowrap">
                          {t.created_at ? new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                        </td>
                        <td className="py-3.5 px-5">
                          <button onClick={(e) => { e.stopPropagation(); openDetail(t); }} className="text-xs text-primary hover:underline">View</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RequestInfoModal
        open={!!infoTarget}
        onClose={() => setInfoTarget(null)}
        targetUserId={infoTarget ? wallets[infoTarget.wallet_id]?.user_id || "" : ""}
        targetName={infoTarget ? wallets[infoTarget.wallet_id]?.full_name || null : null}
        targetType="transaction"
        targetId={infoTarget?.id || ""}
        notificationTitle="ℹ️ More info needed about a transaction"
        auditAction="transaction_request_more_info"
      />

      <RefundConfirmModal
        target={refundTarget}
        userName={refundTarget ? wallets[refundTarget.wallet_id]?.full_name || null : null}
        onClose={() => setRefundTarget(null)}
        onComplete={onRefundComplete}
      />
    </AdminLayout>
  );
};

const FilterChips = ({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) => (
  <div>
    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {options.map((o) => (
        <button key={o} onClick={() => onToggle(o)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all capitalize ${selected.includes(o) ? "bg-primary/15 text-primary border-primary/30" : "bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:bg-white/[0.05]"}`}>
          {o}
        </button>
      ))}
    </div>
  </div>
);

/* ───────────────────────── Detail Panel ───────────────────────── */
const DetailPanel = ({
  t, wallet, all, onFlag, onRefund, onRetry, onRequestInfo,
}: {
  t: Transaction;
  wallet?: WalletInfo;
  all: Transaction[];
  onFlag: (t: Transaction) => void;
  onRefund: (t: Transaction) => void;
  onRetry: (t: Transaction) => void;
  onRequestInfo: () => void;
}) => {
  const [showJSON, setShowJSON] = useState(false);
  const canRetry = t.status === "failed" || t.status === "pending";

  const sameDay = all.filter(
    (x) =>
      x.id !== t.id &&
      x.wallet_id === t.wallet_id &&
      x.created_at &&
      t.created_at &&
      new Date(x.created_at).toDateString() === new Date(t.created_at).toDateString()
  ).slice(0, 5);

  const timeline = [
    { label: "Initiated", at: t.created_at, done: true },
    { label: "Order created", at: t.razorpay_order_id ? t.created_at : null, done: !!t.razorpay_order_id },
    { label: "Payment captured", at: t.razorpay_payment_id ? t.created_at : null, done: !!t.razorpay_payment_id },
    { label: t.status === "failed" ? "Failed" : t.status === "success" ? "Settled" : "Pending settlement", at: t.created_at, done: t.status !== "pending" },
  ];

  const webhook = {
    id: t.id,
    razorpay_order_id: t.razorpay_order_id,
    razorpay_payment_id: t.razorpay_payment_id,
    amount: t.amount,
    type: t.type,
    status: t.status,
    merchant: { name: t.merchant_name, upi_id: t.merchant_upi_id },
    category: t.category,
    description: t.description,
    created_at: t.created_at,
    wallet_id: t.wallet_id,
  };

  return (
    <div className="space-y-5 text-sm">
      {/* Hero */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/[0.06] to-transparent border border-primary/15">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount</p>
        <p className={`text-3xl font-bold ${t.type === "credit" ? "text-success" : "text-foreground"}`}>{formatAmount(t.amount)}</p>
        <p className="text-xs text-muted-foreground mt-1 capitalize">{t.type} • {t.status}</p>
      </div>

      {/* Meta */}
      <div className="space-y-2 text-xs">
        <Row label="Transaction ID" value={t.id} mono />
        <Row label="User" value={wallet?.full_name || "—"} />
        <Row label="Phone" value={wallet?.phone || "—"} />
        <Row label="Merchant" value={t.merchant_name || "—"} />
        <Row label="UPI ID" value={t.merchant_upi_id || "—"} mono />
        <Row label="Category" value={t.category || "—"} />
        <Row label="Razorpay Order" value={t.razorpay_order_id || "—"} mono />
        <Row label="Razorpay Payment" value={t.razorpay_payment_id || "—"} mono />
      </div>

      {/* Payment Location */}
      {(t.location_city || t.latitude) && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Payment Location</p>
            {t.location_source && (
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] uppercase tracking-wider text-primary font-semibold">
                {t.location_source === "gps" ? <Satellite className="w-2.5 h-2.5" /> : <Wifi className="w-2.5 h-2.5" />}
                {t.location_source}
              </span>
            )}
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-foreground">
              {[t.location_city, t.location_region, t.location_country].filter(Boolean).join(", ") || "Coordinates only"}
            </p>
            {t.latitude !== null && t.longitude !== null && (
              <p className="font-mono text-[10px] text-muted-foreground">
                {t.latitude.toFixed(6)}, {t.longitude.toFixed(6)}
              </p>
            )}
            {t.location_captured_at && (
              <p className="text-[10px] text-muted-foreground/70">
                Captured {new Date(t.location_captured_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
          </div>
          {t.latitude !== null && t.longitude !== null && (
            <PaymentLocationMap
              latitude={Number(t.latitude)}
              longitude={Number(t.longitude)}
              city={t.location_city}
              country={t.location_country}
            />
          )}
        </div>
      )}

      {/* Timeline */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Payment Journey</p>
        <div className="space-y-3">
          {timeline.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full border-2 ${s.done ? "bg-primary border-primary" : "bg-transparent border-white/20"}`} />
                {i < timeline.length - 1 && <div className={`w-px flex-1 ${s.done ? "bg-primary/30" : "bg-white/10"}`} />}
              </div>
              <div className="pb-2">
                <p className={`text-xs font-medium ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                {s.at && <p className="text-[10px] text-muted-foreground">{new Date(s.at).toLocaleString("en-IN")}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook JSON */}
      <div>
        <button onClick={() => setShowJSON((v) => !v)} className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
          <span>Webhook payload</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showJSON ? "rotate-180" : ""}`} />
        </button>
        {showJSON && (
          <pre className="mt-2 p-3 rounded-xl bg-black/40 border border-white/[0.06] overflow-x-auto text-[10px] leading-relaxed font-mono">
{JSON.stringify(webhook, null, 2).split("\n").map((line, i) => (
  <div key={i}>
    <span className="text-primary/80">{line.match(/"[^"]+"\s*:/)?.[0] || ""}</span>
    <span className="text-muted-foreground">{line.replace(/"[^"]+"\s*:/, "")}</span>
  </div>
))}
          </pre>
        )}
      </div>

      {/* Related */}
      {sameDay.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Related (same wallet, same day)</p>
          <div className="space-y-1.5">
            {sameDay.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="font-mono text-[10px] text-muted-foreground">{r.id.slice(0, 14)}…</span>
                <span className={`text-xs font-semibold ${r.type === "credit" ? "text-success" : "text-foreground"}`}>{formatAmount(r.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <button onClick={() => onRefund(t)} disabled={t.status !== "success"} className="flex items-center justify-center gap-2 h-10 rounded-xl bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all text-xs font-medium disabled:opacity-30 disabled:pointer-events-none">
          <RefreshCcw className="w-3.5 h-3.5" /> Refund
        </button>
        <button onClick={() => onRetry(t)} disabled={!canRetry} className="flex items-center justify-center gap-2 h-10 rounded-xl bg-success/15 text-success border border-success/30 hover:bg-success/25 transition-all text-xs font-medium disabled:opacity-30 disabled:pointer-events-none">
          <Play className="w-3.5 h-3.5" /> Retry
        </button>
        <button onClick={() => onFlag(t)} className="flex items-center justify-center gap-2 h-10 rounded-xl bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25 transition-all text-xs font-medium">
          <Flag className="w-3.5 h-3.5" /> Flag
        </button>
      </div>
      <button onClick={onRequestInfo} disabled={!wallet?.user_id} className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none">
        <MessageSquareWarning className="w-3.5 h-3.5" /> Request more info from user
      </button>
    </div>
  );
};

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className={`text-right truncate ${mono ? "font-mono text-[10px]" : ""}`}>{value}</span>
  </div>
);

const TxFlashStyles = () => (
  <style>{`
    @keyframes tx-flash-anim {
      0% { background: hsl(var(--success) / 0.25); box-shadow: inset 3px 0 0 hsl(var(--success)); }
      100% { background: transparent; box-shadow: inset 0 0 0 transparent; }
    }
    .tx-flash { animation: tx-flash-anim 2.2s ease-out; }
  `}</style>
);

/* ───────────────────────── Refund Confirm Modal ───────────────────────── */
const RefundConfirmModal = ({
  target, userName, onClose, onComplete,
}: {
  target: Transaction | null;
  userName: string | null;
  onClose: () => void;
  onComplete: (txId: string) => void;
}) => {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target) {
      setReason("");
      setConfirmText("");
      setSubmitting(false);
    }
  }, [target?.id]);

  if (!target) return null;

  // High-risk gate: refunds > ₹10,000 require a longer justification (≥20 chars).
  const HIGH_RISK_PAISE = 10_000 * 100;
  const isHighRisk = target.amount > HIGH_RISK_PAISE;
  const minReasonChars = isHighRisk ? 20 : 5;
  const canSubmit = confirmText === "CONFIRM" && reason.trim().length >= minReasonChars && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-refund-transaction", {
        body: { transaction_id: target.id, reason: reason.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      onComplete(target.id);
    } catch (e: any) {
      toast.error(e?.message || "Refund failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-white/[0.08] p-6 space-y-5"
        style={{ animation: "slide-up-spring 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RefreshCcw className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold">Refund transaction</h3>
            {isHighRisk && (
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
                HIGH-VALUE
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Server-side, audit-logged. The user's wallet is credited and they're notified.
          </p>
        </div>

        <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{formatAmount(target.amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">User</span><span className="truncate ml-2">{userName || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Txn ID</span><span className="font-mono text-[10px]">{target.id.slice(0, 16)}…</span></div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Reason (visible to user, min {minReasonChars} chars)</span>
            <span className={`text-[10px] font-mono ${reason.trim().length >= minReasonChars ? "text-success" : "text-muted-foreground"}`}>
              {reason.trim().length}/{minReasonChars}
            </span>
          </label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            rows={isHighRisk ? 4 : 3}
            placeholder={isHighRisk
              ? "Required for refunds > ₹10,000 — reference dispute ticket, supervisor approval, root cause."
              : "e.g. Duplicate charge confirmed by Razorpay support ticket #123"}
            className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-xs focus:outline-none focus:border-primary/40 resize-none" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Type <span className="font-mono text-primary">CONFIRM</span> to proceed
          </label>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="CONFIRM"
            className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-xs font-mono tracking-widest focus:outline-none focus:border-primary/40" />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={submitting}
            className="flex-1 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-medium hover:bg-white/[0.06] transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={!canSubmit}
            className="flex-1 h-10 rounded-xl bg-primary/20 text-primary border border-primary/40 text-xs font-bold hover:bg-primary/30 transition disabled:opacity-30 disabled:pointer-events-none">
            {submitting ? "Refunding…" : `Refund ${formatAmount(target.amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminTransactionsWithStyles = () => (<><TxFlashStyles /><AdminTransactions /></>);

export default AdminTransactionsWithStyles;
