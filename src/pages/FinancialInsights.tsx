// Screen 19 — Financial Insights: smart money analytics with AI tip.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Sparkles, TrendingUp, TrendingDown, AlertCircle, Lightbulb } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { haptic } from "@/lib/haptics";

type WindowKey = "month" | "rolling30";

interface Tx {
  amount: number;
  category: string | null;
  created_at: string;
  type: string;
  status: string | null;
}

interface CatTotal { category: string; amount: number; pct: number; }

// Gold-family palette + muted neutrals — no off-brand sky/blue/teal/rose accents.
const CATEGORY_COLORS: Record<string, string> = {
  food: "hsl(42 78% 55%)",       // primary gold
  shopping: "hsl(32 70% 50%)",   // amber
  transport: "hsl(48 60% 55%)",  // honey
  entertainment: "hsl(20 65% 50%)", // copper
  bills: "hsl(38 50% 45%)",      // bronze
  education: "hsl(45 80% 60%)",  // light gold
  other: "hsl(220 10% 50%)",     // muted neutral
};
const colorFor = (c: string) => CATEGORY_COLORS[c.toLowerCase()] ?? "hsl(45 80% 55%)";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Custom SVG donut chart ──
const Donut = ({ data, ready }: { data: CatTotal[]; ready: boolean }) => {
  const size = 200, stroke = 24, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  const total = data.reduce((s, d) => s + d.amount, 0);
  const animatedTotal = useCountUp(ready ? Math.round(total / 100) : 0, 1100, ready);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(220 18% 12%)" strokeWidth={stroke} fill="none" />
        {data.map((d, i) => {
          const len = (d.amount / Math.max(1, total)) * c;
          const offset = c - acc;
          acc += len;
          return (
            <circle
              key={d.category}
              cx={size / 2} cy={size / 2} r={r}
              stroke={colorFor(d.category)}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${ready ? len : 0} ${c}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              style={{
                transition: `stroke-dasharray 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.08}s`,
              }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Total Spent</p>
        <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          ₹{animatedTotal.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
};

// ── Custom SVG WoW bar chart ──
const WoWBars = ({ thisWeek, lastWeek, ready }: { thisWeek: number[]; lastWeek: number[]; ready: boolean }) => {
  const max = Math.max(1, ...thisWeek, ...lastWeek);
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="flex items-end gap-2 h-[100px] mt-2">
      {days.map((d, i) => {
        const tw = (thisWeek[i] / max) * 100;
        const lw = (lastWeek[i] / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex-1 flex items-end gap-0.5">
              <div
                className="flex-1 rounded-t-[3px]"
                style={{
                  height: ready ? `${Math.max(lw, 2)}%` : "0%",
                  background: "hsl(220 15% 22%)",
                  transition: `height 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.15 + i * 0.04}s`,
                }}
              />
              <div
                className="flex-1 rounded-t-[3px]"
                style={{
                  height: ready ? `${Math.max(tw, 2)}%` : "0%",
                  background: "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))",
                  transition: `height 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + i * 0.04}s`,
                }}
              />
            </div>
            <span className="text-[9px] text-white/30 font-medium">{d}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function FinancialInsights() {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [loading, setLoading] = useState(true);
  const [windowKey, setWindowKey] = useState<WindowKey>("month");
  const [txs, setTxs] = useState<Tx[]>([]);
  const [prevTxs, setPrevTxs] = useState<Tx[]>([]);
  const [tip, setTip] = useState<string>("");
  const [tipLoading, setTipLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: wallet } = await supabase.from("wallets").select("id").eq("user_id", user.id).maybeSingle();
      if (!wallet) { setLoading(false); return; }

      const now = new Date();
      let curStart: Date, prevStart: Date, prevEnd: Date;
      if (windowKey === "month") {
        curStart = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        curStart = new Date(now.getTime() - 30 * 86400000);
        prevStart = new Date(now.getTime() - 60 * 86400000);
        prevEnd = curStart;
      }

      const { data: cur } = await supabase
        .from("transactions").select("amount,category,created_at,type,status")
        .eq("wallet_id", wallet.id).eq("type", "debit").eq("status", "success")
        .gte("created_at", curStart.toISOString());

      const { data: prev } = await supabase
        .from("transactions").select("amount,category,created_at,type,status")
        .eq("wallet_id", wallet.id).eq("type", "debit").eq("status", "success")
        .gte("created_at", prevStart.toISOString()).lt("created_at", prevEnd.toISOString());

      setTxs((cur ?? []) as Tx[]);
      setPrevTxs((prev ?? []) as Tx[]);
      setLoading(false);
    })();
  }, [windowKey]);

  // ── Aggregations ──
  const { catTotals, totalSpent, topCategory, prevTopAmount, wowChangePct, weekArrays } = useMemo(() => {
    const totals: Record<string, number> = {};
    txs.forEach(t => {
      const k = (t.category ?? "other").toLowerCase();
      totals[k] = (totals[k] ?? 0) + t.amount;
    });
    const total = Object.values(totals).reduce((s, n) => s + n, 0);
    const sorted: CatTotal[] = Object.entries(totals)
      .map(([category, amount]) => ({ category, amount, pct: total ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
    const top = sorted[0]?.category ?? "";

    const prevTotals: Record<string, number> = {};
    prevTxs.forEach(t => {
      const k = (t.category ?? "other").toLowerCase();
      prevTotals[k] = (prevTotals[k] ?? 0) + t.amount;
    });
    const prevTopAmt = top ? (prevTotals[top] ?? 0) : 0;

    // Week-over-week — last 7 days vs prior 7 days
    const now = new Date();
    const dayMs = 86400000;
    const tw = new Array(7).fill(0);
    const lw = new Array(7).fill(0);
    txs.forEach(t => {
      const d = new Date(t.created_at);
      const diff = Math.floor((now.getTime() - d.getTime()) / dayMs);
      if (diff < 7) tw[6 - diff] += t.amount;
      else if (diff < 14) lw[13 - diff] += t.amount;
    });
    prevTxs.forEach(t => {
      const d = new Date(t.created_at);
      const diff = Math.floor((now.getTime() - d.getTime()) / dayMs);
      if (diff >= 7 && diff < 14) lw[13 - diff] += t.amount;
    });

    const twTotal = tw.reduce((s, n) => s + n, 0);
    const lwTotal = lw.reduce((s, n) => s + n, 0);
    const wow = lwTotal > 0 ? Math.round(((twTotal - lwTotal) / lwTotal) * 100) : 0;

    return {
      catTotals: sorted,
      totalSpent: total,
      topCategory: top,
      prevTopAmount: prevTopAmt,
      wowChangePct: wow,
      weekArrays: { tw, lw },
    };
  }, [txs, prevTxs]);

  const topCatChangePct = useMemo(() => {
    if (!topCategory || prevTopAmount === 0) return 0;
    const cur = catTotals.find(c => c.category === topCategory)?.amount ?? 0;
    return Math.round(((cur - prevTopAmount) / prevTopAmount) * 100);
  }, [topCategory, prevTopAmount, catTotals]);

  // ── AI tip ──
  useEffect(() => {
    if (loading || catTotals.length === 0) { setTip(""); return; }
    setTipLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("financial-insights-tip", {
          body: { categories: catTotals.slice(0, 6), totalSpent, topCategory, wowChangePct },
        });
        if (error) throw error;
        setTip(data?.tip ?? "");
      } catch (e) {
        console.error(e);
        setTip("Set a weekly cap on your top category to keep spending in check.");
      } finally {
        setTipLoading(false);
      }
    })();
  }, [catTotals, totalSpent, topCategory, wowChangePct, loading]);

  return (
    <div className="min-h-[100dvh] bg-background pb-28 text-foreground">
      <style>{`
        @keyframes ins-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .ins-in { animation: ins-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-white/[0.04]">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => { haptic.light(); back(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/5 active:scale-95 transition"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold tracking-tight">Financial Insights</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Smart money analytics</p>
          </div>
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Window toggle */}
        <div className="ins-in flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.04] w-fit mx-auto">
          {([
            { k: "month", label: "This Month" },
            { k: "rolling30", label: "Last 30 Days" },
          ] as const).map(o => (
            <button
              key={o.k}
              onClick={() => { haptic.light(); setWindowKey(o.k); }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                windowKey === o.k ? "bg-primary text-primary-foreground" : "text-white/60"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-[260px] rounded-2xl bg-white/[0.03] animate-pulse" />
            <div className="h-[160px] rounded-2xl bg-white/[0.03] animate-pulse" />
            <div className="h-[100px] rounded-2xl bg-white/[0.03] animate-pulse" />
          </div>
        ) : catTotals.length === 0 ? (
          <div className="ins-in rounded-2xl border border-white/[0.04] p-8 text-center" style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
            <Sparkles className="w-10 h-10 mx-auto text-primary/60 mb-2" />
            <p className="text-sm font-semibold">No spending yet</p>
            <p className="text-xs text-white/40 mt-1">Make a few payments to unlock insights.</p>
          </div>
        ) : (
          <>
            {/* Donut + legend */}
            <section
              className="ins-in rounded-2xl border border-white/[0.04] p-5"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))", animationDelay: "0.05s" }}
            >
              <div className="flex flex-col items-center">
                <Donut data={catTotals} ready={!loading} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {catTotals.slice(0, 6).map(c => (
                  <div key={c.category} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorFor(c.category) }} />
                    <span className="flex-1 text-white/70">{cap(c.category)}</span>
                    <span className="font-mono text-white/50">{Math.round(c.pct)}%</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Top category insight */}
            {topCategory && (
              <section
                className="ins-in rounded-2xl border border-primary/20 p-4"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.02))",
                  animationDelay: "0.12s",
                }}
              >
                <p className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold">Top Category</p>
                <p className="text-base font-semibold mt-1">
                  Your biggest spend is <span className="text-primary">{cap(topCategory)}</span>
                </p>
                <p className="text-xs text-white/50 mt-1 font-mono">
                  ₹{((catTotals[0]?.amount ?? 0) / 100).toLocaleString("en-IN")} · {Math.round(catTotals[0]?.pct ?? 0)}% of total
                </p>
              </section>
            )}

            {/* WoW comparison */}
            <section
              className="ins-in rounded-2xl border border-white/[0.04] p-4"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))", animationDelay: "0.18s" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Week over Week</p>
                  <p className="text-sm font-semibold mt-0.5">Spending comparison</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono font-semibold ${
                  wowChangePct > 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-400"
                }`}>
                  {wowChangePct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {wowChangePct > 0 ? "+" : ""}{wowChangePct}%
                </div>
              </div>
              <WoWBars thisWeek={weekArrays.tw} lastWeek={weekArrays.lw} ready={!loading} />
              <div className="flex items-center gap-4 mt-3 text-[10px] text-white/40">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-primary" /> This week</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: "hsl(220 15% 22%)" }} /> Last week</span>
              </div>
            </section>

            {/* Category change alert */}
            {topCategory && Math.abs(topCatChangePct) >= 5 && (
              <section
                className="ins-in rounded-2xl border p-4 flex items-start gap-3"
                style={{
                  background: topCatChangePct > 0
                    ? "linear-gradient(135deg, hsl(0 70% 55% / 0.10), hsl(0 70% 55% / 0.02))"
                    : "linear-gradient(135deg, hsl(150 60% 45% / 0.10), hsl(150 60% 45% / 0.02))",
                  borderColor: topCatChangePct > 0 ? "hsl(0 70% 55% / 0.25)" : "hsl(150 60% 45% / 0.25)",
                  animationDelay: "0.24s",
                }}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  topCatChangePct > 0 ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-400"
                }`}>
                  {topCatChangePct > 0 ? <AlertCircle className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-medium">
                    {topCatChangePct > 0 ? "Spending Up" : "Spending Down"}
                  </p>
                  <p className="text-sm font-semibold mt-0.5 leading-snug">
                    You're spending <span className="font-mono">{Math.abs(topCatChangePct)}%</span> {topCatChangePct > 0 ? "more" : "less"} on{" "}
                    <span className="text-foreground">{cap(topCategory)}</span> this period.
                  </p>
                </div>
              </section>
            )}

            {/* AI saving tip */}
            <section
              className="ins-in rounded-2xl border border-primary/20 p-4 flex items-start gap-3"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.02))",
                animationDelay: "0.3s",
              }}
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary/80 uppercase tracking-wider font-semibold">AI Saving Tip</p>
                {tipLoading ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="h-3 rounded bg-white/[0.06] animate-pulse w-full" />
                    <div className="h-3 rounded bg-white/[0.06] animate-pulse w-3/4" />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed mt-1 text-white/85">{tip}</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
