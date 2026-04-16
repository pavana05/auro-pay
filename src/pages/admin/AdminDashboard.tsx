import { useEffect, useState, useCallback } from "react";
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
  CheckCircle2, XCircle, Timer, Gauge, Heart,
  Signal, Wifi, HardDrive, MemoryStick, MonitorSmartphone,
  Calendar, TrendingDown, Layers, Award, Rocket,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, AreaChart, Area, CartesianGrid, LineChart, Line, RadialBarChart, RadialBar,
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

const CHART_COLORS = [C.primary, C.secondary, C.cyan, C.warning, C.success, C.info];

/* ── CSS keyframes injected once ── */
const styleId = "admin-dash-premium-v2";
if (!document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes admin-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes admin-pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.5);opacity:0} }
    @keyframes admin-gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    @keyframes admin-counter-pop { 0%{transform:scale(1)} 50%{transform:scale(1.05)} 100%{transform:scale(1)} }
    @keyframes admin-border-glow { 0%,100%{border-color:rgba(200,149,46,0.1)} 50%{border-color:rgba(200,149,46,0.25)} }
    @keyframes admin-card-entrance { 0%{opacity:0;transform:translateY(16px) scale(0.97)} 100%{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes admin-sparkle { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
    @keyframes admin-status-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }
    @keyframes admin-shimmer-line { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
    .admin-card-hover:hover { transform: translateY(-2px); box-shadow: 0 16px 48px rgba(0,0,0,0.4), 0 0 80px rgba(200,149,46,0.06) !important; }
    .admin-scrollbar::-webkit-scrollbar { width: 4px; }
    .admin-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .admin-scrollbar::-webkit-scrollbar-thumb { background: rgba(200,149,46,0.15); border-radius: 4px; }
    .admin-number-highlight { animation: admin-counter-pop 0.4s ease-out; }
  `;
  document.head.appendChild(style);
}

interface Stats {
  totalUsers: number; totalTransactionsToday: number; totalVolumeToday: number;
  pendingKyc: number; frozenWallets: number; activeWallets: number;
  totalBalance: number; newUsersToday: number; totalTransactionsAll: number;
  successRate: number; teens: number; parents: number;
  failedToday: number; avgTxnValue: number; activeLinks: number;
  newUsersYesterday: number; totalVolume: number;
  categoryBreakdown: { name: string; value: number; color: string }[];
  topUsers: { name: string; volume: number; txns: number }[];
  totalRewards: number; openTickets: number; totalSavingsGoals: number;
  totalChores: number;
}

interface Transaction {
  id: string; type: string; amount: number; merchant_name: string | null;
  status: string | null; created_at: string | null; wallet_id: string; category: string | null;
}

/* ── Animated Counter ── */
const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1400;
    const start = performance.now();
    const from = display;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span className="admin-number-highlight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{prefix}{display.toLocaleString("en-IN")}{suffix}</span>;
};

/* ── Widget Card with premium glass effect ── */
const WidgetCard = ({ children, className = "", delay = 0, noPadding = false, glow = false, highlight = false }: {
  children: React.ReactNode; className?: string; delay?: number; noPadding?: boolean; glow?: boolean; highlight?: boolean;
}) => (
  <div
    className={`relative rounded-[20px] overflow-hidden admin-card-hover transition-all duration-500 ${!noPadding ? "p-5" : ""} ${className}`}
    style={{
      background: highlight
        ? `linear-gradient(135deg, rgba(200,149,46,0.08), rgba(13,14,18,0.85))`
        : C.cardBg,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1px solid ${highlight ? "rgba(200,149,46,0.18)" : C.border}`,
      boxShadow: glow
        ? `inset 0 1px 0 rgba(200,149,46,0.08), 0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(200,149,46,0.05)`
        : `inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.2)`,
      animation: `admin-card-entrance 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
    }}
  >
    {/* Top shine line */}
    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.2), transparent)" }} />
    {/* Shimmer sweep on hover */}
    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div className="absolute top-0 bottom-0 w-24" style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.03), transparent)", animation: "admin-shimmer-line 3s ease-in-out infinite" }} />
    </div>
    {children}
  </div>
);

/* ── Stat Card with animated accent ── */
const StatCard = ({ label, value, icon: Icon, trend, trendUp, accentColor, delay, onClick, subtitle }: any) => (
  <WidgetCard delay={delay} className="cursor-pointer group" glow={false}>
    <div onClick={onClick} className="relative">
      <div className="flex items-center justify-between mb-3">
        <div className="w-11 h-11 rounded-[14px] flex items-center justify-center relative transition-transform duration-300 group-hover:scale-110" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}20` }}>
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
          <div className="absolute inset-0 rounded-[14px]" style={{ background: `radial-gradient(circle at center, ${accentColor}10, transparent)` }} />
        </div>
        {trend && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-0.5 transition-all duration-300" style={{
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
      <p className="text-[11px] font-medium mt-1.5" style={{ color: C.textMuted }}>{label}</p>
      {subtitle && <p className="text-[9px] mt-0.5" style={{ color: `${accentColor}80` }}>{subtitle}</p>}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-all duration-300 group-hover:w-[4px]" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}40)` }} />
    </div>
  </WidgetCard>
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
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 44 44)" style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)" }} />
        <text x="44" y="40" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{value}%</text>
        <text x="44" y="54" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">{label}</text>
      </svg>
    </div>
  );
};

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
      totalRewards: rewardsRes.count || 0,
      openTickets: ticketsRes.count || 0,
      totalSavingsGoals: goalsRes.count || 0,
      totalChores: choresRes.count || 0,
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

  const getUptime = () => {
    if (!uptime) return "0m";
    const diff = Date.now() - uptime;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 lg:p-8 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-32 rounded-[20px] relative overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(200,149,46,0.04) 50%, transparent 100%)",
                  animation: "admin-shimmer-line 1.5s ease-in-out infinite",
                }} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${C.primary}30`, borderTopColor: C.primary }} />
              <p className="text-xs" style={{ color: C.textMuted }}>Loading dashboard...</p>
            </div>
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
        <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.03]" style={{ background: `radial-gradient(circle, ${C.primary}, transparent)`, filter: "blur(150px)" }} />
        <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.02]" style={{ background: `radial-gradient(circle, ${C.secondary}, transparent)`, filter: "blur(100px)" }} />

        {/* ── Welcome Banner ── */}
        <div className="relative rounded-[22px] overflow-hidden" style={{ animation: "admin-card-entrance 0.5s cubic-bezier(0.16,1,0.3,1)" }}>
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, rgba(200,149,46,0.1) 0%, rgba(13,14,18,0.9) 40%, rgba(200,149,46,0.05) 100%)`,
            backdropFilter: "blur(24px)",
          }} />
          <div className="absolute inset-0 rounded-[22px]" style={{ border: `1px solid rgba(200,149,46,0.14)` }} />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.35), transparent)" }} />
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full" style={{ background: `radial-gradient(circle, rgba(200,149,46,0.12), transparent)`, animation: "admin-float 6s ease-in-out infinite" }} />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full" style={{ background: `radial-gradient(circle, rgba(200,149,46,0.06), transparent)`, animation: "admin-float 8s ease-in-out infinite reverse" }} />

          <div className="relative p-5 lg:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4" style={{ color: C.glow, animation: "admin-sparkle 3s ease-in-out infinite" }} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: C.secondary }}>{greeting}</span>
              </div>
              <h1 className="text-xl lg:text-[26px] font-bold tracking-tight" style={{ color: C.textPrimary }}>
                Command Center
              </h1>
              <p className="text-xs mt-1.5 flex items-center gap-3" style={{ color: C.textMuted }}>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Synced {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="flex items-center gap-1"><Signal className="w-3 h-3" style={{ color: C.success }} /> Live</span>
                <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> Uptime {getUptime()}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} className={`p-2.5 rounded-[14px] transition-all duration-300 ${refreshing ? "" : ""}`} style={{
                background: "rgba(200,149,46,0.06)", border: `1px solid ${C.border}`, color: C.textSecondary,
              }}>
                <RefreshCw className={`w-4 h-4 transition-transform duration-600 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-xs font-semibold transition-all duration-300 active:scale-[0.97]" style={{
                background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
                color: "#0a0c0f", boxShadow: `0 4px 20px rgba(200,149,46,0.3)`,
              }}>
                <Download className="w-3.5 h-3.5" /> Export Report
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex items-center gap-1 p-1 rounded-[16px]" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-medium transition-all duration-300 flex-1 justify-center"
              style={{
                background: activeTab === tab.key ? `linear-gradient(135deg, ${C.primary}20, ${C.primary}08)` : "transparent",
                color: activeTab === tab.key ? C.secondary : C.textMuted,
                border: activeTab === tab.key ? `1px solid ${C.primary}25` : "1px solid transparent",
              }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ══════ OVERVIEW TAB ══════ */}
        {activeTab === "overview" && (
          <>
            {/* Primary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total Users" value={stats.totalUsers} icon={Users} trend={`+${stats.newUsersToday}`} trendUp={true} accentColor={C.info} delay={80} subtitle="Registered accounts" />
              <StatCard label="Active Teens" value={stats.teens} icon={UserPlus} trend={`${stats.parents} parents`} trendUp={true} accentColor={C.success} delay={120} />
              <StatCard label="Volume Today" value={formatAmount(stats.totalVolumeToday)} icon={DollarSign} accentColor={C.primary} delay={160} subtitle="Successful txns" />
              <StatCard label="Txns Today" value={stats.totalTransactionsToday} icon={ArrowLeftRight} trend={`${stats.successRate}%`} trendUp={stats.successRate > 90} accentColor={C.cyan} delay={200} subtitle="Success rate" />
              <StatCard label="Pending KYC" value={stats.pendingKyc} icon={ShieldCheck} trend="review" trendUp={false} accentColor={C.warning} delay={240} onClick={() => navigate("/admin/kyc")} />
              <StatCard label="Failed Txns" value={stats.failedToday} icon={AlertTriangle} trend={`${failureRate}%`} trendUp={false} accentColor={C.danger} delay={280} subtitle="Failure rate" />
            </div>

            {/* Revenue + Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <WidgetCard delay={300} highlight glow className="lg:col-span-1">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>
                      <Wallet className="w-5 h-5" style={{ color: "#0a0c0f" }} />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider" style={{ color: C.textMuted }}>Platform Balance</p>
                      <p className="text-lg font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>
                        <AnimatedCounter value={Math.round(stats.totalBalance / 100)} prefix="₹" />
                      </p>
                    </div>
                  </div>
                  <MiniSparkline data={sparkData.length > 0 ? sparkData : [0,1,2,1,3]} color={C.primary} height={32} />
                </div>
              </WidgetCard>
              <StatCard label="New Signups" value={stats.newUsersToday} icon={Flame} trend={`${signupChange > 0 ? "+" : ""}${signupChange}%`} trendUp={signupChange >= 0} accentColor={C.info} delay={340} subtitle="vs yesterday" />
              <StatCard label="Avg Txn Value" value={formatAmount(stats.avgTxnValue)} icon={CreditCard} accentColor={C.cyan} delay={380} />
              <StatCard label="Active Rewards" value={stats.totalRewards} icon={Gift} accentColor={C.secondary} delay={420} subtitle="Live offers" onClick={() => navigate("/admin/rewards")} />
              <StatCard label="Open Tickets" value={stats.openTickets} icon={Heart} accentColor={stats.openTickets > 5 ? C.danger : C.success} delay={460} subtitle="Support queue" onClick={() => navigate("/admin/support")} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Transaction Volume */}
              <WidgetCard delay={500} className="lg:col-span-2" glow>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}20` }}>
                      <BarChart3 className="w-4 h-4" style={{ color: C.primary }} />
                    </div>
                    Transaction Volume
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full" style={{ background: `${C.primary}10`, color: C.secondary }}>30 Days</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatAmount(stats.totalVolume)}
                    </span>
                    <span className="text-[9px]" style={{ color: C.textMuted }}>total</span>
                  </div>
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
                    <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: `${C.primary}30` }} />
                    <Area type="monotone" dataKey="volume" stroke={C.primary} fill="url(#volGrad)" strokeWidth={2.5} dot={{ r: 2, fill: C.primary, strokeWidth: 0 }} activeDot={{ r: 5, fill: C.primary, stroke: "#0a0c0f", strokeWidth: 2 }} animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </WidgetCard>

              {/* Status Donut */}
              <WidgetCard delay={550}>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.success}12`, border: `1px solid ${C.success}20` }}>
                    <Percent className="w-4 h-4" style={{ color: C.success }} />
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
                      <p className="text-xl font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{totalStatusCount}</p>
                      <p className="text-[9px]" style={{ color: C.textMuted }}>Today</p>
                    </div>
                  </div>
                  <div className="w-full space-y-2">
                    {statusBreakdown.map(d => (
                      <div key={d.name} className="flex items-center justify-between px-3 py-2 rounded-[10px] transition-all duration-200" style={{ background: `${d.color}08` }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${d.color}14`)}
                        onMouseLeave={e => (e.currentTarget.style.background = `${d.color}08`)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}50` }} />
                          <span className="text-[11px] font-medium" style={{ color: C.textSecondary }}>{d.name}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </WidgetCard>
            </div>

            {/* User Growth + Categories + Top Wallets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <WidgetCard delay={600} glow>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}20` }}>
                    <TrendingUp className="w-4 h-4" style={{ color: C.primary }} />
                  </div>
                  User Growth
                  <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${C.primary}10`, color: C.secondary }}>30D</span>
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
                    <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} interval={6} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="users" stroke={C.primary} fill="url(#userGrowthG2)" strokeWidth={2.5} dot={{ r: 2, fill: C.primary, strokeWidth: 0 }} animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </WidgetCard>

              <WidgetCard delay={650}>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}20` }}>
                    <Target className="w-4 h-4" style={{ color: C.warning }} />
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
                        <div key={cat.name} className="group cursor-default">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium capitalize" style={{ color: C.textSecondary }}>{cat.name}</span>
                            <span className="text-[11px] font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{formatAmount(cat.value)}</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}80)`, boxShadow: `0 0 8px ${cat.color}30` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </WidgetCard>

              <WidgetCard delay={700}>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.secondary}12`, border: `1px solid ${C.secondary}20` }}>
                    <Crown className="w-4 h-4" style={{ color: C.secondary }} />
                  </div>
                  Top Wallets
                </h3>
                {stats.topUsers.length === 0 ? (
                  <p className="text-sm text-center py-10" style={{ color: C.textMuted }}>No wallet data</p>
                ) : (
                  <div className="space-y-2">
                    {stats.topUsers.map((u, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-[12px] transition-all duration-200 cursor-pointer"
                        style={{ background: i === 0 ? "rgba(200,149,46,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? "rgba(200,149,46,0.15)" : "transparent"}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,149,46,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? "rgba(200,149,46,0.06)" : "rgba(255,255,255,0.02)")}
                      >
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

            {/* Quick Actions */}
            <WidgetCard delay={750}>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}20` }}>
                  <Zap className="w-4 h-4" style={{ color: C.primary }} />
                </div>
                Quick Actions
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {[
                  { label: "KYC", icon: ShieldCheck, path: "/admin/kyc", color: C.warning },
                  { label: "Users", icon: Users, path: "/admin/users", color: C.info },
                  { label: "Wallets", icon: Wallet, path: "/admin/wallets", color: C.success },
                  { label: "Txns", icon: ArrowLeftRight, path: "/admin/transactions", color: C.primary },
                  { label: "Alerts", icon: Bell, path: "/admin/notifications", color: C.secondary },
                  { label: "Rewards", icon: Gift, path: "/admin/rewards", color: C.cyan },
                  { label: "Analytics", icon: BarChart3, path: "/admin/analytics", color: C.info },
                  { label: "Support", icon: Heart, path: "/admin/support", color: C.danger },
                  { label: "Revenue", icon: TrendingUp, path: "/admin/revenue", color: C.success },
                  { label: "Settings", icon: Globe, path: "/admin/settings", color: C.textSecondary },
                ].map((a) => (
                  <button key={a.label} onClick={() => navigate(a.path)}
                    className="flex flex-col items-center gap-2 p-3 rounded-[14px] transition-all duration-300 active:scale-95 group"
                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${a.color}40`; e.currentTarget.style.background = `${a.color}08`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: `${a.color}12`, border: `1px solid ${a.color}15` }}>
                      <a.icon className="w-4 h-4" style={{ color: a.color }} />
                    </div>
                    <span className="text-[9px] font-medium" style={{ color: C.textSecondary }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </WidgetCard>

            {/* Live Feed + KYC + Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WidgetCard delay={800} glow>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.success}12`, border: `1px solid ${C.success}20` }}>
                      <Activity className="w-4 h-4" style={{ color: C.success }} />
                    </div>
                    Live Feed
                    <span className="relative ml-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: C.success, boxShadow: `0 0 8px ${C.success}` }} />
                      <span className="absolute inset-0 w-2 h-2 rounded-full" style={{ background: C.success, animation: "admin-pulse-ring 2s ease-out infinite" }} />
                    </span>
                  </h3>
                  <button onClick={() => navigate("/admin/transactions")} className="text-[11px] font-medium flex items-center gap-1 transition-all duration-200 px-3 py-1.5 rounded-[10px]" style={{ color: C.primary, background: `${C.primary}08` }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${C.primary}15`)}
                    onMouseLeave={e => (e.currentTarget.style.background = `${C.primary}08`)}
                  >
                    View All <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-1 max-h-[380px] overflow-y-auto admin-scrollbar">
                  {liveTxns.length === 0 ? (
                    <p className="text-sm text-center py-10" style={{ color: C.textMuted }}>No transactions yet</p>
                  ) : liveTxns.map((tx, i) => {
                    const statusColor = tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning;
                    const timeAgo = tx.created_at ? (() => {
                      const diff = Date.now() - new Date(tx.created_at).getTime();
                      if (diff < 60000) return "Just now";
                      if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
                      if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
                      return `${Math.round(diff / 86400000)}d`;
                    })() : "—";
                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-[10px] transition-all duration-200 cursor-pointer"
                        style={{ animation: `admin-card-entrance 0.3s ease-out ${i * 20}ms both` }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,149,46,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${tx.type === "credit" ? C.success : C.danger}10` }}>
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
                  })}
                </div>
              </WidgetCard>

              <div className="space-y-4">
                {/* KYC */}
                <WidgetCard delay={850}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}20` }}>
                        <ShieldCheck className="w-4 h-4" style={{ color: C.warning }} />
                      </div>
                      Pending KYC
                      {stats.pendingKyc > 0 && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${C.danger}15`, color: C.danger }}>{stats.pendingKyc}</span>
                      )}
                    </h3>
                    <button onClick={() => navigate("/admin/kyc")} className="text-[11px] font-medium flex items-center gap-1 px-3 py-1.5 rounded-[10px]" style={{ color: C.primary, background: `${C.primary}08` }}>
                      View All <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  {kycRequests.length === 0 ? (
                    <div className="flex flex-col items-center py-6 gap-2">
                      <CheckCircle2 className="w-8 h-8" style={{ color: C.success }} />
                      <p className="text-sm font-medium" style={{ color: C.success }}>All clear!</p>
                      <p className="text-[11px]" style={{ color: C.textMuted }}>No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {kycRequests.map((kyc: any) => (
                        <div key={kyc.id} className="flex items-center justify-between p-3 rounded-[12px] transition-all duration-200" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = `${C.warning}25`)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                        >
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
                            <button onClick={() => handleApproveKyc(kyc.id)} className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white transition-all duration-200 active:scale-90" style={{ background: C.success }}>
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white transition-all duration-200 active:scale-90" style={{ background: C.danger }}>
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </WidgetCard>

                {/* System Health */}
                <WidgetCard delay={900}>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.success}12`, border: `1px solid ${C.success}20` }}>
                      <Shield className="w-4 h-4" style={{ color: C.success }} />
                    </div>
                    System Health
                    <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${C.success}10`, color: C.success }}>All Systems Operational</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: "Database", status: "OK", icon: Database, ok: true },
                      { label: "Auth", status: "OK", icon: Shield, ok: true },
                      { label: "Payments", status: "Active", icon: Globe, ok: true },
                      { label: "KYC", status: stats.pendingKyc > 5 ? "Backlog" : "OK", icon: Cpu, ok: stats.pendingKyc <= 5 },
                      { label: "Functions", status: "Running", icon: Server, ok: true },
                      { label: "Realtime", status: "Live", icon: Wifi, ok: true },
                    ].map((h) => (
                      <div key={h.label} className="flex items-center gap-2 p-2.5 rounded-[10px] transition-all duration-200" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = h.ok ? `${C.success}25` : `${C.warning}25`)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                      >
                        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: h.ok ? `${C.success}10` : `${C.warning}10` }}>
                          <h.icon className="w-3 h-3" style={{ color: h.ok ? C.success : C.warning }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium truncate" style={{ color: C.textPrimary }}>{h.label}</p>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: h.ok ? C.success : C.warning, boxShadow: `0 0 4px ${h.ok ? C.success : C.warning}`, animation: h.ok ? "admin-status-pulse 2s ease-in-out infinite" : "none" }} />
                            <p className="text-[8px] font-semibold" style={{ color: h.ok ? C.success : C.warning }}>{h.status}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </WidgetCard>
              </div>
            </div>
          </>
        )}

        {/* ══════ ANALYTICS TAB ══════ */}
        {activeTab === "analytics" && (
          <>
            {/* Performance Gauges */}
            <WidgetCard delay={100} glow highlight>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-5" style={{ color: C.textPrimary }}>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}20` }}>
                  <Gauge className="w-4 h-4" style={{ color: C.primary }} />
                </div>
                Performance Metrics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
                <PerformanceGauge value={stats.successRate} label="Success" color={C.success} />
                <PerformanceGauge value={100 - failureRate} label="Reliability" color={C.info} />
                <PerformanceGauge value={stats.activeWallets > 0 ? Math.min(Math.round((stats.totalTransactionsAll / stats.activeWallets) * 10), 100) : 0} label="Engagement" color={C.primary} />
                <PerformanceGauge value={stats.totalUsers > 0 ? Math.min(Math.round((stats.activeWallets / stats.totalUsers) * 100), 100) : 0} label="Adoption" color={C.secondary} />
              </div>
            </WidgetCard>

            {/* Detailed Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WidgetCard delay={200} glow>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
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
                    <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(6,182,212,0.04)" }} />
                    <Bar dataKey="count" fill="url(#countBarGrad)" radius={[6, 6, 2, 2]} animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              </WidgetCard>

              <WidgetCard delay={250} glow>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.success}12`, border: `1px solid ${C.success}20` }}>
                    <TrendingUp className="w-4 h-4" style={{ color: C.success }} />
                  </div>
                  Volume Trend
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,149,46,0.05)" />
                    <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="volume" stroke={C.success} strokeWidth={2.5} dot={{ r: 2.5, fill: C.success, strokeWidth: 0 }} activeDot={{ r: 5, fill: C.success, stroke: "#0a0c0f", strokeWidth: 2 }} animationDuration={1500} />
                  </LineChart>
                </ResponsiveContainer>
              </WidgetCard>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Volume" value={formatAmount(stats.totalVolume)} icon={DollarSign} accentColor={C.primary} delay={300} />
              <StatCard label="All Transactions" value={stats.totalTransactionsAll} icon={ArrowLeftRight} accentColor={C.cyan} delay={340} />
              <StatCard label="Savings Goals" value={stats.totalSavingsGoals} icon={PiggyBank} accentColor={C.success} delay={380} onClick={() => navigate("/admin/savings-oversight")} />
              <StatCard label="Pending Chores" value={stats.totalChores} icon={Award} accentColor={C.warning} delay={420} />
            </div>
          </>
        )}

        {/* ══════ OPERATIONS TAB ══════ */}
        {activeTab === "operations" && (
          <>
            {/* Operations Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Frozen Wallets" value={stats.frozenWallets} icon={AlertTriangle} accentColor={C.danger} delay={80} onClick={() => navigate("/admin/wallets")} />
              <StatCard label="Active Wallets" value={stats.activeWallets} icon={Wallet} accentColor={C.success} delay={120} />
              <StatCard label="Parent-Teen Pairs" value={stats.activeLinks} icon={Users} accentColor={C.info} delay={160} onClick={() => navigate("/admin/parent-links")} />
              <StatCard label="Open Tickets" value={stats.openTickets} icon={Heart} accentColor={stats.openTickets > 5 ? C.danger : C.success} delay={200} onClick={() => navigate("/admin/support")} />
            </div>

            {/* Operations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Activity Timeline */}
              <WidgetCard delay={250} glow>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}20` }}>
                    <Clock className="w-4 h-4" style={{ color: C.primary }} />
                  </div>
                  Activity Timeline
                </h3>
                <div className="space-y-0 max-h-[360px] overflow-y-auto admin-scrollbar">
                  {liveTxns.slice(0, 10).map((tx, i) => {
                    const timeAgo = tx.created_at ? (() => {
                      const diff = Date.now() - new Date(tx.created_at).getTime();
                      if (diff < 60000) return "Just now";
                      if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
                      return `${Math.round(diff / 3600000)}h ago`;
                    })() : "—";
                    return (
                      <div key={tx.id} className="flex gap-3 relative pl-6 py-3" style={{ animation: `admin-card-entrance 0.4s ease-out ${i * 40}ms both` }}>
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-0 bottom-0 w-px" style={{ background: i < 9 ? C.border : "transparent" }} />
                        {/* Timeline dot */}
                        <div className="absolute left-[6px] top-4 w-[12px] h-[12px] rounded-full flex items-center justify-center" style={{
                          background: tx.status === "success" ? `${C.success}20` : tx.status === "failed" ? `${C.danger}20` : `${C.warning}20`,
                          border: `2px solid ${tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning}`,
                        }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-medium" style={{ color: C.textPrimary }}>
                              {tx.type === "credit" ? "Credit" : "Debit"} • {tx.merchant_name || "Transaction"}
                            </p>
                            <span className="text-[10px]" style={{ color: C.textMuted }}>{timeAgo}</span>
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                            {formatAmount(tx.amount)} • {tx.category || "Uncategorized"} •
                            <span style={{ color: tx.status === "success" ? C.success : tx.status === "failed" ? C.danger : C.warning }}> {tx.status}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </WidgetCard>

              {/* Operations Quick Links */}
              <div className="space-y-4">
                <WidgetCard delay={300}>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.secondary}12`, border: `1px solid ${C.secondary}20` }}>
                      <Rocket className="w-4 h-4" style={{ color: C.secondary }} />
                    </div>
                    Operations Hub
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Spending Limits", desc: "Set & manage limits", icon: Target, path: "/admin/spending-limits", color: C.warning },
                      { label: "Pocket Money", desc: "Schedule payouts", icon: Calendar, path: "/admin/pocket-money", color: C.success },
                      { label: "Refunds", desc: "Process disputes", icon: RefreshCw, path: "/admin/refunds", color: C.danger },
                      { label: "Audit Logs", desc: "Admin activity", icon: Eye, path: "/admin/audit-log", color: C.info },
                      { label: "Payouts", desc: "Settlement status", icon: DollarSign, path: "/admin/payouts", color: C.primary },
                      { label: "API Health", desc: "Monitor services", icon: Server, path: "/admin/health", color: C.cyan },
                    ].map(op => (
                      <button key={op.label} onClick={() => navigate(op.path)}
                        className="flex items-center gap-3 p-3 rounded-[12px] transition-all duration-200 text-left"
                        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${op.color}30`; e.currentTarget.style.background = `${op.color}06`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                      >
                        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${op.color}12` }}>
                          <op.icon className="w-4 h-4" style={{ color: op.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium" style={{ color: C.textPrimary }}>{op.label}</p>
                          <p className="text-[9px]" style={{ color: C.textMuted }}>{op.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </WidgetCard>

                {/* Platform Snapshot */}
                <WidgetCard delay={350}>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: C.textPrimary }}>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${C.info}12`, border: `1px solid ${C.info}20` }}>
                      <MonitorSmartphone className="w-4 h-4" style={{ color: C.info }} />
                    </div>
                    Platform Snapshot
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Total Registered Users", value: stats.totalUsers, color: C.info },
                      { label: "Active Wallets", value: stats.activeWallets, color: C.success },
                      { label: "KYC Completion", value: `${stats.totalUsers > 0 ? Math.round(((stats.totalUsers - stats.pendingKyc) / stats.totalUsers) * 100) : 0}%`, color: C.primary },
                      { label: "Parent-Teen Coverage", value: `${stats.activeLinks} linked`, color: C.secondary },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-2 px-1" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <span className="text-[11px]" style={{ color: C.textSecondary }}>{item.label}</span>
                        <span className="text-[12px] font-bold" style={{ color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>
                          {typeof item.value === "number" ? item.value.toLocaleString("en-IN") : item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </WidgetCard>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
