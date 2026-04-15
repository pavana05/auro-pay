import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowLeft, ArrowDownLeft, ArrowUpRight, TrendingUp, CalendarDays, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

const filters = ["All", "Sent", "Received", "Food", "Transport", "Shopping", "Education", "Entertainment"];

const quickDateFilters = [
  { label: "Today", getRange: () => { const d = new Date(); d.setHours(0,0,0,0); return { from: d, to: new Date() }; } },
  { label: "Yesterday", getRange: () => { const d = new Date(); d.setDate(d.getDate()-1); d.setHours(0,0,0,0); const e = new Date(d); e.setHours(23,59,59,999); return { from: d, to: e }; } },
  { label: "This Week", getRange: () => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); const start = new Date(d); start.setDate(diff); start.setHours(0,0,0,0); return { from: start, to: new Date() }; } },
  { label: "This Month", getRange: () => { const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1); return { from: start, to: new Date() }; } },
  { label: "Last 30 Days", getRange: () => { const d = new Date(); const start = new Date(d); start.setDate(d.getDate()-30); start.setHours(0,0,0,0); return { from: start, to: new Date() }; } },
];

const Activity = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState<"from" | "to" | null>(null);
  const [activeQuickDate, setActiveQuickDate] = useState<string | null>(null);
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

      if (dateFrom) query = query.gte("created_at", dateFrom.toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data } = await query;
      setTransactions((data || []) as Transaction[]);
      setLoading(false);
    };
    fetchTransactions();
  }, [filter, dateFrom, dateTo]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("activity-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        const refetch = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: wallet } = await supabase.from("wallets").select("id").eq("user_id", user.id).single();
          if (!wallet) return;
          const { data } = await supabase.from("transactions").select("*").eq("wallet_id", wallet.id).order("created_at", { ascending: false }).limit(50);
          if (data) setTransactions(data as Transaction[]);
        };
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = transactions.filter(
    (tx) => !search || tx.merchant_name?.toLowerCase().includes(search.toLowerCase()) || tx.category?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCompact = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  const totalIn = filtered.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  const hasDateFilter = dateFrom || dateTo;

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setActiveQuickDate(null);
  };

  const applyQuickDate = (label: string) => {
    const qf = quickDateFilters.find(q => q.label === label);
    if (!qf) return;
    haptic.selection();
    const { from, to } = qf.getRange();
    setDateFrom(from);
    setDateTo(to);
    setActiveQuickDate(label);
  };

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
    <div className="min-h-screen bg-background noise-overlay pb-28">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic.light(); navigate(-1); }} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold">Transaction History</h1>
            <p className="text-[10px] text-muted-foreground">{filtered.length} transactions</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-5 mb-5 animate-slide-up-delay-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 border border-border overflow-hidden relative" style={{ background: "linear-gradient(145deg, hsl(152 60% 45% / 0.06), hsl(220 15% 8%))" }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(152 60% 45%), transparent)" }} />
            <div className="relative z-10">
              <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center mb-2">
                <ArrowDownLeft className="w-4 h-4 text-success" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Total In</p>
              <p className="text-lg font-bold text-success">{formatCompact(totalIn)}</p>
            </div>
          </div>
          <div className="rounded-2xl p-4 border border-border overflow-hidden relative" style={{ background: "linear-gradient(145deg, hsl(0 72% 51% / 0.04), hsl(220 15% 8%))" }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(0 72% 51%), transparent)" }} />
            <div className="relative z-10">
              <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                <ArrowUpRight className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Total Out</p>
              <p className="text-lg font-bold text-destructive">{formatCompact(totalOut)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="px-5 mb-4 animate-slide-up-delay-1">
        <div className="flex gap-2 items-center">
          <Popover open={showDatePicker === "from"} onOpenChange={(o) => setShowDatePicker(o ? "from" : null)}>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-medium border transition-all active:scale-95 ${dateFrom ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                <CalendarDays className="w-3.5 h-3.5" />
                {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setShowDatePicker(null); }} disabled={(d) => d > new Date() || (dateTo ? d > dateTo : false)} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <span className="text-[10px] text-muted-foreground">to</span>

          <Popover open={showDatePicker === "to"} onOpenChange={(o) => setShowDatePicker(o ? "to" : null)}>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-medium border transition-all active:scale-95 ${dateTo ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                <CalendarDays className="w-3.5 h-3.5" />
                {dateTo ? format(dateTo, "dd MMM yyyy") : "To date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setShowDatePicker(null); }} disabled={(d) => d > new Date() || (dateFrom ? d < dateFrom : false)} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {hasDateFilter && (
            <button onClick={clearDateFilter} className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center active:scale-90 transition-all">
              <X className="w-3.5 h-3.5 text-destructive" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-4 animate-slide-up-delay-1">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full h-12 rounded-2xl bg-card border border-border pl-11 pr-4 text-sm focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.1)] transition-all duration-200 outline-none"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-5 mb-5 animate-slide-up-delay-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => { haptic.selection(); setFilter(f); }}
              className={`px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-300 active:scale-95 ${
                filter === f
                  ? "gradient-primary text-primary-foreground shadow-[0_4px_12px_hsl(42_78%_55%/0.2)]"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {f !== "All" && f !== "Sent" && f !== "Received" && categoryIcons[f.toLowerCase()]
                ? `${categoryIcons[f.toLowerCase()]} ${f}`
                : f}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="px-5">
        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="w-full h-16 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No transactions found</p>
            <p className="text-[11px] text-muted-foreground mt-1">Try a different filter or search term</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, txns], gi) => (
            <div key={date} className="mb-5" style={{ animationDelay: `${gi * 0.05}s` }}>
              <div className="flex items-center gap-2 mb-2.5">
                <p className="text-[10px] font-bold text-muted-foreground tracking-[0.15em] uppercase">{date}</p>
                <div className="flex-1 h-[1px] bg-border/50" />
                <span className="text-[10px] text-muted-foreground">{txns.length} txns</span>
              </div>
              <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
                {txns.map((tx, idx) => (
                  <button
                    key={tx.id}
                    onClick={() => { haptic.light(); navigate(`/transaction/${tx.id}`); }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-all duration-200 active:bg-muted/10 ${idx < txns.length - 1 ? "border-b border-border/30" : ""}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      tx.type === "credit" ? "bg-success/10" : "bg-muted/15"
                    }`}>
                      {categoryIcons[tx.category || "other"] || "💸"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate text-left">{tx.merchant_name || tx.category || "Transaction"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground capitalize">{tx.category || "other"}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          tx.status === "success" ? "bg-success/10 text-success" :
                          tx.status === "failed" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        }`}>{tx.status}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(tx.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <p className={`text-[13px] font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                      {tx.type === "credit" ? "+" : "-"}{formatCompact(tx.amount)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Activity;
