import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Clock, User, Wallet, ShieldCheck, ArrowLeftRight, Filter } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "user_joined" | "kyc_submitted" | "transaction" | "wallet_created" | "kyc_verified";
  description: string;
  timestamp: string;
  meta?: string;
}

const AdminActivityLog = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      const items: ActivityItem[] = [];

      // Recent profiles (user signups)
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, created_at, role").order("created_at", { ascending: false }).limit(20);
      (profiles || []).forEach((p: any) => {
        items.push({
          id: `profile-${p.id}`,
          type: "user_joined",
          description: `${p.full_name || "Unknown"} joined as ${p.role || "user"}`,
          timestamp: p.created_at,
        });
      });

      // Recent KYC requests
      const { data: kycs } = await supabase.from("kyc_requests").select("id, user_id, status, submitted_at, aadhaar_name").order("submitted_at", { ascending: false }).limit(20);
      (kycs || []).forEach((k: any) => {
        items.push({
          id: `kyc-${k.id}`,
          type: k.status === "verified" ? "kyc_verified" : "kyc_submitted",
          description: `KYC ${k.status} for ${k.aadhaar_name || "user"}`,
          timestamp: k.submitted_at,
          meta: k.status,
        });
      });

      // Recent transactions
      const { data: txns } = await supabase.from("transactions").select("id, type, amount, merchant_name, status, created_at").order("created_at", { ascending: false }).limit(30);
      (txns || []).forEach((t: any) => {
        items.push({
          id: `txn-${t.id}`,
          type: "transaction",
          description: `${t.type} of ₹${(t.amount / 100).toFixed(2)}${t.merchant_name ? ` at ${t.merchant_name}` : ""}`,
          timestamp: t.created_at,
          meta: t.status,
        });
      });

      // Recent wallets
      const { data: wallets } = await supabase.from("wallets").select("id, user_id, created_at").order("created_at", { ascending: false }).limit(10);
      (wallets || []).forEach((w: any) => {
        items.push({
          id: `wallet-${w.id}`,
          type: "wallet_created",
          description: `New wallet created`,
          timestamp: w.created_at,
        });
      });

      // Sort by timestamp
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items);
      setLoading(false);
    };

    fetchActivity();
  }, []);

  const iconMap = {
    user_joined: { icon: User, color: "text-primary", bg: "bg-primary/10" },
    kyc_submitted: { icon: ShieldCheck, color: "text-warning", bg: "bg-warning/10" },
    kyc_verified: { icon: ShieldCheck, color: "text-success", bg: "bg-success/10" },
    transaction: { icon: ArrowLeftRight, color: "text-accent", bg: "bg-accent/10" },
    wallet_created: { icon: Wallet, color: "text-success", bg: "bg-success/10" },
  };

  const filtered = filter === "all" ? activities : activities.filter(a => a.type === filter);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] font-semibold">Activity Log</h1>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-auro w-auto px-3 h-9 text-xs">
              <option value="all">All Activity</option>
              <option value="user_joined">User Signups</option>
              <option value="transaction">Transactions</option>
              <option value="kyc_submitted">KYC Submissions</option>
              <option value="kyc_verified">KYC Verified</option>
              <option value="wallet_created">Wallets</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-card border border-border card-glow">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No activity found</div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.slice(0, 50).map((a) => {
                const { icon: Icon, color, bg } = iconMap[a.type];
                return (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors">
                    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.description}</p>
                      {a.meta && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          a.meta === "success" || a.meta === "verified" ? "bg-success/20 text-success" :
                          a.meta === "failed" || a.meta === "rejected" ? "bg-destructive/20 text-destructive" :
                          "bg-warning/20 text-warning"
                        }`}>
                          {a.meta}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTime(a.timestamp)}
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

export default AdminActivityLog;
