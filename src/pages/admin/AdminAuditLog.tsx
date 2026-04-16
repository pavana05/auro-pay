import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { FileText, Clock, Filter, User, Shield, Wallet, Trash2, RefreshCw } from "lucide-react";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  created_at: string;
}

const actionMeta: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  role_change: { icon: Shield, color: "text-primary", bg: "bg-primary/10" },
  wallet_freeze: { icon: Wallet, color: "text-warning", bg: "bg-warning/10" },
  wallet_unfreeze: { icon: Wallet, color: "text-success", bg: "bg-success/10" },
  kyc_approve: { icon: Shield, color: "text-success", bg: "bg-success/10" },
  kyc_reject: { icon: Shield, color: "text-destructive", bg: "bg-destructive/10" },
  user_delete: { icon: Trash2, color: "text-destructive", bg: "bg-destructive/10" },
  default: { icon: FileText, color: "text-muted-foreground", bg: "bg-muted/10" },
};

const AdminAuditLog = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
    if (actionFilter !== "all") query = query.eq("action", actionFilter);
    const { data } = await query;
    const entries = (data || []) as AuditEntry[];
    setLogs(entries);

    const adminIds = [...new Set(entries.map(e => e.admin_user_id))];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", adminIds);
      const names: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { names[p.id] = p.full_name || "Unknown"; });
      setAdminNames(names);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [actionFilter]);

  const formatTime = (ts: string) => new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        {/* Ambient */}
        <div className="absolute top-0 right-0 w-[350px] h-[350px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[250px] h-[250px] rounded-full bg-primary/[0.02] blur-[100px] pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
            <p className="text-xs text-muted-foreground mt-1">Track all admin actions with timestamps</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchLogs} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-foreground hover:border-white/[0.1] transition-all active:scale-90">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              {[
                { value: "all", label: "All" },
                { value: "role_change", label: "Roles" },
                { value: "wallet_freeze", label: "Freeze" },
                { value: "kyc_approve", label: "KYC ✓" },
                { value: "kyc_reject", label: "KYC ✗" },
                { value: "user_delete", label: "Delete" },
              ].map(f => (
                <button key={f.value} onClick={() => setActionFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                    actionFilter === f.value ? "bg-primary/15 text-primary shadow-[0_0_12px_hsl(42_78%_55%/0.1)]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white/[0.02] rounded-xl animate-pulse" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {logs.map((log, i) => {
                const meta = actionMeta[log.action] || actionMeta.default;
                const Icon = meta.icon;
                return (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all duration-200"
                    style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i * 0.03, 0.3)}s both` }}>
                    <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.target_type}{log.target_id ? ` • ${log.target_id.slice(0, 8)}…` : ""}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 text-[11px] text-muted-foreground bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2 font-mono">
                          {Object.entries(log.details).map(([k, v]) => (
                            <div key={k}><span className="text-primary/70">{k}:</span> {String(v)}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(log.created_at)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <User className="w-3 h-3" />
                        {adminNames[log.admin_user_id] || "Admin"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLog;