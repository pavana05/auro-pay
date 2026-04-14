import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Snowflake, DollarSign, Shield, Clock } from "lucide-react";
import { toast } from "sonner";

const categories = ["food", "transport", "education", "shopping", "entertainment", "other"];
const categoryIcons: Record<string, string> = {
  food: "🍔", transport: "🚗", education: "📚", shopping: "🛍️", entertainment: "🎮", other: "💸",
};

const ParentTeenDetail = () => {
  const { teenId } = useParams();
  const navigate = useNavigate();
  const [teen, setTeen] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [spendingLimits, setSpendingLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const [editingLimit, setEditingLimit] = useState(false);
  const [newDailyLimit, setNewDailyLimit] = useState("");
  const [tab, setTab] = useState<"overview" | "limits" | "history">("overview");

  const fetchData = async () => {
    if (!teenId) return;
    setLoading(true);

    const [profileRes, walletRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", teenId).single(),
      supabase.from("wallets").select("*").eq("user_id", teenId).single(),
    ]);

    setTeen(profileRes.data);
    if (walletRes.data) {
      setWallet(walletRes.data);
      setNewDailyLimit(String((walletRes.data.daily_limit || 0) / 100));

      const [txRes, limitsRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("wallet_id", walletRes.data.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("spending_limits").select("*").eq("teen_wallet_id", walletRes.data.id),
      ]);
      setTransactions(txRes.data || []);
      setSpendingLimits(limitsRes.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [teenId]);

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const toggleFreeze = async () => {
    if (!wallet) return;
    setFreezing(true);
    const { error } = await supabase.from("wallets").update({ is_frozen: !wallet.is_frozen }).eq("id", wallet.id);
    if (error) toast.error("Failed to update");
    else {
      toast.success(wallet.is_frozen ? "Wallet unfrozen" : "Wallet frozen");
      fetchData();
    }
    setFreezing(false);
  };

  const updateDailyLimit = async () => {
    if (!wallet) return;
    const limitPaise = Math.round(parseFloat(newDailyLimit) * 100);
    if (isNaN(limitPaise) || limitPaise <= 0) { toast.error("Enter a valid amount"); return; }
    const { error } = await supabase.from("wallets").update({ daily_limit: limitPaise }).eq("id", wallet.id);
    if (error) toast.error("Failed to update");
    else { toast.success("Daily limit updated"); setEditingLimit(false); fetchData(); }
  };

  const toggleCategoryBlock = async (category: string) => {
    if (!wallet) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = spendingLimits.find(sl => sl.category === category);
    if (existing) {
      // Can't update via anon, delete and re-insert
      // Toggle block
      const { error } = await supabase.from("spending_limits").delete().eq("id", existing.id);
      if (!error && !existing.is_blocked) {
        await supabase.from("spending_limits").insert({
          teen_wallet_id: wallet.id,
          category,
          is_blocked: true,
          set_by_parent_id: user.id,
        });
      } else if (!error && existing.is_blocked) {
        // Unblock - just delete was enough
      }
    } else {
      await supabase.from("spending_limits").insert({
        teen_wallet_id: wallet.id,
        category,
        is_blocked: true,
        set_by_parent_id: user.id,
      });
    }
    fetchData();
  };

  const initials = teen?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="w-full h-40 rounded-lg bg-muted animate-pulse mb-4" />
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="w-full h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold">{teen?.full_name}</p>
            <p className="text-xs text-muted-foreground">{teen?.phone || "Teen Account"}</p>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className={`gradient-card rounded-lg p-5 mb-4 card-glow border border-border ${wallet?.is_frozen ? "opacity-60 grayscale" : ""}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium tracking-wider text-muted-foreground">BALANCE</span>
          {wallet?.is_frozen && <span className="text-xs font-medium text-destructive bg-destructive/20 px-2 py-0.5 rounded-pill">Frozen</span>}
        </div>
        <p className="text-[36px] font-bold tracking-[-2px]">{formatAmount(wallet?.balance || 0)}</p>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>Daily: {formatAmount(wallet?.daily_limit || 0)}</span>
          <span>Spent: {formatAmount(wallet?.spent_today || 0)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={toggleFreeze}
          disabled={freezing}
          className={`h-12 rounded-pill border text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            wallet?.is_frozen
              ? "border-success/40 text-success hover:bg-success/5"
              : "border-destructive/40 text-destructive hover:bg-destructive/5"
          }`}
        >
          <Snowflake className="w-4 h-4" />
          {wallet?.is_frozen ? "Unfreeze" : "Freeze Card"}
        </button>
        <button
          onClick={() => navigate(`/parent/add-money?teen=${teenId}`)}
          className="h-12 rounded-pill gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <DollarSign className="w-4 h-4" /> Add Money
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-card border border-border mb-4">
        {(["overview", "limits", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
              tab === t ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview" ? "Overview" : t === "limits" ? "Controls" : "History"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          {/* Daily Limit Editor */}
          <div className="p-4 rounded-lg bg-card border border-border card-glow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Daily Limit</span>
              <button onClick={() => setEditingLimit(!editingLimit)} className="text-xs text-primary font-medium">
                {editingLimit ? "Cancel" : "Edit"}
              </button>
            </div>
            {editingLimit ? (
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-1 bg-input border border-border rounded-[14px] px-3">
                  <span className="text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={newDailyLimit}
                    onChange={e => setNewDailyLimit(e.target.value)}
                    className="bg-transparent flex-1 h-10 outline-none text-sm"
                  />
                </div>
                <button onClick={updateDailyLimit} className="px-4 h-10 rounded-pill gradient-primary text-primary-foreground text-xs font-semibold">
                  Save
                </button>
              </div>
            ) : (
              <p className="text-2xl font-bold">{formatAmount(wallet?.daily_limit || 0)}</p>
            )}
          </div>

          {/* Spending by Category */}
          <div className="p-4 rounded-lg bg-card border border-border card-glow">
            <h4 className="text-sm font-medium mb-3">Spending by Category</h4>
            {categories.map(cat => {
              const catTxns = transactions.filter(t => t.category === cat && t.type === "debit");
              const total = catTxns.reduce((s, t) => s + t.amount, 0);
              const isBlocked = spendingLimits.find(sl => sl.category === cat)?.is_blocked;
              return (
                <div key={cat} className="flex items-center gap-3 py-2">
                  <span className="text-lg">{categoryIcons[cat]}</span>
                  <span className="text-sm capitalize flex-1">{cat}</span>
                  <span className={`text-sm font-medium ${isBlocked ? "text-destructive line-through" : ""}`}>
                    {formatAmount(total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "limits" && (
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-card border border-border card-glow">
            <h4 className="text-sm font-medium mb-1">Category Controls</h4>
            <p className="text-xs text-muted-foreground mb-4">Block or allow spending categories</p>
            {categories.map(cat => {
              const isBlocked = spendingLimits.find(sl => sl.category === cat)?.is_blocked || false;
              return (
                <div key={cat} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{categoryIcons[cat]}</span>
                    <span className="text-sm capitalize">{cat}</span>
                  </div>
                  <button
                    onClick={() => toggleCategoryBlock(cat)}
                    className={`px-3 py-1 rounded-pill text-xs font-medium transition-all ${
                      isBlocked
                        ? "bg-destructive/20 text-destructive"
                        : "bg-success/20 text-success"
                    }`}
                  >
                    {isBlocked ? "Blocked" : "Allowed"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border card-glow">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                  {categoryIcons[tx.category || "other"] || "💸"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.merchant_name || tx.description || "Transaction"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{tx.category}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                    {tx.type === "credit" ? "+" : "-"}{formatAmount(tx.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ParentTeenDetail;
