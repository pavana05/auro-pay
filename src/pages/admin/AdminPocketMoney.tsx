import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Calendar, Play, Pause, Users, Wallet } from "lucide-react";
import { toast } from "sonner";

const C = { cardBg: "rgba(13,14,18,0.7)", border: "rgba(200,149,46,0.10)", primary: "#c8952e", success: "#22c55e", warning: "#f59e0b", danger: "#ef4444", textPrimary: "#ffffff", textSecondary: "rgba(255,255,255,0.55)", textMuted: "rgba(255,255,255,0.3)" };

const AdminPocketMoney = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalWeekly: 0, families: 0 });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("parent_teen_links").select("*, parent:profiles!parent_teen_links_parent_id_fkey(full_name), teen:profiles!parent_teen_links_teen_id_fkey(full_name)")
        .gt("pocket_money_amount", 0).order("created_at", { ascending: false });
      const d = data || [];
      setSchedules(d);
      const totalWeekly = d.filter((s: any) => s.pocket_money_frequency === "weekly").reduce((sum: number, s: any) => sum + (s.pocket_money_amount || 0), 0);
      setStats({ totalWeekly, families: d.length });
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Pocket Money Schedules</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Weekly Distribution", value: `₹${(stats.totalWeekly / 100).toLocaleString("en-IN")}`, icon: Wallet, color: C.primary },
            { label: "Active Families", value: stats.families, icon: Users, color: C.success },
            { label: "Next Scheduled Run", value: "Mon 00:00", icon: Calendar, color: C.warning },
          ].map(s => (
            <div key={s.label} className="p-5 rounded-[16px]" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
              <s.icon className="w-5 h-5 mb-2" style={{ color: s.color }} />
              <p className="text-2xl font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
              <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[16px] overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
          <div className="grid grid-cols-7 gap-2 px-4 py-3" style={{ background: "rgba(139,92,246,0.08)" }}>
            {["Parent", "Teen", "Amount", "Frequency", "Day", "Status", "Actions"].map(h => (
              <span key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.textMuted }}>{h}</span>
            ))}
          </div>
          {loading ? (
            <div className="p-8 text-center" style={{ color: C.textMuted }}>Loading...</div>
          ) : schedules.length === 0 ? (
            <div className="p-8 text-center" style={{ color: C.textMuted }}>No pocket money schedules</div>
          ) : (
            schedules.map((s: any) => (
              <div key={s.id} className="grid grid-cols-7 gap-2 px-4 py-3 items-center" style={{ borderTop: `1px solid ${C.border}` }}>
                <span className="text-sm font-medium truncate" style={{ color: C.textPrimary }}>{s.parent?.full_name || "—"}</span>
                <span className="text-sm truncate" style={{ color: C.textSecondary }}>{s.teen?.full_name || "—"}</span>
                <span className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.textPrimary }}>₹{((s.pocket_money_amount || 0) / 100).toLocaleString("en-IN")}</span>
                <span className="text-xs capitalize" style={{ color: C.textSecondary }}>{s.pocket_money_frequency || "—"}</span>
                <span className="text-xs" style={{ color: C.textMuted }}>{s.pocket_money_day ? `Day ${s.pocket_money_day}` : "—"}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block w-fit" style={{ background: s.is_active ? `${C.success}15` : `${C.danger}15`, color: s.is_active ? C.success : C.danger }}>
                  {s.is_active ? "Active" : "Paused"}
                </span>
                <div className="flex gap-1">
                  <button className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${C.primary}15`, color: C.primary }}>Edit</button>
                  <button className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${C.success}15`, color: C.success }}>Send Now</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPocketMoney;
