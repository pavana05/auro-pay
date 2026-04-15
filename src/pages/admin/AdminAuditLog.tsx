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

    // Fetch admin names
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

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-semibold">Audit Log</h1>
            <p className="text-xs text-muted-foreground mt-1">Track all admin actions with timestamps</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchLogs} className="p-2 rounded-lg hover:bg-white/[0.04] text-muted-foreground transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input-auro w-auto px-3 h-9 text-xs">
                <option value="all">All Actions</option>
                <option value="role_change">Role Changes</option>
                <option value="wallet_freeze">Wallet Freeze</option>
                <option value="wallet_unfreeze">Wallet Unfreeze</option>
                <option value="kyc_approve">KYC Approvals</option>
                <option value="kyc_reject">KYC Rejections</option>
                <option value="user_delete">User Deletions</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border card-glow">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No audit logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((log) => {
                const meta = actionMeta[log.action] || actionMeta.default;
                const Icon = meta.icon;
                return (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/5 transition-colors">
                    <div className={`w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.target_type}{log.target_id ? ` • ${log.target_id.slice(0, 8)}...` : ""}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-1.5 text-[11px] text-muted-foreground bg-muted/10 rounded-lg px-3 py-2 font-mono">
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
