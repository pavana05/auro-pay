import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  Users, ArrowLeftRight, Wallet, ShieldCheck, TrendingUp,
  Clock, RefreshCw, Zap, Download,
  ArrowUpRight, ArrowDownRight, Crown,
  DollarSign, UserPlus, BarChart3, Server,
  Activity, Globe, Shield, Database, Cpu,
  Sparkles, MoreVertical, Filter,
  Percent, CreditCard, PiggyBank, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, AreaChart, Area, CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";

/* ── Design tokens ── */
const C = {
  cardBg: "#0d0e12",
  elevated: "#121418",
  border: "rgba(200,149,46,0.12)",
  borderHover: "rgba(200,149,46,0.3)",
  primary: "#c8952e",
  secondary: "#d4a84b",
  glow: "#e8c060",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.3)",
};

const CHART_COLORS = [C.primary, C.secondary, "#06b6d4", C.warning, C.success];

interface Stats {
  totalUsers: number; totalTransactionsToday: number; totalVolumeToday: number;
  pendingKyc: number; frozenWallets: number; activeWallets: number;
  totalBalance: number; newUsersToday: number; totalTransactionsAll: number;
  successRate: number; teens: number; parents: number;
  failedToday: number; avgTxnValue: number; activeLinks: number;
  newUsersYesterday: number;
}

interface Transaction {
  id: string; type: string; amount: number; merchant_name: string | null;
  status: string | null; created_at: string | null; wallet_id: string; category: string | null;
}

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
  return <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{prefix}{display.toLocaleString("en-IN")}{suffix}</span>;
};

const WidgetCard = ({ children, className = "", delay = 0, noPadding = false }: { children: React.ReactNode; className?: string; delay?: number; noPadding?: boolean }) => (
  <div
    className={`relative rounded-[16px] overflow-hidden group transition-all duration-200 ${!noPadding ? "p-5" : ""} ${className}`}
    style={{ background: C.cardBg, border: `1px solid ${C.border}`, animation: `admin-slide-up 0.5s ease-out ${delay}ms both` }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderHover)}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
  >
    {children}
  </div>
);

const StatCard = ({ label, value, icon: Icon, trend, trendUp, color, accentColor, delay, onClick }: any) => (
  <WidgetCard delay={delay}>
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: `${accentColor}15` }}>
        <Icon className="w-4.5 h-4.5" style={{ color: accentColor }} />
      </div>
      {trend && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
          background: trendUp ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          color: trendUp ? C.success : C.danger,
        }}>
          {trendUp ? "↑" : "↓"} {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>
      {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
    </p>
    <p className="text-[11px] font-medium mt-1" style={{ color: C.textMuted }}>{label}</p>
    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: accentColor }} />
  </WidgetCard>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalTransactionsToday: 0, totalVolumeToday: 0,
    pendingKyc: 0, frozenWallets: 0, activeWallets: 0, totalBalance: 0,
    newUsersToday: 0, totalTransactionsAll: 0, successRate: 0, teens: 0, parents: 0,
    failedToday: 0, avgTxnValue: 0, activeLinks: 0, newUsersYesterday: 0,
  });
  const [liveTxns, setLiveTxns] = useState<Transaction[]>([]);
  const [dailyVolume, setDailyVolume] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [kycRequests, setKycRequests] = useState<any[]>([]);

  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const [usersRes, txnsTodayRes, kycRes, walletsRes, allTxnsRes, linksRes, kycPendingRes] = await Promise.all([
      supabase.from("profiles").select("id, created_at, role, full_name, phone"),
      supabase.from("transactions").select("*").gte("created_at", today),
      supabase.from("kyc_requests").select("id").eq("status", "pending"),
      supabase.from("wallets").select("id, balance, is_frozen"),
      supabase.from("transactions").select("id, status, merchant_name, amount, type, created_at, category, wallet_id").order("created_at", { ascending: false }).limit(500),
      supabase.from("parent_teen_links").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("kyc_requests").select("id, user_id, aadhaar_name, submitted_at, status").eq("status", "pending").order("submitted_at", { ascending: false }).limit(5),
    ]);

    const allUsers = usersRes.data || [];
    const txnsToday = (txnsTodayRes.data || []) as Transaction[];
    const successToday = txnsToday.filter(t => t.status === "success");
    const failedToday = txnsToday.filter(t => t.status === "failed").length;
    const volume = successToday.reduce((s, t) => s + t.amount, 0);
    const wallets = walletsRes.data || [];
    const frozenWallets = wallets.filter((w: any) => w.is_frozen).length;
    const totalBalance = wallets.reduce((s: number, w: any) => s + (w.balance || 0), 0);
    const newUsersToday = allUsers.filter((u: any) => u.created_at?.startsWith(today)).length;
    const newUsersYesterday = allUsers.filter((u: any) => u.created_at?.startsWith(yesterday)).length;
    const allTxns = allTxnsRes.data || [];
    const successCount = allTxns.filter((t: any) => t.status === "success").length;
    const teens = allUsers.filter((u: any) => u.role === "teen").length;
    const parents = allUsers.filter((u: any) => u.role === "parent").length;
    const avgTxnValue = successToday.length > 0 ? Math.round(volume / successToday.length) : 0;

    setStats({
      totalUsers: allUsers.length, totalTransactionsToday: txnsToday.length, totalVolumeToday: volume,
      pendingKyc: kycRes.data?.length || 0, frozenWallets, activeWallets: wallets.length - frozenWallets,
      totalBalance, newUsersToday, totalTransactionsAll: allTxns.length,
      successRate: allTxns.length > 0 ? Math.round((successCount / allTxns.length) * 100) : 0,
      teens, parents, failedToday, avgTxnValue,
      activeLinks: linksRes.count || 0, newUsersYesterday,
    });

    setKycRequests(kycPendingRes.data || []);
    setLiveTxns(allTxns.slice(0, 20) as Transaction[]);

    // Status breakdown for donut
    const successC = txnsToday.filter(t => t.status === "success").length;
    const failedC = txnsToday.filter(t => t.status === "failed").length;
    const pendingC = txnsToday.filter(t => t.status === "pending").length;
    setStatusBreakdown([
      { name: "Success", value: successC || 0, color: C.success },
      { name: "Failed", value: failedC || 0, color: C.danger },
      { name: "Pending", value: pendingC || 0, color: C.warning },
    ].filter(d => d.value > 0));

    // 30-day volume
    const days: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTxns = allTxns.filter((t: any) => t.created_at?.startsWith(dateStr) && t.status === "success");
      days.push({
        day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        volume: dayTxns.reduce((s: number, t: any) => s + t.amount, 0) / 100,
        count: dayTxns.length,
      });
    }
    setDailyVolume(days);

    // 30-day user growth
    const growth: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      growth.push({
        day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        users: allUsers.filter((u: any) => u.created_at?.startsWith(dateStr)).length,
      });
    }
    setUserGrowth(growth);

    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    fetchStats();
    const txChannel = supabase.channel("admin-dash-txns").on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, (payload) => {
      setLiveTxns(prev => [payload.new as Transaction, ...prev].slice(0, 20));
      fetchStats();
    }).subscribe();
    const usersChannel = supabase.channel("admin-dash-users").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchStats()).subscribe();
    const walletsChannel = supabase.channel("admin-dash-wallets").on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, () => fetchStats()).subscribe();
    const kycChannel = supabase.channel("admin-dash-kyc").on("postgres_changes", { event: "*", schema: "public", table: "kyc_requests" }, () => fetchStats()).subscribe();
    return () => { [txChannel, usersChannel, walletsChannel, kycChannel].forEach(c => supabase.removeChannel(c)); };
  }, []);

  const handleRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };
  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;
  const totalStatusCount = statusBreakdown.reduce((s, d) => s + d.value, 0);

  const tooltipStyle = {
    background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 12,
    color: C.textPrimary, fontSize: 11, boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
  };

  const handleApproveKyc = async (id: string) => {
    await supabase.from("kyc_requests").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", id);
    fetchStats();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 lg:p-8 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-32 rounded-[16px] relative overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" style={{ animation: "admin-shimmer 1.5s linear infinite", backgroundSize: "200% 100%" }} />
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const signupChange = stats.newUsersYesterday > 0 ? Math.round(((stats.newUsersToday - stats.newUsersYesterday) / stats.newUsersYesterday) * 100) : 0;
  const failureRate = stats.totalTransactionsToday > 0 ? Math.round((stats.failedToday / stats.totalTransactionsToday) * 100) : 0;

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6 relative min-h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ animation: "admin-slide-up 0.4s ease-out" }}>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-2.5" style={{ color: C.textPrimary, fontFamily: "'Sora', sans-serif" }}>
              <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: `${C.primary}15` }}>
                <Sparkles className="w-4.5 h-4.5" style={{ color: C.primary }} />
              </div>
              Dashboard
            </h1>
            <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: C.textMuted }}>
              <Clock className="w-3 h-3" />
              Real-time overview • Last synced {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className={`p-2.5 rounded-[10px] transition-all duration-200 ${refreshing ? "animate-spin" : ""}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, color: C.textSecondary }}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-xs font-semibold text-white transition-all duration-200" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* ── Row 1: Primary KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Registered Users" value={stats.totalUsers} icon={Users} trend={`+${stats.newUsersToday} today`} trendUp={true} accentColor={C.info} delay={100} />
          <StatCard label="Active Teens Today" value={stats.teens} icon={UserPlus} trend={`${stats.parents} parents`} trendUp={true} accentColor={C.success} delay={140} />
          <StatCard label="Volume Today" value={formatAmount(stats.totalVolumeToday)} icon={DollarSign} accentColor={C.primary} delay={180} />
          <StatCard label="Transactions Today" value={stats.totalTransactionsToday} icon={ArrowLeftRight} trend={`${stats.successRate}% success`} trendUp={stats.successRate > 90} accentColor="#06b6d4" delay={220} />
          <StatCard label="Pending KYC" value={stats.pendingKyc} icon={ShieldCheck} trend="review" trendUp={false} accentColor={C.warning} delay={260} onClick={() => navigate("/admin/kyc")} />
          <StatCard label="Failed Txns Today" value={stats.failedToday} icon={AlertTriangle} trend={`${failureRate}% rate`} trendUp={false} accentColor={C.danger} delay={300} />
        </div>

        {/* ── Row 2: Secondary Metrics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Wallet Balance" value={formatAmount(stats.totalBalance)} icon={Wallet} accentColor={C.primary} delay={340} />
          <StatCard label="New Signups Today" value={stats.newUsersToday} icon={UserPlus} trend={`${signupChange > 0 ? "+" : ""}${signupChange}%`} trendUp={signupChange >= 0} accentColor={C.info} delay={380} />
          <StatCard label="Avg Transaction Value" value={formatAmount(stats.avgTxnValue)} icon={CreditCard} accentColor="#06b6d4" delay={420} />
          <StatCard label="Active Parent-Teen Pairs" value={stats.activeLinks} icon={Users} accentColor={C.success} delay={460} />
        </div>

        {/* ── Row 3: Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Transaction Volume 30 days */}
          <WidgetCard delay={500}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.primary}15` }}>
                  <BarChart3 className="w-3.5 h-3.5" style={{ color: C.primary }} />
                </div>
                Transaction Volume (30 Days)
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyVolume} barCategoryGap="15%">
                <defs>
                  <linearGradient id="barGradDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={1} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,149,46,0.06)" />
                <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(200,149,46,0.04)" }} />
                <Bar dataKey="volume" fill="url(#barGradDash)" radius={[6, 6, 2, 2]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </WidgetCard>

          {/* Transaction Status Donut */}
          <WidgetCard delay={550}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.success}15` }}>
                  <Percent className="w-3.5 h-3.5" style={{ color: C.success }} />
                </div>
                Status Breakdown (Today)
              </h3>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={78} dataKey="value" paddingAngle={4} strokeWidth={0}>
                      {statusBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{totalStatusCount}</p>
                  <p className="text-[10px]" style={{ color: C.textMuted }}>Total</p>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                {statusBreakdown.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                      <span className="text-xs" style={{ color: C.textSecondary }}>{d.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{d.value}</span>
                      <span className="text-[10px] ml-1" style={{ color: C.textMuted }}>
                        ({totalStatusCount > 0 ? Math.round((d.value / totalStatusCount) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </WidgetCard>
        </div>

        {/* ── Row 4: User Growth + Payment Methods ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* User Growth */}
          <WidgetCard delay={600}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.primary}15` }}>
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: C.primary }} />
                </div>
                New User Signups (30 Days)
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userGrowthGradD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,149,46,0.06)" />
                <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="users" stroke={C.primary} fill="url(#userGrowthGradD)" strokeWidth={2.5} dot={{ r: 3, fill: C.primary, strokeWidth: 0 }} animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </WidgetCard>

          {/* Quick Actions + System Health */}
          <div className="grid grid-cols-1 gap-4">
            <WidgetCard delay={650}>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.primary}15` }}>
                  <Zap className="w-3.5 h-3.5" style={{ color: C.primary }} />
                </div>
                Quick Actions
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Review KYC", icon: ShieldCheck, path: "/admin/kyc", color: C.warning },
                  { label: "Manage Users", icon: Users, path: "/admin/users", color: C.info },
                  { label: "View Wallets", icon: Wallet, path: "/admin/wallets", color: C.success },
                  { label: "Transactions", icon: ArrowLeftRight, path: "/admin/transactions", color: C.primary },
                  { label: "Send Alert", icon: Zap, path: "/admin/notifications", color: C.secondary },
                  { label: "Settings", icon: Globe, path: "/admin/settings", color: "#06b6d4" },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.path)}
                    className="flex flex-col items-center gap-2 p-3 rounded-[10px] transition-all duration-200 active:scale-95"
                    style={{ background: "rgba(200,149,46,0.04)", border: `1px solid ${C.border}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
                  >
                    <a.icon className="w-4 h-4" style={{ color: a.color }} />
                    <span className="text-[10px] font-medium" style={{ color: C.textSecondary }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </WidgetCard>
          </div>
        </div>

        {/* ── Row 5: Live Transaction Feed ── */}
        <WidgetCard delay={700}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.success}15` }}>
                <Activity className="w-3.5 h-3.5" style={{ color: C.success }} />
              </div>
              Live Transaction Feed
              <span className="w-2 h-2 rounded-full ml-1" style={{ background: C.success, animation: "admin-glow-pulse 2s ease-in-out infinite" }} />
            </h3>
            <button onClick={() => navigate("/admin/transactions")} className="text-[11px] font-medium flex items-center gap-1 transition-colors" style={{ color: C.primary }}>
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 rounded-[10px] mb-1" style={{ background: "rgba(200,149,46,0.08)" }}>
            {["Time", "User", "Type", "Amount", "Merchant", "Category", "Status"].map((h, i) => (
              <span key={h} className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${i === 0 ? "col-span-2" : i === 1 ? "col-span-2" : i === 3 ? "col-span-2" : i === 4 ? "col-span-2" : "col-span-1"}`} style={{ color: C.textMuted }}>
                {h}
              </span>
            ))}
          </div>

          <div className="space-y-0.5 max-h-[400px] overflow-y-auto scrollbar-none">
            {liveTxns.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: C.textMuted }}>No transactions yet</p>
            ) : (
              liveTxns.map((tx, i) => {
                const statusColor = tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning;
                const typeColor = tx.type === "credit" ? C.success : C.danger;
                const timeAgo = tx.created_at ? (() => {
                  const diff = Date.now() - new Date(tx.created_at).getTime();
                  if (diff < 60000) return "Just now";
                  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
                  return `${Math.round(diff / 3600000)}h ago`;
                })() : "—";

                return (
                  <div
                    key={tx.id}
                    className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-[8px] transition-all duration-200"
                    style={{ animation: `admin-slide-up 0.3s ease-out ${i * 30}ms both` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,149,46,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="col-span-2 text-xs" style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo}</span>
                    <span className="col-span-2 text-xs font-medium truncate" style={{ color: C.textPrimary }}>—</span>
                    <span className="col-span-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${typeColor}15`, color: typeColor }}>
                        {tx.type === "credit" ? "CR" : "DR"}
                      </span>
                    </span>
                    <span className="col-span-2 text-sm font-bold" style={{ color: tx.type === "credit" ? C.success : C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>
                      {tx.type === "credit" ? "+" : "-"}{formatAmount(tx.amount)}
                    </span>
                    <span className="col-span-2 text-xs truncate" style={{ color: C.textSecondary }}>{tx.merchant_name || "—"}</span>
                    <span className="col-span-1">
                      {tx.category && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${C.primary}10`, color: C.secondary }}>{tx.category}</span>
                      )}
                    </span>
                    <span className="col-span-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>
                        {tx.status}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </WidgetCard>

        {/* ── Row 6: Quick Panels ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent KYC */}
          <WidgetCard delay={800}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.warning}15` }}>
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.warning }} />
                </div>
                Recent KYC Requests
              </h3>
              <button onClick={() => navigate("/admin/kyc")} className="text-[11px] font-medium flex items-center gap-1" style={{ color: C.primary }}>
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {kycRequests.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: C.textMuted }}>No pending KYC requests</p>
            ) : (
              <div className="space-y-2">
                {kycRequests.map((kyc: any) => (
                  <div key={kyc.id} className="flex items-center justify-between p-3 rounded-[10px]" style={{ background: "rgba(200,149,46,0.04)", border: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold" style={{ background: `${C.warning}15`, color: C.warning }}>
                        {kyc.aadhaar_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{kyc.aadhaar_name || "Unknown"}</p>
                        <p className="text-[10px]" style={{ color: C.textMuted }}>
                          {kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString("en-IN") : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleApproveKyc(kyc.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white" style={{ background: C.success }}>Approve</button>
                      <button className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white" style={{ background: C.danger }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>

          {/* System Health */}
          <WidgetCard delay={850}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.success}15` }}>
                <Shield className="w-3.5 h-3.5" style={{ color: C.success }} />
              </div>
              System Health
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { label: "Database", status: "Operational", icon: Database, ok: true },
                { label: "Auth Service", status: "Operational", icon: Shield, ok: true },
                { label: "Payments", status: "Active", icon: Globe, ok: true },
                { label: "KYC Service", status: stats.pendingKyc > 5 ? "Backlog" : "Normal", icon: Cpu, ok: stats.pendingKyc <= 5 },
                { label: "Edge Functions", status: "Running", icon: Server, ok: true },
                { label: "Realtime", status: "Connected", icon: Activity, ok: true },
              ].map((h) => (
                <div key={h.label} className="flex items-center gap-3 p-3 rounded-[10px]" style={{ background: "rgba(200,149,46,0.04)", border: `1px solid ${C.border}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: h.ok ? `${C.success}10` : `${C.warning}10` }}>
                    <h.icon className="w-3.5 h-3.5" style={{ color: h.ok ? C.success : C.warning }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate" style={{ color: C.textPrimary }}>{h.label}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: h.ok ? C.success : C.warning }}>
                        <div className="w-full h-full rounded-full" style={{ background: h.ok ? C.success : C.warning, animation: "admin-ripple 2.5s ease-out infinite" }} />
                      </div>
                      <p className="text-[9px] font-semibold" style={{ color: h.ok ? C.success : C.warning }}>{h.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </WidgetCard>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
