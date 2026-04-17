import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { useContextPanel } from "@/components/admin/AdminContextPanel";
import { toast } from "sonner";
import { Wallet, Snowflake, TrendingUp, DollarSign, Search, Plus, Minus, Check, X, Edit3, ArrowLeftRight, Activity, ShieldAlert, Copy, FileText } from "lucide-react";

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
  profile?: { full_name: string | null; phone: string | null; role: string | null };
}

const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

const BALANCE_BUCKETS = [
  { label: "₹0", test: (b: number) => b === 0 },
  { label: "₹1–100", test: (b: number) => b > 0 && b <= 10000 },
  { label: "₹101–500", test: (b: number) => b > 10000 && b <= 50000 },
  { label: "₹501–1k", test: (b: number) => b > 50000 && b <= 100000 },
  { label: "₹1k+", test: (b: number) => b > 100000 },
];

type EditField = "balance" | "daily_limit" | "monthly_limit";
type EditState = { walletId: string; field: EditField; value: string } | null;

const AdminWallets = () => {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "frozen">("all");
  const [edit, setEdit] = useState<EditState>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [fundsModal, setFundsModal] = useState<{ wallet: WalletRow; mode: "add" | "deduct" } | null>(null);

  const fetchWallets = async () => {
    setLoading(true);
    const { data } = await supabase.from("wallets").select("*").order("created_at", { ascending: false });
    const enriched = await Promise.all(
      ((data || []) as WalletRow[]).map(async (w) => {
        const { data: p } = await supabase.from("profiles").select("full_name, phone, role").eq("id", w.user_id).single();
        return { ...w, profile: p || undefined };
      })
    );
    setWallets(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchWallets(); }, []);

  const logAudit = async (action: string, walletId: string, details: Record<string, any> = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({ admin_user_id: user.id, action, target_type: "wallet", target_id: walletId, details });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wallets.filter((w) => {
      if (tab === "frozen" && !w.is_frozen) return false;
      if (q) {
        const hit = (w.profile?.full_name || "").toLowerCase().includes(q) || (w.profile?.phone || "").includes(q) || w.id.includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [wallets, tab, search]);

  const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const frozenCount = wallets.filter((w) => w.is_frozen).length;
  const activeCount = wallets.length - frozenCount;

  const distribution = BALANCE_BUCKETS.map((b) => ({
    label: b.label,
    count: wallets.filter((w) => b.test(w.balance || 0)).length,
  }));
  const maxBucket = Math.max(1, ...distribution.map((d) => d.count));

  const startEdit = (w: WalletRow, field: EditField) => {
    const cur = w[field] || 0;
    setEdit({ walletId: w.id, field, value: String((cur as number) / 100) });
  };

  const saveEdit = async () => {
    if (!edit) return;
    const valuePaise = Math.round(parseFloat(edit.value) * 100);
    if (isNaN(valuePaise) || valuePaise < 0) { toast.error("Invalid value"); return; }
    const w = wallets.find((x) => x.id === edit.walletId);
    if (!w) return;
    const oldVal = (w[edit.field] as number) || 0;
    const update: Record<string, number> = { [edit.field]: valuePaise };
    const { error } = await supabase.from("wallets").update(update as any).eq("id", edit.walletId);
    if (error) { toast.error(error.message); return; }
    await logAudit(`wallet_${edit.field}_updated`, edit.walletId, { from: oldVal, to: valuePaise, user: w.profile?.full_name });
    setSavedFlash(`${edit.walletId}-${edit.field}`);
    setTimeout(() => setSavedFlash(null), 1500);
    setEdit(null);
    fetchWallets();
  };

  const toggleFreeze = async (w: WalletRow) => {
    await supabase.from("wallets").update({ is_frozen: !w.is_frozen }).eq("id", w.id);
    await logAudit(w.is_frozen ? "wallet_unfreeze" : "wallet_freeze", w.id, { user: w.profile?.full_name });
    toast.success(w.is_frozen ? "Wallet unfrozen" : "Wallet frozen");
    fetchWallets();
  };

  const summaryCards = [
    { label: "System Balance", value: formatAmount(totalBalance), icon: DollarSign, color: "text-primary", hero: true },
    { label: "Total Wallets", value: wallets.length, icon: Wallet, color: "text-accent" },
    { label: "Active", value: activeCount, icon: TrendingUp, color: "text-success" },
    { label: "Frozen", value: frozenCount, icon: Snowflake, color: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 left-1/2 w-[400px] h-[350px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none -translate-x-1/2" />

        {/* Header */}
        <div className="relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <h1 className="text-2xl font-bold tracking-tight">Wallet Management</h1>
          <p className="text-xs text-muted-foreground mt-1">Financial control center • inline edits • audit-logged</p>
        </div>

        {/* Hero balance + summary */}
        <div className="grid grid-cols-4 gap-3">
          {summaryCards.map((s, i) => (
            <div key={s.label}
              className={`group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/15 transition-all duration-500 relative overflow-hidden ${s.hero ? "col-span-1" : ""}`}
              style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.06 + i * 0.05}s both` }}>
              <div className={`w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center ${s.color} mb-2`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className={`text-xl font-bold ${s.hero ? "text-primary" : ""}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Distribution chart */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.2s both" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">Balance Distribution</p>
              <p className="text-[10px] text-muted-foreground">Wallet count per balance range</p>
            </div>
          </div>
          <div className="flex items-end gap-3 h-32">
            {distribution.map((d, i) => {
              const h = (d.count / maxBucket) * 100;
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold">{d.count}</span>
                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full rounded-lg bg-gradient-to-t from-primary/40 to-primary/10 border border-primary/20 transition-all duration-500"
                      style={{ height: `${Math.max(h, 4)}%`, animation: `slide-up-spring 0.6s ${0.3 + i * 0.05}s both` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs + search */}
        <div className="flex items-center gap-3" style={{ animation: "slide-up-spring 0.5s 0.25s both" }}>
          <div className="flex gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
            {[{ k: "all", label: `All (${wallets.length})` }, { k: "frozen", label: `Frozen (${frozenCount})` }].map((t) => (
              <button key={t.k} onClick={() => setTab(t.k as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, wallet ID…"
              className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-11 pr-4 text-sm focus:outline-none focus:border-primary/40 transition-all" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden backdrop-blur-sm" style={{ animation: "slide-up-spring 0.5s 0.3s both" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["User", "Balance", "Daily Limit", "Monthly Limit", "Spent Today", "Spent Month", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left py-4 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
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
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm text-muted-foreground">No wallets found</p>
                  </td></tr>
                ) : (
                  filtered.map((w, i) => (
                    <tr key={w.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all duration-200 group"
                      style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i * 0.03, 0.3)}s both` }}>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-[11px] font-semibold text-primary">
                            {(w.profile?.full_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-xs">{w.profile?.full_name || "—"}</div>
                            <div className="text-[10px] text-muted-foreground">{w.profile?.phone || w.profile?.role || ""}</div>
                          </div>
                        </div>
                      </td>
                      <InlineCell w={w} field="balance" edit={edit} setEdit={setEdit} startEdit={startEdit} saveEdit={saveEdit} savedFlash={savedFlash} />
                      <InlineCell w={w} field="daily_limit" edit={edit} setEdit={setEdit} startEdit={startEdit} saveEdit={saveEdit} savedFlash={savedFlash} />
                      <InlineCell w={w} field="monthly_limit" edit={edit} setEdit={setEdit} startEdit={startEdit} saveEdit={saveEdit} savedFlash={savedFlash} />
                      <td className="py-3.5 px-5 text-xs text-muted-foreground whitespace-nowrap">{formatAmount(w.spent_today || 0)}</td>
                      <td className="py-3.5 px-5 text-xs text-muted-foreground whitespace-nowrap">{formatAmount(w.spent_this_month || 0)}</td>
                      <td className="py-3.5 px-5">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          w.is_frozen ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-success/10 text-success border border-success/20"
                        }`}>{w.is_frozen ? "🔒 Frozen" : "● Active"}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setFundsModal({ wallet: w, mode: "add" })}
                            className="p-1.5 rounded-lg bg-success/10 hover:bg-success/20 border border-success/20 transition-all" title="Add funds">
                            <Plus className="w-3.5 h-3.5 text-success" />
                          </button>
                          <button onClick={() => setFundsModal({ wallet: w, mode: "deduct" })}
                            className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 transition-all" title="Deduct funds">
                            <Minus className="w-3.5 h-3.5 text-destructive" />
                          </button>
                          <button onClick={() => toggleFreeze(w)}
                            className={`text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all active:scale-90 whitespace-nowrap ${
                              w.is_frozen ? "bg-success/10 text-success border border-success/20 hover:bg-success/20" : "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                            }`}>
                            {w.is_frozen ? "Unfreeze" : "Freeze"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {fundsModal && (
        <FundsModal
          wallet={fundsModal.wallet}
          mode={fundsModal.mode}
          onClose={() => setFundsModal(null)}
          onDone={() => { setFundsModal(null); fetchWallets(); }}
        />
      )}
    </AdminLayout>
  );
};

const InlineCell = ({
  w, field, edit, setEdit, startEdit, saveEdit, savedFlash,
}: {
  w: WalletRow;
  field: EditField;
  edit: EditState;
  setEdit: (e: EditState) => void;
  startEdit: (w: WalletRow, f: EditField) => void;
  saveEdit: () => void;
  savedFlash: string | null;
}) => {
  const isEditing = edit?.walletId === w.id && edit?.field === field;
  const flashed = savedFlash === `${w.id}-${field}`;
  const value = (w[field] as number) || 0;

  return (
    <td className={`py-3.5 px-5 transition-colors duration-500 ${flashed ? "bg-success/15" : ""}`}>
      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <input value={edit.value} onChange={(e) => setEdit({ ...edit!, value: e.target.value })}
            className="w-24 h-8 rounded-lg bg-white/[0.04] border border-primary/30 px-2 text-xs focus:outline-none focus:border-primary/60"
            placeholder="₹" autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEdit(null); }} />
          <button onClick={saveEdit} className="p-1.5 rounded-lg bg-success/10 hover:bg-success/20 transition-colors"><Check className="w-3 h-3 text-success" /></button>
          <button onClick={() => setEdit(null)} className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors"><X className="w-3 h-3 text-destructive" /></button>
        </div>
      ) : (
        <button onClick={() => startEdit(w, field)} className="flex items-center gap-1.5 text-xs font-semibold hover:text-primary transition-colors group/edit whitespace-nowrap">
          {formatAmount(value)}
          <Edit3 className="w-3 h-3 opacity-0 group-hover/edit:opacity-100 text-muted-foreground transition-opacity" />
        </button>
      )}
    </td>
  );
};

const FundsModal = ({
  wallet, mode, onClose, onDone,
}: {
  wallet: WalletRow;
  mode: "add" | "deduct";
  onClose: () => void;
  onDone: () => void;
}) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const isAdd = mode === "add";

  const submit = async () => {
    const paise = Math.round(parseFloat(amount) * 100);
    if (isNaN(paise) || paise <= 0) { toast.error("Enter a valid amount"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    if (confirm !== "CONFIRM") { toast.error("Type CONFIRM to proceed"); return; }
    if (!isAdd && (wallet.balance || 0) < paise) { toast.error("Insufficient balance"); return; }

    setLoading(true);
    const newBalance = (wallet.balance || 0) + (isAdd ? paise : -paise);
    const { error: wErr } = await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
    if (wErr) { toast.error(wErr.message); setLoading(false); return; }

    await supabase.from("transactions").insert({
      wallet_id: wallet.id,
      type: isAdd ? "credit" : "debit",
      amount: paise,
      status: "success",
      category: "admin_manual",
      description: `Admin ${isAdd ? "credit" : "debit"}: ${reason}`,
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_logs").insert({
        admin_user_id: user.id,
        action: isAdd ? "wallet_funds_added" : "wallet_funds_deducted",
        target_type: "wallet",
        target_id: wallet.id,
        details: { amount: paise, reason, user: wallet.profile?.full_name, old_balance: wallet.balance, new_balance: newBalance },
      });
    }

    toast.success(`${isAdd ? "Credited" : "Debited"} ${formatAmount(paise)}`);
    setLoading(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(5,6,9,0.7)", backdropFilter: "blur(8px)", animation: "fade-in 0.2s ease-out" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 rounded-2xl bg-card border border-white/[0.06] shadow-2xl"
        style={{ animation: "slide-up-spring 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold">{isAdd ? "Add Funds" : "Deduct Funds"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{wallet.profile?.full_name} • Balance {formatAmount(wallet.balance || 0)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05]"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" autoFocus
              className="mt-1 w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-sm focus:outline-none focus:border-primary/40" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reason (logged to audit)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              placeholder={isAdd ? "Refund for failed transaction…" : "Chargeback recovery…"}
              className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm focus:outline-none focus:border-primary/40 resize-none" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type CONFIRM to proceed</label>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value.toUpperCase())} placeholder="CONFIRM"
              className="mt-1 w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-sm font-mono focus:outline-none focus:border-primary/40" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-medium hover:bg-white/[0.06]">Cancel</button>
          <button onClick={submit} disabled={loading || confirm !== "CONFIRM"}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all ${
              isAdd ? "bg-success/15 text-success border border-success/30 hover:bg-success/25" : "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25"
            } disabled:opacity-40 disabled:cursor-not-allowed`}>
            {loading ? "Processing…" : isAdd ? "Add Funds" : "Deduct Funds"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminWallets;
