import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

const C = { cardBg: "rgba(13,14,18,0.7)", border: "rgba(200,149,46,0.10)", primary: "#c8952e", secondary: "#d4a84b", success: "#22c55e", textPrimary: "#ffffff", textMuted: "rgba(255,255,255,0.3)" };

const AdminRevenue = () => {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, month: 0, projected: 0 });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("transactions").select("amount, created_at, status").eq("status", "success").order("created_at", { ascending: false }).limit(1000);
      const txns = data || [];
      const today = new Date().toISOString().split("T")[0];
      const todayVol = txns.filter(t => t.created_at?.startsWith(today)).reduce((s, t) => s + t.amount, 0);
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const monthVol = txns.filter(t => t.created_at && t.created_at >= monthStart).reduce((s, t) => s + t.amount, 0);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dayOfMonth = now.getDate();
      const projected = dayOfMonth > 0 ? Math.round((monthVol / dayOfMonth) * daysInMonth) : 0;
      setStats({ today: todayVol, month: monthVol, projected });
      
      const days: any[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        const vol = txns.filter(t => t.created_at?.startsWith(ds)).reduce((s, t) => s + t.amount, 0);
        days.push({ day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue: Math.round(vol * 0.02 / 100) });
      }
      setDailyData(days);
      setLoading(false);
    };
    fetch();
  }, []);

  const fmt = (v: number) => `₹${(v / 100).toLocaleString("en-IN")}`;
  const tooltipStyle = { background: "#140a28", border: `1px solid ${C.border}`, borderRadius: 12, color: C.textPrimary, fontSize: 11 };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Revenue Analytics</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Revenue Today (est.)", value: fmt(Math.round(stats.today * 0.02)), icon: DollarSign, color: C.primary },
            { label: "Revenue This Month", value: fmt(Math.round(stats.month * 0.02)), icon: TrendingUp, color: C.success },
            { label: "Projected Monthly", value: fmt(Math.round(stats.projected * 0.02)), icon: BarChart3, color: C.secondary },
          ].map(s => (
            <div key={s.label} className="p-5 rounded-[16px]" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
              <s.icon className="w-5 h-5 mb-2" style={{ color: s.color }} />
              <p className="text-2xl font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
              <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[16px] p-5" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: C.textPrimary }}>Revenue Trend (30 Days — 2% interchange estimate)</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center" style={{ color: C.textMuted }}>Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.06)" />
                <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="revenue" stroke={C.primary} fill="url(#revGrad)" strokeWidth={2.5} dot={{ r: 3, fill: C.primary, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminRevenue;
