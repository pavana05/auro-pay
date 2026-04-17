import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { PiggyBank, Target, TrendingUp } from "lucide-react";
import { useAdminQuery } from "@/hooks/useAdminQuery";
import { AdminQueryError, AdminQueryLoading } from "@/components/admin/AdminQueryState";

const C = { cardBg: "rgba(13,14,18,0.7)", border: "rgba(200,149,46,0.10)", primary: "#c8952e", success: "#22c55e", warning: "#f59e0b", textPrimary: "#ffffff", textSecondary: "rgba(255,255,255,0.55)", textMuted: "rgba(255,255,255,0.3)" };

interface SavingsData {
  goals: any[];
  stats: { active: number; totalSaved: number; completedMonth: number; avgRate: number };
}

const AdminSavingsOversight = () => {
  const { data, loading, error, refetch } = useAdminQuery<SavingsData>(
    async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*, teen:profiles!savings_goals_teen_id_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const g = data || [];
      const active = g.filter((x: any) => !x.is_completed).length;
      const totalSaved = g.reduce((s: number, x: any) => s + (x.current_amount || 0), 0);
      const completed = g.filter((x: any) => x.is_completed);
      const now = new Date();
      const completedMonth = completed.filter((x: any) => {
        const d = new Date(x.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      const rates = g.filter((x: any) => x.target_amount > 0).map((x: any) => ((x.current_amount || 0) / x.target_amount) * 100);
      const avgRate = rates.length > 0 ? Math.round(rates.reduce((a: number, b: number) => a + b, 0) / rates.length) : 0;
      return { goals: g, stats: { active, totalSaved, completedMonth, avgRate } };
    },
    { label: "savings goals" }
  );

  const goals = data?.goals ?? [];
  const stats = data?.stats ?? { active: 0, totalSaved: 0, completedMonth: 0, avgRate: 0 };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Savings Goals Oversight</h1>

        {error ? (
          <AdminQueryError error={error} onRetry={refetch} label="savings goals" />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active Goals", value: stats.active, icon: Target, color: C.primary },
                { label: "Total Savings", value: `₹${(stats.totalSaved / 100).toLocaleString("en-IN")}`, icon: PiggyBank, color: C.success },
                { label: "Completed This Month", value: stats.completedMonth, icon: TrendingUp, color: C.warning },
                { label: "Avg Completion Rate", value: `${stats.avgRate}%`, icon: TrendingUp, color: C.primary },
              ].map(s => (
                <div key={s.label} className="p-5 rounded-[16px]" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                  <s.icon className="w-5 h-5 mb-2" style={{ color: s.color }} />
                  <p className="text-2xl font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
                  <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[16px] overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div className="grid grid-cols-7 gap-2 px-4 py-3" style={{ background: "rgba(200,149,46,0.06)" }}>
                {["Teen", "Goal", "Target", "Current", "Progress", "Deadline", "Status"].map(h => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.textMuted }}>{h}</span>
                ))}
              </div>
              {loading ? (
                <div className="p-4"><AdminQueryLoading rows={5} /></div>
              ) : goals.length === 0 ? (
                <div className="p-8 text-center" style={{ color: C.textMuted }}>No savings goals found</div>
              ) : (
                goals.slice(0, 50).map((g: any) => {
                  const pct = g.target_amount > 0 ? Math.round(((g.current_amount || 0) / g.target_amount) * 100) : 0;
                  const statusColor = g.is_completed ? C.success : pct >= 50 ? C.primary : C.warning;
                  return (
                    <div key={g.id} className="grid grid-cols-7 gap-2 px-4 py-3 items-center" style={{ borderTop: `1px solid ${C.border}` }}>
                      <span className="text-sm font-medium truncate" style={{ color: C.textPrimary }}>{g.teen?.full_name || "—"}</span>
                      <span className="text-sm truncate" style={{ color: C.textSecondary }}>{g.title}</span>
                      <span className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.textPrimary }}>₹{((g.target_amount || 0) / 100).toLocaleString("en-IN")}</span>
                      <span className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.success }}>₹{((g.current_amount || 0) / 100).toLocaleString("en-IN")}</span>
                      <div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(200,149,46,0.1)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: statusColor }} />
                        </div>
                        <span className="text-[10px]" style={{ color: C.textMuted }}>{pct}%</span>
                      </div>
                      <span className="text-xs" style={{ color: C.textMuted }}>{g.deadline || "—"}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block w-fit" style={{ background: `${statusColor}15`, color: statusColor }}>
                        {g.is_completed ? "Completed" : pct >= 50 ? "On Track" : "At Risk"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSavingsOversight;
