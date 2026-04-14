import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  merchant_name: string | null;
  category: string | null;
  status: string;
  created_at: string;
}

const categoryIcons: Record<string, string> = {
  food: "🍔", transport: "🚗", education: "📚", shopping: "🛍️", entertainment: "🎮", other: "💸",
};

const filters = ["All", "Sent", "Received", "Food", "Transport", "Shopping", "Education"];

const Activity = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallet } = await supabase.from("wallets").select("id").eq("user_id", user.id).single();
      if (!wallet) { setLoading(false); return; }

      let query = supabase.from("transactions").select("*").eq("wallet_id", wallet.id).order("created_at", { ascending: false }).limit(50);

      if (filter === "Sent") query = query.eq("type", "debit");
      else if (filter === "Received") query = query.eq("type", "credit");
      else if (filter !== "All") query = query.eq("category", filter.toLowerCase());

      const { data } = await query;
      setTransactions((data || []) as Transaction[]);
      setLoading(false);
    };
    fetchTransactions();
  }, [filter]);

  const filtered = transactions.filter(
    (tx) => !search || tx.merchant_name?.toLowerCase().includes(search.toLowerCase()) || tx.category?.toLowerCase().includes(search.toLowerCase())
  );

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const d = new Date(tx.created_at);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    if (!acc[label]) acc[label] = [];
    acc[label].push(tx);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold">Transaction History</h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..." className="input-auro w-full pl-11" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-pill text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              filter === f ? "gradient-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-border-active"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="w-full h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">No transactions found</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, txns]) => (
          <div key={date} className="mb-6">
            <p className="text-xs font-medium text-muted-foreground mb-3 tracking-wider">{date.toUpperCase()}</p>
            <div className="space-y-2">
              {txns.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border card-glow">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                    {categoryIcons[tx.category || "other"]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.merchant_name || "Transaction"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{tx.category} · {tx.status}</p>
                  </div>
                  <p className={`text-sm font-semibold ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                    {tx.type === "credit" ? "+" : "-"}{formatAmount(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <BottomNav />
    </div>
  );
};

export default Activity;
