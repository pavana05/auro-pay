import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Clock, User, Wallet, ShieldCheck, ArrowLeftRight, RefreshCw } from "lucide-react";

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

  const fetchActivity = async () => {
    setLoading(true);
    const items: ActivityItem[] = [];

    const { data: profiles } = await supabase.from("profiles").select("id, full_name, created_at, role").order("created_at", { ascending: false }).limit(20);
    (profiles || []).forEach((p: any) => {
      items.push({ id: `profile-${p.id}`, type: "user_joined", description: `${p.full_name || "Unknown"} joined as ${p.role || "user"}`, timestamp: p.created_at });
    });

    const { data: kycs } = await supabase.from("kyc_requests").select("id, user_id, status, submitted_at, aadhaar_name").order("submitted_at", { ascending: false }).limit(20);
    (kycs || []).forEach((k: any) => {
      items.push({ id: `kyc-${k.id}`, type: k.status === "verified" ? "kyc_verified" : "kyc_submitted", description: `KYC ${k.status} for ${k.aadhaar_name || "user"}`, timestamp: k.submitted_at, meta: k.status });
    });

    const { data: txns } = await supabase.from("transactions").select("id, type, amount, merchant_name, status, created_at").order("created_at", { ascending: false }).limit(30);
    (txns || []).forEach((t: any) => {
      items.push({ id: `txn-${t.id}`, type: "transaction", description: `${t.type} of ₹${(t.amount / 100).toFixed(2)}${t.merchant_name ? ` at ${t.merchant_name}` : ""}`, timestamp: t.created_at, meta: t.status });
    });

    const { data: wallets } = await supabase.from("wallets").select("id, user_id, created_at").order("created_at", { ascending: false }).limit(10);
    (wallets || []).forEach((w: any) => {
      items.push({ id: `wallet-${w.id}`, type: "wallet_created", description: `New wallet created`, timestamp: w.created_at });
    });

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(items);
    setLoading(false);
  };

  useEffect(() => { fetchActivity(); }, []);

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
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[350px] h-[350px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-0 w-[200px] h-[200px] rounded-full bg-primary/[0.02] blur-[80px] pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-xs text-muted-foreground mt-1">Real-time platform activity feed</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchActivity} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-foreground hover:border-white/[0.1] transition-all active:scale-90">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              {[
                { value: "all", label: "All" },
                { value: "user_joined", label: "Signups" },
                { value: "transaction", label: "Txns" },
                { value: "kyc_submitted", label: "KYC" },
              ].map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`px-3.5 py-2 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                    filter === f.value ? "bg-primary/15 text-primary shadow-[0_0_12px_hsl(42_78%_55%/0.1)]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Live Feed • {filtered.length} events</span>
        </div>

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white/[0.02] rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">No activity found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {filtered.slice(0, 50).map((a, i) => {
                const { icon: Icon, color, bg } = iconMap[a.type];
                return (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-all duration-200 group"
                    style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i * 0.03, 0.3)}s both` }}>
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.description}</p>
                      {a.meta && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          a.meta === "success" || a.meta === "verified" ? "bg-success/10 text-success" :
                          a.meta === "failed" || a.meta === "rejected" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
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