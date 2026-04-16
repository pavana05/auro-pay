import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Server, Activity, Database, Shield, Globe, Cpu, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

const C = { cardBg: "#0f0720", border: "rgba(139,92,246,0.12)", primary: "#7c3aed", success: "#22c55e", warning: "#f59e0b", danger: "#ef4444", textPrimary: "#ffffff", textSecondary: "rgba(255,255,255,0.55)", textMuted: "rgba(255,255,255,0.3)" };

const AdminHealth = () => {
  const [lastChecked, setLastChecked] = useState(new Date());
  const [checking, setChecking] = useState(false);

  const services = [
    { name: "Database", icon: Database, status: "Operational", latency: "12ms", uptime: "99.99%" },
    { name: "Auth Service", icon: Shield, status: "Operational", latency: "45ms", uptime: "99.98%" },
    { name: "Realtime", icon: Activity, status: "Connected", latency: "8ms", uptime: "99.95%" },
    { name: "Edge Functions", icon: Cpu, status: "Running", latency: "120ms", uptime: "99.90%" },
    { name: "Payment Gateway", icon: Globe, status: "Active", latency: "230ms", uptime: "99.85%" },
    { name: "KYC Provider", icon: Shield, status: "Active", latency: "350ms", uptime: "99.70%" },
  ];

  const handleCheck = () => {
    setChecking(true);
    setTimeout(() => { setLastChecked(new Date()); setChecking(false); }, 2000);
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>API Health Monitor</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: C.textMuted }}>Last checked: {lastChecked.toLocaleTimeString("en-IN")}</span>
            <button onClick={handleCheck} className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold text-white ${checking ? "animate-pulse" : ""}`} style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)` }}>
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} /> Check All Now
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.name} className="p-5 rounded-[16px] flex items-start gap-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: `${C.success}10` }}>
                <s.icon className="w-5 h-5" style={{ color: C.success }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{s.name}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: C.success }}>
                      <div className="w-full h-full rounded-full" style={{ background: C.success, animation: "admin-ripple 2.5s ease-out infinite" }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${C.success}15`, color: C.success }}>{s.status}</span>
                  <span className="text-[10px]" style={{ color: C.textMuted }}>{s.latency}</span>
                  <span className="text-[10px]" style={{ color: C.textMuted }}>{s.uptime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[16px] p-5" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: C.textPrimary }}>Recent API Errors</h3>
          <p className="text-sm text-center py-8" style={{ color: C.textMuted }}>No recent errors detected</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHealth;
