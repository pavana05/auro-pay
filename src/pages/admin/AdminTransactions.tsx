import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Search, Download } from "lucide-react";

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
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] font-semibold">Transactions</h1>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-pill border border-border-active text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID or merchant..." className="input-auro w-full pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-auro w-auto px-3">
            <option>All</option><option>Success</option><option>Pending</option><option>Failed</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-auro w-auto px-3">
            <option>All</option><option>Credit</option><option>Debit</option>
          </select>
        </div>

        <div className="rounded-lg bg-card border border-border card-glow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["ID", "Type", "Amount", "Merchant", "Category", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-3 px-4"><div className="h-5 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{t.id.slice(0, 8)}...</td>
                    <td className="py-3 px-4 capitalize">
                      <span className={t.type === "credit" ? "text-success" : "text-destructive"}>{t.type}</span>
                    </td>
                    <td className="py-3 px-4 font-medium">{formatAmount(t.amount)}</td>
                    <td className="py-3 px-4">{t.merchant_name || "—"}</td>
                    <td className="py-3 px-4 capitalize text-muted-foreground">{t.category || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-pill ${
                        t.status === "success" ? "bg-success/20 text-success" :
                        t.status === "failed" ? "bg-destructive/20 text-destructive" :
                        "bg-warning/20 text-warning"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {t.created_at ? new Date(t.created_at).toLocaleString("en-IN") : "—"}
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
