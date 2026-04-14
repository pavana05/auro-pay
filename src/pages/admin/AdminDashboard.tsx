import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Users, ArrowLeftRight, Wallet, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from "recharts";

interface Stats {
  totalUsers: number;
  totalTransactionsToday: number;
  totalVolumeToday: number;
  pendingKyc: number;
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

const CHART_COLORS = ["#7c3aed", "#a855f7", "#c084fc", "#e9d5ff"];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalTransactionsToday: 0, totalVolumeToday: 0, pendingKyc: 0 });
  const [liveTxns, setLiveTxns] = useState<Transaction[]>([]);
  const [dailyVolume, setDailyVolume] = useState<any[]>([]);
  const [txTypeData, setTxTypeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];

    const [usersRes, txnsRes, kycRes] = await Promise.all([
      supabase.from("profiles").select("id"),
      supabase.from("transactions").select("*").gte("created_at", today),
      supabase.from("kyc_requests").select("id").eq("status", "pending"),
    ]);

    const txns = (txnsRes.data || []) as Transaction[];
    const volume = txns.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0);

    setStats({
      totalUsers: usersRes.data?.length || 0,
      totalTransactionsToday: txns.length,
      totalVolumeToday: volume,
      pendingKyc: kycRes.data?.length || 0,
    });

    // Fetch latest 50 transactions
    const { data: latest } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50);
    setLiveTxns((latest || []) as Transaction[]);

    // Daily volume for last 7 days
    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTxns = (latest || []).filter((t: any) => t.created_at?.startsWith(dateStr) && t.status === "success");
      days.push({
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        volume: dayTxns.reduce((s: number, t: any) => s + t.amount, 0) / 100,
      });
    }
    setDailyVolume(days);

    // Type breakdown
    const credits = (latest || []).filter((t: any) => t.type === "credit").length;
    const debits = (latest || []).filter((t: any) => t.type === "debit").length;
    setTxTypeData([
      { name: "Credits", value: credits || 1 },
      { name: "Debits", value: debits || 1 },
    ]);

    setLoading(false);
  };

  useEffect(() => {
    fetchStats();

    // Real-time subscription
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
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Transactions Today", value: stats.totalTransactionsToday, icon: ArrowLeftRight, color: "text-accent" },
    { label: "Volume Today", value: formatAmount(stats.totalVolumeToday), icon: Wallet, color: "text-success" },
    { label: "Pending KYC", value: stats.pendingKyc, icon: ShieldCheck, color: "text-warning" },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}</div>
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-[22px] font-semibold">Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="p-5 rounded-lg bg-card border border-border card-glow">
              <div className="flex items-center justify-between mb-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <TrendingUp className="w-3 h-3 text-success" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-lg bg-card border border-border card-glow">
            <h3 className="text-sm font-semibold mb-4">Daily Volume (7 days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyVolume}>
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1a0a2e", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 12, color: "#fff" }} />
                <Bar dataKey="volume" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-5 rounded-lg bg-card border border-border card-glow">
            <h3 className="text-sm font-semibold mb-4">Transaction Types</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={txTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={5}>
                  {txTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a0a2e", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 12, color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              {txTypeData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Transaction Feed */}
        <div className="p-5 rounded-lg bg-card border border-border card-glow">
          <h3 className="text-sm font-semibold mb-4">Live Transaction Feed</h3>
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
                  liveTxns.slice(0, 20).map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors animate-fade-in-up">
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {tx.created_at ? new Date(tx.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-medium capitalize ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium">{formatAmount(tx.amount)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{tx.merchant_name || "-"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-pill ${
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
