// Force-action confirmation: typed reason (≥20 chars) + 6-digit OTP emailed to admin.
// Used for high-risk wallet credit/debit (>= ₹10,000). The actual mutation runs on
// the admin-force-wallet-adjust edge function which re-validates everything server-side.
import { useEffect, useState } from "react";
import { ShieldAlert, X, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ForceActionPayload {
  wallet_id: string;
  kind: "credit" | "debit";
  amount_paise: number;
  user_label?: string; // shown in summary header
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  payload: ForceActionPayload | null;
}

const formatINR = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

const ForceActionConfirmModal = ({ open, onClose, onSuccess, payload }: Props) => {
  const [reason, setReason] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setReason(""); setOtp(""); setOtpSent(false); setMaskedEmail(null); setResendCooldown(0);
    }
  }, [open, payload?.wallet_id]);

  // Countdown for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  if (!open || !payload) return null;

  const requestOtp = async () => {
    setRequesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-force-wallet-adjust", {
        body: { action: "request_otp" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMaskedEmail((data as any)?.masked_email || null);
      setOtpSent(true);
      setResendCooldown(45);
      toast.success("Verification code sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send code");
    } finally {
      setRequesting(false);
    }
  };

  const reasonOk = reason.trim().length >= 20;
  const otpOk = /^\d{6}$/.test(otp);
  const canConfirm = reasonOk && otpOk && otpSent && !confirming;

  const confirm = async () => {
    if (!canConfirm) return;
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-force-wallet-adjust", {
        body: {
          action: "confirm",
          wallet_id: payload.wallet_id,
          kind: payload.kind,
          amount_paise: payload.amount_paise,
          reason: reason.trim(),
          otp,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(payload.kind === "credit" ? "Wallet credited" : "Wallet debited");
      onSuccess(Number((data as any)?.new_balance || 0));
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Confirmation failed");
    } finally {
      setConfirming(false);
    }
  };

  const isCredit = payload.kind === "credit";
  const accent = isCredit ? "hsl(var(--success))" : "hsl(var(--destructive))";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[460px] rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "hsl(220 18% 7%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 flex items-start justify-between border-b border-white/[0.06]"
          style={{ background: `linear-gradient(135deg, ${accent.replace(")", " / 0.10)")}, transparent)` }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${accent.replace(")", " / 0.15)")}`, color: accent }}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">Force {isCredit ? "credit" : "debit"} — high-value</h3>
              <p className="text-[11px] text-white/55 mt-0.5">
                {formatINR(payload.amount_paise)} {isCredit ? "to" : "from"} {payload.user_label || "this wallet"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Warning */}
          <div className="rounded-lg p-3 border text-[11px] leading-relaxed"
            style={{ background: "hsl(var(--destructive) / 0.08)", borderColor: "hsl(var(--destructive) / 0.25)", color: "hsl(var(--destructive))" }}>
            This action moves real money and is irreversible. A typed reason and an email OTP are required for the audit trail.
          </div>

          {/* Reason */}
          <div>
            <label className="text-[11px] font-medium text-white/70 flex items-center justify-between mb-1.5">
              <span>Reason for this action</span>
              <span className={`text-[10px] font-mono ${reasonOk ? "text-success" : "text-white/40"}`}>
                {reason.trim().length}/20
              </span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Customer raised dispute #1284 — refund approved by ops lead Priya on 12-Apr."
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-[12px] text-white bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:outline-none resize-none"
            />
            {!reasonOk && reason.length > 0 && (
              <p className="text-[10px] text-white/40 mt-1">Must be at least 20 characters.</p>
            )}
          </div>

          {/* OTP */}
          <div>
            <label className="text-[11px] font-medium text-white/70 mb-1.5 block">
              Email verification code
            </label>
            {!otpSent ? (
              <button
                onClick={requestOtp}
                disabled={requesting || !reasonOk}
                className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-[12px] font-semibold border disabled:opacity-40"
                style={{ background: "hsl(var(--primary) / 0.10)", borderColor: "hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }}
              >
                {requesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                Send code to my email
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    className="flex-1 rounded-lg px-3 h-10 text-[14px] text-white font-mono tracking-[6px] text-center bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:outline-none"
                  />
                  <button
                    onClick={requestOtp}
                    disabled={requesting || resendCooldown > 0}
                    className="h-10 px-3 rounded-lg text-[10px] font-semibold border border-white/[0.08] text-white/60 hover:text-white disabled:opacity-40 whitespace-nowrap"
                  >
                    {resendCooldown > 0 ? `Resend ${resendCooldown}s` : "Resend"}
                  </button>
                </div>
                <p className="text-[10px] text-white/40 mt-1.5">
                  Sent to {maskedEmail || "your admin email"} • valid 10 min
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 h-10 rounded-lg text-[12px] font-semibold border border-white/[0.08] text-white/70 hover:text-white">
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={!canConfirm}
              className="flex-1 h-10 rounded-lg text-[12px] font-semibold text-black disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ background: accent }}
            >
              {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm {isCredit ? "credit" : "debit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForceActionConfirmModal;
