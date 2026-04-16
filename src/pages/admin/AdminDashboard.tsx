import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  Users, ArrowLeftRight, Wallet, ShieldCheck, TrendingUp,
  Clock, AlertTriangle, RefreshCw, Zap, Download,
  ArrowUpRight, ArrowDownRight, Crown,
  DollarSign, UserPlus, BarChart3, Server,
  Activity, Globe, Shield, Database, Cpu,
  CheckCircle2, XCircle, AlertCircle, Eye, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, AreaChart, Area,
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

/* Premium glassmorphism card wrapper */
const GlassCard = ({ children, className = "", delay = 0, hover = true }: { children: React.ReactNode; className?: string; delay?: number; hover?: boolean }) => (
  <div
    className={`relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden group transition-all duration-400 ${hover ? "hover:border-primary/15 hover:shadow-[0_8px_40px_hsl(42_78%_55%/0.06)]" : ""} ${className}`}
    style={{ animation: `admin-slide-up 0.5s ease-out ${delay}ms both` }}
  >
    {/* Top gradient border */}
    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    {/* Shimmer sweep on hover */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
    {children}
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

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, glow: "hsl(42 78% 55%)", sub: `+${stats.newUsersToday} today`, trend: "+12%", trendUp: true },
    { label: "Txns Today", value: stats.totalTransactionsToday, icon: ArrowLeftRight, glow: "hsl(36 60% 48%)", sub: `${stats.totalTransactionsAll} total`, trend: "+8%", trendUp: true },
    { label: "Volume Today", value: formatAmount(stats.totalVolumeToday), icon: DollarSign, glow: "hsl(152 60% 45%)", sub: "processed", trend: "+15%", trendUp: true },
    { label: "Pending KYC", value: stats.pendingKyc, icon: ShieldCheck, glow: "hsl(38 92% 50%)", sub: "awaiting review", trend: "", trendUp: false },
    { label: "System Balance", value: formatAmount(stats.totalBalance), icon: Wallet, glow: "hsl(42 78% 55%)", sub: `${stats.activeWallets} wallets`, trend: "+5%", trendUp: true },
    { label: "Success Rate", value: `${stats.successRate}%`, icon: BarChart3, glow: "hsl(152 60% 45%)", sub: "payment success", trend: "+2%", trendUp: true },
  ];

  const quickActions = [
    { label: "Review KYC", icon: ShieldCheck, path: "/admin/kyc", count: stats.pendingKyc, glow: "hsl(38 92% 50%)", desc: "Pending verifications" },
    { label: "Manage Roles", icon: Crown, path: "/admin/roles", glow: "hsl(42 78% 55%)", desc: "User permissions" },
    { label: "View Wallets", icon: Wallet, path: "/admin/wallets", count: stats.activeWallets + stats.frozenWallets, glow: "hsl(36 60% 48%)", desc: "All user wallets" },
    { label: "Send Alert", icon: Zap, path: "/admin/notifications", glow: "hsl(152 60% 45%)", desc: "Push notifications" },
    { label: "Transactions", icon: ArrowLeftRight, path: "/admin/transactions", glow: "hsl(42 78% 55%)", desc: "All transactions" },
    { label: "User Mgmt", icon: Users, path: "/admin/users", glow: "hsl(36 60% 48%)", desc: "Manage users" },
  ];

  const systemHealth = [
    { label: "Database", status: "Operational", icon: Database, ok: true },
    { label: "Auth Service", status: "Operational", icon: Shield, ok: true },
    { label: "Payment Gateway", status: "Active", icon: Globe, ok: true },
    { label: "KYC Service", status: stats.pendingKyc > 5 ? "Backlog" : "Normal", icon: Cpu, ok: stats.pendingKyc <= 5 },
    { label: "Wallets", status: stats.frozenWallets > 0 ? `${stats.frozenWallets} Frozen` : "All Active", icon: Wallet, ok: stats.frozenWallets === 0 },
    { label: "API Gateway", status: "Running", icon: Server, ok: true },
  ];

  const tooltipStyle = {
    background: "hsl(220 15% 8% / 0.95)",
    border: "1px solid rgba(200,149,46,0.15)",
    borderRadius: 14,
    color: "#f5edd6",
    fontSize: 11,
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    backdropFilter: "blur(12px)",
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-36 rounded-2xl bg-white/[0.02] border border-white/[0.04] relative overflow-hidden">
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
      <div className="p-6 space-y-6 relative">
        {/* Ambient background orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/[0.015] blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.01] blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10" style={{ animation: "admin-slide-up 0.4s ease-out" }}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Command Center
            </h1>
            <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3" />
              Last synced: {lastRefresh.toLocaleTimeString("en-IN")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className={`p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-primary hover:border-primary/20 hover:shadow-[0_0_20px_hsl(42_78%_55%/0.08)] transition-all duration-300 active:scale-90 ${refreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/admin/users")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-medium hover:bg-white/[0.06] hover:border-primary/15 transition-all duration-300 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Stats Grid — Premium glassmorphism cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s, i) => (
            <GlassCard key={s.label} delay={i * 60} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                  style={{ background: `${s.glow.replace(')', ' / 0.1)')}` }}
                >
                  <s.icon className="w-4.5 h-4.5" style={{ color: s.glow, filter: `drop-shadow(0 0 6px ${s.glow.replace(')', ' / 0.4)')})` }} />
                  {/* Icon halo */}
                  <div className="absolute inset-0 rounded-xl" style={{ boxShadow: `inset 0 0 12px ${s.glow.replace(')', ' / 0.08)')}` }} />
                </div>
                {s.trend && (
                  <span className={`text-[10px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${s.trendUp ? "text-success bg-success/10" : "text-destructive bg-destructive/10"}`}>
                    {s.trendUp ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {s.trend}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold tracking-tight">{typeof s.value === "number" ? <AnimatedCounter value={s.value} /> : s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">{s.sub}</p>
            </GlassCard>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ animation: "admin-slide-up 0.5s ease-out 200ms both" }}>
          <h3 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3 text-primary" /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((a, i) => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 text-left transition-all duration-300 hover:shadow-[0_8px_30px_hsl(42_78%_55%/0.06)] active:scale-[0.96] relative overflow-hidden"
                style={{ animation: `admin-slide-up 0.5s ease-out ${250 + i * 40}ms both` }}
              >
                {/* Hover gradient underline */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{ background: `${a.glow.replace(')', ' / 0.1)')}` }}
                  >
                    <a.icon className="w-4 h-4" style={{ color: a.glow }} />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                </div>
                <p className="text-xs font-semibold mt-1">{a.label}</p>
                <p className="text-[10px] text-muted-foreground/60">{a.desc}</p>
                {a.count !== undefined && a.count > 0 && (
                  <div className="mt-2 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5 w-fit border border-primary/10">
                    {a.count}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard delay={350} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Daily Volume
              </h3>
              <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.04]">7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyVolume}>
                <defs>
                  <linearGradient id="barGradAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8952e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#c8952e" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "hsl(40,10%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="volume" fill="url(#barGradAdmin)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard delay={400} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> User Growth
              </h3>
              <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.04]">7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userGradAdmin2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8952e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#c8952e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "hsl(40,10%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="users" stroke="#c8952e" fill="url(#userGradAdmin2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard delay={450} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Distribution
              </h3>
              <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.04]">By role</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {roleDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {roleDistribution.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shadow-[0_0_6px_currentColor]" style={{ background: CHART_COLORS[i % CHART_COLORS.length], color: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* System Health */}
        <div style={{ animation: "admin-slide-up 0.5s ease-out 500ms both" }}>
          <h3 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <Shield className="w-3 h-3 text-success" /> System Health
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {systemHealth.map((h, i) => (
              <div
                key={h.label}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] transition-all duration-300"
                style={{ animation: `admin-slide-up 0.4s ease-out ${550 + i * 40}ms both` }}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center relative ${h.ok ? "bg-success/10" : "bg-warning/10"}`}>
                  <h.icon className={`w-4 h-4 ${h.ok ? "text-success" : "text-warning"}`} />
                  {/* Status ripple */}
                  <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${h.ok ? "bg-success" : "bg-warning"}`}>
                    <div className={`absolute inset-0 rounded-full ${h.ok ? "bg-success" : "bg-warning"}`} style={{ animation: "admin-ripple 2.5s ease-out infinite" }} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{h.label}</p>
                  <p className={`text-[10px] font-semibold ${h.ok ? "text-success" : "text-warning"}`}>{h.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics + Transaction Mix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard delay={600} className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Key Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Teens", value: stats.teens, icon: Users, glow: "hsl(42 78% 55%)" },
                { label: "Parents", value: stats.parents, icon: Users, glow: "hsl(36 60% 48%)" },
                { label: "Frozen Wallets", value: stats.frozenWallets, icon: AlertTriangle, glow: "hsl(38 92% 50%)" },
                { label: "Success Rate", value: `${stats.successRate}%`, icon: CheckCircle2, glow: "hsl(152 60% 45%)" },
                { label: "Verified KYC", value: stats.verifiedKyc, icon: ShieldCheck, glow: "hsl(152 60% 45%)" },
                { label: "Avg Balance", value: formatAmount(stats.avgBalance), icon: DollarSign, glow: "hsl(42 78% 55%)" },
              ].map(m => (
                <div key={m.label} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-1.5">
                    <m.icon className="w-3.5 h-3.5" style={{ color: m.glow }} />
                    <p className="text-[10px] text-muted-foreground/60 font-medium">{m.label}</p>
                  </div>
                  <p className="text-lg font-bold" style={{ color: m.glow }}>{m.value}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard delay={650} className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Transaction Mix
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={txTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {txTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {txTypeData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Recent Signups & Top Merchants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard delay={700} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Recent Signups
              </h3>
              <button onClick={() => navigate("/admin/users")} className="text-[10px] text-primary hover:text-primary/80 font-semibold transition-colors flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No signups yet</p>
            ) : (
              <div className="space-y-1">
                {recentSignups.map((u, i) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-all duration-300 group"
                    style={{ animation: `admin-slide-up 0.4s ease-out ${750 + i * 60}ms both` }}
                  >
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground shadow-[0_4px_12px_hsl(42_78%_55%/0.25)] relative">
                      {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                      {/* New badge for today */}
                      {u.created_at && new Date(u.created_at).toDateString() === new Date().toDateString() && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success text-[7px] font-bold text-white flex items-center justify-center border border-card">N</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground/60 capitalize">{u.role || "user"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/50">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard delay={750} className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" /> Top Merchants
            </h3>
            {topMerchants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No merchant data yet</p>
            ) : (
              <div className="space-y-2">
                {topMerchants.map((m, i) => {
                  const maxCount = topMerchants[0]?.count || 1;
                  const pct = Math.round((m.count / maxCount) * 100);
                  return (
                    <div key={m.name} className="p-3 rounded-xl hover:bg-white/[0.02] transition-all duration-300 relative overflow-hidden" style={{ animation: `admin-slide-up 0.4s ease-out ${800 + i * 60}ms both` }}>
                      {/* Volume progress bar background */}
                      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 bottom-0 bg-primary/[0.04] transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-[0_2px_8px_hsl(42_78%_55%/0.2)]">
                          #{i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground/50">{m.count} transactions</p>
                        </div>
                        <span className="text-xs font-bold text-primary">{formatAmount(m.volume)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Live Transaction Feed */}
        <GlassCard delay={800} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Live Transaction Feed
              </h3>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/[0.08] border border-success/10">
                <div className="w-1.5 h-1.5 rounded-full bg-success relative">
                  <div className="absolute inset-0 rounded-full bg-success" style={{ animation: "admin-ripple 2s ease-out infinite" }} />
                </div>
                <span className="text-[9px] text-success font-bold tracking-wider">LIVE</span>
              </div>
            </div>
            <button onClick={() => navigate("/admin/transactions")} className="text-[10px] text-primary hover:text-primary/80 font-semibold transition-colors flex items-center gap-1">
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Time", "Type", "Amount", "Merchant", "Status"].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liveTxns.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground/50 text-sm">No transactions yet</td></tr>
                ) : (
                  liveTxns.slice(0, 15).map((tx, i) => (
                    <tr
                      key={tx.id}
                      className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-all duration-300"
                      style={{ animation: `admin-slide-up 0.3s ease-out ${850 + i * 30}ms both` }}
                    >
                      <td className="py-3 px-3 text-xs text-muted-foreground/60 tabular-nums">
                        {tx.created_at ? new Date(tx.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-semibold capitalize flex items-center gap-1.5 ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${tx.type === "credit" ? "bg-success/10" : "bg-destructive/10"}`}>
                            {tx.type === "credit" ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          </div>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-sm">{formatAmount(tx.amount)}</td>
                      <td className="py-3 px-3 text-muted-foreground/60 text-xs">{tx.merchant_name || "—"}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                          tx.status === "success" ? "bg-success/10 text-success shadow-[0_0_8px_hsl(152_60%_45%/0.15)]" :
                          tx.status === "failed" ? "bg-destructive/10 text-destructive shadow-[0_0_8px_hsl(0_72%_51%/0.15)]" :
                          "bg-warning/10 text-warning shadow-[0_0_8px_hsl(38_92%_50%/0.15)]"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
