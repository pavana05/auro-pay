import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  UserPlus, ArrowLeftRight, ShieldCheck, DollarSign,
  TrendingUp, TrendingDown, Calendar, Filter,
  BarChart3, Activity, PieChart as PieChartIcon, LineChart as LineChartIcon,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const CHART_COLORS = ["#c8952e", "#d4a843", "#a67a1e", "#e8c56d", "#8B7355", "#5a9e6f", "#e06060"];

const TOOLTIP_STYLE = {
  background: "hsl(220 15% 8%)",
  border: "1px solid rgba(200,149,46,0.15)",
  borderRadius: 12,
  color: "#f5edd6",
  fontSize: 12,
  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
};

type DateRange = "7d" | "14d" | "30d" | "90d";

const DATE_RANGES: { label: string; value: DateRange; days: number }[] = [
  { label: "7 Days", value: "7d", days: 7 },
  { label: "14 Days", value: "14d", days: 14 },
  { label: "30 Days", value: "30d", days: 30 },
  { label: "90 Days", value: "90d", days: 90 },
];

const AdminAnalytics = () => {
  const [range, setRange] = useState<DateRange>("30d");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [kycRequests, setKycRequests] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(true);

  const days = DATE_RANGES.find(r => r.value === range)!.days;

  const fetchAll = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    const [pRes, tRes, kRes] = await Promise.all([
      supabase.from("profiles").select("id, created_at, role"),
      supabase.from("transactions").select("id, amount, type, status, category, created_at").gte("created_at", sinceStr).order("created_at", { ascending: true }).limit(1000),
      supabase.from("kyc_requests").select("id, status, submitted_at, verified_at").gte("submitted_at", sinceStr),
    ]);

    setProfiles(pRes.data || []);
    setTransactions(tRes.data || []);
    setKycRequests(kRes.data || []);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [days]);

  // Realtime subscriptions
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel('admin-analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_requests' }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLive, days]);

  // Generate date labels
  const dateLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().split("T")[0]);
    }
    return labels;
  }, [days]);

  // Daily signups
  const signupData = useMemo(() => {
    return dateLabels.map(date => {
      const count = profiles.filter(p => p.created_at?.startsWith(date)).length;
      return { date: formatLabel(date, days), count, fullDate: date };
    });
  }, [profiles, dateLabels, days]);

  // Transaction volume trends
  const volumeData = useMemo(() => {
    return dateLabels.map(date => {
      const dayTxns = transactions.filter(t => t.created_at?.startsWith(date) && t.status === "success");
      const volume = dayTxns.reduce((s: number, t: any) => s + (t.amount || 0), 0) / 100;
      const count = dayTxns.length;
      return { date: formatLabel(date, days), volume, count, fullDate: date };
    });
  }, [transactions, dateLabels, days]);

  // KYC approval rates
  const kycData = useMemo(() => {
    const verified = kycRequests.filter(k => k.status === "verified").length;
    const pending = kycRequests.filter(k => k.status === "pending").length;
    const rejected = kycRequests.filter(k => k.status === "rejected").length;
    const total = kycRequests.length;
    const rate = total > 0 ? Math.round((verified / total) * 100) : 0;

    const pie = [
      { name: "Verified", value: verified || 0 },
      { name: "Pending", value: pending || 0 },
      { name: "Rejected", value: rejected || 0 },
    ].filter(d => d.value > 0);

    // Daily KYC trend
    const trend = dateLabels.map(date => {
      const dayKyc = kycRequests.filter(k => k.submitted_at?.startsWith(date));
      const dayVerified = dayKyc.filter(k => k.status === "verified").length;
      return { date: formatLabel(date, days), submitted: dayKyc.length, verified: dayVerified };
    });

    return { pie: pie.length ? pie : [{ name: "No Data", value: 1 }], rate, total, verified, pending, rejected, trend };
  }, [kycRequests, dateLabels, days]);

  // Revenue metrics
  const revenueData = useMemo(() => {
    const successTxns = transactions.filter(t => t.status === "success");
    const totalRevenue = successTxns.reduce((s: number, t: any) => s + (t.amount || 0), 0) / 100;
    const creditRevenue = successTxns.filter(t => t.type === "credit").reduce((s: number, t: any) => s + (t.amount || 0), 0) / 100;
    const debitRevenue = successTxns.filter(t => t.type === "debit").reduce((s: number, t: any) => s + (t.amount || 0), 0) / 100;
    const avgTxnValue = successTxns.length > 0 ? totalRevenue / successTxns.length : 0;

    // Category breakdown
    const catMap = new Map<string, number>();
    successTxns.forEach(t => {
      const cat = t.category || "other";
      catMap.set(cat, (catMap.get(cat) || 0) + (t.amount || 0) / 100);
    });
    const categories = Array.from(catMap.entries())
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Daily revenue
    const daily = dateLabels.map(date => {
      const dayTxns = successTxns.filter(t => t.created_at?.startsWith(date));
      const credit = dayTxns.filter(t => t.type === "credit").reduce((s: number, t: any) => s + (t.amount || 0), 0) / 100;
      const debit = dayTxns.filter(t => t.type === "debit").reduce((s: number, t: any) => s + (t.amount || 0), 0) / 100;
      return { date: formatLabel(date, days), credit, debit, total: credit + debit };
    });

    return { totalRevenue, creditRevenue, debitRevenue, avgTxnValue, categories: categories.length ? categories : [{ name: "No Data", value: 1 }], daily };
  }, [transactions, dateLabels, days]);

  // Summary stats
  const totalSignups = signupData.reduce((s, d) => s + d.count, 0);
  const totalVolume = volumeData.reduce((s, d) => s + d.volume, 0);
  const totalTxnCount = volumeData.reduce((s, d) => s + d.count, 0);

  const summaryCards = [
    { label: "New Signups", value: totalSignups, icon: UserPlus, color: "text-primary", prefix: "" },
    { label: "Transactions", value: totalTxnCount, icon: ArrowLeftRight, color: "text-accent", prefix: "" },
    { label: "Volume", value: `₹${totalVolume.toLocaleString("en-IN")}`, icon: DollarSign, color: "text-success", prefix: "" },
    { label: "KYC Approval", value: `${kycData.rate}%`, icon: ShieldCheck, color: "text-warning", prefix: "" },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-72 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/[0.02] blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> Analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Deep insights into your platform performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-0.5">
              {DATE_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    range === r.value
                      ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(42_78%_55%/0.3)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryCards.map((s, i) => (
            <div
              key={s.label}
              className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/20 transition-all duration-300 hover:shadow-[0_0_30px_hsl(42_78%_55%/0.06)] relative overflow-hidden"
              style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s both` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Row 1: Signups + Transaction Volume */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Signups */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Daily Signups</h3>
              </div>
              <span className="text-[10px] text-muted-foreground">{totalSignups} total</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={signupData}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8952e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#c8952e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="count" stroke="#c8952e" fill="url(#signupGrad)" strokeWidth={2} name="Signups" dot={{ fill: "#c8952e", r: 2 }} activeDot={{ r: 5, fill: "#c8952e", stroke: "#0a0c0f", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Transaction Volume */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.38s both" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold">Transaction Volume</h3>
              </div>
              <span className="text-[10px] text-muted-foreground">₹{totalVolume.toLocaleString("en-IN")}</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Volume"]} />
                <Bar dataKey="volume" fill="#c8952e" radius={[6, 6, 0, 0]} name="Volume (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: KYC + Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* KYC Approval */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.46s both" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold">KYC Approval Rates</h3>
              </div>
              <span className="text-[10px] text-muted-foreground">{kycData.total} submissions</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={kycData.pie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {kycData.pie.map((_, i) => <Cell key={i} fill={["#5a9e6f", "#e8c56d", "#e06060"][i] || CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {kycData.pie.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: ["#5a9e6f", "#e8c56d", "#e06060"][i] }} />
                      <span className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 flex flex-col justify-center">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                  <p className="text-[10px] text-muted-foreground">Approval Rate</p>
                  <p className="text-2xl font-bold text-success">{kycData.rate}%</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-warning">{kycData.pending}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                  <p className="text-[10px] text-muted-foreground">Rejected</p>
                  <p className="text-lg font-bold text-destructive">{kycData.rejected}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Metrics */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.54s both" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success" />
                <h3 className="text-sm font-semibold">Revenue Metrics</h3>
              </div>
              <span className="text-[10px] text-muted-foreground">₹{revenueData.totalRevenue.toLocaleString("en-IN")}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] text-center">
                <p className="text-[9px] text-muted-foreground">Credits</p>
                <p className="text-sm font-bold text-success">₹{revenueData.creditRevenue.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] text-center">
                <p className="text-[9px] text-muted-foreground">Debits</p>
                <p className="text-sm font-bold text-primary">₹{revenueData.debitRevenue.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] text-center">
                <p className="text-[9px] text-muted-foreground">Avg Txn</p>
                <p className="text-sm font-bold text-accent">₹{Math.round(revenueData.avgTxnValue).toLocaleString("en-IN")}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={revenueData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(40,10%,50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, ""]} />
                <Line type="monotone" dataKey="credit" stroke="#5a9e6f" strokeWidth={2} dot={false} name="Credits" />
                <Line type="monotone" dataKey="debit" stroke="#c8952e" strokeWidth={2} dot={false} name="Debits" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 3: Revenue by Category */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Revenue by Category</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={revenueData.categories} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {revenueData.categories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {revenueData.categories.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-sm flex-1">{c.name}</span>
                  <span className="text-sm font-semibold text-primary">₹{c.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

function formatLabel(dateStr: string, totalDays: number): string {
  const d = new Date(dateStr);
  if (totalDays <= 14) return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default AdminAnalytics;
