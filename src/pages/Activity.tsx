import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowLeft, ArrowDownLeft, ArrowUpRight, TrendingUp, CalendarDays, X, BarChart3, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { format, subDays, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";

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

const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

const Activity = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
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

      // Fetch all for chart (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: allData } = await supabase.from("transactions").select("*").eq("wallet_id", wallet.id).gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false });
      if (allData) setAllTransactions(allData as Transaction[]);

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

  const totalIn = filtered.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const animIn = useCountUp(totalIn, 1000, true);
  const animOut = useCountUp(totalOut, 1000, true);

  // 7-day spending chart from allTransactions
  const chartData = useMemo(() => {
    const days: { day: string; date: Date; amount: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const next = subDays(d, -1);
      const amount = allTransactions
        .filter(t => t.type === "debit" && new Date(t.created_at) >= d && new Date(t.created_at) < next)
        .reduce((s, t) => s + t.amount, 0);
      days.push({
        day: format(d, "EEE")[0],
        date: d,
        amount,
        label: format(d, "dd MMM"),
      });
    }
    return days;
  }, [allTransactions]);

  const maxChart = Math.max(...chartData.map(d => d.amount), 1);
  const totalWeek = chartData.reduce((s, d) => s + d.amount, 0);
  const animWeek = useCountUp(totalWeek, 1000, true);
  const avgDaily = totalWeek / 7;

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
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      {/* Ambient BG */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[420px] h-[420px] rounded-full opacity-[0.045] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute top-[40%] -left-32 w-[280px] h-[280px] rounded-full opacity-[0.02] blur-[80px]" style={{ background: "hsl(36 60% 48%)" }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="px-5 pt-6 pb-4"
        >
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => { haptic.light(); navigate(-1); }}
              className="w-[42px] h-[42px] rounded-[14px] bg-muted/20 border border-border/30 flex items-center justify-center"
            >
              <ArrowLeft className="w-[18px] h-[18px] text-muted-foreground/70" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-[18px] font-bold tracking-[-0.4px] font-sora">Activity</h1>
              <p className="text-[10px] text-muted-foreground/40 font-mono mt-0.5">{filtered.length} transactions</p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards with count-up */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 200, damping: 22 }}
          className="px-5 mb-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[20px] p-4 border border-success/[0.08] overflow-hidden relative" style={{ background: "linear-gradient(160deg, hsl(152 60% 45% / 0.04), hsl(220 18% 7%))" }}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.05] blur-[20px]" style={{ background: "hsl(152 60% 45%)" }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-[9px] bg-success/[0.1] flex items-center justify-center">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-success" />
                  </div>
                  <p className="text-[9px] text-muted-foreground/40 font-bold tracking-[0.12em] uppercase font-sora">Income</p>
                </div>
                <p className="text-[18px] font-bold text-success tabular-nums font-mono">{fmt(animIn)}</p>
              </div>
            </div>
            <div className="rounded-[20px] p-4 border border-destructive/[0.06] overflow-hidden relative" style={{ background: "linear-gradient(160deg, hsl(0 72% 51% / 0.03), hsl(220 18% 7%))" }}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.05] blur-[20px]" style={{ background: "hsl(0 72% 51%)" }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-[9px] bg-destructive/[0.1] flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
                  </div>
                  <p className="text-[9px] text-muted-foreground/40 font-bold tracking-[0.12em] uppercase font-sora">Spent</p>
                </div>
                <p className="text-[18px] font-bold text-destructive tabular-nums font-mono">{fmt(animOut)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 7-Day Spending Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 22 }}
          className="px-5 mb-5"
        >
          <div className="rounded-[22px] p-4 border border-border/20 relative overflow-hidden" style={{ background: "radial-gradient(ellipse 60% 80% at 95% 5%, hsl(42 78% 55% / 0.06) 0%, transparent 60%), linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.2), transparent)" }} />

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className="w-3.5 h-3.5 text-primary/70" />
                  <p className="text-[9px] font-bold text-muted-foreground/40 tracking-[0.12em] uppercase font-sora">7-Day Spending</p>
                </div>
                <p className="text-[22px] font-bold tabular-nums font-mono tracking-[-0.5px]">{fmt(animWeek)}</p>
                <p className="text-[10px] text-muted-foreground/40 font-sora font-mono mt-0.5">~{fmt(avgDaily)}/day</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => { haptic.light(); navigate("/analytics"); }}
                className="px-3 py-2 rounded-[12px] bg-primary/[0.06] border border-primary/[0.1] flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-primary font-sora">Insights</span>
              </motion.button>
            </div>

            {/* Bars */}
            <div className="flex items-end justify-between gap-2 h-[80px] mt-2">
              {chartData.map((d, i) => {
                const height = (d.amount / maxChart) * 100;
                const isToday = i === chartData.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full flex-1 flex items-end relative">
                      <motion.div
                        initial={{ height: "0%" }}
                        animate={{ height: `${Math.max(height, 4)}%` }}
                        transition={{ delay: 0.2 + i * 0.07, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
                        className="w-full rounded-t-[6px] relative"
                        style={{
                          background: isToday
                            ? "linear-gradient(180deg, hsl(42 78% 55%), hsl(36 80% 42%))"
                            : "linear-gradient(180deg, hsl(42 78% 55% / 0.35), hsl(36 80% 42% / 0.18))",
                          boxShadow: isToday ? "0 0 12px hsl(42 78% 55% / 0.3)" : "none",
                        }}
                      >
                        {isToday && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" style={{ boxShadow: "0 0 6px hsl(42 78% 55%)" }} />
                        )}
                      </motion.div>
                    </div>
                    <span className={`text-[9px] font-bold font-sora ${isToday ? "text-primary" : "text-muted-foreground/30"}`}>{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Quick Date Chips */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="px-5 mb-3"
        >
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {quickDateFilters.map((qf, i) => (
              <motion.button
                key={qf.label}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.04, type: "spring", stiffness: 300, damping: 22 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => activeQuickDate === qf.label ? clearDateFilter() : applyQuickDate(qf.label)}
                className={`px-3.5 py-2 rounded-[12px] text-[11px] font-semibold whitespace-nowrap transition-colors font-sora ${
                  activeQuickDate === qf.label
                    ? "gradient-primary text-primary-foreground shadow-[0_4px_14px_hsl(42_78%_55%/0.3)]"
                    : "bg-muted/15 border border-border/30 text-muted-foreground/60"
                }`}
              >
                {qf.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Custom Date Filter */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="px-5 mb-4"
        >
          <div className="flex gap-2 items-center">
            <Popover open={showDatePicker === "from"} onOpenChange={(o) => setShowDatePicker(o ? "from" : null)}>
              <PopoverTrigger asChild>
                <button className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] text-[11px] font-medium border transition-all active:scale-95 font-sora ${dateFrom ? "border-primary/30 bg-primary/[0.06] text-primary" : "border-border/30 bg-muted/15 text-muted-foreground/40"}`}>
                  <CalendarDays className="w-3.5 h-3.5" />
                  {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setShowDatePicker(null); setActiveQuickDate(null); }} disabled={(d) => d > new Date() || (dateTo ? d > dateTo : false)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <span className="text-[10px] text-muted-foreground/30 font-sora">to</span>

            <Popover open={showDatePicker === "to"} onOpenChange={(o) => setShowDatePicker(o ? "to" : null)}>
              <PopoverTrigger asChild>
                <button className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] text-[11px] font-medium border transition-all active:scale-95 font-sora ${dateTo ? "border-primary/30 bg-primary/[0.06] text-primary" : "border-border/30 bg-muted/15 text-muted-foreground/40"}`}>
                  <CalendarDays className="w-3.5 h-3.5" />
                  {dateTo ? format(dateTo, "dd MMM yyyy") : "To"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setShowDatePicker(null); setActiveQuickDate(null); }} disabled={(d) => d > new Date() || (dateFrom ? d < dateFrom : false)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <AnimatePresence>
              {hasDateFilter && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={clearDateFilter}
                  className="w-8 h-8 rounded-[10px] bg-destructive/[0.08] border border-destructive/[0.12] flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-destructive/70" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="px-5 mb-4"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full h-[48px] rounded-[16px] bg-muted/15 border border-border/30 pl-11 pr-4 text-[13px] placeholder:text-muted-foreground/25 focus:border-primary/40 focus:bg-muted/20 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.06)] transition-all outline-none font-sora"
            />
          </div>
        </motion.div>

        {/* Category Filter Chips */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="px-5 mb-5"
        >
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filters.map((f, i) => (
              <motion.button
                key={f}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.03, type: "spring", stiffness: 300, damping: 22 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => { haptic.selection(); setFilter(f); }}
                className={`px-4 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors font-sora ${
                  filter === f
                    ? "gradient-primary text-primary-foreground shadow-[0_4px_14px_hsl(42_78%_55%/0.3)]"
                    : "bg-muted/15 border border-border/30 text-muted-foreground/50"
                }`}
              >
                {f !== "All" && f !== "Sent" && f !== "Received" && categoryIcons[f.toLowerCase()]
                  ? `${categoryIcons[f.toLowerCase()]} ${f}`
                  : f}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Transaction List */}
        <div className="px-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-full h-16 rounded-[16px] skeleton-gold" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 rounded-[20px] bg-muted/10 border border-border/20"
            >
              <div className="w-14 h-14 rounded-[18px] bg-muted/15 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-7 h-7 text-muted-foreground/15" />
              </div>
              <p className="text-[13px] font-semibold text-muted-foreground/40 font-sora">No transactions found</p>
              <p className="text-[11px] text-muted-foreground/25 mt-1 font-sora">Try a different filter or search term</p>
            </motion.div>
          ) : (
            Object.entries(grouped).map(([date, txns], gi) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + gi * 0.06, type: "spring", stiffness: 200, damping: 22 }}
                className="mb-5"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <p className="text-[10px] font-bold text-muted-foreground/30 tracking-[0.15em] uppercase font-sora">{date}</p>
                  <div className="flex-1 h-[1px]" style={{ background: "linear-gradient(90deg, hsl(220 15% 18% / 0.4), transparent)" }} />
                  <span className="text-[10px] text-muted-foreground/25 font-mono">{txns.length}</span>
                </div>
                <div className="rounded-[20px] border border-border/20 overflow-hidden relative" style={{
                  background: "linear-gradient(160deg, hsl(220 18% 8.5%), hsl(220 20% 5%))",
                  boxShadow: "0 8px 32px -8px hsl(220 20% 4% / 0.5), inset 0 1px 0 hsl(40 20% 95% / 0.02)"
                }}>
                  <div className="absolute top-0 inset-x-0 h-[1px] z-10" style={{ background: "linear-gradient(90deg, transparent 10%, hsl(42 78% 55% / 0.1) 50%, transparent 90%)" }} />
                  {txns.map((tx, idx) => (
                    <motion.button
                      key={tx.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.42 + gi * 0.06 + idx * 0.04, type: "spring", stiffness: 300, damping: 24 }}
                      whileTap={{ scale: 0.98, backgroundColor: "rgba(255,255,255,0.025)" }}
                      onClick={() => { haptic.light(); navigate(`/transaction/${tx.id}`); }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-all duration-200 ${idx < txns.length - 1 ? "border-b border-border/10" : ""}`}
                    >
                      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center text-lg shrink-0 border border-border/10 ${
                        tx.type === "credit" ? "bg-success/[0.08]" : "bg-muted/20"
                      }`}>
                        {categoryIcons[tx.category || "other"] || "💸"}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[13px] font-semibold truncate font-sora">{tx.merchant_name || tx.category || "Transaction"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground/30 capitalize font-sora">{tx.category || "other"}</span>
                          <span className="text-[10px] text-muted-foreground/15">·</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full font-sora ${
                            tx.status === "success" ? "bg-success/[0.1] text-success" :
                            tx.status === "failed" ? "bg-destructive/[0.1] text-destructive" :
                            "bg-warning/[0.1] text-warning"
                          }`}>{tx.status}</span>
                          <span className="text-[10px] text-muted-foreground/15">·</span>
                          <span className="text-[10px] text-muted-foreground/30 font-mono">
                            {new Date(tx.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      <p className={`text-[13px] font-bold tabular-nums font-mono ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                        {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <BottomNav />

      <style>{`
        .skeleton-gold {
          background: linear-gradient(110deg, hsl(220 15% 8%) 0%, hsl(220 15% 8%) 40%, hsl(42 78% 55% / 0.06) 50%, hsl(220 15% 8%) 60%, hsl(220 15% 8%) 100%);
          background-size: 200% 100%;
          animation: skel 1.8s ease-in-out infinite;
        }
        @keyframes skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Activity;
