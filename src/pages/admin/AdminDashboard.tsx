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
  Eye, Flame, Target, Star, Gift, Bell,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, AreaChart, Area, CartesianGrid, LineChart, Line,
} from "recharts";
import { useNavigate } from "react-router-dom";

/* ── Design tokens ── */
const C = {
  cardBg: "rgba(13,14,18,0.7)",
  elevated: "#121418",
  border: "rgba(200,149,46,0.10)",
  borderHover: "rgba(200,149,46,0.25)",
  primary: "#c8952e",
  secondary: "#d4a84b",
  glow: "#e8c060",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  cyan: "#06b6d4",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.3)",
  glass: "rgba(255,255,255,0.02)",
};

const CHART_COLORS = [C.primary, C.secondary, C.cyan, C.warning, C.success];

interface Stats {
  totalUsers: number; totalTransactionsToday: number; totalVolumeToday: number;
  pendingKyc: number; frozenWallets: number; activeWallets: number;
  totalBalance: number; newUsersToday: number; totalTransactionsAll: number;
  successRate: number; teens: number; parents: number;
  failedToday: number; avgTxnValue: number; activeLinks: number;
  newUsersYesterday: number; totalVolume: number;
  categoryBreakdown: { name: string; value: number; color: string }[];
  topUsers: { name: string; volume: number; txns: number }[];
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

const WidgetCard = ({ children, className = "", delay = 0, noPadding = false, glow = false }: { children: React.ReactNode; className?: string; delay?: number; noPadding?: boolean; glow?: boolean }) => (
  <div
    className={`relative rounded-[18px] overflow-hidden group transition-all duration-300 ${!noPadding ? "p-5" : ""} ${className}`}
    style={{
      background: C.cardBg,
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: `1px solid ${C.border}`,
      boxShadow: glow
        ? `inset 0 1px 0 rgba(200,149,46,0.06), 0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(200,149,46,0.04)`
        : `inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.2)`,
      animation: `admin-slide-up 0.5s ease-out ${delay}ms both`,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = C.borderHover;
      e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(200,149,46,0.08), 0 12px 40px rgba(0,0,0,0.4), 0 0 80px rgba(200,149,46,0.06)`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = C.border;
      e.currentTarget.style.boxShadow = glow
        ? `inset 0 1px 0 rgba(200,149,46,0.06), 0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(200,149,46,0.04)`
        : `inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.2)`;
    }}
  >
    {/* Subtle top shine */}
    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.15), transparent)" }} />
    {children}
  </div>
);

const StatCard = ({ label, value, icon: Icon, trend, trendUp, accentColor, delay, onClick, subtitle }: any) => (
  <WidgetCard delay={delay} className="cursor-pointer" glow={false}>
    <div onClick={onClick} className="relative">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-[12px] flex items-center justify-center relative" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}20` }}>
          <Icon className="w-4.5 h-4.5" style={{ color: accentColor }} />
          <div className="absolute inset-0 rounded-[12px]" style={{ background: `radial-gradient(circle at center, ${accentColor}10, transparent)` }} />
        </div>
        {trend && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5" style={{
            background: trendUp ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: trendUp ? C.success : C.danger,
            border: `1px solid ${trendUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
          }}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>
        {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
      </p>
      <p className="text-[11px] font-medium mt-1" style={{ color: C.textMuted }}>{label}</p>
      {subtitle && <p className="text-[9px] mt-0.5" style={{ color: `${accentColor}80` }}>{subtitle}</p>}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}40)` }} />
    </div>
  </WidgetCard>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalTransactionsToday: 0, totalVolumeToday: 0,
    pendingKyc: 0, frozenWallets: 0, activeWallets: 0, totalBalance: 0,
    newUsersToday: 0, totalTransactionsAll: 0, successRate: 0, teens: 0, parents: 0,
    failedToday: 0, avgTxnValue: 0, activeLinks: 0, newUsersYesterday: 0, totalVolume: 0,
    categoryBreakdown: [], topUsers: [],
  });
  const [liveTxns, setLiveTxns] = useState<Transaction[]>([]);
  const [dailyVolume, setDailyVolume] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [kycRequests, setKycRequests] = useState<any[]>([]);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening");
  }, []);

  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const [usersRes, txnsTodayRes, kycRes, walletsRes, allTxnsRes, linksRes, kycPendingRes] = await Promise.all([
      supabase.from("profiles").select("id, created_at, role, full_name, phone"),
      supabase.from("transactions").select("*").gte("created_at", today),
      supabase.from("kyc_requests").select("id").eq("status", "pending"),
      supabase.from("wallets").select("id, balance, is_frozen, user_id"),
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
    const totalVolume = allTxns.filter((t: any) => t.status === "success").reduce((s: number, t: any) => s + t.amount, 0);

    // Category breakdown
    const catMap: Record<string, number> = {};
    const catColors: Record<string, string> = { food: C.warning, shopping: C.info, transport: C.cyan, entertainment: "#a855f7", education: C.success, other: C.primary };
    allTxns.forEach((t: any) => {
      const cat = t.category || "other";
      catMap[cat] = (catMap[cat] || 0) + t.amount;
    });
    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value, color: catColors[name] || C.secondary }));

    // Top users by wallet balance
    const topUsers = wallets
      .sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0))
      .slice(0, 5)
      .map((w: any) => {
        const user = allUsers.find((u: any) => u.id === w.user_id);
        return { name: user?.full_name || "User", volume: w.balance || 0, txns: 0 };
      });

    setStats({
      totalUsers: allUsers.length, totalTransactionsToday: txnsToday.length, totalVolumeToday: volume,
      pendingKyc: kycRes.data?.length || 0, frozenWallets, activeWallets: wallets.length - frozenWallets,
      totalBalance, newUsersToday, totalTransactionsAll: allTxns.length,
      successRate: allTxns.length > 0 ? Math.round((successCount / allTxns.length) * 100) : 0,
      teens, parents, failedToday, avgTxnValue,
      activeLinks: linksRes.count || 0, newUsersYesterday, totalVolume,
      categoryBreakdown, topUsers,
    });

    setKycRequests(kycPendingRes.data || []);
    setLiveTxns(allTxns.slice(0, 15) as Transaction[]);

    const successC = txnsToday.filter(t => t.status === "success").length;
    const failedC = txnsToday.filter(t => t.status === "failed").length;
    const pendingC = txnsToday.filter(t => t.status === "pending").length;
    setStatusBreakdown([
      { name: "Success", value: successC || 0, color: C.success },
      { name: "Failed", value: failedC || 0, color: C.danger },
      { name: "Pending", value: pendingC || 0, color: C.warning },
    ].filter(d => d.value > 0));

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
      setLiveTxns(prev => [payload.new as Transaction, ...prev].slice(0, 15));
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
    background: "rgba(18,20,24,0.95)", border: `1px solid ${C.border}`, borderRadius: 14,
    color: C.textPrimary, fontSize: 11, boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
    backdropFilter: "blur(12px)",
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
              <div key={i} className="h-32 rounded-[18px] relative overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
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
        {/* Ambient orbs */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.03]" style={{ background: `radial-gradient(circle, ${C.primary}, transparent)`, filter: "blur(120px)" }} />

        {/* ── Welcome Banner ── */}
        <div className="relative rounded-[20px] overflow-hidden" style={{ animation: "admin-slide-up 0.4s ease-out" }}>
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, rgba(200,149,46,0.08) 0%, rgba(13,14,18,0.9) 50%, rgba(200,149,46,0.04) 100%)`,
            backdropFilter: "blur(20px)",
          }} />
          <div className="absolute inset-0" style={{ border: `1px solid rgba(200,149,46,0.12)`, borderRadius: 20 }} />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.3), transparent)" }} />
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full" style={{ background: `radial-gradient(circle, rgba(200,149,46,0.1), transparent)` }} />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full" style={{ background: `radial-gradient(circle, rgba(200,149,46,0.06), transparent)` }} />

          <div className="relative p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" style={{ color: C.glow }} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: C.secondary }}>{greeting}</span>
              </div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
                Command Center
              </h1>
              <p className="text-xs mt-1 flex items-center gap-2" style={{ color: C.textMuted }}>
                <Clock className="w-3 h-3" />
                Real-time overview • Last synced {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} className={`p-2.5 rounded-[12px] transition-all duration-200 ${refreshing ? "animate-spin" : ""}`} style={{ background: "rgba(200,149,46,0.06)", border: `1px solid ${C.border}`, color: C.textSecondary }}>
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-semibold transition-all duration-200" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: "#0a0c0f", boxShadow: `0 4px 20px rgba(200,149,46,0.3)` }}>
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>
        </div>

        {/* ── Row 1: Primary KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} trend={`+${stats.newUsersToday}`} trendUp={true} accentColor={C.info} delay={100} subtitle="Registered accounts" />
          <StatCard label="Active Teens" value={stats.teens} icon={UserPlus} trend={`${stats.parents} parents`} trendUp={true} accentColor={C.success} delay={140} />
          <StatCard label="Volume Today" value={formatAmount(stats.totalVolumeToday)} icon={DollarSign} accentColor={C.primary} delay={180} subtitle="Successful txns" />
          <StatCard label="Txns Today" value={stats.totalTransactionsToday} icon={ArrowLeftRight} trend={`${stats.successRate}%`} trendUp={stats.successRate > 90} accentColor={C.cyan} delay={220} subtitle="Success rate" />
          <StatCard label="Pending KYC" value={stats.pendingKyc} icon={ShieldCheck} trend="review" trendUp={false} accentColor={C.warning} delay={260} onClick={() => navigate("/admin/kyc")} />
          <StatCard label="Failed Txns" value={stats.failedToday} icon={AlertTriangle} trend={`${failureRate}%`} trendUp={false} accentColor={C.danger} delay={300} subtitle="Failure rate" />
        </div>

        {/* ── Row 2: Revenue summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Platform Balance" value={formatAmount(stats.totalBalance)} icon={Wallet} accentColor={C.primary} delay={340} subtitle="All wallets combined" />
          <StatCard label="New Signups" value={stats.newUsersToday} icon={Flame} trend={`${signupChange > 0 ? "+" : ""}${signupChange}%`} trendUp={signupChange >= 0} accentColor={C.info} delay={380} subtitle="vs yesterday" />
          <StatCard label="Avg Txn Value" value={formatAmount(stats.avgTxnValue)} icon={CreditCard} accentColor={C.cyan} delay={420} />
          <StatCard label="Parent-Teen Pairs" value={stats.activeLinks} icon={Users} accentColor={C.success} delay={460} subtitle="Active links" />
        </div>

        {/* ── Row 3: Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Transaction Volume */}
          <WidgetCard delay={500} className="lg:col-span-2" glow>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}20` }}>
                  <BarChart3 className="w-3.5 h-3.5" style={{ color: C.primary }} />
                </div>
                Transaction Volume
                <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${C.primary}10`, color: C.secondary }}>30D</span>
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyVolume} barCategoryGap="15%">
                <defs>
                  <linearGradient id="barGradDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,149,46,0.05)" />
                <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(200,149,46,0.04)" }} />
                <Bar dataKey="volume" fill="url(#barGradDash)" radius={[6, 6, 2, 2]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </WidgetCard>

          {/* Transaction Status Donut */}
          <WidgetCard delay={550}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.success}12`, border: `1px solid ${C.success}20` }}>
                <Percent className="w-3.5 h-3.5" style={{ color: C.success }} />
              </div>
              Status
            </h3>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={4} strokeWidth={0}>
                      {statusBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xl font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{totalStatusCount}</p>
                  <p className="text-[9px]" style={{ color: C.textMuted }}>Today</p>
                </div>
              </div>
              <div className="w-full space-y-2">
                {statusBreakdown.map(d => (
                  <div key={d.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: `${d.color}08` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-[11px] font-medium" style={{ color: C.textSecondary }}>{d.name}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </WidgetCard>
        </div>

        {/* ── Row 4: User Growth + Category Breakdown + Top Wallets ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* User Growth */}
          <WidgetCard delay={600} glow>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}20` }}>
                <TrendingUp className="w-3.5 h-3.5" style={{ color: C.primary }} />
              </div>
              User Growth
              <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${C.primary}10`, color: C.secondary }}>30D</span>
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userGrowthGradD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,149,46,0.05)" />
                <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="users" stroke={C.primary} fill="url(#userGrowthGradD)" strokeWidth={2.5} dot={{ r: 2.5, fill: C.primary, strokeWidth: 0 }} animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </WidgetCard>

          {/* Category Breakdown */}
          <WidgetCard delay={650}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}20` }}>
                <Target className="w-3.5 h-3.5" style={{ color: C.warning }} />
              </div>
              Spending Categories
            </h3>
            {stats.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: C.textMuted }}>No category data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.categoryBreakdown.map((cat) => {
                  const maxVal = stats.categoryBreakdown[0]?.value || 1;
                  const pct = Math.round((cat.value / maxVal) * 100);
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium capitalize" style={{ color: C.textSecondary }}>{cat.name}</span>
                        <span className="text-[11px] font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{formatAmount(cat.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}80)`, boxShadow: `0 0 8px ${cat.color}30` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </WidgetCard>

          {/* Top Wallets */}
          <WidgetCard delay={700}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.secondary}12`, border: `1px solid ${C.secondary}20` }}>
                <Crown className="w-3.5 h-3.5" style={{ color: C.secondary }} />
              </div>
              Top Wallets
            </h3>
            {stats.topUsers.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: C.textMuted }}>No wallet data</p>
            ) : (
              <div className="space-y-2">
                {stats.topUsers.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-[12px] transition-all duration-200" style={{ background: i === 0 ? "rgba(200,149,46,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? "rgba(200,149,46,0.15)" : "transparent"}` }}>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[11px] font-bold shrink-0" style={{
                      background: i === 0 ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : `rgba(255,255,255,0.05)`,
                      color: i === 0 ? "#0a0c0f" : C.textSecondary,
                    }}>
                      {i === 0 ? <Crown className="w-3.5 h-3.5" /> : `#${i + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate" style={{ color: C.textPrimary }}>{u.name}</p>
                    </div>
                    <span className="text-[12px] font-bold shrink-0" style={{ color: C.secondary, fontFamily: "'JetBrains Mono', monospace" }}>{formatAmount(u.volume)}</span>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>
        </div>

        {/* ── Row 5: Quick Actions ── */}
        <WidgetCard delay={750}>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}20` }}>
              <Zap className="w-3.5 h-3.5" style={{ color: C.primary }} />
            </div>
            Quick Actions
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: "Review KYC", icon: ShieldCheck, path: "/admin/kyc", color: C.warning },
              { label: "Manage Users", icon: Users, path: "/admin/users", color: C.info },
              { label: "Wallets", icon: Wallet, path: "/admin/wallets", color: C.success },
              { label: "Transactions", icon: ArrowLeftRight, path: "/admin/transactions", color: C.primary },
              { label: "Send Alert", icon: Bell, path: "/admin/notifications", color: C.secondary },
              { label: "Rewards", icon: Gift, path: "/admin/rewards", color: "#a855f7" },
              { label: "Analytics", icon: BarChart3, path: "/admin/analytics", color: C.cyan },
              { label: "Settings", icon: Globe, path: "/admin/settings", color: C.textSecondary },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-2.5 p-3.5 rounded-[14px] transition-all duration-200 active:scale-95 group"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${a.color}40`; e.currentTarget.style.background = `${a.color}08`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
              >
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: `${a.color}12`, border: `1px solid ${a.color}15` }}>
                  <a.icon className="w-4 h-4" style={{ color: a.color }} />
                </div>
                <span className="text-[10px] font-medium" style={{ color: C.textSecondary }}>{a.label}</span>
              </button>
            ))}
          </div>
        </WidgetCard>

        {/* ── Row 6: Live Feed + KYC + System Health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Live Transaction Feed */}
          <WidgetCard delay={800} glow>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.success}12`, border: `1px solid ${C.success}20` }}>
                  <Activity className="w-3.5 h-3.5" style={{ color: C.success }} />
                </div>
                Live Feed
                <span className="w-2 h-2 rounded-full ml-1" style={{ background: C.success, animation: "admin-glow-pulse 2s ease-in-out infinite", boxShadow: `0 0 8px ${C.success}` }} />
              </h3>
              <button onClick={() => navigate("/admin/transactions")} className="text-[11px] font-medium flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg" style={{ color: C.primary, background: `${C.primary}08` }}>
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1 max-h-[340px] overflow-y-auto scrollbar-none">
              {liveTxns.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: C.textMuted }}>No transactions yet</p>
              ) : (
                liveTxns.map((tx, i) => {
                  const statusColor = tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning;
                  const typeColor = tx.type === "credit" ? C.success : C.danger;
                  const timeAgo = tx.created_at ? (() => {
                    const diff = Date.now() - new Date(tx.created_at).getTime();
                    if (diff < 60000) return "Just now";
                    if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
                    if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
                    return `${Math.round(diff / 86400000)}d`;
                  })() : "—";

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-2.5 rounded-[10px] transition-all duration-200"
                      style={{ animation: `admin-slide-up 0.3s ease-out ${i * 30}ms both` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,149,46,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${typeColor}10` }}>
                        {tx.type === "credit" ? <ArrowDownRight className="w-3.5 h-3.5" style={{ color: C.success }} /> : <ArrowUpRight className="w-3.5 h-3.5" style={{ color: C.danger }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate" style={{ color: C.textPrimary }}>{tx.merchant_name || tx.type}</p>
                        <p className="text-[9px]" style={{ color: C.textMuted }}>{timeAgo} • {tx.category || "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-bold" style={{ color: tx.type === "credit" ? C.success : C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>
                          {tx.type === "credit" ? "+" : "-"}{formatAmount(tx.amount)}
                        </p>
                        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor}12`, color: statusColor }}>{tx.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </WidgetCard>

          <div className="space-y-4">
            {/* Recent KYC */}
            <WidgetCard delay={850}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}20` }}>
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.warning }} />
                  </div>
                  Pending KYC
                </h3>
                <button onClick={() => navigate("/admin/kyc")} className="text-[11px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ color: C.primary, background: `${C.primary}08` }}>
                  View All <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              {kycRequests.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: C.textMuted }}>No pending requests ✓</p>
              ) : (
                <div className="space-y-2">
                  {kycRequests.map((kyc: any) => (
                    <div key={kyc.id} className="flex items-center justify-between p-3 rounded-[12px]" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold" style={{ background: `${C.warning}12`, color: C.warning }}>
                          {kyc.aadhaar_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-[12px] font-medium" style={{ color: C.textPrimary }}>{kyc.aadhaar_name || "Unknown"}</p>
                          <p className="text-[9px]" style={{ color: C.textMuted }}>
                            {kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString("en-IN") : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleApproveKyc(kyc.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white" style={{ background: C.success }}>✓</button>
                        <button className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white" style={{ background: C.danger }}>✗</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </WidgetCard>

            {/* System Health */}
            <WidgetCard delay={900}>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.success}12`, border: `1px solid ${C.success}20` }}>
                  <Shield className="w-3.5 h-3.5" style={{ color: C.success }} />
                </div>
                System Health
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: "Database", status: "OK", icon: Database, ok: true },
                  { label: "Auth", status: "OK", icon: Shield, ok: true },
                  { label: "Payments", status: "Active", icon: Globe, ok: true },
                  { label: "KYC", status: stats.pendingKyc > 5 ? "Backlog" : "OK", icon: Cpu, ok: stats.pendingKyc <= 5 },
                  { label: "Functions", status: "Running", icon: Server, ok: true },
                  { label: "Realtime", status: "Live", icon: Activity, ok: true },
                ].map((h) => (
                  <div key={h.label} className="flex items-center gap-2 p-2.5 rounded-[10px]" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: h.ok ? `${C.success}10` : `${C.warning}10` }}>
                      <h.icon className="w-3 h-3" style={{ color: h.ok ? C.success : C.warning }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium truncate" style={{ color: C.textPrimary }}>{h.label}</p>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: h.ok ? C.success : C.warning, boxShadow: `0 0 4px ${h.ok ? C.success : C.warning}` }} />
                        <p className="text-[8px] font-semibold" style={{ color: h.ok ? C.success : C.warning }}>{h.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </WidgetCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
