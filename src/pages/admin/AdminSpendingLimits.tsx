import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Target, Shield } from "lucide-react";

const C = { cardBg: "#0f0720", border: "rgba(139,92,246,0.12)", primary: "#7c3aed", secondary: "#a855f7", success: "#22c55e", warning: "#f59e0b", textPrimary: "#ffffff", textSecondary: "rgba(255,255,255,0.55)", textMuted: "rgba(255,255,255,0.3)" };

const AdminSpendingLimits = () => {
  const [limits, setLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("spending_limits").select("*, wallet:wallets!spending_limits_teen_wallet_id_fkey(user_id, balance), parent:profiles!spending_limits_set_by_parent_id_fkey(full_name)");
      setLimits(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Spending Limits Manager</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-[16px]" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: C.textPrimary }}>Global Defaults</h3>
            {[
              { label: "Default Daily Limit", value: "₹5,000" },
              { label: "Default Monthly Limit", value: "₹50,000" },
              { label: "Max Single Transaction", value: "₹10,000" },
              { label: "Min Transaction Amount", value: "₹1" },
            ].map(d => (
              <div key={d.label} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                <span className="text-xs" style={{ color: C.textSecondary }}>{d.label}</span>
                <span className="text-sm font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{d.value}</span>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-[16px]" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: C.textPrimary }}>Category Controls</h3>
            {["Food", "Transport", "Education", "Shopping", "Entertainment", "Gaming"].map(cat => (
              <div key={cat} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                <span className="text-xs" style={{ color: C.textSecondary }}>{cat}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${C.success}15`, color: C.success }}>Allowed</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] p-5" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: C.textPrimary }}>Per-User Overrides ({limits.length})</h3>
          {loading ? (
            <p className="text-sm text-center py-8" style={{ color: C.textMuted }}>Loading...</p>
          ) : limits.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: C.textMuted }}>No custom spending limits set</p>
          ) : (
            <div className="space-y-2">
              {limits.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-[10px]" style={{ background: "rgba(139,92,246,0.04)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{l.category || "All"}</p>
                    <p className="text-[10px]" style={{ color: C.textMuted }}>Set by {l.parent?.full_name || "System"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>₹{((l.daily_limit || 0) / 100).toLocaleString("en-IN")}/day</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: l.is_blocked ? "rgba(239,68,68,0.15)" : `${C.success}15`, color: l.is_blocked ? "#ef4444" : C.success }}>
                      {l.is_blocked ? "Blocked" : "Active"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSpendingLimits;
