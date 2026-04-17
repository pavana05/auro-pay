import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { useNavigate } from "react-router-dom";
import { useCountUp } from "@/hooks/useCountUp";
import { useContextPanel } from "@/components/admin/AdminContextPanel";
import { Sparkline, VolumeBars, StatusDonut, GrowthLine, HBars, type VolBar } from "@/components/admin/charts";
import { toast } from "sonner";
import {
  Users, ArrowLeftRight, Wallet, ShieldCheck, AlertTriangle,
  UserPlus, DollarSign, CreditCard, Heart, Link2,
  ArrowUpRight, ArrowDownRight, Sparkles, Activity,
  Pause, Play, RefreshCw, CheckCircle2, XCircle, Server,
  Database, Globe, Wifi, Trophy, Filter,
} from "lucide-react";

const C = {
  primary: "#c8952e", secondary: "#d4a84b", glow: "#e8c060",
  success: "#22c55e", danger: "#ef4444", warning: "#f59e0b",
  info: "#3b82f6", cyan: "#06b6d4",
};

/* ─────────── Helpers ─────────── */
const fmtPaise = (p: number) =>
  p >= 10000000 ? `₹${(p / 10000000).toFixed(2)}Cr` :
  p >= 100000 ? `₹${(p / 100000).toFixed(2)}L` :
  p >= 1000 ? `₹${(p / 100).toLocaleString("en-IN")}` :
  `₹${(p / 100).toFixed(2)}`;

const Counter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const v = useCountUp(value, 1200, true);
  return <span className="font-mono">{prefix}{v.toLocaleString("en-IN")}{suffix}</span>;
};

const greetingFor = (date: Date) => {
  const h = parseInt(date.toLocaleString("en-IN", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }), 10);
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Working late";
};

const trendPct = (curr: number, prev: number) => {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return 100;
  return Math.round(((curr - prev) / prev) * 100);
};

/* ─────────── KPI Card ─────────── */
interface Kpi {
  label: string; value: number | string; numericValue?: number;
  icon: any; color: string; trendPct?: number; trendLabel?: string;
  spark: number[]; suffix?: string; prefix?: string;
  onClick?: () => void;
}

const KpiCard = ({ k }: { k: Kpi }) => {
  const trendUp = (k.trendPct ?? 0) >= 0;
  return (
    <button
      onClick={k.onClick}
      className="group relative text-left rounded-[18px] p-4 overflow-hidden border transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "rgba(13,14,18,0.7)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(255,255,255,0.05)",
        animation: "kpi-in 0.5s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: `linear-gradient(180deg, ${k.color}, ${k.color}40)` }} />
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${k.color}30, transparent)` }} />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: `${k.color}14`, border: `1px solid ${k.color}25` }}>
          <k.icon className="w-4 h-4" style={{ color: k.color }} />
        </div>
        {k.trendPct !== undefined && (
          <span
            className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full flex items-center gap-0.5"
            style={{
              background: trendUp ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: trendUp ? C.success : C.danger,
              border: `1px solid ${trendUp ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)"}`,
            }}
            title={k.trendLabel}
          >
            {trendUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {Math.abs(k.trendPct)}%
          </span>
        )}
      </div>

      <p className="text-[10px] uppercase tracking-[0.1em] text-white/40 font-sora mb-1">{k.label}</p>
      <p className="text-[26px] font-bold tracking-tight text-white leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {typeof k.value === "number"
          ? <Counter value={k.value} prefix={k.prefix} suffix={k.suffix} />
          : k.value}
      </p>
      {k.trendLabel && (
        <p className="text-[10px] mt-1.5 font-sora" style={{ color: trendUp ? `${C.success}b0` : `${C.danger}b0` }}>
          {trendUp ? "↑" : "↓"} {k.trendLabel}
        </p>
      )}

      <div className="mt-3 -mx-1 -mb-1">
        <Sparkline data={k.spark.length ? k.spark : [0, 0, 0, 0, 0, 0, 0]} color={k.color} height={32} />
      </div>
    </button>
  );
};

/* ─────────── Widget shell ─────────── */
const Widget = ({ children, className = "", noPadding = false }: { children: React.ReactNode; className?: string; noPadding?: boolean }) => (
  <div
    className={`relative rounded-[18px] overflow-hidden border ${!noPadding ? "p-5" : ""} ${className}`}
    style={{
      background: "rgba(13,14,18,0.7)",
      backdropFilter: "blur(20px)",
      borderColor: "rgba(255,255,255,0.05)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)",
      animation: "kpi-in 0.5s cubic-bezier(0.22,1,0.36,1) both",
    }}
  >
    <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.15), transparent)" }} />
    {children}
  </div>
);

/* ─────────── Page ─────────── */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const ctxPanel = useContextPanel();

  /* Snapshot state */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [profile, setProfile] = useState<any>(null);

  /* Live data */
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [allTxns, setAllTxns] = useState<any[]>([]);
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);
  const [recentFailed, setRecentFailed] = useState<any[]>([]);
  const [activeLinks, setActiveLinks] = useState(0);
  const [systemBalance, setSystemBalance] = useState(0);

  /* Live feed */
  const [feed, setFeed] = useState<any[]>([]);
  const [feedPaused, setFeedPaused] = useState(false);
  const pausedRef = useRef(feedPaused);
  pausedRef.current = feedPaused;
  const queuedRef = useRef<any[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  /* Filtering */
  const [filterDate, setFilterDate] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setProfile(data);
    })();
  }, []);

  const fetchAll = useCallback(async () => {
    const [usersRes, walletsRes, txnsRes, kycRes, linksRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, role, created_at, phone").order("created_at", { ascending: false }),
      supabase.from("wallets").select("id, user_id, balance, is_frozen"),
      supabase.from("transactions").select("id, type, amount, status, merchant_name, merchant_upi_id, category, created_at, wallet_id, razorpay_payment_id").order("created_at", { ascending: false }).limit(1000),
      supabase.from("kyc_requests").select("id, user_id, aadhaar_name, submitted_at, status").eq("status", "pending").order("submitted_at", { ascending: false }).limit(5),
      supabase.from("parent_teen_links").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

    const allUsers = usersRes.data || [];
    const allWallets = walletsRes.data || [];
    const txns = txnsRes.data || [];
    setUsers(allUsers);
    setWallets(allWallets);
    setAllTxns(txns);
    setPendingKyc(kycRes.data || []);
    setActiveLinks(linksRes.count || 0);
    setSystemBalance(allWallets.reduce((s: number, w: any) => s + (w.balance || 0), 0));
    setRecentFailed(txns.filter((t: any) => t.status === "failed").slice(0, 5));
    setFeed(txns.slice(0, 30));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Realtime: live feed insert */
  useEffect(() => {
    const ch = supabase
      .channel("admin-mc-txns")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, (payload) => {
        const row: any = payload.new;
        if (pausedRef.current) {
          queuedRef.current = [row, ...queuedRef.current];
          return;
        }
        setFeed((prev) => [row, ...prev].slice(0, 50));
        setFlashIds((s) => { const n = new Set(s); n.add(row.id); return n; });
        setTimeout(() => setFlashIds((s) => { const n = new Set(s); n.delete(row.id); return n; }), 1400);
        setAllTxns((prev) => [row, ...prev].slice(0, 1000));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "kyc_requests" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  /* Resume: drain queue */
  useEffect(() => {
    if (!feedPaused && queuedRef.current.length > 0) {
      const drained = queuedRef.current;
      queuedRef.current = [];
      setFeed((prev) => [...drained, ...prev].slice(0, 50));
      const ids = new Set(drained.map((d) => d.id));
      setFlashIds((s) => { const n = new Set(s); ids.forEach((i) => n.add(i)); return n; });
      setTimeout(() => setFlashIds((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; }), 1400);
    }
  }, [feedPaused]);

  const handleRefresh = async () => {
    setRefreshing(true); haptic(); await fetchAll();
    setTimeout(() => setRefreshing(false), 500);
  };
  function haptic() { try { (navigator as any).vibrate?.(8); } catch {} }

  /* ─────────── Derived stats ─────────── */
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }, []);
  const yesterday = useMemo(() => new Date(today.getTime() - 86400000), [today]);

  const todayTxns = useMemo(() => allTxns.filter((t) => t.created_at && new Date(t.created_at) >= today), [allTxns, today]);
  const yTxns = useMemo(() => allTxns.filter((t) => {
    if (!t.created_at) return false;
    const d = new Date(t.created_at);
    return d >= yesterday && d < today;
  }), [allTxns, today, yesterday]);

  const todaySuccess = todayTxns.filter((t) => t.status === "success");
  const todayFailed = todayTxns.filter((t) => t.status === "failed");
  const todayPending = todayTxns.filter((t) => t.status === "pending");
  const yesterdaySuccess = yTxns.filter((t) => t.status === "success");
  const yesterdayFailed = yTxns.filter((t) => t.status === "failed");

  const volumeToday = todaySuccess.reduce((s, t) => s + (t.amount || 0), 0);
  const volumeYday = yesterdaySuccess.reduce((s, t) => s + (t.amount || 0), 0);

  const newUsersToday = users.filter((u) => u.created_at && new Date(u.created_at) >= today).length;
  const newUsersYday = users.filter((u) => {
    if (!u.created_at) return false;
    const d = new Date(u.created_at);
    return d >= yesterday && d < today;
  }).length;

  const activeUsersToday = useMemo(() => {
    const set = new Set<string>();
    todayTxns.forEach((t) => {
      const w = wallets.find((w) => w.id === t.wallet_id);
      if (w?.user_id) set.add(w.user_id);
    });
    return set.size;
  }, [todayTxns, wallets]);
  const activeUsersYday = useMemo(() => {
    const set = new Set<string>();
    yTxns.forEach((t) => {
      const w = wallets.find((w) => w.id === t.wallet_id);
      if (w?.user_id) set.add(w.user_id);
    });
    return set.size;
  }, [yTxns, wallets]);

  const avgTxn = todaySuccess.length > 0 ? Math.round(volumeToday / todaySuccess.length) : 0;

  /* 7-day sparkline series */
  const last7Days = useMemo(() => {
    const days: { date: string; volume: number; count: number; users: number; failed: number; kyc: number; active: Set<string>; signups: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const next = new Date(d.getTime() + 86400000);
      const dayTxns = allTxns.filter((t) => t.created_at && new Date(t.created_at) >= d && new Date(t.created_at) < next);
      const success = dayTxns.filter((t) => t.status === "success");
      const active = new Set<string>();
      dayTxns.forEach((t) => {
        const w = wallets.find((w) => w.id === t.wallet_id);
        if (w?.user_id) active.add(w.user_id);
      });
      const signups = users.filter((u) => u.created_at && new Date(u.created_at) >= d && new Date(u.created_at) < next).length;
      days.push({
        date: d.toISOString().slice(0, 10),
        volume: success.reduce((s, t) => s + (t.amount || 0), 0),
        count: dayTxns.length,
        users: signups,
        failed: dayTxns.filter((t) => t.status === "failed").length,
        kyc: 0, active, signups,
      });
    }
    return days;
  }, [allTxns, users, wallets, today]);

  const sparkUsers = last7Days.map((d) => d.users);
  const sparkActive = last7Days.map((d) => d.active.size);
  const sparkVolume = last7Days.map((d) => d.volume);
  const sparkCount = last7Days.map((d) => d.count);
  const sparkFailed = last7Days.map((d) => d.failed);
  const sparkKyc = useMemo(() => Array(7).fill(pendingKyc.length), [pendingKyc.length]);

  /* 30-day volume bars */
  const volumeBars: VolBar[] = useMemo(() => {
    const out: VolBar[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const next = new Date(d.getTime() + 86400000);
      const dayTxns = allTxns.filter((t) => t.created_at && new Date(t.created_at) >= d && new Date(t.created_at) < next && t.status === "success");
      out.push({
        day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        date: d.toISOString().slice(0, 10),
        volume: dayTxns.reduce((s, t) => s + (t.amount || 0), 0),
        count: dayTxns.length,
      });
    }
    return out;
  }, [allTxns, today]);

  /* User-growth (signups, last 30 days) */
  const growthData = useMemo(() => {
    const out: { day: string; users: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const next = new Date(d.getTime() + 86400000);
      const c = users.filter((u) => u.created_at && new Date(u.created_at) >= d && new Date(u.created_at) < next).length;
      out.push({ day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), users: c });
    }
    return out;
  }, [users, today]);

  /* Status donut for today */
  const donutData = useMemo(() => [
    { label: "Success", value: todaySuccess.length, color: C.success },
    { label: "Pending", value: todayPending.length, color: C.warning },
    { label: "Failed",  value: todayFailed.length,  color: C.danger },
  ].filter((d) => d.value > 0), [todaySuccess.length, todayPending.length, todayFailed.length]);

  /* Payment method distribution (UPI vs Razorpay vs Wallet vs Other) */
  const paymentMethods = useMemo(() => {
    let upi = 0, razor = 0, internal = 0, other = 0;
    todayTxns.forEach((t) => {
      if (t.merchant_upi_id) upi++;
      else if (t.razorpay_payment_id) razor++;
      else if (t.type === "credit" || t.type === "debit") internal++;
      else other++;
    });
    return [
      { label: "UPI", value: upi, color: C.primary },
      { label: "Razorpay", value: razor, color: C.info },
      { label: "Wallet", value: internal, color: C.secondary },
      { label: "Other", value: other, color: C.cyan },
    ].filter((d) => d.value > 0);
  }, [todayTxns]);

  /* Top merchant today */
  const topMerchant = useMemo(() => {
    const map: Record<string, { count: number; volume: number }> = {};
    todaySuccess.forEach((t) => {
      const k = t.merchant_name || "Unknown";
      map[k] = map[k] || { count: 0, volume: 0 };
      map[k].count++;
      map[k].volume += t.amount || 0;
    });
    const arr = Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.count - a.count);
    return arr[0] || null;
  }, [todaySuccess]);

  const visibleFeed = filterDate
    ? feed.filter((t) => t.created_at?.slice(0, 10) === filterDate)
    : feed;

  /* ─────────── Click handlers wiring context panel ─────────── */
  const openTxnInPanel = (tx: any) => {
    const w = wallets.find((w) => w.id === tx.wallet_id);
    const user = w ? users.find((u) => u.id === w.user_id) : null;
    ctxPanel.show({
      title: tx.merchant_name || tx.type || "Transaction",
      subtitle: tx.id,
      body: (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Amount</span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: tx.status === "success" ? "rgba(34,197,94,0.12)" : tx.status === "failed" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                  color: tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning,
                }}
              >
                {tx.status}
              </span>
            </div>
            <p className="text-3xl font-bold font-mono text-white">{fmtPaise(tx.amount || 0)}</p>
            <p className="text-[11px] text-white/40 font-sora mt-1">{tx.created_at ? new Date(tx.created_at).toLocaleString("en-IN") : "—"}</p>
          </div>
          <DetailRow label="User" value={user?.full_name || "Unknown"} />
          <DetailRow label="Type" value={tx.type} />
          <DetailRow label="Category" value={tx.category || "—"} />
          <DetailRow label="UPI ID" value={tx.merchant_upi_id || "—"} mono />
          <DetailRow label="Razorpay ID" value={tx.razorpay_payment_id || "—"} mono />
          <DetailRow label="Wallet" value={tx.wallet_id} mono />
          <button
            onClick={() => navigate(`/admin/transactions`)}
            className="w-full h-10 rounded-xl text-[12px] font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}
          >
            View in transactions →
          </button>
        </div>
      ),
    });
  };

  const openKycInPanel = async (kyc: any) => {
    const user = users.find((u) => u.id === kyc.user_id);
    ctxPanel.show({
      title: kyc.aadhaar_name || user?.full_name || "KYC request",
      subtitle: `Submitted ${kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString("en-IN") : "—"}`,
      body: (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 border border-warning/20" style={{ background: "rgba(245,158,11,0.05)" }}>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-warning mb-1"><ShieldCheck className="w-3.5 h-3.5" /> Pending verification</div>
            <p className="text-[11px] text-white/60 font-sora">Approve to unlock the user's wallet and full app access.</p>
          </div>
          <DetailRow label="User" value={user?.full_name || "—"} />
          <DetailRow label="Phone" value={user?.phone || "—"} mono />
          <DetailRow label="KYC ID" value={kyc.id} mono />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await supabase.from("kyc_requests").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", kyc.id);
                toast.success("KYC approved");
                ctxPanel.hide(); fetchAll();
              }}
              className="flex-1 h-10 rounded-xl text-[12px] font-semibold text-white"
              style={{ background: C.success }}
            >
              Approve
            </button>
            <button
              onClick={async () => {
                await supabase.from("kyc_requests").update({ status: "rejected" }).eq("id", kyc.id);
                toast.error("KYC rejected");
                ctxPanel.hide(); fetchAll();
              }}
              className="flex-1 h-10 rounded-xl text-[12px] font-semibold text-white"
              style={{ background: C.danger }}
            >
              Reject
            </button>
          </div>
        </div>
      ),
    });
  };

  /* ─────────── Loading shell ─────────── */
  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 lg:p-6 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[140px] rounded-[18px] border border-white/5 overflow-hidden" style={{ background: "rgba(13,14,18,0.7)" }}>
                <div className="h-full w-full" style={{
                  background: "linear-gradient(110deg, transparent 40%, rgba(200,149,46,0.08) 50%, transparent 60%)",
                  backgroundSize: "200% 100%", animation: "shimmer-card 1.6s ease-in-out infinite",
                }} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  /* ─────────── KPI definitions ─────────── */
  const kpis: Kpi[] = [
    { label: "Total Users", value: users.length, icon: Users, color: C.info, spark: sparkUsers,
      trendPct: trendPct(newUsersToday, newUsersYday), trendLabel: `${newUsersToday} new today`,
      onClick: () => navigate("/admin/users") },
    { label: "Active Today", value: activeUsersToday, icon: Activity, color: C.cyan, spark: sparkActive,
      trendPct: trendPct(activeUsersToday, activeUsersYday), trendLabel: `${Math.abs(activeUsersToday - activeUsersYday)} vs yesterday` },
    { label: "Volume Today", value: fmtPaise(volumeToday), icon: DollarSign, color: C.primary, spark: sparkVolume,
      trendPct: trendPct(volumeToday, volumeYday), trendLabel: "vs yesterday" },
    { label: "Transactions", value: todayTxns.length, icon: ArrowLeftRight, color: C.secondary, spark: sparkCount,
      trendPct: trendPct(todayTxns.length, yTxns.length), trendLabel: "vs yesterday",
      onClick: () => navigate("/admin/transactions") },
    { label: "Pending KYC", value: pendingKyc.length, icon: ShieldCheck, color: C.warning, spark: sparkKyc,
      onClick: () => navigate("/admin/kyc") },
    { label: "Failed Txns", value: todayFailed.length, icon: AlertTriangle, color: C.danger, spark: sparkFailed,
      trendPct: trendPct(todayFailed.length, yesterdayFailed.length), trendLabel: "vs yesterday" },
  ];

  const secondaryKpis: Kpi[] = [
    { label: "Platform Balance", value: fmtPaise(systemBalance), icon: Wallet, color: C.primary, spark: sparkVolume },
    { label: "New Signups", value: newUsersToday, icon: UserPlus, color: C.info, spark: sparkUsers,
      trendPct: trendPct(newUsersToday, newUsersYday), trendLabel: "vs yesterday" },
    { label: "Avg Transaction", value: fmtPaise(avgTxn), icon: CreditCard, color: C.cyan, spark: sparkVolume.map((v, i) => sparkCount[i] > 0 ? Math.round(v / sparkCount[i]) : 0) },
    { label: "Parent-Teen Pairs", value: activeLinks, icon: Link2, color: C.success, spark: [activeLinks, activeLinks, activeLinks, activeLinks, activeLinks, activeLinks, activeLinks] },
  ];

  const summary = `₹${(volumeToday / 100).toLocaleString("en-IN")} transacted today across ${todayTxns.length} transaction${todayTxns.length === 1 ? "" : "s"}.`;

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-5 relative min-h-full">
        {/* Ambient glow */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.04] blur-[150px]" style={{ background: `radial-gradient(circle, ${C.primary}, transparent)` }} />

        {/* Welcome banner */}
        <div
          className="relative rounded-[20px] overflow-hidden border border-primary/[0.14] p-5 lg:p-6"
          style={{
            background: `linear-gradient(135deg, rgba(200,149,46,0.1) 0%, rgba(13,14,18,0.85) 50%, rgba(200,149,46,0.05) 100%)`,
            backdropFilter: "blur(24px)",
            animation: "kpi-in 0.4s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.5), transparent)" }} />
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" style={{ color: C.primary }} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] font-sora" style={{ color: `${C.primary}cc` }}>
                  {greetingFor(now)} · {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST
                </span>
              </div>
              <h1 className="text-xl lg:text-[24px] font-bold tracking-tight text-white font-sora">
                {greetingFor(now)}, {profile?.full_name?.split(" ")[0] || "Admin"}.
              </h1>
              <p className="text-[12px] mt-1 text-white/55 font-sora">Here's what's happening.</p>
            </div>
            <div className="flex items-center gap-3 sm:text-right">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-sora">Today</p>
                <p className="text-[14px] font-medium text-white font-sora truncate">{summary}</p>
              </div>
              <button
                onClick={handleRefresh}
                className="p-2.5 rounded-xl border text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors shrink-0"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Primary KPIs (6) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => <KpiCard key={k.label} k={k} />)}
        </div>

        {/* Secondary KPIs (4) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {secondaryKpis.map((k) => <KpiCard key={k.label} k={k} />)}
        </div>

        {/* Charts row 1: volume bars (60%) + status donut (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Widget className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-semibold text-white font-sora">Transaction Volume</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(200,149,46,0.12)", color: C.primary }}>30D</span>
              </div>
              {filterDate && (
                <button
                  onClick={() => setFilterDate(null)}
                  className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-full font-sora"
                  style={{ background: "rgba(200,149,46,0.12)", color: C.primary }}
                >
                  <Filter className="w-3 h-3" /> Filtered: {filterDate} <XCircle className="w-3 h-3" />
                </button>
              )}
            </div>
            <VolumeBars data={volumeBars} selected={filterDate} onSelect={setFilterDate} height={220} />
            <p className="text-[10px] text-white/30 font-sora mt-2">Click any bar to filter the live feed by that date.</p>
          </Widget>

          <Widget className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-semibold text-white font-sora">Live Status</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.success, boxShadow: `0 0 6px ${C.success}` }} />
                <span className="text-[9px] font-bold tracking-wider font-mono" style={{ color: C.success }}>LIVE</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <StatusDonut data={donutData} size={180} />
              <div className="w-full space-y-2">
                {donutData.length === 0 ? (
                  <p className="text-[11px] text-center text-white/30 font-sora py-2">No transactions yet today.</p>
                ) : donutData.map((d) => (
                  <div key={d.label} className="flex items-center justify-between px-3 py-2 rounded-[10px]" style={{ background: `${d.color}08` }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}50` }} />
                      <span className="text-[11px] text-white/70 font-sora">{d.label}</span>
                    </div>
                    <span className="text-[12px] font-bold font-mono text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Widget>
        </div>

        {/* Charts row 2: user growth + payment methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Widget>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-semibold text-white font-sora">User Growth</h3>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(200,149,46,0.12)", color: C.primary }}>30D</span>
            </div>
            <GrowthLine data={growthData} height={200} />
          </Widget>

          <Widget>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-semibold text-white font-sora">Payment Methods</h3>
              <span className="text-[9px] text-white/40 font-mono">today</span>
            </div>
            {paymentMethods.length === 0 ? (
              <p className="text-[11px] text-white/30 text-center py-10 font-sora">No transactions yet today.</p>
            ) : <HBars data={paymentMethods} />}
          </Widget>
        </div>

        {/* Live feed + quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Live feed */}
          <Widget className="lg:col-span-2" noPadding>
            <div className="px-5 h-14 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-semibold text-white font-sora flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: C.primary }} />
                  Live Transaction Feed
                </h3>
                {!feedPaused && (
                  <span className="flex items-center gap-1 text-[9px] font-bold tracking-wider font-mono" style={{ color: C.success }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.success, boxShadow: `0 0 6px ${C.success}` }} /> LIVE
                  </span>
                )}
                {feedPaused && queuedRef.current.length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono" style={{ background: "rgba(245,158,11,0.12)", color: C.warning }}>
                    +{queuedRef.current.length} queued
                  </span>
                )}
              </div>
              <button
                onClick={() => setFeedPaused((p) => !p)}
                className="flex items-center gap-1.5 px-2.5 h-8 rounded-[10px] text-[11px] font-medium font-sora transition-colors"
                style={{
                  background: feedPaused ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                  color: feedPaused ? C.warning : "rgba(255,255,255,0.6)",
                  border: `1px solid ${feedPaused ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {feedPaused ? <><Play className="w-3 h-3" /> Resume</> : <><Pause className="w-3 h-3" /> Pause</>}
              </button>
            </div>

            <div className="hidden md:grid grid-cols-[80px_1fr_110px_1fr_80px_70px] gap-3 px-5 py-2 text-[9px] uppercase tracking-wider text-white/30 font-sora border-b" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
              <span>Time</span><span>User</span><span>Amount</span><span>Merchant</span><span>Method</span><span>Status</span>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {visibleFeed.length === 0 ? (
                <div className="py-12 text-center text-[11px] text-white/30 font-sora">
                  {filterDate ? `No transactions on ${filterDate}.` : "Waiting for activity…"}
                </div>
              ) : visibleFeed.map((t, i) => {
                const w = wallets.find((w) => w.id === t.wallet_id);
                const u = w ? users.find((u) => u.id === w.user_id) : null;
                const flash = flashIds.has(t.id);
                const method = t.merchant_upi_id ? "UPI" : t.razorpay_payment_id ? "Razorpay" : "Wallet";
                const statusColor = t.status === "success" ? C.success : t.status === "failed" ? C.danger : C.warning;
                const time = t.created_at
                  ? new Date(t.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                  : "—";
                return (
                  <div
                    key={t.id + i}
                    onClick={() => openTxnInPanel(t)}
                    className="relative grid grid-cols-[80px_1fr_110px_1fr_80px_70px] gap-3 px-5 py-2.5 text-[11px] cursor-pointer transition-colors hover:bg-white/[0.02]"
                    style={{
                      background: i % 2 === 0 ? "rgba(255,255,255,0.005)" : "transparent",
                      animation: flash ? "feed-row-in 0.5s cubic-bezier(0.22,1,0.36,1) both" : undefined,
                    }}
                  >
                    {flash && (
                      <span
                        className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full"
                        style={{ background: C.primary, boxShadow: `0 0 12px ${C.primary}`, animation: "feed-flash 1.4s ease-out forwards" }}
                      />
                    )}
                    <span className="text-white/40 font-mono">{time}</span>
                    <span className="text-white/80 truncate font-sora">{u?.full_name || "Unknown"}</span>
                    <span className={`font-mono font-semibold ${t.type === "credit" ? "" : "text-white"}`} style={{ color: t.type === "credit" ? C.success : undefined }}>
                      {t.type === "credit" ? "+" : "-"}{fmtPaise(t.amount || 0)}
                    </span>
                    <span className="text-white/60 truncate font-sora">{t.merchant_name || t.category || "—"}</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full font-sora self-center justify-self-start" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>{method}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider font-sora self-center justify-self-start" style={{ color: statusColor }}>{t.status}</span>
                  </div>
                );
              })}
            </div>
          </Widget>

          {/* Quick actions */}
          <div className="space-y-4">
            {/* Pending KYC */}
            <Widget>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-white flex items-center gap-2 font-sora">
                  <ShieldCheck className="w-4 h-4" style={{ color: C.warning }} />
                  Pending KYC
                </h3>
                <button onClick={() => navigate("/admin/kyc")} className="text-[10px] font-medium" style={{ color: C.primary }}>
                  All →
                </button>
              </div>
              {pendingKyc.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1" style={{ color: C.success }} />
                  <p className="text-[11px] text-white/40 font-sora">All clear</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pendingKyc.map((kyc) => (
                    <button
                      key={kyc.id}
                      onClick={() => openKycInPanel(kyc)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-[10px] text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "rgba(245,158,11,0.12)", color: C.warning }}>
                        {(kyc.aadhaar_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-white truncate font-sora">{kyc.aadhaar_name || "Unknown"}</p>
                        <p className="text-[9px] text-white/40 font-sora">{kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString("en-IN") : "—"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Widget>

            {/* Failed Txns */}
            <Widget>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-white flex items-center gap-2 font-sora">
                  <AlertTriangle className="w-4 h-4" style={{ color: C.danger }} />
                  Failed Transactions
                </h3>
                <button onClick={() => navigate("/admin/transactions")} className="text-[10px] font-medium" style={{ color: C.primary }}>
                  All →
                </button>
              </div>
              {recentFailed.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1" style={{ color: C.success }} />
                  <p className="text-[11px] text-white/40 font-sora">No failures</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentFailed.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => openTxnInPanel(tx)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-[10px] text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
                        <XCircle className="w-3.5 h-3.5" style={{ color: C.danger }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-white truncate font-sora">{tx.merchant_name || "Unknown"}</p>
                        <p className="text-[9px] text-white/40 font-mono">{fmtPaise(tx.amount || 0)} · {tx.created_at ? new Date(tx.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Widget>

            {/* System Health */}
            <Widget>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-white flex items-center gap-2 font-sora">
                  <Server className="w-4 h-4" style={{ color: C.success }} />
                  System Health
                </h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-sora" style={{ background: "rgba(34,197,94,0.1)", color: C.success }}>OK</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Database", icon: Database, ok: true },
                  { label: "Auth", icon: ShieldCheck, ok: true },
                  { label: "Payments", icon: Globe, ok: true },
                  { label: "Realtime", icon: Wifi, ok: true },
                ].map((h) => (
                  <div key={h.label} className="flex items-center gap-1.5 p-2 rounded-[8px]" style={{ background: "rgba(34,197,94,0.04)" }}>
                    <h.icon className="w-3 h-3" style={{ color: C.success }} />
                    <span className="text-[10px] text-white/70 font-sora flex-1 truncate">{h.label}</span>
                    <span className="w-1 h-1 rounded-full" style={{ background: C.success, boxShadow: `0 0 4px ${C.success}` }} />
                  </div>
                ))}
              </div>
            </Widget>

            {/* Top Merchant */}
            <Widget>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-white flex items-center gap-2 font-sora">
                  <Trophy className="w-4 h-4" style={{ color: C.primary }} />
                  Top Merchant Today
                </h3>
              </div>
              {topMerchant ? (
                <div className="rounded-[12px] p-3 border" style={{ background: "rgba(200,149,46,0.04)", borderColor: "rgba(200,149,46,0.18)" }}>
                  <p className="text-[13px] font-semibold text-white font-sora truncate">{topMerchant.name}</p>
                  <p className="text-[18px] font-bold font-mono text-white mt-1">{fmtPaise(topMerchant.volume)}</p>
                  <p className="text-[10px] text-white/40 font-sora mt-0.5">{topMerchant.count} successful transaction{topMerchant.count === 1 ? "" : "s"}</p>
                </div>
              ) : (
                <p className="text-[11px] text-white/30 text-center py-4 font-sora">No merchant data yet</p>
              )}
            </Widget>
          </div>
        </div>
      </div>

      {/* keyframes scoped for this page */}
      <style>{`
        @keyframes kpi-in { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes feed-row-in { 0% { opacity: 0; transform: translateY(-12px); background: rgba(200,149,46,0.08); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes feed-flash { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes shimmer-card { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
    </AdminLayout>
  );
};

const DetailRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-[10px] uppercase tracking-wider text-white/40 font-sora shrink-0 pt-0.5">{label}</span>
    <span className={`text-[12px] text-white text-right ${mono ? "font-mono break-all" : "font-sora"}`}>{value}</span>
  </div>
);

export default AdminDashboard;
