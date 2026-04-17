import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  TrendingUp, DollarSign, Calendar, Sparkles, Repeat, Crown,
  ArrowUpRight, Users as UsersIcon,
} from "lucide-react";
import { Sparkline } from "@/components/admin/charts";

/* ───────────────────── Revenue model ─────────────────────
 * No real revenue table → derive an estimate from transaction volume.
 *  - Interchange fees: 1.2% of debit volume (the platform's UPI/card spread)
 *  - Premium plans:    flat ₹49 / active premium user / month (count = 5% of users)
 *  - Partnerships:     0.3% of total volume (brand merchant deals)
 * These are pluggable constants surfaced in the UI footer.
 */
const INTERCHANGE_RATE = 0.012;
const PREMIUM_PLAN_PRICE_PAISE = 4900;
const PREMIUM_PENETRATION = 0.05;
const PARTNERSHIPS_RATE = 0.003;

const COST_PER_USER_PAISE = 1500; // ₹15 estimated infra/support per user/month
const LTV_MONTHS = 18;            // average user lifespan

const fmtINR = (paise: number) => {
  if (paise >= 10000000) return `₹${(paise / 10000000).toFixed(2)}Cr`;
  if (paise >= 100000) return `₹${(paise / 100000).toFixed(2)}L`;
  if (paise >= 1000) return `₹${(paise / 1000).toFixed(1)}K`;
  return `₹${(paise / 100).toFixed(0)}`;
};
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

interface Tx {
  amount: number;
  type: string;
  status: string | null;
  created_at: string | null;
  wallet_id: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
  created_at: string | null;
}

const AdminRevenue = () => {
  const [txns, setTxns] = useState<Tx[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [walletToUser, setWalletToUser] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 365);

      const [{ data: tx }, { data: us }, { data: ws }] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount, type, status, created_at, wallet_id")
          .eq("status", "success")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase.from("profiles").select("id, full_name, created_at"),
        supabase.from("wallets").select("id, user_id"),
      ]);

      const map: Record<string, string> = {};
      (ws || []).forEach((w: any) => (map[w.id] = w.user_id));
      setWalletToUser(map);
      setTxns((tx || []) as Tx[]);
      setUsers((us || []) as UserRow[]);
      setLoading(false);
    })();
  }, []);

  /* ───────── Revenue calculations ───────── */
  const revenue = useMemo(() => {
    const debits = txns.filter((t) => t.type === "debit");
    const totalVolume = debits.reduce((s, t) => s + t.amount, 0);
    const totalAllVolume = txns.reduce((s, t) => s + t.amount, 0);

    const inDays = (t: Tx, days: number) => {
      if (!t.created_at) return false;
      return new Date(t.created_at).getTime() > Date.now() - days * 86400000;
    };
    const todayKey = new Date().toISOString().split("T")[0];
    const interchange = (vol: number) => Math.round(vol * INTERCHANGE_RATE);
    const partners = (vol: number) => Math.round(vol * PARTNERSHIPS_RATE);

    const dayVol = debits.filter((t) => t.created_at?.startsWith(todayKey)).reduce((s, t) => s + t.amount, 0);
    const weekVol = debits.filter((t) => inDays(t, 7)).reduce((s, t) => s + t.amount, 0);
    const monthVol = debits.filter((t) => inDays(t, 30)).reduce((s, t) => s + t.amount, 0);
    const yearVol = debits.filter((t) => inDays(t, 365)).reduce((s, t) => s + t.amount, 0);

    const premiumMonthly = Math.round(users.length * PREMIUM_PENETRATION) * PREMIUM_PLAN_PRICE_PAISE;
    const interchangeMonth = interchange(monthVol);
    const partnerMonth = partners(monthVol);
    const mrr = interchangeMonth + premiumMonthly + partnerMonth;
    const arr = mrr * 12;

    return {
      day: interchange(dayVol) + partners(dayVol) + Math.round(premiumMonthly / 30),
      week: interchange(weekVol) + partners(weekVol) + Math.round(premiumMonthly / 4),
      month: mrr,
      year: interchange(yearVol) + partners(yearVol) + premiumMonthly * 12,
      mrr,
      arr,
      totalVolume,
      totalAllVolume,
      premiumMonthly,
      interchangeMonth,
      partnerMonth,
    };
  }, [txns, users]);

  /* ───────── 90-day stacked breakdown ───────── */
  const stackedData = useMemo(() => {
    const days: { date: string; label: string; interchange: number; premium: number; partner: number }[] = [];
    const dailyPremium = Math.round((users.length * PREMIUM_PENETRATION * PREMIUM_PLAN_PRICE_PAISE) / 30);
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayDebits = txns.filter((t) => t.type === "debit" && t.created_at?.startsWith(key));
      const vol = dayDebits.reduce((s, t) => s + t.amount, 0);
      days.push({
        date: key,
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        interchange: Math.round(vol * INTERCHANGE_RATE),
        premium: dailyPremium,
        partner: Math.round(vol * PARTNERSHIPS_RATE),
      });
    }
    return days;
  }, [txns, users]);

  /* ───────── Cohort analysis (8 weeks) ───────── */
  const cohorts = useMemo(() => {
    const weeks: { week: string; weekStart: Date; signups: number; firstTxn: number; activeAfter30d: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i + 1) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const cohortUsers = users.filter((u) => {
        if (!u.created_at) return false;
        const c = new Date(u.created_at);
        return c >= start && c < end;
      });
      const cohortIds = new Set(cohortUsers.map((u) => u.id));

      // first transaction
      const transactedIds = new Set<string>();
      const activeAfter30Ids = new Set<string>();
      for (const t of txns) {
        if (!t.created_at) continue;
        const uid = walletToUser[t.wallet_id];
        if (!uid || !cohortIds.has(uid)) continue;
        transactedIds.add(uid);
        const txDate = new Date(t.created_at);
        const daysSince = (txDate.getTime() - start.getTime()) / 86400000;
        if (daysSince >= 30) activeAfter30Ids.add(uid);
      }
      weeks.push({
        week: `${start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`,
        weekStart: start,
        signups: cohortUsers.length,
        firstTxn: transactedIds.size,
        activeAfter30d: activeAfter30Ids.size,
      });
    }
    return weeks;
  }, [users, txns, walletToUser]);

  /* ───────── Unit economics ───────── */
  const unitEcon = useMemo(() => {
    const activeUsers = Math.max(users.length, 1);
    const monthInterchange = revenue.interchangeMonth;
    const arpu = Math.round(monthInterchange / activeUsers);
    const cpu = COST_PER_USER_PAISE;
    const ltv = arpu * LTV_MONTHS;
    const margin = arpu > 0 ? (arpu - cpu) / arpu : 0;
    return { arpu, cpu, ltv, margin };
  }, [revenue, users]);

  /* ───────── Top earning users ───────── */
  const topEarners = useMemo(() => {
    const byUser: Record<string, { volume: number; count: number }> = {};
    for (const t of txns) {
      if (t.type !== "debit") continue;
      const uid = walletToUser[t.wallet_id];
      if (!uid) continue;
      byUser[uid] ||= { volume: 0, count: 0 };
      byUser[uid].volume += t.amount;
      byUser[uid].count++;
    }
    const userMap = new Map(users.map((u) => [u.id, u]));
    return Object.entries(byUser)
      .map(([uid, v]) => ({
        user: userMap.get(uid),
        volume: v.volume,
        count: v.count,
        revenue: Math.round(v.volume * (INTERCHANGE_RATE + PARTNERSHIPS_RATE)),
      }))
      .filter((r) => r.user)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [txns, walletToUser, users]);

  // Sparkline data per KPI (last 14d revenue series)
  const sparklineData = stackedData.slice(-14).map((d) => d.interchange + d.premium + d.partner);

  const kpis = [
    { label: "Today", value: fmtINR(revenue.day), icon: Calendar, color: "text-primary" },
    { label: "This Week", value: fmtINR(revenue.week), icon: Calendar, color: "text-primary" },
    { label: "This Month", value: fmtINR(revenue.month), icon: DollarSign, color: "text-success" },
    { label: "This Year", value: fmtINR(revenue.year), icon: TrendingUp, color: "text-accent" },
    { label: "MRR", value: fmtINR(revenue.mrr), icon: Repeat, color: "text-primary" },
    { label: "ARR", value: fmtINR(revenue.arr), icon: Sparkles, color: "text-warning" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-success/[0.03] blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Analytics</h1>
          <p className="text-xs text-muted-foreground mt-1">Business intelligence • derived from {txns.length.toLocaleString()} transactions</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k, i) => (
            <div key={k.label}
              className="group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/20 transition-all duration-500 relative overflow-hidden"
              style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.06 + i * 0.04}s both` }}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center ${k.color}`}>
                  <k.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{k.label}</span>
              </div>
              <p className="text-xl font-bold font-mono">{loading ? "—" : k.value}</p>
              <div className="mt-1.5 -mb-1 opacity-70">
                <Sparkline data={sparklineData} color={k.color.includes("success") ? "#22c55e" : k.color.includes("warning") ? "#f59e0b" : "#c8952e"} height={24} />
              </div>
            </div>
          ))}
        </div>

        {/* Stacked area: revenue breakdown (90 days) */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] relative overflow-hidden" style={{ animation: "slide-up-spring 0.5s 0.25s both" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Revenue Breakdown — Last 90 Days</h3>
              <p className="text-[10px] text-muted-foreground">Stacked: interchange fees + premium plans + partnerships</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <Legend color="#9b6dff" label="Interchange" />
              <Legend color="#2dd4bf" label="Premium" />
              <Legend color="#c8952e" label="Partnerships" />
            </div>
          </div>
          <StackedArea data={stackedData} />
        </div>

        {/* Cohort + Unit econ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Cohort */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.3s both" }}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-primary" /> Cohort Analysis
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Activation & 30-day retention by signup week</p>
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cohort week</th>
                    <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Signups</th>
                    <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">First Txn</th>
                    <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Activation</th>
                    <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">30d Active</th>
                    <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c, i) => {
                    const activation = c.signups ? c.firstTxn / c.signups : 0;
                    const retention = c.signups ? c.activeAfter30d / c.signups : 0;
                    return (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-medium">{c.week}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{c.signups}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{c.firstTxn}</td>
                        <td className="py-2.5 px-3 text-right">
                          <RetentionPill value={activation} />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{c.activeAfter30d}</td>
                        <td className="py-2.5 px-3 text-right">
                          <RetentionPill value={retention} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unit economics */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.35s both" }}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Unit Economics
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Per-user financial health</p>
            </div>
            <div className="space-y-3">
              <UnitRow label="ARPU (monthly)" value={fmtINR(unitEcon.arpu)} sub="Avg revenue per user" tone="success" />
              <UnitRow label="Cost per user" value={fmtINR(unitEcon.cpu)} sub="Infra + support estimate" tone="muted" />
              <UnitRow label="LTV" value={fmtINR(unitEcon.ltv)} sub={`${LTV_MONTHS}mo lifespan`} tone="primary" />
              <UnitRow label="Gross margin" value={pct(unitEcon.margin)} sub="(ARPU − CPU) / ARPU" tone={unitEcon.margin > 0 ? "success" : "danger"} />
            </div>
            <div className="mt-4 p-3 rounded-xl bg-primary/[0.04] border border-primary/15">
              <p className="text-[10px] text-muted-foreground">LTV / CAC ratio</p>
              <p className="text-lg font-bold text-primary font-mono">{unitEcon.cpu ? (unitEcon.ltv / unitEcon.cpu).toFixed(1) : "∞"}×</p>
            </div>
          </div>
        </div>

        {/* Top earning users */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.4s both" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Crown className="w-4 h-4 text-warning" /> Top 10 Revenue-Generating Users
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Estimated platform revenue from interchange + partnerships</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">#</th>
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">User</th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">Volume</th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">Txns</th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">% of total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td colSpan={6} className="py-3 px-3"><div className="h-4 bg-white/[0.04] rounded" /></td>
                    </tr>
                  ))
                ) : topEarners.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No revenue data yet</td></tr>
                ) : topEarners.map((r, i) => {
                  const totalRev = topEarners.reduce((s, x) => s + x.revenue, 0) || 1;
                  return (
                    <tr key={r.user!.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                      style={{ animation: `slide-up-spring 0.4s ${0.05 + i * 0.04}s both` }}>
                      <td className="py-3 px-3">
                        <span className={`inline-flex w-6 h-6 rounded-lg items-center justify-center text-[10px] font-bold ${
                          i === 0 ? "bg-warning/20 text-warning" : i === 1 ? "bg-white/10 text-white/80" : i === 2 ? "bg-orange-500/15 text-orange-400" : "bg-white/[0.04] text-muted-foreground"
                        }`}>{i + 1}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[10px] font-semibold text-primary">
                            {(r.user!.full_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{r.user!.full_name || "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{fmtINR(r.volume)}</td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">{r.count}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-success">{fmtINR(r.revenue)}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-[10px] text-muted-foreground">{pct(r.revenue / totalRev)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model footer */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[10px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span><span className="text-muted-foreground/60">Interchange</span> {pct(INTERCHANGE_RATE)} · debit volume</span>
          <span><span className="text-muted-foreground/60">Premium</span> ₹{PREMIUM_PLAN_PRICE_PAISE / 100}/user × {pct(PREMIUM_PENETRATION)} of users</span>
          <span><span className="text-muted-foreground/60">Partnerships</span> {pct(PARTNERSHIPS_RATE)} · total volume</span>
          <span><span className="text-muted-foreground/60">CPU</span> ₹{COST_PER_USER_PAISE / 100} · <span className="text-muted-foreground/60">Lifespan</span> {LTV_MONTHS}mo</span>
        </div>
      </div>
    </AdminLayout>
  );
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
    <span className="text-muted-foreground">{label}</span>
  </div>
);

const RetentionPill = ({ value }: { value: number }) => {
  const color = value >= 0.5 ? "success" : value >= 0.25 ? "warning" : value > 0 ? "primary" : "muted";
  const tones: Record<string, string> = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    primary: "bg-primary/10 text-primary border-primary/20",
    muted: "bg-white/[0.03] text-muted-foreground border-white/[0.05]",
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border font-mono ${tones[color]}`}>{pct(value)}</span>;
};

const UnitRow = ({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "success" | "primary" | "danger" | "muted" }) => {
  const colors: Record<string, string> = {
    success: "text-success",
    primary: "text-primary",
    danger: "text-destructive",
    muted: "text-foreground",
  };
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
      <p className={`text-sm font-bold font-mono ${colors[tone]}`}>{value}</p>
    </div>
  );
};

/* ───────── Custom SVG stacked area chart ───────── */
const StackedArea = ({
  data,
}: {
  data: { date: string; label: string; interchange: number; premium: number; partner: number }[];
}) => {
  const W = 1000;
  const H = 240;
  const padL = 44;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const series = data.map((d) => ({
    date: d.date,
    label: d.label,
    interchange: d.interchange,
    premium: d.premium,
    partner: d.partner,
    total: d.interchange + d.premium + d.partner,
  }));
  const max = Math.max(...series.map((s) => s.total), 1);

  const xAt = (i: number) => padL + (i / Math.max(series.length - 1, 1)) * innerW;
  const yAt = (v: number) => padT + innerH - (v / max) * innerH;

  // Build stacked area paths bottom-up: partnerships → premium → interchange
  const buildLayer = (getLow: (s: any) => number, getHigh: (s: any) => number) => {
    const top = series.map((s, i) => `${xAt(i)},${yAt(getHigh(s))}`).join(" ");
    const bot = series
      .map((s, i) => `${xAt(i)},${yAt(getLow(s))}`)
      .reverse()
      .join(" ");
    return `${top} ${bot}`;
  };

  const partnerArea = buildLayer((s) => 0, (s) => s.partner);
  const premiumArea = buildLayer((s) => s.partner, (s) => s.partner + s.premium);
  const interchangeArea = buildLayer(
    (s) => s.partner + s.premium,
    (s) => s.partner + s.premium + s.interchange
  );

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((p) => p * max);

  return (
    <div className="w-full">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradInter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9b6dff" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#9b6dff" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="gradPrem" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="gradPart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8952e" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#c8952e" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {yLabels.map((v, i) => {
          const y = yAt(v);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(200,149,46,0.06)" strokeDasharray="2 4" />
              <text x={padL - 6} y={y + 3} fill="rgba(255,255,255,0.3)" fontSize={9} textAnchor="end" fontFamily="'JetBrains Mono', monospace">
                {fmtINR(v)}
              </text>
            </g>
          );
        })}

        <polygon points={partnerArea} fill="url(#gradPart)" />
        <polygon points={premiumArea} fill="url(#gradPrem)" />
        <polygon points={interchangeArea} fill="url(#gradInter)" />

        {/* x labels */}
        {series.map((s, i) => {
          const step = Math.ceil(series.length / 8);
          if (i % step !== 0 && i !== series.length - 1) return null;
          return (
            <text key={i} x={xAt(i)} y={H - 8} fill="rgba(255,255,255,0.3)" fontSize={9} textAnchor="middle" fontFamily="Sora">
              {s.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default AdminRevenue;
