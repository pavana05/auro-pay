import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  Users, ArrowLeftRight, Wallet, ShieldCheck, TrendingUp,
  Clock, AlertTriangle, RefreshCw, Zap,
  ArrowUpRight, ArrowDownRight, Crown,
  DollarSign, UserPlus, BarChart3,
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

const CHART_COLORS = ["#c8952e", "#d4a843", "#a67a1e", "#e8c56d"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalTransactionsToday: 0, totalVolumeToday: 0,
    pendingKyc: 0, frozenWallets: 0, activeWallets: 0, totalBalance: 0,
    newUsersToday: 0, totalTransactionsAll: 0, successRate: 0, teens: 0, parents: 0,
  });
  const [liveTxns, setLiveTxns] = useState<Transaction[]>([]);
  const [dailyVolume, setDailyVolume] = useState<any[]>([]);
  const [txTypeData, setTxTypeData] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];

    const [usersRes, txnsRes, kycRes, walletsRes, allTxnsRes] = await Promise.all([
      supabase.from("profiles").select("id, created_at, role"),
      supabase.from("transactions").select("*").gte("created_at", today),
      supabase.from("kyc_requests").select("id").eq("status", "pending"),
      supabase.from("wallets").select("id, balance, is_frozen"),
      supabase.from("transactions").select("id, status").limit(1000),
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
    });

    setRoleDistribution([
      { name: "Teens", value: teens || 1 },
      { name: "Parents", value: parents || 1 },
      { name: "Others", value: Math.max(1, allUsers.length - teens - parents) },
    ]);

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
    const channel = supabase
      .channel("admin-live-txns")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, (payload) => {
        setLiveTxns((prev) => [payload.new as Transaction, ...prev].slice(0, 50));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary", sub: `+${stats.newUsersToday} today` },
    { label: "Txns Today", value: stats.totalTransactionsToday, icon: ArrowLeftRight, color: "text-accent", sub: `${stats.totalTransactionsAll} total` },
    { label: "Volume Today", value: formatAmount(stats.totalVolumeToday), icon: DollarSign, color: "text-success", sub: "processed" },
    { label: "Pending KYC", value: stats.pendingKyc, icon: ShieldCheck, color: "text-warning", sub: "awaiting review" },
    { label: "System Balance", value: formatAmount(stats.totalBalance), icon: Wallet, color: "text-primary", sub: `${stats.activeWallets} wallets` },
    { label: "Success Rate", value: `${stats.successRate}%`, icon: BarChart3, color: "text-success", sub: "payment success" },
  ];

  const quickActions = [
    { label: "Review KYC", icon: ShieldCheck, path: "/admin/kyc", count: stats.pendingKyc, color: "text-warning" },
    { label: "Manage Roles", icon: Crown, path: "/admin/roles", color: "text-primary" },
    { label: "View Wallets", icon: Wallet, path: "/admin/wallets", count: stats.activeWallets + stats.frozenWallets, color: "text-accent" },
    { label: "Send Alert", icon: Zap, path: "/admin/notifications", color: "text-success" },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-6 gap-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}</div>
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold">Dashboard</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              Last updated: {lastRefresh.toLocaleTimeString("en-IN")}
            </p>
          </div>
          <button onClick={fetchStats} className="flex items-center gap-2 px-4 py-2 rounded-pill border border-border-active text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s, i) => (
            <div key={s.label} className={`p-4 rounded-lg bg-card border border-border card-premium ${i === 0 ? "shimmer-border" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <TrendingUp className="w-3 h-3 text-success" />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="p-4 rounded-lg bg-card border border-border card-premium text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <a.icon className={`w-5 h-5 ${a.color}`} />
                <ArrowUpRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-medium">{a.label}</p>
              {a.count !== undefined && (
                <p className="text-[10px] text-muted-foreground">{a.count} items</p>
              )}
            </button>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-lg bg-card border border-border card-premium">
            <h3 className="text-sm font-semibold mb-4">Daily Volume (7 days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyVolume}>
                <XAxis dataKey="day" tick={{ fill: "hsl(40,10%,60%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,60%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#121518", border: "1px solid rgba(200,149,46,0.2)", borderRadius: 12, color: "#f5edd6", fontSize: 12 }} />
                <Bar dataKey="volume" fill="#c8952e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-5 rounded-lg bg-card border border-border card-premium">
            <h3 className="text-sm font-semibold mb-4">New Users (7 days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a843" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#d4a843" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "hsl(40,10%,60%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,60%)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#121518", border: "1px solid rgba(200,149,46,0.2)", borderRadius: 12, color: "#f5edd6", fontSize: 12 }} />
                <Area type="monotone" dataKey="users" stroke="#d4a843" fill="url(#userGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-5 rounded-lg bg-card border border-border card-premium">
            <h3 className="text-sm font-semibold mb-4">User Distribution</h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {roleDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#121518", border: "1px solid rgba(200,149,46,0.2)", borderRadius: 12, color: "#f5edd6", fontSize: 12 }} />
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

        {/* System Health + Frozen Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Database", status: "Healthy", color: "bg-success" },
              { label: "Payments", status: "Active", color: "bg-success" },
              { label: "KYC Service", status: stats.pendingKyc > 5 ? "Backlog" : "Normal", color: stats.pendingKyc > 5 ? "bg-warning" : "bg-success" },
              { label: "Wallets", status: stats.frozenWallets > 0 ? `${stats.frozenWallets} Frozen` : "All Active", color: stats.frozenWallets > 0 ? "bg-warning" : "bg-success" },
            ].map((h) => (
              <div key={h.label} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border card-premium">
                <div className={`w-2 h-2 rounded-full ${h.color} animate-pulse`} />
                <div>
                  <p className="text-xs font-medium">{h.label}</p>
                  <p className="text-[10px] text-muted-foreground">{h.status}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Key Metrics */}
          <div className="p-4 rounded-lg bg-card border border-border card-premium shimmer-border">
            <h3 className="text-sm font-semibold mb-3">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/20">
                <p className="text-[10px] text-muted-foreground">Teens</p>
                <p className="text-lg font-bold">{stats.teens}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20">
                <p className="text-[10px] text-muted-foreground">Parents</p>
                <p className="text-lg font-bold">{stats.parents}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20">
                <p className="text-[10px] text-muted-foreground">Frozen Wallets</p>
                <p className="text-lg font-bold text-warning">{stats.frozenWallets}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20">
                <p className="text-[10px] text-muted-foreground">Success Rate</p>
                <p className="text-lg font-bold text-success">{stats.successRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Transaction Feed */}
        <div className="p-5 rounded-lg bg-card border border-border card-premium">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Live Transaction Feed</h3>
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            </div>
            <button onClick={() => navigate("/admin/transactions")} className="text-xs text-primary hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Time</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Merchant</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {liveTxns.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No transactions yet</td></tr>
                ) : (
                  liveTxns.slice(0, 15).map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {tx.created_at ? new Date(tx.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-medium capitalize flex items-center gap-1 ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                          {tx.type === "credit" ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium">{formatAmount(tx.amount)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{tx.merchant_name || "-"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          tx.status === "success" ? "bg-success/20 text-success" :
                          tx.status === "failed" ? "bg-destructive/20 text-destructive" :
                          "bg-warning/20 text-warning"
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
