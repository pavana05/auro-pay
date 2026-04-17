// Screen 11 — Transaction History. Search + voice-icon, filter chips, date-range picker,
// summary metric strip, daily spending bar chart, grouped infinite-scroll list, full-sheet detail.
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Mic, X, Calendar, Check, Copy, Download, AlertTriangle,
  ChevronDown, ArrowUpRight, ArrowDownLeft, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import BottomNav from "@/components/BottomNav";
import SwipeActionRow from "@/components/SwipeActionRow";

interface Txn {
  id: string;
  wallet_id: string;
  type: "credit" | "debit" | string;
  amount: number;
  status: string | null;
  category: string | null;
  description: string | null;
  merchant_name: string | null;
  merchant_upi_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  created_at: string;
}

type DirectionFilter = "all" | "sent" | "received";
type DateRange = "week" | "month" | "custom";

const PAGE_SIZE = 30;

const CATEGORIES = [
  { key: "food", label: "Food", icon: "🍔" },
  { key: "transport", label: "Transport", icon: "🚗" },
  { key: "shopping", label: "Shopping", icon: "🛍️" },
  { key: "education", label: "Education", icon: "📚" },
  { key: "entertainment", label: "Entertainment", icon: "🎬" },
];

const categoryIcon = (cat: string | null, type: string) => {
  const c = (cat || "").toLowerCase();
  const found = CATEGORIES.find(x => x.key === c);
  if (found) return found.icon;
  if (type === "credit") return "💰";
  return "💸";
};

const formatINR = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatINRShort = (paise: number) => {
  const v = paise / 100;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${v.toFixed(0)}`;
};

const dayKey = (iso: string) => iso.slice(0, 10);
const groupLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = (today.getTime() - target.getTime()) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-IN", { weekday: "long" });
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

const Activity = () => {
  const navigate = useNavigate();
  const [allTx, setAllTx] = useState<Txn[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [pinnedDay, setPinnedDay] = useState<string | null>(null);

  const [selected, setSelected] = useState<Txn | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (range === "week") {
      const f = new Date(now); f.setDate(now.getDate() - 6); f.setHours(0, 0, 0, 0);
      return { from: f, to: now };
    }
    if (range === "month") {
      const f = new Date(now); f.setDate(now.getDate() - 29); f.setHours(0, 0, 0, 0);
      return { from: f, to: now };
    }
    const f = customFrom ? new Date(customFrom + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
    const t = customTo ? new Date(customTo + "T23:59:59") : now;
    return { from: f, to: t };
  }, [range, customFrom, customTo]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: wallet } = await supabase.from("wallets").select("id").eq("user_id", user.id).maybeSingle();
    if (!wallet) { setLoading(false); return; }
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("wallet_id", wallet.id)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);
    setAllTx((data || []) as Txn[]);
    setVisibleCount(PAGE_SIZE);
    setPinnedDay(null);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTx.filter(tx => {
      if (direction === "sent" && tx.type !== "debit") return false;
      if (direction === "received" && tx.type !== "credit") return false;
      if (category && (tx.category || "").toLowerCase() !== category) return false;
      if (pinnedDay && dayKey(tx.created_at) !== pinnedDay) return false;
      if (q) {
        const hay = `${tx.merchant_name || ""} ${tx.description || ""} ${tx.category || ""} ${tx.merchant_upi_id || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allTx, search, direction, category, pinnedDay]);

  const summary = useMemo(() => {
    let spent = 0, received = 0;
    for (const tx of filtered) {
      if (tx.status && tx.status !== "success") continue;
      if (tx.type === "debit") spent += tx.amount;
      else if (tx.type === "credit") received += tx.amount;
    }
    return { spent, received, count: filtered.length };
  }, [filtered]);

  const chart = useMemo(() => {
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
    const buckets: { day: string; spent: number; label: string }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from); d.setDate(from.getDate() + i);
      buckets.push({ day: d.toISOString().slice(0, 10), spent: 0, label: d.toLocaleDateString("en-IN", { day: "numeric" }) });
    }
    for (const tx of allTx) {
      if (tx.type !== "debit") continue;
      if (tx.status && tx.status !== "success") continue;
      const k = dayKey(tx.created_at);
      const b = buckets.find(x => x.day === k);
      if (b) b.spent += tx.amount;
    }
    const max = Math.max(1, ...buckets.map(b => b.spent));
    return { buckets, max };
  }, [allTx, from, to]);

  const groups = useMemo(() => {
    const slice = filtered.slice(0, visibleCount);
    const map = new Map<string, Txn[]>();
    for (const tx of slice) {
      const k = dayKey(tx.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(tx);
    }
    return Array.from(map.entries()).map(([k, items]) => ({
      key: k,
      label: groupLabel(items[0].created_at),
      items,
      subtotal: items.reduce((s, t) => s + (t.type === "debit" ? t.amount : 0), 0),
    }));
  }, [filtered, visibleCount]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filtered.length && !loadingMore) {
        setLoadingMore(true);
        setTimeout(() => {
          setVisibleCount(c => Math.min(c + PAGE_SIZE, filtered.length));
          setLoadingMore(false);
        }, 350);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filtered.length, visibleCount, loadingMore]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    haptic.light();
    toast.success(`${label} copied`);
  };

  const downloadReceipt = (tx: Txn) => {
    const lines = [
      `AuroPay Receipt`,
      `─────────────────────`,
      `Type: ${tx.type === "credit" ? "Received" : "Sent"}`,
      `Amount: ${formatINR(tx.amount)}`,
      `Status: ${(tx.status || "success").toUpperCase()}`,
      `Merchant: ${tx.merchant_name || tx.description || "—"}`,
      `Category: ${tx.category || "other"}`,
      `Date: ${new Date(tx.created_at).toLocaleString("en-IN")}`,
      `UPI ID: ${tx.merchant_upi_id || "—"}`,
      `Payment Ref: ${tx.razorpay_payment_id || tx.id}`,
      `Order ID: ${tx.razorpay_order_id || "—"}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `receipt_${tx.id.slice(0, 8)}.txt`; a.click();
    URL.revokeObjectURL(url);
    haptic.success();
    toast.success("Receipt downloaded");
  };

  const clearChips = !!(category || direction !== "all" || search || pinnedDay);

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[120px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}
            className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]"
            style={{ background: "hsl(220 15% 8%)" }}>
            <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[19px] font-bold tracking-[-0.5px]">Activity</h1>
            <p className="text-[10px] text-white/30 font-medium">{summary.count} transactions</p>
          </div>
          <button onClick={() => setShowRangePicker(true)}
            className="px-3 h-[34px] rounded-full flex items-center gap-1.5 border border-white/[0.06] active:scale-95 transition"
            style={{ background: "hsl(220 15% 8%)" }}>
            <Calendar className="w-3 h-3 text-white/50" />
            <span className="text-[11px] font-semibold text-white/80">
              {range === "week" ? "This Week" : range === "month" ? "This Month" : "Custom"}
            </span>
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full h-[44px] pl-11 pr-20 rounded-[14px] text-[13px] outline-none border border-white/[0.06] focus:border-primary/40 transition placeholder:text-white/25"
            style={{ background: "hsl(220 15% 7%)" }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search && (
              <button onClick={() => setSearch("")}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.05] active:scale-90">
                <X className="w-3.5 h-3.5 text-white/50" />
              </button>
            )}
            <button onClick={() => toast("Voice search coming soon")}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition"
              style={{ background: "hsl(var(--primary) / 0.12)" }}>
              <Mic className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
          <div className="flex gap-2 w-max">
            {([
              { k: "all", label: "All" },
              { k: "sent", label: "Sent" },
              { k: "received", label: "Received" },
            ] as const).map(c => {
              const active = direction === c.k;
              return (
                <button key={c.k} onClick={() => { haptic.light(); setDirection(c.k); }}
                  className="px-4 h-[32px] rounded-full text-[11px] font-semibold transition active:scale-95 border whitespace-nowrap"
                  style={{
                    background: active ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" : "hsl(220 15% 7%)",
                    color: active ? "hsl(220 20% 6%)" : "hsl(0 0% 100% / 0.6)",
                    borderColor: active ? "transparent" : "hsl(0 0% 100% / 0.06)",
                  }}>
                  {c.label}
                </button>
              );
            })}
            <div className="w-px h-5 self-center bg-white/10 mx-1" />
            {CATEGORIES.map(c => {
              const active = category === c.key;
              return (
                <button key={c.key} onClick={() => { haptic.light(); setCategory(active ? null : c.key); }}
                  className="px-3 h-[32px] rounded-full text-[11px] font-semibold transition active:scale-95 border whitespace-nowrap flex items-center gap-1.5"
                  style={{
                    background: active ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" : "hsl(220 15% 7%)",
                    color: active ? "hsl(220 20% 6%)" : "hsl(0 0% 100% / 0.6)",
                    borderColor: active ? "transparent" : "hsl(0 0% 100% / 0.06)",
                  }}>
                  <span>{c.icon}</span>{c.label}
                </button>
              );
            })}
          </div>
        </div>

        {clearChips && (
          <button onClick={() => { setCategory(null); setDirection("all"); setSearch(""); setPinnedDay(null); }}
            className="mt-3 text-[10px] text-white/40 hover:text-white/70 flex items-center gap-1 font-semibold">
            <X className="w-2.5 h-2.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Summary strip */}
      <div className="relative z-10 px-5 mt-2 grid grid-cols-3 gap-2">
        {[
          { label: "Spent", value: formatINRShort(summary.spent), color: "hsl(0 70% 65%)" },
          { label: "Received", value: formatINRShort(summary.received), color: "hsl(152 60% 60%)" },
          { label: "Total", value: summary.count.toString(), color: "hsl(var(--primary))" },
        ].map(m => (
          <div key={m.label} className="rounded-[14px] p-3 border border-white/[0.05]"
            style={{ background: "hsl(220 15% 7%)" }}>
            <p className="text-[9px] text-white/30 font-semibold tracking-widest uppercase mb-1">{m.label}</p>
            <p className="text-[15px] font-bold font-mono tracking-tight" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="relative z-10 mx-5 mt-3 rounded-[16px] p-3 border border-white/[0.05]"
        style={{ background: "hsl(220 15% 6%)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] text-white/30 font-semibold tracking-widest uppercase">Daily spend</p>
          {pinnedDay && (
            <button onClick={() => setPinnedDay(null)}
              className="text-[9px] flex items-center gap-1 font-semibold" style={{ color: "hsl(var(--primary))" }}>
              <X className="w-2.5 h-2.5" /> Showing {new Date(pinnedDay).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </button>
          )}
        </div>
        <div className="flex items-end gap-[3px] h-[80px]">
          {chart.buckets.map(b => {
            const h = (b.spent / chart.max) * 72;
            const active = pinnedDay === b.day;
            const hasData = b.spent > 0;
            return (
              <button
                key={b.day}
                onClick={() => { if (hasData) { haptic.light(); setPinnedDay(active ? null : b.day); } }}
                disabled={!hasData}
                className="flex-1 flex flex-col items-center justify-end h-full group disabled:cursor-default"
                title={`${b.label}: ${formatINR(b.spent)}`}
              >
                <div className="w-full rounded-t transition-all"
                  style={{
                    height: `${Math.max(2, h)}px`,
                    background: active
                      ? "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))"
                      : hasData
                      ? "linear-gradient(180deg, hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.2))"
                      : "hsl(220 15% 12%)",
                    boxShadow: active ? "0 0 12px hsl(var(--primary) / 0.4)" : "none",
                  }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped list */}
      <div className="relative z-10 px-5 mt-5">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-[64px] rounded-[14px] bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-[18px] border border-white/[0.05] p-8 text-center"
            style={{ background: "hsl(220 15% 7%)" }}>
            <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <Filter className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <p className="text-[14px] font-semibold mb-1">No transactions found</p>
            <p className="text-[11px] text-white/40">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(g => (
              <div key={g.key}>
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-white/40">{g.label}</p>
                  <p className="text-[10px] text-white/30 font-mono">{g.items.length} item{g.items.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="rounded-[16px] overflow-hidden border border-white/[0.05]"
                  style={{ background: "hsl(220 15% 7%)" }}>
                  {g.items.map((tx, i) => (
                    <SwipeActionRow
                      key={tx.id}
                      onDetails={() => { haptic.light(); setSelected(tx); }}
                      onDispute={() => { haptic.medium(); navigate("/help"); }}
                    >
                      <button
                        onClick={() => { haptic.light(); setSelected(tx); }}
                        className="w-full flex items-center gap-3 p-3 text-left active:bg-white/[0.03] transition"
                        style={{
                          borderTop: i > 0 ? "1px solid hsl(0 0% 100% / 0.04)" : "none",
                          background: "hsl(220 15% 7%)",
                        }}>
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                          style={{ background: "hsl(220 15% 10%)" }}>
                          {categoryIcon(tx.category, tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate text-white/90">
                            {tx.merchant_name || tx.description || "Transaction"}
                          </p>
                          <p className="text-[10px] text-white/40 truncate flex items-center gap-1.5">
                            <span className="capitalize">{tx.category || "other"}</span>
                            <span className="text-white/20">·</span>
                            <span>{new Date(tx.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-mono font-bold flex items-center gap-0.5 justify-end"
                            style={{ color: tx.type === "credit" ? "hsl(152 60% 60%)" : "hsl(0 70% 65%)" }}>
                            {tx.type === "credit" ? "+" : "−"}{formatINR(tx.amount)}
                          </p>
                          {tx.status && tx.status !== "success" && (
                            <p className="text-[9px] text-white/40 capitalize">{tx.status}</p>
                          )}
                        </div>
                      </button>
                    </SwipeActionRow>
                  ))}
                </div>
                {g.subtotal > 0 && (
                  <p className="text-[10px] text-white/30 text-right mt-1.5 px-1 font-mono">
                    Subtotal: −{formatINR(g.subtotal)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-4">
          {loadingMore && (
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full"
                  style={{
                    background: "hsl(var(--primary))",
                    animation: `dot-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }} />
              ))}
            </div>
          )}
          {!loadingMore && !loading && visibleCount >= filtered.length && filtered.length > 5 && (
            <p className="text-[10px] text-white/25 font-semibold">— End of list —</p>
          )}
        </div>
      </div>

      <BottomNav />

      {/* Date range picker */}
      {showRangePicker && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "fade-in 0.2s ease-out" }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowRangePicker(false)} />
          <div className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8"
            style={{ background: "hsl(220 20% 8%)", animation: "sheet-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />
            <h3 className="text-[16px] font-bold mb-4">Select Date Range</h3>

            <div className="space-y-2">
              {[
                { k: "week" as const, label: "This Week", desc: "Last 7 days" },
                { k: "month" as const, label: "This Month", desc: "Last 30 days" },
                { k: "custom" as const, label: "Custom", desc: "Pick your own dates" },
              ].map(opt => {
                const active = range === opt.k;
                return (
                  <button key={opt.k}
                    onClick={() => { setRange(opt.k); if (opt.k !== "custom") setShowRangePicker(false); }}
                    className="w-full p-3.5 rounded-[14px] flex items-center justify-between border transition active:scale-[0.98]"
                    style={{
                      background: active ? "hsl(var(--primary) / 0.1)" : "hsl(220 15% 6%)",
                      borderColor: active ? "hsl(var(--primary) / 0.4)" : "hsl(0 0% 100% / 0.06)",
                    }}>
                    <div className="text-left">
                      <p className="text-[13px] font-semibold">{opt.label}</p>
                      <p className="text-[10px] text-white/40">{opt.desc}</p>
                    </div>
                    {active && <Check className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />}
                  </button>
                );
              })}
            </div>

            {range === "custom" && (
              <div className="mt-4 space-y-2">
                <div>
                  <label className="text-[10px] text-white/40 font-semibold tracking-wider uppercase mb-1 block">From</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    className="w-full h-[44px] px-3 rounded-[12px] text-[13px] outline-none border border-white/[0.06] focus:border-primary/40"
                    style={{ background: "hsl(220 15% 6%)", colorScheme: "dark" }} />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 font-semibold tracking-wider uppercase mb-1 block">To</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    className="w-full h-[44px] px-3 rounded-[12px] text-[13px] outline-none border border-white/[0.06] focus:border-primary/40"
                    style={{ background: "hsl(220 15% 6%)", colorScheme: "dark" }} />
                </div>
                <button onClick={() => setShowRangePicker(false)} disabled={!customFrom || !customTo}
                  className="w-full h-[48px] rounded-2xl font-semibold text-[13px] mt-2 disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                    color: "hsl(220 20% 6%)",
                  }}>
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail bottom sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "fade-in 0.2s ease-out" }}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setSelected(null)} />
          <div className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-[28px] border-t border-white/[0.08]"
            style={{
              background: "linear-gradient(180deg, hsl(220 20% 9%), hsl(220 22% 5%))",
              animation: "sheet-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}>
            <div className="sticky top-0 z-10 pt-3 pb-2 backdrop-blur-md"
              style={{ background: "hsl(220 22% 7% / 0.9)" }}>
              <div className="w-12 h-1 rounded-full bg-white/15 mx-auto" />
            </div>

            <div className="px-6 pb-8">
              <div className="flex flex-col items-center pt-2 pb-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[32px] mb-3"
                  style={{ background: "hsl(220 15% 10%)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                  {categoryIcon(selected.category, selected.type)}
                </div>
                <p className="text-[12px] text-white/40 mb-1 flex items-center gap-1.5">
                  {selected.type === "credit" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  {selected.type === "credit" ? "Received from" : "Sent to"}
                </p>
                <p className="text-[16px] font-bold mb-3 text-center">{selected.merchant_name || selected.description || "Transaction"}</p>
                <p className="text-[36px] font-mono font-bold tracking-tight"
                  style={{
                    background: selected.type === "credit"
                      ? "linear-gradient(135deg, hsl(152 60% 60%), hsl(152 60% 75%))"
                      : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                  {selected.type === "credit" ? "+" : "−"}{formatINR(selected.amount)}
                </p>
                <div className="mt-3 px-3 h-[26px] rounded-full flex items-center gap-1.5 text-[11px] font-semibold"
                  style={{
                    background: selected.status === "success" || !selected.status
                      ? "hsl(152 60% 50% / 0.12)" : "hsl(40 90% 55% / 0.12)",
                    color: selected.status === "success" || !selected.status
                      ? "hsl(152 60% 65%)" : "hsl(40 90% 65%)",
                  }}>
                  <Check className="w-3 h-3" />
                  {(selected.status || "success").toUpperCase()}
                </div>
              </div>

              <div className="rounded-[16px] divide-y divide-white/[0.04] border border-white/[0.05]"
                style={{ background: "hsl(220 15% 6%)" }}>
                {[
                  { label: "Category", value: <span className="capitalize">{selected.category || "other"}</span>, copy: false, mono: false, copyVal: "" },
                  { label: "Date & time", value: new Date(selected.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }), copy: false, mono: false, copyVal: "" },
                  { label: "UPI ID", value: selected.merchant_upi_id || "—", copy: !!selected.merchant_upi_id, mono: true, copyVal: selected.merchant_upi_id || "" },
                  { label: "Payment ID", value: selected.razorpay_payment_id || selected.id, copy: true, mono: true, copyVal: selected.razorpay_payment_id || selected.id },
                  ...(selected.razorpay_order_id ? [{ label: "Order ID", value: selected.razorpay_order_id, copy: true, mono: true, copyVal: selected.razorpay_order_id }] : []),
                  { label: "Fee", value: "₹0.00", copy: false, mono: false, copyVal: "" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-[11px] text-white/40 font-medium">{r.label}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[12px] font-medium text-white/85 truncate ${r.mono ? "font-mono" : ""}`}>{r.value}</span>
                      {r.copy && (
                        <button onClick={() => copyToClipboard(r.copyVal, r.label)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] active:scale-90">
                          <Copy className="w-3 h-3 text-white/50" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => downloadReceipt(selected)}
                  className="flex-1 h-[50px] rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.97] transition"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                    color: "hsl(220 20% 6%)",
                    boxShadow: "0 4px 24px hsl(var(--primary) / 0.25)",
                  }}>
                  <Download className="w-4 h-4" /> Receipt
                </button>
                <button onClick={() => { navigate("/help-support"); setSelected(null); }}
                  className="flex-1 h-[50px] rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.97] transition border border-white/[0.06] text-white/70"
                  style={{ background: "hsl(220 15% 8%)" }}>
                  <AlertTriangle className="w-4 h-4" /> Dispute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes sheet-up { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Activity;
