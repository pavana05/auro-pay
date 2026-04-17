import { useState } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  warning: string;
  /** Phrase the user must type exactly to enable the final button. */
  confirmPhrase: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * Three-step confirmation:
 *   Step 1: "Are you sure?" → Continue
 *   Step 2: Read warning → I understand, continue
 *   Step 3: Type confirmPhrase → Final destructive action
 */
export const DestructiveConfirm = ({
  open, title, warning, confirmPhrase, confirmLabel = "Confirm", onCancel, onConfirm,
}: Props) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;
  const valid = typed === confirmPhrase;

  const reset = () => { setStep(1); setTyped(""); setBusy(false); };
  const cancel = () => { reset(); onCancel(); };
  const handleConfirm = async () => {
    setBusy(true);
    try { await onConfirm(); reset(); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={cancel}>
      <div className="w-full max-w-md rounded-[20px] overflow-hidden animate-in zoom-in-95"
        style={{ background: "#0d0e12", border: "1px solid rgba(239,68,68,0.4)" }}
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex-1 h-1 rounded-full transition-all"
                style={{ background: step >= n ? "#ef4444" : "rgba(255,255,255,0.08)" }} />
            ))}
            <span className="text-[10px] font-semibold ml-1" style={{ color: "#ef4444" }}>
              {step}/3
            </span>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
              <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white">
                {step === 1 ? title : step === 2 ? "Read carefully" : "Final confirmation"}
              </h3>
              <p className="text-xs mt-1.5 text-white/55">
                {step === 1 && "This is a destructive action. We'll walk you through 3 confirmation steps."}
                {step === 2 && warning}
                {step === 3 && `Type "${confirmPhrase}" below to execute. This cannot be undone.`}
              </p>
            </div>
            <button onClick={cancel} className="p-1.5 rounded-md hover:bg-white/[0.04] text-white/55">
              <X className="w-4 h-4" />
            </button>
          </div>

          {step === 3 && (
            <input
              autoFocus
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={confirmPhrase}
              className="w-full h-11 px-3 rounded-[10px] font-mono text-sm focus:outline-none mb-4"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${valid ? "rgba(34,197,94,0.5)" : "rgba(200,149,46,0.12)"}`,
                color: valid ? "#22c55e" : "#fff",
              }}
            />
          )}

          <div className="flex gap-2">
            <button onClick={cancel}
              className="flex-1 h-10 rounded-[10px] text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.04)", color: "#fff", border: "1px solid rgba(200,149,46,0.12)" }}>
              Cancel
            </button>
            {step < 3 ? (
              <button onClick={() => setStep((step + 1) as 2 | 3)}
                className="flex-1 h-10 rounded-[10px] text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                {step === 1 ? "Continue" : "I understand, continue"}
                <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <button disabled={!valid || busy} onClick={handleConfirm}
                className="flex-1 h-10 rounded-[10px] text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                {busy ? "Executing…" : confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestructiveConfirm;
