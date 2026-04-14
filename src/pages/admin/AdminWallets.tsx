import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";

interface WalletRow {
  id: string;
  user_id: string;
  balance: number | null;
  daily_limit: number | null;
  spent_today: number | null;
  is_frozen: boolean | null;
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
    toast.success(w.is_frozen ? "Wallet unfrozen" : "Wallet frozen");
    fetchWallets();
  };

  const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-[22px] font-semibold mb-2">Wallets</h1>
        <p className="text-sm text-muted-foreground mb-6">Total system balance: <span className="font-semibold text-foreground">{formatAmount(totalBalance)}</span></p>

        <div className="rounded-lg bg-card border border-border card-glow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["User", "Role", "Balance", "Daily Limit", "Spent Today", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-3 px-4"><div className="h-5 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : wallets.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No wallets</td></tr>
              ) : (
                wallets.map((w) => (
                  <tr key={w.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{w.profile?.full_name || "—"}</td>
                    <td className="py-3 px-4 capitalize text-muted-foreground">{w.profile?.role || "—"}</td>
                    <td className="py-3 px-4 font-medium">{formatAmount(w.balance || 0)}</td>
                    <td className="py-3 px-4">
                      {editingLimit === w.id ? (
                        <div className="flex gap-1 items-center">
                          <input
                            value={newLimit}
                            onChange={(e) => setNewLimit(e.target.value)}
                            className="w-20 h-7 rounded bg-input border border-border px-2 text-xs"
                            placeholder="₹"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && updateLimit(w.id)}
                          />
                          <button onClick={() => updateLimit(w.id)} className="text-[10px] text-success">✓</button>
                          <button onClick={() => setEditingLimit(null)} className="text-[10px] text-destructive">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingLimit(w.id); setNewLimit(String((w.daily_limit || 0) / 100)); }} className="hover:text-primary transition-colors">
                          {formatAmount(w.daily_limit || 0)}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{formatAmount(w.spent_today || 0)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-pill ${
                        w.is_frozen ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"
                      }`}>
                        {w.is_frozen ? "Frozen" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => toggleFreeze(w)} className="text-xs text-primary hover:underline">
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
