import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Wallet, Snowflake, TrendingUp, Edit3, Check, X, DollarSign } from "lucide-react";

interface WalletRow {
  id: string;
  user_id: string;
  balance: number | null;
  daily_limit: number | null;
  monthly_limit: number | null;
  spent_today: number | null;
  spent_this_month: number | null;
  is_frozen: boolean | null;
  created_at: string | null;
  profile?: { full_name: string | null; role: string | null };
}

const AdminWallets = () => {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState("");

  const fetchWallets = async () => {
    setLoading(true);
    const { data } = await supabase.from("wallets").select("*").order("created_at", { ascending: false });
    const enriched = await Promise.all(
      ((data || []) as WalletRow[]).map(async (w) => {
        const { data: p } = await supabase.from("profiles").select("full_name, role").eq("id", w.user_id).single();
        return { ...w, profile: p || undefined };
      })
    );
    setWallets(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchWallets(); }, []);

  const logAudit = async (action: string, targetId: string, details: Record<string, any> = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({ admin_user_id: user.id, action, target_type: "wallet", target_id: targetId, details });
  };

  const updateLimit = async (walletId: string) => {
    const limit = parseInt(newLimit) * 100;
    if (isNaN(limit) || limit < 0) { toast.error("Invalid limit"); return; }
    await supabase.from("wallets").update({ daily_limit: limit }).eq("id", walletId);
    toast.success("Limit updated");
    setEditingLimit(null);
    setNewLimit("");
    fetchWallets();
  };

  const toggleFreeze = async (w: WalletRow) => {
    await supabase.from("wallets").update({ is_frozen: !w.is_frozen }).eq("id", w.id);
    await logAudit(w.is_frozen ? "wallet_unfreeze" : "wallet_freeze", w.id, { user_id: w.user_id, user_name: w.profile?.full_name });
    toast.success(w.is_frozen ? "Wallet unfrozen" : "Wallet frozen");
    fetchWallets();
  };

  const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const frozenCount = wallets.filter(w => w.is_frozen).length;
  const activeCount = wallets.length - frozenCount;
  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  const summaryCards = [
    { label: "System Balance", value: formatAmount(totalBalance), icon: DollarSign, color: "text-primary" },
    { label: "Total Wallets", value: wallets.length, icon: Wallet, color: "text-accent" },
    { label: "Active", value: activeCount, icon: TrendingUp, color: "text-success" },
    { label: "Frozen", value: frozenCount, icon: Snowflake, color: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        {/* Ambient */}
        <div className="absolute top-0 left-1/2 w-[400px] h-[350px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-[200px] h-[200px] rounded-full bg-primary/[0.02] blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <h1 className="text-2xl font-bold tracking-tight">Wallet Management</h1>
          <p className="text-xs text-muted-foreground mt-1">Monitor and manage all user wallets</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {summaryCards.map((s, i) => (
            <div key={s.label}
              className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/15 transition-all duration-500 hover:shadow-[0_0_30px_hsl(42_78%_55%/0.06)] relative overflow-hidden"
              style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.06 + i * 0.05}s both` }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className={`w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center ${s.color} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden backdrop-blur-sm" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["User", "Role", "Balance", "Daily Limit", "Spent Today", "Spent Monthly", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left py-4 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td colSpan={8} className="py-4 px-5">
                      <div className="h-5 rounded-lg overflow-hidden relative">
                        <div className="absolute inset-0 bg-white/[0.03]" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" style={{ animation: "admin-shimmer 2s infinite" }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : wallets.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">No wallets found</p>
                </td></tr>
              ) : (
                wallets.map((w, i) => (
                  <tr key={w.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all duration-200 group"
                    style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i * 0.03, 0.3)}s both` }}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-[11px] font-semibold text-primary group-hover:scale-105 transition-transform duration-300">
                          {(w.profile?.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{w.profile?.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 capitalize text-muted-foreground text-xs">{w.profile?.role || "—"}</td>
                    <td className="py-3.5 px-5 font-semibold">{formatAmount(w.balance || 0)}</td>
                    <td className="py-3.5 px-5">
                      {editingLimit === w.id ? (
                        <div className="flex items-center gap-1.5">
                          <input value={newLimit} onChange={(e) => setNewLimit(e.target.value)}
                            className="w-20 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2 text-xs focus:outline-none focus:border-primary/40"
                            placeholder="₹" autoFocus onKeyDown={(e) => e.key === "Enter" && updateLimit(w.id)} />
                          <button onClick={() => updateLimit(w.id)} className="p-1.5 rounded-lg bg-success/10 hover:bg-success/20 transition-colors"><Check className="w-3 h-3 text-success" /></button>
                          <button onClick={() => setEditingLimit(null)} className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors"><X className="w-3 h-3 text-destructive" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingLimit(w.id); setNewLimit(String((w.daily_limit || 0) / 100)); }}
                          className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors group/edit">
                          {formatAmount(w.daily_limit || 0)}
                          <Edit3 className="w-3 h-3 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-muted-foreground">{formatAmount(w.spent_today || 0)}</td>
                    <td className="py-3.5 px-5 text-xs text-muted-foreground">{formatAmount(w.spent_this_month || 0)}</td>
                    <td className="py-3.5 px-5">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        w.is_frozen ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-success/10 text-success border border-success/20"
                      }`}>{w.is_frozen ? "🔒 Frozen" : "● Active"}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <button onClick={() => toggleFreeze(w)}
                        className={`text-xs font-medium px-4 py-2 rounded-xl transition-all duration-300 active:scale-90 ${
                          w.is_frozen
                            ? "bg-success/10 text-success hover:bg-success/20 border border-success/20 hover:shadow-[0_0_15px_hsl(142_71%_45%/0.15)]"
                            : "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 hover:shadow-[0_0_15px_hsl(0_84%_60%/0.15)]"
                        }`}>
                        {w.is_frozen ? "Unfreeze" : "Freeze"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminWallets;
