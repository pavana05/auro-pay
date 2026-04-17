// Reusable high-risk confirmation gate.
// Requires: typed "CONFIRM" + a typed reason (default ≥ 10 chars).
// Used for non-money admin actions like wallet freeze/unfreeze on high-balance
// wallets and manual KYC approval. The caller provides an onConfirm(reason)
// callback that performs the actual mutation + audit write.
import { useEffect, useState } from "react";
import { ShieldAlert, X, Loader2 } from "lucide-react";

export interface HighRiskGatePayload {
  title: string;          // e.g. "Freeze wallet" / "Approve KYC"
  description: string;    // 1-line context (e.g. user name + balance/role)
  confirmLabel?: string;  // CTA text, default "Confirm"
  destructive?: boolean;  // tints CTA red; default false (gold)
  minReasonLength?: number; // default 10
  reasonPlaceholder?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  payload: HighRiskGatePayload | null;
}

const HighRiskConfirmGate = ({ open, onClose, onConfirm, payload }: Props) => {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason(""); setConfirmText(""); setSubmitting(false);
    }
  }, [open, payload?.title]);

  if (!open || !payload) return null;

  const minLen = payload.minReasonLength ?? 10;
  const reasonOk = reason.trim().length >= minLen;
  const confirmOk = confirmText.trim().toUpperCase() === "CONFIRM";
  const canSubmit = reasonOk && confirmOk && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const accent = payload.destructive ? "hsl(var(--destructive))" : "hsl(var(--primary))";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[460px] rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "hsl(220 18% 7%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex items-start justify-between border-b border-white/[0.06]"
          style={{ background: `linear-gradient(135deg, ${accent.replace(")", " / 0.10)")}, transparent)` }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${accent.replace(")", " / 0.15)")}`, color: accent }}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">{payload.title}</h3>
              <p className="text-[11px] text-white/55 mt-0.5">{payload.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-lg p-3 border text-[11px] leading-relaxed"
            style={{ background: `${accent.replace(")", " / 0.08)")}`, borderColor: `${accent.replace(")", " / 0.25)")}`, color: accent }}>
            High-risk action — a typed reason is recorded in the audit log so compliance can review later.
          </div>

          <div>
            <label className="text-[11px] font-medium text-white/70 flex items-center justify-between mb-1.5">
              <span>Reason</span>
              <span className={`text-[10px] font-mono ${reasonOk ? "text-success" : "text-white/40"}`}>
                {reason.trim().length}/{minLen}
              </span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder={payload.reasonPlaceholder || "Brief justification — referenced ticket, supervisor, etc."}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-[12px] text-white bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:outline-none resize-none"
            />
            {!reasonOk && reason.length > 0 && (
              <p className="text-[10px] text-white/40 mt-1">Must be at least {minLen} characters.</p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium text-white/70 mb-1.5 block">
              Type <span className="font-mono text-primary">CONFIRM</span> to proceed
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="CONFIRM"
              className="w-full h-10 rounded-lg px-3 text-[14px] font-mono tracking-[3px] text-white bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} disabled={submitting}
              className="flex-1 h-10 rounded-lg text-[12px] font-semibold border border-white/[0.08] text-white/70 hover:text-white disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="flex-1 h-10 rounded-lg text-[12px] font-semibold text-black disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ background: accent }}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {payload.confirmLabel || "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighRiskConfirmGate;
