import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  Users, ArrowLeftRight, Wallet, ShieldCheck, TrendingUp,
  Clock, AlertTriangle, RefreshCw, Zap, Download,
  ArrowUpRight, ArrowDownRight, Crown,
  DollarSign, UserPlus, BarChart3, Server,
  Activity, Globe, Shield, Database, Cpu,
  CheckCircle2, Sparkles, MoreVertical, Filter,
  Eye, Percent, CreditCard, PiggyBank,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, AreaChart, Area, LineChart, Line, CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";

interface Stats {
  totalUsers: number;
  totalTransactionsToday: number;
  totalVolumeToday: number;
  pendingKyc: number;
  frozenWallets: number;
  activeWallets: number;
  totalBalance: number;
  newUsersToday: number;
  totalTransactionsAll: number;
  successRate: number;
  teens: number;
  parents: number;
  verifiedKyc: number;
  avgBalance: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  merchant_name: string | null;
  status: string | null;
  created_at: string | null;
  wallet_id: string;
}

interface RecentSignup {
  id: string;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
}

interface TopMerchant {
  name: string;
  count: number;
  volume: number;
}

const CHART_COLORS = ["#c8952e", "#d4a843", "#a67a1e", "#e8c56d", "#8B7355"];
const STATUS_COLORS = {
  success: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  failed: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-400" },
  pending: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
};

const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = display;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{prefix}{display.toLocaleString("en-IN")}{suffix}</span>;
};

/* Premium Widget Card - inspired by reference design */
const WidgetCard = ({
  children,
  className = "",
  delay = 0,
  noPadding = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
}) => (
  <div
    className={`relative rounded-[20px] border border-white/[0.06] bg-[hsl(220_18%_11%)] overflow-hidden group transition-all duration-500 hover:border-primary/15 hover:shadow-[0_8px_40px_hsl(42_78%_55%/0.06)] ${!noPadding ? "p-5" : ""} ${className}`}
    style={{ animation: `admin-slide-up 0.5s ease-out ${delay}ms both` }}
  >
    {/* Top shimmer line */}
    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    {children}
  </div>
);

const WidgetHeader = ({
  icon: Icon,
  title,
  action,
  actionLabel,
}: {
  icon: React.ElementType;
  title: string;
  action?: () => void;
  actionLabel?: string;
}) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-semibold flex items-center gap-2.5 text-foreground/90">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      {title}
    </h3>
    {action ? (
      <button onClick={action} className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1">
        {actionLabel || "View All"} <ArrowUpRight className="w-3 h-3" />
      </button>
    ) : (
      <button className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
      </button>
    )}
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalTransactionsToday: 0, totalVolumeToday: 0,
    pendingKyc: 0, frozenWallets: 0, activeWallets: 0, totalBalance: 0,
    newUsersToday: 0, totalTransactionsAll: 0, successRate: 0, teens: 0, parents: 0,
    verifiedKyc: 0, avgBalance: 0,
  });
  const [liveTxns, setLiveTxns] = useState<Transaction[]>([]);
  const [dailyVolume, setDailyVolume] = useState<any[]>([]);
  const [txTypeData, setTxTypeData] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [volumePeriod, setVolumePeriod] = useState<"Week" | "Month">("Week");

  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    const [usersRes, txnsRes, kycRes, walletsRes, allTxnsRes, verifiedKycRes] = await Promise.all([
      supabase.from("profiles").select("id, created_at, role, full_name"),
      supabase.from("transactions").select("*").gte("created_at", today),
      supabase.from("kyc_requests").select("id").eq("status", "pending"),
      supabase.from("wallets").select("id, balance, is_frozen"),
      supabase.from("transactions").select("id, status, merchant_name, amount, type, created_at").limit(1000),
      supabase.from("kyc_requests").select("id").eq("status", "verified"),
    ]);
    const allUsers = usersRes.data || [];
    const txns = (txnsRes.data || []) as Transaction[];
    const volume = txns.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0);
    const wallets = walletsRes.data || [];
    const frozenWallets = wallets.filter((w: any) => w.is_frozen).length;
    const totalBalance = wallets.reduce((s: number, w: any) => s + (w.balance || 0), 0);
    const newUsersToday = allUsers.filter((u: any) => u.created_at?.startsWith(today)).length;
    const allTxns = allTxnsRes.data || [];
    const successCount = allTxns.filter((t: any) => t.status === "success").length;
    const teens = allUsers.filter((u: any) => u.role === "teen").length;
    const parents = allUsers.filter((u: any) => u.role === "parent").length;
    const avgBalance = wallets.length > 0 ? Math.round(totalBalance / wallets.length) : 0;

    setStats({
      totalUsers: allUsers.length, totalTransactionsToday: txns.length, totalVolumeToday: volume,
      pendingKyc: kycRes.data?.length || 0, frozenWallets, activeWallets: wallets.length - frozenWallets,
      totalBalance, newUsersToday, totalTransactionsAll: allTxns.length,
      successRate: allTxns.length > 0 ? Math.round((successCount / allTxns.length) * 100) : 0,
      teens, parents, verifiedKyc: verifiedKycRes.data?.length || 0, avgBalance,
    });
    setRoleDistribution([
      { name: "Teens", value: teens || 1 },
      { name: "Parents", value: parents || 1 },
      { name: "Others", value: Math.max(1, allUsers.length - teens - parents) },
    ]);
    const sortedUsers = [...allUsers].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecentSignups(sortedUsers.slice(0, 5) as RecentSignup[]);
    const merchantMap = new Map<string, { count: number; volume: number }>();
    allTxns.forEach((t: any) => {
      if (t.merchant_name) {
        const existing = merchantMap.get(t.merchant_name) || { count: 0, volume: 0 };
        merchantMap.set(t.merchant_name, { count: existing.count + 1, volume: existing.volume + (t.amount || 0) });
      }
    });
    setTopMerchants(
      Array.from(merchantMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count).slice(0, 5)
    );
    const { data: latest } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50);
    setLiveTxns((latest || []) as Transaction[]);
    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTxns = (latest || []).filter((t: any) => t.created_at?.startsWith(dateStr) && t.status === "success");
      days.push({ day: d.toLocaleDateString("en-IN", { weekday: "short" }), volume: dayTxns.reduce((s: number, t: any) => s + t.amount, 0) / 100, count: dayTxns.length });
    }
    setDailyVolume(days);
    const credits = (latest || []).filter((t: any) => t.type === "credit").length;
    const debits = (latest || []).filter((t: any) => t.type === "debit").length;
    const pending = (latest || []).filter((t: any) => t.status === "pending").length;
    const failed = (latest || []).filter((t: any) => t.status === "failed").length;
    setTxTypeData([
      { name: "Credits", value: credits || 1 }, { name: "Debits", value: debits || 1 },
      { name: "Pending", value: pending || 0 }, { name: "Failed", value: failed || 0 },
    ].filter(d => d.value > 0));
    const growth: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      growth.push({ day: d.toLocaleDateString("en-IN", { weekday: "short" }), users: allUsers.filter((u: any) => u.created_at?.startsWith(dateStr)).length });
    }
    setUserGrowth(growth);
    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    fetchStats();
    const txChannel = supabase.channel("admin-live-txns").on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
      if (payload.eventType === "INSERT") setLiveTxns((prev) => [payload.new as Transaction, ...prev].slice(0, 50));
      fetchStats();
    }).subscribe();
    const usersChannel = supabase.channel("admin-users-realtime").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchStats()).subscribe();
    const walletsChannel = supabase.channel("admin-wallets-realtime").on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, () => fetchStats()).subscribe();
    const kycChannel = supabase.channel("admin-kyc-realtime").on("postgres_changes", { event: "*", schema: "public", table: "kyc_requests" }, () => fetchStats()).subscribe();
    return () => { supabase.removeChannel(txChannel); supabase.removeChannel(usersChannel); supabase.removeChannel(walletsChannel); supabase.removeChannel(kycChannel); };
  }, []);

  const handleRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };
  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  const tooltipStyle = {
    background: "hsl(220 18% 11% / 0.98)",
    border: "1px solid rgba(200,149,46,0.15)",
    borderRadius: 14,
    color: "#f5edd6",
    fontSize: 11,
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    backdropFilter: "blur(12px)",
  };

  /* Revenue split data */
  const receivedAmount = stats.totalVolumeToday;
  const orderedAmount = stats.totalBalance;

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 lg:p-6 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 rounded-[20px] bg-[hsl(220_18%_11%)] border border-white/[0.04] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" style={{ animation: "admin-shimmer 1.5s linear infinite", backgroundSize: "200% 100%" }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-64 rounded-[20px] bg-[hsl(220_18%_11%)] border border-white/[0.04] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" style={{ animation: "admin-shimmer 1.5s linear infinite", backgroundSize: "200% 100%" }} />
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-5 relative min-h-full">
        {/* Ambient glow */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/[0.015] blur-[200px] pointer-events-none" />

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ animation: "admin-slide-up 0.4s ease-out" }}>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
              </div>
              Your Dashboard
            </h1>
            <p className="text-xs text-muted-foreground/50 mt-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Real-time overview • Last synced {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-2.5 rounded-xl bg-[hsl(220_18%_11%)] border border-white/[0.06] text-muted-foreground hover:text-primary hover:border-primary/20 transition-all duration-300 active:scale-90 ${refreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="p-2.5 rounded-xl bg-[hsl(220_18%_11%)] border border-white/[0.06] text-muted-foreground hover:text-primary hover:border-primary/20 transition-all duration-300">
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/admin/users")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/15 transition-all duration-300 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* ── Row 1: AI Assistant + Total Volume + Revenue ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* AI Assistant Card - dark premium */}
          <WidgetCard className="lg:col-span-4 bg-gradient-to-br from-[hsl(220_20%_8%)] to-[hsl(220_18%_12%)] relative overflow-hidden" delay={50} noPadding>
            <div className="p-5 relative z-10">
              <h3 className="text-lg font-bold text-foreground mb-1.5">AI Assistant</h3>
              <p className="text-xs text-muted-foreground/60 leading-relaxed mb-6">
                Analyze user activity, revenue trends, and system health with AI-powered insights.
              </p>
              <button
                onClick={() => navigate("/admin/analytics")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-all duration-300 group"
              >
                Analyze data
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            {/* Decorative sphere */}
            <div className="absolute bottom-0 right-0 w-40 h-40 opacity-30">
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" style={{ animation: "admin-glow-pulse 4s ease-in-out infinite" }} />
              <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/20 to-transparent" style={{ animation: "admin-glow-pulse 4s ease-in-out infinite 1s" }} />
            </div>
          </WidgetCard>

          {/* Total Volume Chart */}
          <WidgetCard className="lg:col-span-4" delay={100}>
            <div className="flex items-center justify-between mb-4">
              <WidgetHeader icon={BarChart3} title="Total Volume" />
              <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg border border-white/[0.06] p-0.5">
                {(["Week", "Month"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setVolumePeriod(p)}
                    className={`px-3 py-1 rounded-md text-[10px] font-medium transition-all ${volumePeriod === p ? "bg-primary/15 text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dailyVolume} barCategoryGap="20%">
                <defs>
                  <linearGradient id="barGradAdmin2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8952e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#c8952e" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "hsl(40,10%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(42 78% 55% / 0.04)" }} />
                <Bar dataKey="volume" fill="url(#barGradAdmin2)" radius={[8, 8, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </WidgetCard>

          {/* Revenue Split */}
          <WidgetCard className="lg:col-span-4" delay={150}>
            <WidgetHeader icon={DollarSign} title="Revenue Summary" />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-semibold">↑ 24%</span>
                </div>
                <p className="text-lg font-bold">{formatAmount(receivedAmount)}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Today's Volume
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-primary font-semibold">↑ 8%</span>
                </div>
                <p className="text-lg font-bold">{formatAmount(orderedAmount)}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> System Balance
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8952e" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#c8952e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="users" stroke="#c8952e" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </WidgetCard>
        </div>

        {/* ── Row 2: Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: Users, trend: `+${stats.newUsersToday}`, trendUp: true, color: "text-primary" },
            { label: "Txns Today", value: stats.totalTransactionsToday, icon: ArrowLeftRight, trend: "+8%", trendUp: true, color: "text-primary" },
            { label: "Active Wallets", value: stats.activeWallets, icon: Wallet, trend: `${stats.frozenWallets} frozen`, trendUp: stats.frozenWallets === 0, color: "text-emerald-400" },
            { label: "Pending KYC", value: stats.pendingKyc, icon: ShieldCheck, trend: "review", trendUp: false, color: "text-amber-400" },
            { label: "Success Rate", value: `${stats.successRate}%`, icon: Percent, trend: "+2%", trendUp: true, color: "text-emerald-400" },
            { label: "Avg Balance", value: formatAmount(stats.avgBalance), icon: PiggyBank, trend: "+5%", trendUp: true, color: "text-primary" },
          ].map((s, i) => (
            <WidgetCard key={s.label} delay={200 + i * 40}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                  {s.trend}
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight">
                {typeof s.value === "number" ? <AnimatedCounter value={s.value} /> : s.value}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-1 font-medium">{s.label}</p>
            </WidgetCard>
          ))}
        </div>

        {/* ── Row 3: Recent Transactions + Growth + Top Merchants ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Recent Transactions */}
          <WidgetCard className="lg:col-span-5" delay={400}>
            <WidgetHeader icon={Activity} title="Recent Transactions" action={() => navigate("/admin/transactions")} actionLabel="View All" />
            <div className="space-y-1">
              {liveTxns.length === 0 ? (
                <p className="text-sm text-muted-foreground/40 text-center py-10">No transactions yet</p>
              ) : (
                liveTxns.slice(0, 6).map((tx, i) => {
                  const statusKey = (tx.status as keyof typeof STATUS_COLORS) || "pending";
                  const sc = STATUS_COLORS[statusKey] || STATUS_COLORS.pending;
                  const isNew = tx.created_at && (Date.now() - new Date(tx.created_at).getTime()) < 3600000;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-all duration-300"
                      style={{ animation: `admin-slide-up 0.3s ease-out ${450 + i * 40}ms both` }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 relative">
                        {tx.type === "credit"
                          ? <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                          : <ArrowUpRight className="w-4 h-4 text-rose-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{tx.merchant_name || (tx.type === "credit" ? "Credit" : "Debit")}</p>
                          {isNew && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">New</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/40">
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${tx.type === "credit" ? "text-emerald-400" : "text-foreground"}`}>
                          {tx.type === "credit" ? "+" : "-"}{formatAmount(tx.amount)}
                        </p>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </WidgetCard>

          {/* Growth Donut */}
          <WidgetCard className="lg:col-span-3" delay={450}>
            <WidgetHeader icon={TrendingUp} title="Growth" />
            <div className="flex flex-col items-center">
              <div className="relative">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={78}
                      dataKey="value"
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      {roleDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-primary">
                    +{stats.successRate > 0 ? stats.successRate : 73}%
                  </p>
                  <p className="text-[10px] text-muted-foreground/50">Growth rate</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3">
                {roleDistribution.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-[10px] text-muted-foreground/60">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </WidgetCard>

          {/* Top Merchants */}
          <WidgetCard className="lg:col-span-4" delay={500}>
            <WidgetHeader icon={Crown} title="Top Merchants" action={() => navigate("/admin/transactions")} actionLabel="View All" />
            {topMerchants.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 text-center py-10">No merchant data yet</p>
            ) : (
              <div className="space-y-3">
                {topMerchants.map((m, i) => {
                  const maxCount = topMerchants[0]?.count || 1;
                  const pct = Math.round((m.count / maxCount) * 100);
                  return (
                    <div key={m.name} className="flex items-center gap-3" style={{ animation: `admin-slide-up 0.3s ease-out ${550 + i * 40}ms both` }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <p className="text-sm font-medium truncate">{m.name}</p>
                            <p className="text-[10px] text-muted-foreground/40">{m.count} transactions</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary">{formatAmount(m.volume)}</p>
                            <p className="text-[9px] text-emerald-400 font-semibold">↑ {Math.round(pct * 0.4)}%</p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </WidgetCard>
        </div>

        {/* ── Row 4: Quick Actions + System Health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quick Actions */}
          <WidgetCard delay={600}>
            <WidgetHeader icon={Zap} title="Quick Actions" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { label: "Review KYC", icon: ShieldCheck, path: "/admin/kyc", count: stats.pendingKyc, color: "text-amber-400" },
                { label: "Manage Roles", icon: Crown, path: "/admin/roles", color: "text-primary" },
                { label: "View Wallets", icon: Wallet, path: "/admin/wallets", count: stats.activeWallets, color: "text-emerald-400" },
                { label: "Send Alert", icon: Zap, path: "/admin/notifications", color: "text-sky-400" },
                { label: "Transactions", icon: ArrowLeftRight, path: "/admin/transactions", color: "text-primary" },
                { label: "User Mgmt", icon: Users, path: "/admin/users", color: "text-violet-400" },
              ].map((a, i) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/15 hover:bg-white/[0.04] transition-all duration-300 active:scale-[0.97] group text-left"
                  style={{ animation: `admin-slide-up 0.3s ease-out ${650 + i * 30}ms both` }}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <a.icon className={`w-4 h-4 ${a.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{a.label}</p>
                    {a.count !== undefined && a.count > 0 && (
                      <p className="text-[10px] text-primary font-bold">{a.count}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </WidgetCard>

          {/* System Health */}
          <WidgetCard delay={650}>
            <WidgetHeader icon={Shield} title="System Health" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { label: "Database", status: "Operational", icon: Database, ok: true },
                { label: "Auth Service", status: "Operational", icon: Shield, ok: true },
                { label: "Payments", status: "Active", icon: Globe, ok: true },
                { label: "KYC Service", status: stats.pendingKyc > 5 ? "Backlog" : "Normal", icon: Cpu, ok: stats.pendingKyc <= 5 },
                { label: "Wallets", status: stats.frozenWallets > 0 ? `${stats.frozenWallets} Frozen` : "All Active", icon: Wallet, ok: stats.frozenWallets === 0 },
                { label: "API Gateway", status: "Running", icon: Server, ok: true },
              ].map((h, i) => (
                <div
                  key={h.label}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-all duration-300"
                  style={{ animation: `admin-slide-up 0.3s ease-out ${700 + i * 30}ms both` }}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${h.ok ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                    <h.icon className={`w-4 h-4 ${h.ok ? "text-emerald-400" : "text-amber-400"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{h.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${h.ok ? "bg-emerald-400" : "bg-amber-400"}`}>
                        <div className={`w-full h-full rounded-full ${h.ok ? "bg-emerald-400" : "bg-amber-400"}`} style={{ animation: "admin-ripple 2.5s ease-out infinite" }} />
                      </div>
                      <p className={`text-[10px] font-semibold ${h.ok ? "text-emerald-400" : "text-amber-400"}`}>{h.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </WidgetCard>
        </div>

        {/* ── Row 5: Charts + Recent Signups ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* User Growth */}
          <WidgetCard className="lg:col-span-4" delay={750}>
            <WidgetHeader icon={UserPlus} title="User Growth" />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8952e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#c8952e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 15%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(40,10%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="users" stroke="#c8952e" fill="url(#userGrowthGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "#c8952e", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </WidgetCard>

          {/* Transaction Mix */}
          <WidgetCard className="lg:col-span-4" delay={800}>
            <WidgetHeader icon={CreditCard} title="Transaction Mix" />
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={txTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {txTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {txTypeData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground/70">{d.name}</span>
                    </div>
                    <span className="text-xs font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </WidgetCard>

          {/* Recent Signups */}
          <WidgetCard className="lg:col-span-4" delay={850}>
            <WidgetHeader icon={UserPlus} title="Recent Signups" action={() => navigate("/admin/users")} actionLabel="View All" />
            {recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 text-center py-10">No signups yet</p>
            ) : (
              <div className="space-y-1">
                {recentSignups.map((u, i) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-all duration-300"
                    style={{ animation: `admin-slide-up 0.3s ease-out ${900 + i * 40}ms both` }}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                      {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground/40 capitalize">{u.role || "user"}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 shrink-0">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
