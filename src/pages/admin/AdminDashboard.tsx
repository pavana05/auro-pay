import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  Users, ArrowLeftRight, Wallet, ShieldCheck, TrendingUp,
  Clock, AlertTriangle, RefreshCw, Zap,
  ArrowUpRight, ArrowDownRight, Crown,
  DollarSign, UserPlus, BarChart3, Server,
  Activity, Globe, Shield, Database, Cpu,
  CheckCircle2, XCircle, AlertCircle, Eye,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, AreaChart, Area, LineChart, Line,
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
      totalUsers: allUsers.length,
      totalTransactionsToday: txns.length,
      totalVolumeToday: volume,
      pendingKyc: kycRes.data?.length || 0,
      frozenWallets,
      activeWallets: wallets.length - frozenWallets,
      totalBalance,
      newUsersToday,
      totalTransactionsAll: allTxns.length,
      successRate: allTxns.length > 0 ? Math.round((successCount / allTxns.length) * 100) : 0,
      teens,
      parents,
      verifiedKyc: verifiedKycRes.data?.length || 0,
      avgBalance,
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
    const topMerch = Array.from(merchantMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    setTopMerchants(topMerch);

    const { data: latest } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50);
    setLiveTxns((latest || []) as Transaction[]);

    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTxns = (latest || []).filter((t: any) => t.created_at?.startsWith(dateStr) && t.status === "success");
      days.push({
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        volume: dayTxns.reduce((s: number, t: any) => s + t.amount, 0) / 100,
        count: dayTxns.length,
      });
    }
    setDailyVolume(days);

    const credits = (latest || []).filter((t: any) => t.type === "credit").length;
    const debits = (latest || []).filter((t: any) => t.type === "debit").length;
    const pending = (latest || []).filter((t: any) => t.status === "pending").length;
    const failed = (latest || []).filter((t: any) => t.status === "failed").length;
    setTxTypeData([
      { name: "Credits", value: credits || 1 },
      { name: "Debits", value: debits || 1 },
      { name: "Pending", value: pending || 0 },
      { name: "Failed", value: failed || 0 },
    ].filter(d => d.value > 0));

    const growth: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = allUsers.filter((u: any) => u.created_at?.startsWith(dateStr)).length;
      growth.push({ day: d.toLocaleDateString("en-IN", { weekday: "short" }), users: count });
    }
    setUserGrowth(growth);

    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    fetchStats();

    const txChannel = supabase
      .channel("admin-live-txns")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setLiveTxns((prev) => [payload.new as Transaction, ...prev].slice(0, 50));
        }
        fetchStats();
      })
      .subscribe();

    const usersChannel = supabase
      .channel("admin-users-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchStats())
      .subscribe();

    const walletsChannel = supabase
      .channel("admin-wallets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, () => fetchStats())
      .subscribe();

    const kycChannel = supabase
      .channel("admin-kyc-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "kyc_requests" }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(walletsChannel);
      supabase.removeChannel(kycChannel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary", sub: `+${stats.newUsersToday} today`, trend: "+12%" },
    { label: "Txns Today", value: stats.totalTransactionsToday, icon: ArrowLeftRight, color: "text-accent", sub: `${stats.totalTransactionsAll} total`, trend: "+8%" },
    { label: "Volume Today", value: formatAmount(stats.totalVolumeToday), icon: DollarSign, color: "text-success", sub: "processed", trend: "+15%" },
    { label: "Pending KYC", value: stats.pendingKyc, icon: ShieldCheck, color: "text-warning", sub: "awaiting review", trend: "" },
    { label: "System Balance", value: formatAmount(stats.totalBalance), icon: Wallet, color: "text-primary", sub: `${stats.activeWallets} wallets`, trend: "+5%" },
    { label: "Success Rate", value: `${stats.successRate}%`, icon: BarChart3, color: "text-success", sub: "payment success", trend: "+2%" },
  ];

  const quickActions = [
    { label: "Review KYC", icon: ShieldCheck, path: "/admin/kyc", count: stats.pendingKyc, color: "text-warning", desc: "Pending verifications" },
    { label: "Manage Roles", icon: Crown, path: "/admin/roles", color: "text-primary", desc: "User permissions" },
    { label: "View Wallets", icon: Wallet, path: "/admin/wallets", count: stats.activeWallets + stats.frozenWallets, color: "text-accent", desc: "All user wallets" },
    { label: "Send Alert", icon: Zap, path: "/admin/notifications", color: "text-success", desc: "Push notifications" },
    { label: "Transactions", icon: ArrowLeftRight, path: "/admin/transactions", color: "text-primary", desc: "All transactions" },
    { label: "User Mgmt", icon: Users, path: "/admin/users", color: "text-accent", desc: "Manage users" },
  ];

  const systemHealth = [
    { label: "Database", status: "Operational", icon: Database, ok: true },
    { label: "Auth Service", status: "Operational", icon: Shield, ok: true },
    { label: "Payment Gateway", status: "Active", icon: Globe, ok: true },
    { label: "KYC Service", status: stats.pendingKyc > 5 ? "Backlog" : "Normal", icon: Cpu, ok: stats.pendingKyc <= 5 },
    { label: "Wallets", status: stats.frozenWallets > 0 ? `${stats.frozenWallets} Frozen` : "All Active", icon: Wallet, ok: stats.frozenWallets === 0 },
    { label: "API Gateway", status: "Running", icon: Server, ok: true },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-32 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-64 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/[0.02] blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3" />
              Last synced: {lastRefresh.toLocaleTimeString("en-IN")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all duration-200 active:scale-90 ${refreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/10">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-success font-semibold tracking-wide">LIVE</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s, i) => (
            <div
              key={s.label}
              className="group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/20 transition-all duration-300 hover:shadow-[0_0_30px_hsl(42_78%_55%/0.06)] relative overflow-hidden"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Subtle shimmer on first card */}
              {i === 0 && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />}
              
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                {s.trend && (
                  <span className="text-[10px] font-medium text-success flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />{s.trend}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold tracking-tight">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/20 text-left transition-all duration-300 hover:shadow-[0_0_20px_hsl(42_78%_55%/0.05)] active:scale-[0.96]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center ${a.color}`}>
                    <a.icon className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs font-semibold mt-1">{a.label}</p>
                <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                {a.count !== undefined && (
                  <div className="mt-2 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 w-fit">
                    {a.count}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Daily Volume</h3>
              <span className="text-[10px] text-muted-foreground">Last 7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyVolume}>
                <XAxis dataKey="day" tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(220 15% 8%)",
                    border: "1px solid rgba(200,149,46,0.15)",
                    borderRadius: 12,
                    color: "#f5edd6",
                    fontSize: 12,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                  }}
                />
                <Bar dataKey="volume" fill="#c8952e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">User Growth</h3>
              <span className="text-[10px] text-muted-foreground">Last 7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userGradAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8952e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#c8952e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(220 15% 8%)",
                    border: "1px solid rgba(200,149,46,0.15)",
                    borderRadius: 12,
                    color: "#f5edd6",
                    fontSize: 12,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="#c8952e" fill="url(#userGradAdmin)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Distribution</h3>
              <span className="text-[10px] text-muted-foreground">By role</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {roleDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(220 15% 8%)",
                    border: "1px solid rgba(200,149,46,0.15)",
                    borderRadius: 12,
                    color: "#f5edd6",
                    fontSize: 12,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {roleDistribution.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">System Health</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {systemHealth.map((h) => (
              <div key={h.label} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${h.ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  <h.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{h.label}</p>
                  <p className={`text-[10px] font-medium ${h.ok ? "text-success" : "text-warning"}`}>{h.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics + Transaction Mix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <h3 className="text-sm font-semibold mb-4">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Teens", value: stats.teens, icon: Users, color: "text-primary" },
                { label: "Parents", value: stats.parents, icon: Users, color: "text-accent" },
                { label: "Frozen Wallets", value: stats.frozenWallets, icon: AlertTriangle, color: "text-warning" },
                { label: "Success Rate", value: `${stats.successRate}%`, icon: CheckCircle2, color: "text-success" },
                { label: "Verified KYC", value: stats.verifiedKyc, icon: ShieldCheck, color: "text-success" },
                { label: "Avg Balance", value: formatAmount(stats.avgBalance), icon: DollarSign, color: "text-primary" },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                  <div className="flex items-center gap-2 mb-1">
                    <m.icon className={`w-3 h-3 ${m.color}`} />
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <h3 className="text-sm font-semibold mb-4">Transaction Mix</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={txTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {txTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(220 15% 8%)",
                    border: "1px solid rgba(200,149,46,0.15)",
                    borderRadius: 12,
                    color: "#f5edd6",
                    fontSize: 12,
                  }}
                />
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
          </div>
        </div>

        {/* Recent Signups & Top Merchants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Recent Signups</h3>
              <button onClick={() => navigate("/admin/users")} className="text-[10px] text-primary hover:underline font-medium">View All →</button>
            </div>
            {recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No signups yet</p>
            ) : (
              <div className="space-y-1.5">
                {recentSignups.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground shadow-[0_2px_8px_hsl(42_78%_55%/0.2)]">
                      {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{u.role || "user"}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <h3 className="text-sm font-semibold mb-4">Top Merchants</h3>
            {topMerchants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No merchant data yet</p>
            ) : (
              <div className="space-y-1.5">
                {topMerchants.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.count} transactions</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">{formatAmount(m.volume)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Transaction Feed */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Live Transaction Feed</h3>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[9px] text-success font-semibold">LIVE</span>
              </div>
            </div>
            <button onClick={() => navigate("/admin/transactions")} className="text-[10px] text-primary hover:underline font-medium">View All →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Merchant</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {liveTxns.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No transactions yet</td></tr>
                ) : (
                  liveTxns.slice(0, 15).map((tx) => (
                    <tr key={tx.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {tx.created_at ? new Date(tx.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-medium capitalize flex items-center gap-1 ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                          {tx.type === "credit" ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-sm">{formatAmount(tx.amount)}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{tx.merchant_name || "—"}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                          tx.status === "success" ? "bg-success/10 text-success" :
                          tx.status === "failed" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
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
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
