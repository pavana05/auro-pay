import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { useContextPanel } from "@/components/admin/AdminContextPanel";
import { toast } from "sonner";
import { optimistic } from "@/lib/optimistic";
import MaskedReveal from "@/components/admin/MaskedReveal";
import { Wallet, Snowflake, TrendingUp, DollarSign, Search, Check, X, Edit3, ArrowLeftRight, Copy, FileText, Download, CreditCard, ChevronDown } from "lucide-react";
import ForceActionConfirmModal, { type ForceActionPayload } from "@/components/admin/ForceActionConfirmModal";
import HighRiskConfirmGate, { type HighRiskGatePayload } from "@/components/admin/HighRiskConfirmGate";

const FORCE_THRESHOLD_PAISE = 10_000 * 100; // ₹10,000 — must match the edge function
const FREEZE_GATE_THRESHOLD_PAISE = 10_000 * 100; // ₹10,000 balance triggers reason+CONFIRM gate

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
  card_number?: string | null;
  card_expiry_month?: number | null;
  card_expiry_year?: number | null;
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
  const ctxPanel = useContextPanel();
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "frozen">("all");
  const [edit, setEdit] = useState<EditState>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [forcePayload, setForcePayload] = useState<ForceActionPayload | null>(null);
  const [freezeGate, setFreezeGate] = useState<{ wallet: WalletRow; next: boolean; payload: HighRiskGatePayload } | null>(null);
  // Map of wallet_id -> latest confirmed_fraud flag id (used to surface "Unlock account").
  const [fraudLocks, setFraudLocks] = useState<Map<string, string>>(new Map());
  const [unlockGate, setUnlockGate] = useState<{ wallet: WalletRow; flagId: string; payload: HighRiskGatePayload } | null>(null);

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

    // Pull confirmed_fraud flags for frozen wallets so we can show "Unlock account".
    const frozenIds = enriched.filter((w) => w.is_frozen).map((w) => w.id);
    if (frozenIds.length) {
      const { data: flags } = await (supabase as any)
        .from("flagged_transactions")
        .select("id, wallet_id, created_at")
        .eq("status", "confirmed_fraud")
        .in("wallet_id", frozenIds)
        .order("created_at", { ascending: false });
      const m = new Map<string, string>();
      (flags || []).forEach((f: any) => { if (!m.has(f.wallet_id)) m.set(f.wallet_id, f.id); });
      setFraudLocks(m);
    } else {
      setFraudLocks(new Map());
    }
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

    // High-risk gate: balance changes whose delta >= ₹10,000 must go through OTP+reason flow.
    if (edit.field === "balance") {
      const delta = valuePaise - oldVal;
      if (Math.abs(delta) >= FORCE_THRESHOLD_PAISE) {
        setForcePayload({
          wallet_id: w.id,
          kind: delta > 0 ? "credit" : "debit",
          amount_paise: Math.abs(delta),
          user_label: w.profile?.full_name || w.profile?.phone || "this wallet",
        });
        return; // modal will run the mutation server-side
      }
    }

    const update: Record<string, number> = { [edit.field]: valuePaise };
    const { error } = await supabase.from("wallets").update(update as any).eq("id", edit.walletId);
    if (error) { toast.error(error.message); return; }
    await logAudit(`wallet_${edit.field}_updated`, edit.walletId, { from: oldVal, to: valuePaise, user: w.profile?.full_name });
    setSavedFlash(`${edit.walletId}-${edit.field}`);
    setTimeout(() => setSavedFlash(null), 1500);
    setEdit(null);
    fetchWallets();
  };

  // Called by ForceActionConfirmModal once the server has applied + logged the change.
  const handleForceSuccess = (newBalance: number) => {
    if (!forcePayload) return;
    setWallets((prev) => prev.map((x) => x.id === forcePayload.wallet_id ? { ...x, balance: newBalance } : x));
    setSavedFlash(`${forcePayload.wallet_id}-balance`);
    setTimeout(() => setSavedFlash(null), 1500);
    setEdit(null);
    setForcePayload(null);
    fetchWallets();
  };

  const performFreezeToggle = async (w: WalletRow, next: boolean, reason?: string) => {
    return optimistic({
      apply: () => setWallets((prev) => prev.map((x) => x.id === w.id ? { ...x, is_frozen: next } : x)),
      rollback: () => setWallets((prev) => prev.map((x) => x.id === w.id ? { ...x, is_frozen: w.is_frozen } : x)),
      mutate: async () => {
        const u = await supabase.from("wallets").update({ is_frozen: next }).eq("id", w.id);
        if (!u.error) {
          await logAudit(next ? "wallet_freeze" : "wallet_unfreeze", w.id, {
            user: w.profile?.full_name,
            balance_paise: w.balance || 0,
            ...(reason ? { reason, gated: true } : {}),
          });
          if (reason) {
            await supabase.from("notifications").insert({
              user_id: w.user_id,
              title: next ? "🔒 Wallet frozen" : "🔓 Wallet unfrozen",
              body: `An admin ${next ? "froze" : "unfroze"} your wallet. Reason: ${reason.slice(0, 140)}`,
              type: "admin_action",
            });
          }
        }
        return u;
      },
      successMessage: next ? "Wallet frozen" : "Wallet unfrozen",
    });
  };

  const toggleFreeze = async (w: WalletRow) => {
    const next = !w.is_frozen;
    const balance = w.balance || 0;
    const userLabel = w.profile?.full_name || w.profile?.phone || "this wallet";
    // High-risk gate: wallets with balance > ₹10,000 require typed reason + CONFIRM.
    if (balance > FREEZE_GATE_THRESHOLD_PAISE) {
      setFreezeGate({
        wallet: w,
        next,
        payload: {
          title: `${next ? "Freeze" : "Unfreeze"} high-balance wallet`,
          description: `${userLabel} • Balance ${formatAmount(balance)}`,
          confirmLabel: next ? "Freeze wallet" : "Unfreeze wallet",
          destructive: next,
          minReasonLength: 10,
          reasonPlaceholder: next
            ? "e.g. Suspected account takeover — flagged ticket #4471"
            : "e.g. User verified identity over phone, dispute resolved",
        },
      });
      return;
    }
    return performFreezeToggle(w, next);
  };

  // Unlock-account flow specifically for wallets locked by a confirmed_fraud flag.
  // Requires typed reason, unfreezes, audit-logs, and notifies the user that access is restored.
  const requestUnlockAccount = (w: WalletRow) => {
    const flagId = fraudLocks.get(w.id);
    if (!flagId) {
      toast.error("No fraud lock found for this wallet");
      return;
    }
    const userLabel = w.profile?.full_name || w.profile?.phone || "this user";
    setUnlockGate({
      wallet: w,
      flagId,
      payload: {
        title: "Unlock fraud-locked account",
        description: `${userLabel} • Wallet was frozen by a confirmed_fraud flag. Document why access is being restored.`,
        confirmLabel: "Unlock account",
        destructive: false,
        minReasonLength: 15,
        reasonPlaceholder: "e.g. Compliance review #2231 cleared user; charges reversed and identity re-verified on call.",
      },
    });
  };

  const performUnlockAccount = async (w: WalletRow, flagId: string, reason: string) => {
    return optimistic({
      apply: () => setWallets((prev) => prev.map((x) => x.id === w.id ? { ...x, is_frozen: false } : x)),
      rollback: () => setWallets((prev) => prev.map((x) => x.id === w.id ? { ...x, is_frozen: true } : x)),
      mutate: async () => {
        const u = await supabase.from("wallets").update({ is_frozen: false }).eq("id", w.id);
        if (!u.error) {
          await logAudit("wallet_account_unlock", w.id, {
            user: w.profile?.full_name,
            balance_paise: w.balance || 0,
            triggered_by_flag_id: flagId,
            reason,
            gated: true,
          });
          await supabase.from("notifications").insert({
            user_id: w.user_id,
            title: "✅ Your account has been restored",
            body: `Our team has reviewed the recent fraud flag and restored full access to your wallet. Reason: ${reason.slice(0, 160)}`,
            type: "account_restored",
          });
          setFraudLocks((prev) => {
            const m = new Map(prev);
            m.delete(w.id);
            return m;
          });
        }
        return u;
      },
      successMessage: "Account unlocked & user notified",
    });
  };

  const openWalletPanel = (w: WalletRow) => {
    const fraudFlagId = fraudLocks.get(w.id) || null;
    ctxPanel.show({
      title: w.profile?.full_name || "Wallet",
      subtitle: w.profile?.phone || w.id.slice(0, 18) + "…",
      body: (
        <WalletPanelBody
          wallet={w}
          onFreeze={() => toggleFreeze(w)}
          fraudFlagId={fraudFlagId}
          onUnlockAccount={fraudFlagId ? () => requestUnlockAccount(w) : undefined}
        />
      ),
    });
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

        {/* Tabs + search + export */}
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
          <button onClick={() => exportWalletsCsv(filtered)}
            className="flex items-center gap-2 px-4 h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-medium hover:bg-white/[0.06] hover:border-primary/20 transition-all whitespace-nowrap">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
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
                    <tr key={w.id} onClick={() => openWalletPanel(w)} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all duration-200 group cursor-pointer"
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                            w.is_frozen ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-success/10 text-success border border-success/20"
                          }`}>{w.is_frozen ? "🔒 Frozen" : "● Active"}</span>
                          {fraudLocks.has(w.id) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30 whitespace-nowrap" title="Auto-frozen by confirmed_fraud flag">
                              FRAUD
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {fraudLocks.has(w.id) ? (
                            <button onClick={() => requestUnlockAccount(w)}
                              className="text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all active:scale-90 whitespace-nowrap bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25">
                              Unlock account
                            </button>
                          ) : (
                            <button onClick={() => toggleFreeze(w)}
                              className={`text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all active:scale-90 whitespace-nowrap ${
                                w.is_frozen ? "bg-success/10 text-success border border-success/20 hover:bg-success/20" : "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                              }`}>
                              {w.is_frozen ? "Unfreeze" : "Freeze"}
                            </button>
                          )}
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

      <ForceActionConfirmModal
        open={!!forcePayload}
        payload={forcePayload}
        onClose={() => setForcePayload(null)}
        onSuccess={handleForceSuccess}
      />

      <HighRiskConfirmGate
        open={!!freezeGate}
        payload={freezeGate?.payload || null}
        onClose={() => setFreezeGate(null)}
        onConfirm={async (reason) => {
          if (!freezeGate) return;
          await performFreezeToggle(freezeGate.wallet, freezeGate.next, reason);
          setFreezeGate(null);
        }}
      />

      <HighRiskConfirmGate
        open={!!unlockGate}
        payload={unlockGate?.payload || null}
        onClose={() => setUnlockGate(null)}
        onConfirm={async (reason) => {
          if (!unlockGate) return;
          await performUnlockAccount(unlockGate.wallet, unlockGate.flagId, reason);
          setUnlockGate(null);
        }}
      />
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
    <td onClick={(e) => e.stopPropagation()} className={`py-3.5 px-5 transition-colors duration-500 ${flashed ? "bg-success/15" : ""}`}>
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

/* ─────────── Wallet context-panel body ─────────── */
const G = { primary: "#c8952e", secondary: "#d4a84b", success: "#22c55e", danger: "#ef4444", info: "#3b82f6", cyan: "#06b6d4" };

const WalletPanelBody = ({
  wallet, onFreeze,
}: {
  wallet: WalletRow;
  onFreeze: () => void;
}) => {
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [auditOpen, setAuditOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tx, aud] = await Promise.all([
        supabase.from("transactions").select("*").eq("wallet_id", wallet.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("audit_logs").select("*").eq("target_type", "wallet").eq("target_id", wallet.id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (cancelled) return;
      setRecentTx(tx.data || []);
      setAuditEntries(aud.data || []);
      setLoadingTx(false);
    })();
    return () => { cancelled = true; };
  }, [wallet.id]);

  const successCount = recentTx.filter((t) => t.status === "success").length;
  const failedCount = recentTx.filter((t) => t.status === "failed").length;
  const balancePct = wallet.daily_limit ? Math.min(100, ((wallet.spent_today || 0) / wallet.daily_limit) * 100) : 0;
  const monthPct = wallet.monthly_limit ? Math.min(100, ((wallet.spent_this_month || 0) / wallet.monthly_limit) * 100) : 0;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-4">
      {/* Hero balance */}
      <div className="rounded-2xl p-4 border" style={{ background: `linear-gradient(135deg, rgba(200,149,46,0.10), rgba(255,255,255,0.01))`, borderColor: "rgba(200,149,46,0.2)" }}>
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-sora mb-1">Current Balance</p>
        <p className="text-3xl font-bold text-white font-mono">{formatAmount(wallet.balance || 0)}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${wallet.is_frozen ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
            {wallet.is_frozen ? "🔒 Frozen" : "● Active"}
          </span>
          {wallet.profile?.role && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-white/60 uppercase tracking-wider">{wallet.profile.role}</span>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-2">
        <ActionBtn icon={Snowflake} label={wallet.is_frozen ? "Unfreeze wallet" : "Freeze wallet"} color={wallet.is_frozen ? G.success : G.info} onClick={onFreeze} />
      </div>

      {/* Limits with progress */}
      <div className="space-y-2">
        <LimitBar label="Daily" spent={wallet.spent_today || 0} limit={wallet.daily_limit || 0} pct={balancePct} />
        <LimitBar label="Monthly" spent={wallet.spent_this_month || 0} limit={wallet.monthly_limit || 0} pct={monthPct} />
      </div>

      {/* Activity stats */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat k="Last 20 tx" v={recentTx.length.toString()} color={G.primary} />
        <MiniStat k="Success" v={successCount.toString()} color={G.success} />
        <MiniStat k="Failed" v={failedCount.toString()} color={G.danger} />
      </div>

      {/* Card number */}
      {wallet.card_number && (
        <div className="rounded-xl p-3 border space-y-2" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-sora flex items-center gap-1.5">
            <CreditCard className="w-3 h-3" /> Card on file
          </p>
          <div className="flex items-center justify-between text-[11px] text-white/70">
            <span className="font-sora">Number</span>
            <MaskedReveal value={wallet.card_number} kind="card" targetUserId={wallet.user_id} />
          </div>
          {wallet.card_expiry_month && wallet.card_expiry_year && (
            <div className="flex items-center justify-between text-[11px] text-white/70">
              <span className="font-sora">Expiry</span>
              <span className="font-mono">{String(wallet.card_expiry_month).padStart(2, "0")}/{String(wallet.card_expiry_year).slice(-2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Wallet metadata */}
      <div className="rounded-xl p-3 border space-y-2" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-sora">Wallet info</p>
        <button onClick={() => copy(wallet.id, "Wallet ID")} className="w-full flex items-center justify-between text-[11px] hover:text-white text-white/60 group">
          <span className="font-sora">Wallet ID</span>
          <span className="font-mono truncate max-w-[180px] flex items-center gap-1.5">{wallet.id.slice(0, 8)}…{wallet.id.slice(-6)} <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" /></span>
        </button>
        <button onClick={() => copy(wallet.user_id, "User ID")} className="w-full flex items-center justify-between text-[11px] hover:text-white text-white/60 group">
          <span className="font-sora">User ID</span>
          <span className="font-mono truncate max-w-[180px] flex items-center gap-1.5">{wallet.user_id.slice(0, 8)}…{wallet.user_id.slice(-6)} <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" /></span>
        </button>
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span className="font-sora">Created</span>
          <span className="font-mono">{wallet.created_at ? new Date(wallet.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-sora mb-2 flex items-center gap-1.5"><ArrowLeftRight className="w-3 h-3" /> Recent activity</p>
        <div className="max-h-[240px] overflow-y-auto space-y-1">
          {loadingTx ? <p className="text-[11px] text-white/30 text-center py-4">Loading…</p> :
           recentTx.length === 0 ? <p className="text-[11px] text-white/30 text-center py-4">No transactions yet</p> :
           recentTx.slice(0, 12).map((t) => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.015)" }}>
              <div className="min-w-0">
                <p className="text-[11px] text-white truncate font-sora">{t.merchant_name || t.description || t.type}</p>
                <p className="text-[9px] text-white/40 font-mono">{t.created_at ? new Date(t.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
              </div>
              <span className="font-mono text-[11px] font-semibold ml-2 shrink-0" style={{ color: t.type === "credit" ? G.success : G.danger }}>
                {t.type === "credit" ? "+" : "−"}{formatAmount(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit log — always visible collapsible, even when empty */}
      <div>
        <button
          onClick={() => setAuditOpen((v) => !v)}
          className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40 font-sora mb-2 hover:text-white/70 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3 h-3" /> Recent admin actions on this wallet
            <span className="text-white/30 normal-case tracking-normal">({auditEntries.length})</span>
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${auditOpen ? "rotate-180" : ""}`} />
        </button>
        {auditOpen && (
          auditEntries.length === 0 ? (
            <div className="p-3 rounded-lg text-[11px] text-white/40 text-center" style={{ background: "rgba(255,255,255,0.015)" }}>
              No admin actions logged for this wallet yet.
            </div>
          ) : (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {auditEntries.map((a) => (
                <div key={a.id} className="p-2 rounded-lg text-[10px]" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <p className="text-white/80 font-sora capitalize">{String(a.action || "").replace(/_/g, " ")}</p>
                  <p className="text-white/40 font-mono">{new Date(a.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  {a.details && typeof a.details === "object" && (a.details.reason || a.details.amount_paise) && (
                    <p className="text-white/50 font-sora mt-1 truncate">
                      {a.details.amount_paise ? `₹${(Number(a.details.amount_paise) / 100).toLocaleString("en-IN")}` : ""}
                      {a.details.amount_paise && a.details.reason ? " · " : ""}
                      {a.details.reason || ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

const ActionBtn = ({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-95"
    style={{ background: `${color}10`, borderColor: `${color}25` }}>
    <Icon className="w-4 h-4" style={{ color }} />
    <span className="text-[10px] font-semibold font-sora" style={{ color }}>{label}</span>
  </button>
);

const LimitBar = ({ label, spent, limit, pct }: { label: string; spent: number; limit: number; pct: number }) => (
  <div className="rounded-xl p-3 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] uppercase tracking-wider text-white/50 font-sora">{label} spent</span>
      <span className="text-[11px] font-mono text-white">{formatAmount(spent)} / {formatAmount(limit)}</span>
    </div>
    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 90 ? G.danger : pct > 70 ? G.primary : G.success, boxShadow: `0 0 8px ${pct > 90 ? G.danger : pct > 70 ? G.primary : G.success}60` }} />
    </div>
  </div>
);

const MiniStat = ({ k, v, color }: { k: string; v: string; color: string }) => (
  <div className="rounded-xl p-2.5 border text-center" style={{ background: `${color}08`, borderColor: `${color}20` }}>
    <p className="text-[9px] uppercase tracking-wider text-white/40 font-sora">{k}</p>
    <p className="text-base font-bold font-mono mt-0.5" style={{ color }}>{v}</p>
  </div>
);

/* ─────────── CSV export ─────────── */
function exportWalletsCsv(rows: WalletRow[]) {
  if (!rows.length) { toast.info("No wallets to export"); return; }
  const headers = [
    "wallet_id", "user_id", "full_name", "phone", "role",
    "balance_inr", "daily_limit_inr", "monthly_limit_inr",
    "spent_today_inr", "spent_this_month_inr", "is_frozen", "created_at",
  ];
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  rows.forEach((w) => {
    lines.push([
      w.id, w.user_id,
      w.profile?.full_name || "", w.profile?.phone || "", w.profile?.role || "",
      ((w.balance || 0) / 100).toFixed(2),
      ((w.daily_limit || 0) / 100).toFixed(2),
      ((w.monthly_limit || 0) / 100).toFixed(2),
      ((w.spent_today || 0) / 100).toFixed(2),
      ((w.spent_this_month || 0) / 100).toFixed(2),
      w.is_frozen ? "yes" : "no",
      w.created_at || "",
    ].map(escape).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wallets_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} wallets`);
}

export default AdminWallets;
