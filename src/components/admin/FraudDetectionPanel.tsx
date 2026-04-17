import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, ShieldAlert, Snowflake, TrendingUp, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FlagRow {
  wallet_id: string;
  user_id: string;
  full_name: string | null;
  reason: string;
  detail: string;
  severity: "high" | "medium";
  amount?: number;
  count?: number;
}

const HIGH_VALUE_PAISE = 500000; // ₹5,000
const RAPID_DEBIT_THRESHOLD = 3; // 3+ debits ≥ ₹5k in 1h
const FAILED_TXN_THRESHOLD = 5; // 5+ failed txns in 1h

export default function FraudDetectionPanel() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState<string | null>(null);
  const [frozenWallets, setFrozenWallets] = useState<Set<string>>(new Set());

  const freezeWallet = useCallback(async (f: FlagRow) => {
    if (!confirm(`Freeze wallet for ${f.full_name || "this user"}?\n\nReason: ${f.reason}\n\nThis will block all transactions and resolve open flags. The user will be notified.`)) {
      return;
    }
    setFreezing(f.wallet_id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-freeze-wallet", {
        body: {
          wallet_id: f.wallet_id,
          user_id: f.user_id,
          reason: `${f.reason} — ${f.detail}`,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Wallet frozen · ${(data as any)?.flags_resolved ?? 0} flag(s) resolved`);
      setFrozenWallets((s) => new Set(s).add(f.wallet_id));
    } catch (err: any) {
      toast.error(err?.message || "Failed to freeze wallet");
    } finally {
      setFreezing(null);
    }
  }, []);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: txns } = await supabase
        .from("transactions")
        .select("id, wallet_id, type, amount, status, created_at")
        .gte("created_at", sinceIso)
        .limit(2000);

      const byWalletDebit: Record<string, { total: number; count: number }> = {};
      const byWalletFailed: Record<string, number> = {};

      (txns || []).forEach((t: any) => {
        if (t.type === "debit" && t.amount >= HIGH_VALUE_PAISE && t.status === "success") {
          const w = byWalletDebit[t.wallet_id] || { total: 0, count: 0 };
          w.total += t.amount; w.count += 1;
          byWalletDebit[t.wallet_id] = w;
        }
        if (t.status === "failed") {
          byWalletFailed[t.wallet_id] = (byWalletFailed[t.wallet_id] || 0) + 1;
        }
      });

      const suspectWalletIds = new Set([
        ...Object.entries(byWalletDebit).filter(([, v]) => v.count >= RAPID_DEBIT_THRESHOLD).map(([k]) => k),
        ...Object.entries(byWalletFailed).filter(([, c]) => c >= FAILED_TXN_THRESHOLD).map(([k]) => k),
      ]);

      if (suspectWalletIds.size === 0) {
        setFlags([]);
        setLoading(false);
        return;
      }

      const { data: wallets } = await supabase
        .from("wallets")
        .select("id, user_id")
        .in("id", Array.from(suspectWalletIds));

      const userIds = (wallets || []).map((w: any) => w.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
      const walletMap = new Map((wallets || []).map((w: any) => [w.id, w.user_id]));

      const out: FlagRow[] = [];
      Object.entries(byWalletDebit).forEach(([wid, v]) => {
        if (v.count >= RAPID_DEBIT_THRESHOLD && walletMap.has(wid)) {
          const uid = walletMap.get(wid)!;
          out.push({
            wallet_id: wid, user_id: uid,
            full_name: profMap.get(uid) || null,
            reason: "Rapid high-value debits",
            detail: `${v.count} debits totaling ₹${(v.total / 100).toLocaleString("en-IN")} in last hour`,
            severity: "high",
            amount: v.total, count: v.count,
          });
        }
      });
      Object.entries(byWalletFailed).forEach(([wid, c]) => {
        if (c >= FAILED_TXN_THRESHOLD && walletMap.has(wid)) {
          const uid = walletMap.get(wid)!;
          out.push({
            wallet_id: wid, user_id: uid,
            full_name: profMap.get(uid) || null,
            reason: "Repeated failed transactions",
            detail: `${c} failed transactions in last hour`,
            severity: "medium",
            count: c,
          });
        }
      });

      setFlags(out.sort((a, b) => (a.severity === "high" ? -1 : 1)));
    } catch (e) {
      console.error("fraud scan error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    scan();
    const t = setInterval(scan, 60_000);
    return () => clearInterval(t);
  }, [scan]);

  return (
    <div
      className="rounded-[16px] border p-4 lg:p-5 space-y-3"
      style={{ background: "rgba(13,14,18,0.85)", borderColor: "rgba(239,68,68,0.18)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
          <h3 className="text-[13px] font-semibold text-white font-sora">Fraud Detection · Last 1h</h3>
          {flags.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/30 text-[10px] font-bold text-[#ef4444]">
              {flags.length}
            </span>
          )}
        </div>
        <button
          onClick={scan}
          className="p-1.5 rounded-[8px] bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition"
          aria-label="Rescan"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-white/60 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && flags.length === 0 ? (
        <div className="text-[11px] text-white/40 font-sora py-6 text-center">Scanning recent activity…</div>
      ) : flags.length === 0 ? (
        <div className="text-[11px] text-white/40 font-sora py-6 text-center">
          ✓ No suspicious activity detected in last hour
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {flags.map((f) => (
            <div
              key={f.wallet_id + f.reason}
              className="flex items-start gap-3 p-3 rounded-[10px] border"
              style={{
                background: f.severity === "high" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.06)",
                borderColor: f.severity === "high" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.2)",
              }}
            >
              <div className="mt-0.5">
                {f.severity === "high"
                  ? <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
                  : <XCircle className="w-4 h-4 text-[#f59e0b]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-semibold text-white font-sora truncate">
                    {f.full_name || "Unknown user"}
                  </span>
                  <span className="text-[9px] text-white/40 font-mono">{f.user_id.slice(0, 8)}…</span>
                </div>
                <div className="text-[11px] text-white/70 font-sora">{f.reason}</div>
                <div className="text-[10px] text-white/50 font-sora mt-0.5">{f.detail}</div>
              </div>
              <div className="text-right shrink-0">
                {f.amount ? (
                  <div className="text-[11px] font-bold text-white font-mono flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-[#ef4444]" />
                    ₹{(f.amount / 100).toLocaleString("en-IN")}
                  </div>
                ) : (
                  <div className="text-[11px] font-bold text-[#f59e0b] font-mono">{f.count}×</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
