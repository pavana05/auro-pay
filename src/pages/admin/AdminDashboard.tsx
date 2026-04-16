import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  Users, ArrowLeftRight, Wallet, ShieldCheck, TrendingUp,
  Clock, RefreshCw, Zap, Download,
  ArrowUpRight, ArrowDownRight,
  DollarSign, UserPlus, BarChart3, Server,
  Activity, Globe, Shield, Database, Cpu,
  Sparkles, Percent, CreditCard, PiggyBank, AlertTriangle,
  Eye, Flame, Target, Award, Gift, Heart,
  Signal, Wifi, MonitorSmartphone,
  Calendar, Layers, Rocket, Timer,
  CheckCircle2, XCircle, Gauge,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, AreaChart, Area, CartesianGrid, LineChart, Line,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";

/* ── Semantic color refs (gold theme) ── */
const C = {
  primary: "#c8952e", secondary: "#d4a84b", glow: "#e8c060",
  success: "#22c55e", danger: "#ef4444", warning: "#f59e0b",
  info: "#3b82f6", cyan: "#06b6d4",
};

/* ── Animated Counter ── */
const Counter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const display = useCountUp(value, 1400, true);
  return <span className="font-mono">{prefix}{display.toLocaleString("en-IN")}{suffix}</span>;
};

/* ── Stagger variants ── */
const staggerParent = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const staggerChild = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

/* ── Stat Card ── */
const StatCard = ({ label, value, icon: Icon, trend, trendUp, color, subtitle, onClick }: {
  label: string; value: string | number; icon: any; trend?: string; trendUp?: boolean;
  color: string; subtitle?: string; onClick?: () => void;
}) => (
  <motion.div
    variants={staggerChild}
    whileHover={{ y: -3, transition: { duration: 0.2 } }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="relative rounded-[20px] p-5 overflow-hidden cursor-pointer group border border-border/30"
    style={{ background: "rgba(13,14,18,0.7)", backdropFilter: "blur(20px)" }}
  >
    {/* Top shine */}
    <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
    {/* Left accent */}
    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full group-hover:w-[4px] transition-all" style={{ background: `linear-gradient(180deg, ${color}, ${color}40)` }} />
    {/* Hover shimmer */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}08, transparent 60%)` }} />

    <div className="flex items-center justify-between mb-3">
      <div className="w-11 h-11 rounded-[14px] flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend && (
        <span className="text-[10px] font-semibold font-mono px-2.5 py-1 rounded-full flex items-center gap-0.5" style={{
          background: trendUp ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          color: trendUp ? C.success : C.danger,
          border: `1px solid ${trendUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
        }}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold tracking-tight font-mono text-foreground">
      {typeof value === "number" ? <Counter value={value} /> : value}
    </p>
    <p className="text-[11px] font-medium mt-1.5 text-muted-foreground/50 font-sora">{label}</p>
    {subtitle && <p className="text-[9px] mt-0.5 font-sora" style={{ color: `${color}80` }}>{subtitle}</p>}
  </motion.div>
);

/* ── Mini Sparkline ── */
const MiniSparkline = ({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) => {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 80}`).join(" ");
  return (
    <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none" className="opacity-60">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      <polygon fill={`url(#spark-${color.replace("#", "")})`} points={`0,100 ${points} 100,100`} />
    </svg>
  );
};

/* ── Performance Gauge ── */
const PerformanceGauge = ({ value, label, color }: { value: number; label: string; color: string }) => {
  const circ = 2 * Math.PI * 36;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        <motion.circle
          cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${(value / 100) * circ} ${circ}` }}
          transition={{ duration: 1.5, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="40" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{value}%</text>
        <text x="44" y="54" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="Sora">{label}</text>
      </svg>
    </div>
  );
};

/* ── Widget Card ── */
const Widget = ({ children, className = "", noPadding = false, glow = false, highlight = false }: {
  children: React.ReactNode; className?: string; noPadding?: boolean; glow?: boolean; highlight?: boolean;
}) => (
  <motion.div
    variants={staggerChild}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    className={`relative rounded-[20px] overflow-hidden border border-border/30 ${!noPadding ? "p-5" : ""} ${className}`}
    style={{
      background: highlight ? `linear-gradient(135deg, rgba(200,149,46,0.08), rgba(13,14,18,0.85))` : "rgba(13,14,18,0.7)",
      backdropFilter: "blur(20px)",
      boxShadow: glow ? `inset 0 1px 0 rgba(200,149,46,0.08), 0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(200,149,46,0.05)` : `inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.2)`,
    }}
  >
    <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${highlight ? "rgba(200,149,46,0.35)" : "rgba(200,149,46,0.15)"}, transparent)` }} />
    {children}
  </motion.div>
);

interface Stats {
  totalUsers: number; totalTransactionsToday: number; totalVolumeToday: number;
  pendingKyc: number; frozenWallets: number; activeWallets: number;
  totalBalance: number; newUsersToday: number; totalTransactionsAll: number;
  successRate: number; teens: number; parents: number;
  failedToday: number; avgTxnValue: number; activeLinks: number;
  newUsersYesterday: number; totalVolume: number;
  categoryBreakdown: { name: string; value: number; color: string }[];
  topUsers: { name: string; volume: number; txns: number }[];
  totalRewards: number; openTickets: number; totalSavingsGoals: number; totalChores: number;
}

interface Transaction {
  id: string; type: string; amount: number; merchant_name: string | null;
  status: string | null; created_at: string | null; wallet_id: string; category: string | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalTransactionsToday: 0, totalVolumeToday: 0,
    pendingKyc: 0, frozenWallets: 0, activeWallets: 0, totalBalance: 0,
    newUsersToday: 0, totalTransactionsAll: 0, successRate: 0, teens: 0, parents: 0,
    failedToday: 0, avgTxnValue: 0, activeLinks: 0, newUsersYesterday: 0, totalVolume: 0,
    categoryBreakdown: [], topUsers: [], totalRewards: 0, openTickets: 0,
    totalSavingsGoals: 0, totalChores: 0,
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
  const [uptime, setUptime] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "operations">("overview");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening");
    setUptime(Date.now());
  }, []);

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const [usersRes, txnsTodayRes, kycRes, walletsRes, allTxnsRes, linksRes, kycPendingRes, rewardsRes, ticketsRes, goalsRes, choresRes] = await Promise.all([
      supabase.from("profiles").select("id, created_at, role, full_name, phone"),
      supabase.from("transactions").select("*").gte("created_at", today),
      supabase.from("kyc_requests").select("id").eq("status", "pending"),
      supabase.from("wallets").select("id, balance, is_frozen, user_id"),
      supabase.from("transactions").select("id, status, merchant_name, amount, type, created_at, category, wallet_id").order("created_at", { ascending: false }).limit(500),
      supabase.from("parent_teen_links").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("kyc_requests").select("id, user_id, aadhaar_name, submitted_at, status").eq("status", "pending").order("submitted_at", { ascending: false }).limit(5),
      supabase.from("rewards").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("savings_goals").select("id", { count: "exact", head: true }),
      supabase.from("chores").select("id", { count: "exact", head: true }).eq("status", "pending"),
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

    const catMap: Record<string, number> = {};
    const catColors: Record<string, string> = { food: C.warning, shopping: C.info, transport: C.cyan, entertainment: C.secondary, education: C.success, other: C.primary };
    allTxns.forEach((t: any) => { const cat = t.category || "other"; catMap[cat] = (catMap[cat] || 0) + t.amount; });
    const categoryBreakdown = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, value]) => ({ name, value, color: catColors[name] || C.secondary }));

    const topUsers = wallets.sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0)).slice(0, 5)
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
      totalRewards: rewardsRes.count || 0, openTickets: ticketsRes.count || 0,
      totalSavingsGoals: goalsRes.count || 0, totalChores: choresRes.count || 0,
    });

    setKycRequests(kycPendingRes.data || []);
    setLiveTxns(allTxns.slice(0, 20) as Transaction[]);

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
      days.push({ day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), volume: dayTxns.reduce((s: number, t: any) => s + t.amount, 0) / 100, count: dayTxns.length });
    }
    setDailyVolume(days);

    const growth: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      growth.push({ day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), users: allUsers.filter((u: any) => u.created_at?.startsWith(dateStr)).length });
    }
    setUserGrowth(growth);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

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
  }, [fetchStats]);

  const handleRefresh = async () => { setRefreshing(true); await fetchStats(); setTimeout(() => setRefreshing(false), 600); };
  const fmtAmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;
  const totalStatusCount = statusBreakdown.reduce((s, d) => s + d.value, 0);
  const handleApproveKyc = async (id: string) => {
    await supabase.from("kyc_requests").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", id);
    fetchStats();
  };
  const getUptime = () => { if (!uptime) return "0m"; const mins = Math.floor((Date.now() - uptime) / 60000); return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`; };

  const tooltipStyle = { background: "rgba(18,20,24,0.95)", border: "1px solid rgba(200,149,46,0.1)", borderRadius: 14, color: "#fff", fontSize: 11, boxShadow: "0 16px 48px rgba(0,0,0,0.6)" };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 lg:p-8 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-32 rounded-[20px] overflow-hidden border border-border/20" style={{ background: "rgba(13,14,18,0.7)" }}>
                <div className="h-full w-full" style={{
                  background: "linear-gradient(110deg, transparent 40%, rgba(200,149,46,0.06) 50%, transparent 60%)",
                  backgroundSize: "200% 100%", animation: "shimmer-card 1.8s ease-in-out infinite",
                }} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const signupChange = stats.newUsersYesterday > 0 ? Math.round(((stats.newUsersToday - stats.newUsersYesterday) / stats.newUsersYesterday) * 100) : 0;
  const failureRate = stats.totalTransactionsToday > 0 ? Math.round((stats.failedToday / stats.totalTransactionsToday) * 100) : 0;
  const sparkData = dailyVolume.map(d => d.volume);

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Layers },
    { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { key: "operations" as const, label: "Operations", icon: Zap },
  ];

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6 relative min-h-full">
        {/* Ambient orbs */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.03] blur-[150px]" style={{ background: `radial-gradient(circle, ${C.primary}, transparent)` }} />
        <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.02] blur-[100px]" style={{ background: `radial-gradient(circle, ${C.secondary}, transparent)` }} />

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring" as const, stiffness: 200, damping: 22 }}
          className="relative rounded-[22px] overflow-hidden border border-primary/[0.14]"
          style={{ background: `linear-gradient(135deg, rgba(200,149,46,0.1) 0%, rgba(13,14,18,0.9) 40%, rgba(200,149,46,0.05) 100%)`, backdropFilter: "blur(24px)" }}
        >
          <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.35), transparent)" }} />
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(200,149,46,0.12), transparent)", animation: "float-up 6s ease-in-out infinite" }} />

          <div className="relative p-5 lg:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80 font-sora">{greeting}</span>
              </div>
              <h1 className="text-xl lg:text-[26px] font-bold tracking-tight text-foreground font-sora">Command Center</h1>
              <p className="text-xs mt-1.5 flex items-center gap-3 text-muted-foreground/50 font-sora">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="flex items-center gap-1 text-success"><Signal className="w-3 h-3" /> Live</span>
                <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {getUptime()}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button whileTap={{ scale: 0.92 }} onClick={handleRefresh} className="p-2.5 rounded-[14px] border border-border/30 text-muted-foreground bg-muted/20">
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.96 }} className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-xs font-semibold gradient-primary text-primary-foreground shadow-[0_4px_20px_rgba(200,149,46,0.3)] font-sora">
                <Download className="w-3.5 h-3.5" /> Export
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-1 p-1 rounded-[16px] bg-muted/10 border border-border/20"
        >
          {tabs.map(tab => (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-medium flex-1 justify-center font-sora transition-all ${
                activeTab === tab.key ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground/50 border border-transparent"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ══════ OVERVIEW ══════ */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Primary KPIs */}
              <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Total Users" value={stats.totalUsers} icon={Users} trend={`+${stats.newUsersToday}`} trendUp color={C.info} subtitle="Registered" />
                <StatCard label="Active Teens" value={stats.teens} icon={UserPlus} trend={`${stats.parents} parents`} trendUp color={C.success} />
                <StatCard label="Volume Today" value={fmtAmt(stats.totalVolumeToday)} icon={DollarSign} color={C.primary} subtitle="Successful" />
                <StatCard label="Txns Today" value={stats.totalTransactionsToday} icon={ArrowLeftRight} trend={`${stats.successRate}%`} trendUp={stats.successRate > 90} color={C.cyan} subtitle="Success rate" />
                <StatCard label="Pending KYC" value={stats.pendingKyc} icon={ShieldCheck} trend="review" trendUp={false} color={C.warning} onClick={() => navigate("/admin/kyc")} />
                <StatCard label="Failed Txns" value={stats.failedToday} icon={AlertTriangle} trend={`${failureRate}%`} trendUp={false} color={C.danger} subtitle="Failure rate" />
              </motion.div>

              {/* Revenue + Secondary */}
              <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Widget highlight glow className="lg:col-span-1">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center gradient-primary">
                        <Wallet className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/40 font-sora">Platform Balance</p>
                        <p className="text-lg font-bold font-mono text-foreground">
                          <Counter value={Math.round(stats.totalBalance / 100)} prefix="₹" />
                        </p>
                      </div>
                    </div>
                    <MiniSparkline data={sparkData.length > 0 ? sparkData : [0,1,2,1,3]} color={C.primary} height={32} />
                  </div>
                </Widget>
                <StatCard label="New Signups" value={stats.newUsersToday} icon={Flame} trend={`${signupChange > 0 ? "+" : ""}${signupChange}%`} trendUp={signupChange >= 0} color={C.info} subtitle="vs yesterday" />
                <StatCard label="Avg Txn" value={fmtAmt(stats.avgTxnValue)} icon={CreditCard} color={C.cyan} />
                <StatCard label="Active Rewards" value={stats.totalRewards} icon={Gift} color={C.secondary} subtitle="Live offers" onClick={() => navigate("/admin/rewards")} />
                <StatCard label="Open Tickets" value={stats.openTickets} icon={Heart} color={stats.openTickets > 5 ? C.danger : C.success} subtitle="Support" onClick={() => navigate("/admin/support")} />
              </motion.div>

              {/* Charts */}
              <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Widget glow className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground font-sora">
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-primary/10 border border-primary/20">
                        <BarChart3 className="w-4 h-4 text-primary" />
                      </div>
                      Transaction Volume
                      <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono">30D</span>
                    </h3>
                    <span className="text-[10px] font-bold font-mono text-foreground">{fmtAmt(stats.totalVolume)}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={dailyVolume}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.primary} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,149,46,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="volume" stroke={C.primary} fill="url(#volGrad)" strokeWidth={2.5} dot={{ r: 2, fill: C.primary, strokeWidth: 0 }} activeDot={{ r: 5, fill: C.primary, stroke: "#0a0c0f", strokeWidth: 2 }} animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Widget>

                <Widget>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-foreground font-sora">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-success/10 border border-success/20">
                      <Percent className="w-4 h-4 text-success" />
                    </div>
                    Status
                  </h3>
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={statusBreakdown.length > 0 ? statusBreakdown : [{ name: "No data", value: 1, color: "rgba(255,255,255,0.05)" }]} cx="50%" cy="50%" innerRadius={52} outerRadius={72} dataKey="value" paddingAngle={statusBreakdown.length > 1 ? 4 : 0} strokeWidth={0}>
                            {(statusBreakdown.length > 0 ? statusBreakdown : [{ color: "rgba(255,255,255,0.05)" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-xl font-bold font-mono text-foreground">{totalStatusCount}</p>
                        <p className="text-[9px] text-muted-foreground/40 font-sora">Today</p>
                      </div>
                    </div>
                    <div className="w-full space-y-2">
                      {statusBreakdown.map(d => (
                        <div key={d.name} className="flex items-center justify-between px-3 py-2 rounded-[10px] transition-all" style={{ background: `${d.color}08` }}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}50` }} />
                            <span className="text-[11px] font-medium text-muted-foreground/70 font-sora">{d.name}</span>
                          </div>
                          <span className="text-xs font-bold font-mono text-foreground">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Widget>
              </motion.div>

              {/* User Growth + Categories + Live Feed */}
              <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Widget glow>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-foreground font-sora">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-primary/10 border border-primary/20">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    User Growth <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">30D</span>
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={userGrowth}>
                      <defs>
                        <linearGradient id="userGrowthG2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.primary} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,149,46,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} interval={6} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="users" stroke={C.primary} fill="url(#userGrowthG2)" strokeWidth={2} dot={false} animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Widget>

                {/* Category Breakdown */}
                <Widget>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-foreground font-sora">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-secondary/10 border border-secondary/20">
                      <Target className="w-4 h-4" style={{ color: C.secondary }} />
                    </div>
                    Categories
                  </h3>
                  <div className="space-y-2.5">
                    {stats.categoryBreakdown.map((cat, i) => {
                      const maxVal = Math.max(...stats.categoryBreakdown.map(c => c.value), 1);
                      return (
                        <motion.div
                          key={cat.name}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.06 }}
                          className="space-y-1"
                        >
                          <div className="flex justify-between text-[11px]">
                            <span className="capitalize text-muted-foreground/60 font-sora">{cat.name}</span>
                            <span className="font-bold font-mono text-foreground">{fmtAmt(cat.value)}</span>
                          </div>
                          <div className="h-[5px] rounded-full bg-muted/20 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(cat.value / maxVal) * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.4 + i * 0.06 }}
                              className="h-full rounded-full"
                              style={{ background: cat.color, boxShadow: `0 0 8px ${cat.color}40` }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                    {stats.categoryBreakdown.length === 0 && (
                      <p className="text-[11px] text-muted-foreground/30 text-center py-6 font-sora">No category data yet</p>
                    )}
                  </div>
                </Widget>

                {/* Live Feed */}
                <Widget noPadding>
                  <div className="p-4 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground font-sora">
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-primary/10 border border-primary/20">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      Live Feed
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" style={{ boxShadow: "0 0 6px rgba(34,197,94,0.6)" }} />
                      <span className="text-[9px] font-bold text-success font-mono">LIVE</span>
                    </div>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto px-3 pb-3 space-y-0.5">
                    {liveTxns.slice(0, 12).map((tx, i) => {
                      const statusColor = tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning;
                      const timeAgo = tx.created_at ? (() => {
                        const diff = Date.now() - new Date(tx.created_at).getTime();
                        if (diff < 60000) return "now";
                        if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
                        if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
                        return `${Math.round(diff / 86400000)}d`;
                      })() : "—";
                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.03, type: "spring" as const, stiffness: 300, damping: 24 }}
                          className="flex items-center gap-3 p-2.5 rounded-[10px] hover:bg-muted/10 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${tx.type === "credit" ? C.success : C.danger}10` }}>
                            {tx.type === "credit" ? <ArrowDownRight className="w-3.5 h-3.5" style={{ color: C.success }} /> : <ArrowUpRight className="w-3.5 h-3.5" style={{ color: C.danger }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate text-foreground font-sora">{tx.merchant_name || tx.type}</p>
                            <p className="text-[9px] text-muted-foreground/40 font-sora">{timeAgo} · {tx.category || "—"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[12px] font-bold font-mono" style={{ color: tx.type === "credit" ? C.success : undefined }}>
                              {tx.type === "credit" ? "+" : "-"}{fmtAmt(tx.amount)}
                            </p>
                            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full font-sora" style={{ background: `${statusColor}12`, color: statusColor }}>{tx.status}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Widget>
              </motion.div>

              {/* KYC + System Health */}
              <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* KYC */}
                <Widget>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground font-sora">
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-warning/10 border border-warning/20">
                        <ShieldCheck className="w-4 h-4 text-warning" />
                      </div>
                      Pending KYC
                      {stats.pendingKyc > 0 && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono">{stats.pendingKyc}</span>}
                    </h3>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/admin/kyc")} className="text-[11px] font-medium text-primary px-3 py-1.5 rounded-[10px] bg-primary/[0.06] font-sora">
                      View All <ArrowUpRight className="w-3 h-3 inline" />
                    </motion.button>
                  </div>
                  {kycRequests.length === 0 ? (
                    <div className="flex flex-col items-center py-6 gap-2">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                      <p className="text-sm font-medium text-success font-sora">All clear!</p>
                      <p className="text-[11px] text-muted-foreground/40 font-sora">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {kycRequests.map((kyc: any, i: number) => (
                        <motion.div
                          key={kyc.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center justify-between p-3 rounded-[12px] bg-muted/10 border border-border/20 hover:border-warning/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold bg-warning/10 text-warning">{kyc.aadhaar_name?.charAt(0) || "?"}</div>
                            <div>
                              <p className="text-[12px] font-medium text-foreground font-sora">{kyc.aadhaar_name || "Unknown"}</p>
                              <p className="text-[9px] text-muted-foreground/40 font-sora">{kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString("en-IN") : "—"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleApproveKyc(kyc.id)} className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-success text-white"><CheckCircle2 className="w-4 h-4" /></motion.button>
                            <motion.button whileTap={{ scale: 0.85 }} className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-destructive text-white"><XCircle className="w-4 h-4" /></motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Widget>

                {/* System Health */}
                <Widget>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-foreground font-sora">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-success/10 border border-success/20">
                      <Shield className="w-4 h-4 text-success" />
                    </div>
                    System Health
                    <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success font-sora">All Operational</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: "Database", status: "OK", icon: Database, ok: true },
                      { label: "Auth", status: "OK", icon: Shield, ok: true },
                      { label: "Payments", status: "Active", icon: Globe, ok: true },
                      { label: "KYC", status: stats.pendingKyc > 5 ? "Backlog" : "OK", icon: Cpu, ok: stats.pendingKyc <= 5 },
                      { label: "Functions", status: "Running", icon: Server, ok: true },
                      { label: "Realtime", status: "Live", icon: Wifi, ok: true },
                    ].map((h, i) => (
                      <motion.div
                        key={h.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className="flex items-center gap-2 p-2.5 rounded-[10px] bg-muted/10 border border-border/20 hover:border-success/20 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: `${h.ok ? C.success : C.warning}10` }}>
                          <h.icon className="w-3 h-3" style={{ color: h.ok ? C.success : C.warning }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-foreground truncate font-sora">{h.label}</p>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: h.ok ? C.success : C.warning, boxShadow: `0 0 4px ${h.ok ? C.success : C.warning}` }} />
                            <p className="text-[8px] font-semibold font-sora" style={{ color: h.ok ? C.success : C.warning }}>{h.status}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Widget>
              </motion.div>
            </motion.div>
          )}

          {/* ══════ ANALYTICS ══════ */}
          {activeTab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <motion.div variants={staggerParent} initial="hidden" animate="show">
                <Widget highlight glow>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-5 text-foreground font-sora">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-primary/10 border border-primary/20">
                      <Gauge className="w-4 h-4 text-primary" />
                    </div>
                    Performance Metrics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
                    <PerformanceGauge value={stats.successRate} label="Success" color={C.success} />
                    <PerformanceGauge value={100 - failureRate} label="Reliability" color={C.info} />
                    <PerformanceGauge value={stats.activeWallets > 0 ? Math.min(Math.round((stats.totalTransactionsAll / stats.activeWallets) * 10), 100) : 0} label="Engagement" color={C.primary} />
                    <PerformanceGauge value={stats.totalUsers > 0 ? Math.min(Math.round((stats.activeWallets / stats.totalUsers) * 100), 100) : 0} label="Adoption" color={C.secondary} />
                  </div>
                </Widget>
              </motion.div>

              <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Widget glow>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-foreground font-sora">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.cyan}12`, border: `1px solid ${C.cyan}20` }}>
                      <BarChart3 className="w-4 h-4" style={{ color: C.cyan }} />
                    </div>
                    Daily Transaction Count
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dailyVolume} barCategoryGap="15%">
                      <defs>
                        <linearGradient id="countBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.cyan} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={C.cyan} stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,149,46,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="url(#countBarGrad)" radius={[6, 6, 2, 2]} animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </Widget>

                <Widget glow>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-foreground font-sora">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-success/10 border border-success/20">
                      <TrendingUp className="w-4 h-4 text-success" />
                    </div>
                    Volume Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={dailyVolume}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,149,46,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="volume" stroke={C.success} strokeWidth={2.5} dot={{ r: 2.5, fill: C.success, strokeWidth: 0 }} activeDot={{ r: 5, fill: C.success, stroke: "#0a0c0f", strokeWidth: 2 }} animationDuration={1500} />
                    </LineChart>
                  </ResponsiveContainer>
                </Widget>
              </motion.div>

              <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Volume" value={fmtAmt(stats.totalVolume)} icon={DollarSign} color={C.primary} />
                <StatCard label="All Transactions" value={stats.totalTransactionsAll} icon={ArrowLeftRight} color={C.cyan} />
                <StatCard label="Savings Goals" value={stats.totalSavingsGoals} icon={PiggyBank} color={C.success} onClick={() => navigate("/admin/savings-oversight")} />
                <StatCard label="Pending Chores" value={stats.totalChores} icon={Award} color={C.warning} />
              </motion.div>
            </motion.div>
          )}

          {/* ══════ OPERATIONS ══════ */}
          {activeTab === "operations" && (
            <motion.div key="operations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Frozen Wallets" value={stats.frozenWallets} icon={AlertTriangle} color={C.danger} onClick={() => navigate("/admin/wallets")} />
                <StatCard label="Active Wallets" value={stats.activeWallets} icon={Wallet} color={C.success} />
                <StatCard label="Parent-Teen" value={stats.activeLinks} icon={Users} color={C.info} onClick={() => navigate("/admin/parent-links")} />
                <StatCard label="Open Tickets" value={stats.openTickets} icon={Heart} color={stats.openTickets > 5 ? C.danger : C.success} onClick={() => navigate("/admin/support")} />
              </motion.div>

              <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Timeline */}
                <Widget glow>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-foreground font-sora">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-primary/10 border border-primary/20">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    Activity Timeline
                  </h3>
                  <div className="space-y-0 max-h-[360px] overflow-y-auto">
                    {liveTxns.slice(0, 10).map((tx, i) => {
                      const timeAgo = tx.created_at ? (() => {
                        const diff = Date.now() - new Date(tx.created_at).getTime();
                        if (diff < 60000) return "Just now";
                        if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
                        return `${Math.round(diff / 3600000)}h ago`;
                      })() : "—";
                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex gap-3 relative pl-6 py-3"
                        >
                          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border/20" style={{ display: i < 9 ? "block" : "none" }} />
                          <div className="absolute left-[6px] top-4 w-[12px] h-[12px] rounded-full" style={{
                            background: `${tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning}20`,
                            border: `2px solid ${tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning}`,
                          }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-medium text-foreground font-sora">{tx.type === "credit" ? "Credit" : "Debit"} · {tx.merchant_name || "Transaction"}</p>
                              <span className="text-[10px] text-muted-foreground/40 font-sora">{timeAgo}</span>
                            </div>
                            <p className="text-[10px] mt-0.5 text-muted-foreground/40 font-sora">
                              <span className="font-mono">{fmtAmt(tx.amount)}</span> · {tx.category || "—"} ·
                              <span style={{ color: tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning }}> {tx.status}</span>
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Widget>

                {/* Operations Hub */}
                <div className="space-y-4">
                  <motion.div variants={staggerChild}>
                    <Widget>
                      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-foreground font-sora">
                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.secondary}12`, border: `1px solid ${C.secondary}20` }}>
                          <Rocket className="w-4 h-4" style={{ color: C.secondary }} />
                        </div>
                        Operations Hub
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Spending Limits", desc: "Set & manage", icon: Target, path: "/admin/spending-limits", color: C.warning },
                          { label: "Pocket Money", desc: "Schedules", icon: Calendar, path: "/admin/pocket-money", color: C.success },
                          { label: "Refunds", desc: "Disputes", icon: RefreshCw, path: "/admin/refunds", color: C.danger },
                          { label: "Audit Logs", desc: "Admin activity", icon: Eye, path: "/admin/audit-log", color: C.info },
                          { label: "Payouts", desc: "Settlements", icon: DollarSign, path: "/admin/payouts", color: C.primary },
                          { label: "API Health", desc: "Services", icon: Server, path: "/admin/health", color: C.cyan },
                        ].map(op => (
                          <motion.button
                            key={op.label}
                            whileTap={{ scale: 0.96 }}
                            whileHover={{ y: -1 }}
                            onClick={() => navigate(op.path)}
                            className="flex items-center gap-3 p-3 rounded-[12px] bg-muted/10 border border-border/20 text-left hover:border-primary/20 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${op.color}12` }}>
                              <op.icon className="w-4 h-4" style={{ color: op.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-foreground font-sora">{op.label}</p>
                              <p className="text-[9px] text-muted-foreground/40 font-sora">{op.desc}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </Widget>
                  </motion.div>

                  <motion.div variants={staggerChild}>
                    <Widget>
                      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-foreground font-sora">
                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-info/10 border border-info/20">
                          <MonitorSmartphone className="w-4 h-4" style={{ color: C.info }} />
                        </div>
                        Platform Snapshot
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: "Total Users", value: stats.totalUsers, color: C.info },
                          { label: "Active Wallets", value: stats.activeWallets, color: C.success },
                          { label: "KYC Completion", value: `${stats.totalUsers > 0 ? Math.round(((stats.totalUsers - stats.pendingKyc) / stats.totalUsers) * 100) : 0}%`, color: C.primary },
                          { label: "Parent-Teen Coverage", value: `${stats.activeLinks} linked`, color: C.secondary },
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between py-2 px-1 border-b border-border/10">
                            <span className="text-[11px] text-muted-foreground/60 font-sora">{item.label}</span>
                            <span className="text-[12px] font-bold font-mono" style={{ color: item.color }}>
                              {typeof item.value === "number" ? item.value.toLocaleString("en-IN") : item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Widget>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
