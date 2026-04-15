import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Search, Download, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  merchant_name: string | null;
  category: string | null;
  status: string | null;
  created_at: string | null;
  wallet_id: string;
}

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100);
      if (statusFilter !== "All") query = query.eq("status", statusFilter.toLowerCase());
      if (typeFilter !== "All") query = query.eq("type", typeFilter.toLowerCase());
      const { data } = await query;
      setTransactions((data || []) as Transaction[]);
      setLoading(false);
    };
    fetch();
  }, [statusFilter, typeFilter]);

  const filtered = transactions.filter(
    (t) => !search || t.id.includes(search) || t.merchant_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalVolume = filtered.filter(t => t.status === "success").reduce((s, t) => s + t.amount, 0);
  const successCount = filtered.filter(t => t.status === "success").length;
  const failedCount = filtered.filter(t => t.status === "failed").length;

  const exportCSV = () => {
    const headers = "ID,Type,Amount,Merchant,Category,Status,Date\n";
    const rows = filtered.map((t) =>
      `${t.id},${t.type},${t.amount / 100},${t.merchant_name || ""},${t.category || ""},${t.status},${t.created_at}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[350px] h-[350px] rounded-full bg-primary/[0.02] blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-xs text-muted-foreground mt-1">Monitor all platform transactions</p>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-medium hover:bg-white/[0.06] transition-all duration-200 active:scale-95">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Volume", value: formatAmount(totalVolume), color: "text-primary" },
            { label: "Successful", value: successCount, color: "text-success" },
            { label: "Failed", value: failedCount, color: "text-destructive" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID or merchant..."
              className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-11 pr-4 text-sm focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all duration-200" />
          </div>
          <div className="flex gap-1.5 p-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
            {["All", "Success", "Pending", "Failed"].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${statusFilter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 p-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
            {["All", "Credit", "Debit"].map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${typeFilter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["ID", "Type", "Amount", "Merchant", "Category", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left py-3.5 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-4 px-5"><div className="h-5 bg-white/[0.03] rounded-lg animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">No transactions found</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground">{t.id.slice(0, 8)}…</td>
                    <td className="py-3.5 px-5">
                      <span className={`text-xs font-semibold capitalize flex items-center gap-1 ${t.type === "credit" ? "text-success" : "text-destructive"}`}>
                        {t.type === "credit" ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-semibold">{formatAmount(t.amount)}</td>
                    <td className="py-3.5 px-5 text-muted-foreground text-xs">{t.merchant_name || "—"}</td>
                    <td className="py-3.5 px-5 capitalize text-muted-foreground text-xs">{t.category || "—"}</td>
                    <td className="py-3.5 px-5">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        t.status === "success" ? "bg-success/10 text-success" :
                        t.status === "failed" ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-muted-foreground">
                      {t.created_at ? new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTransactions;
