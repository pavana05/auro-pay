import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  /** Sensitive raw value (e.g. full Aadhaar, full PAN, full card). */
  value: string;
  /** What kind of data — used for audit log + mask format. */
  kind: "aadhaar" | "card" | "pan" | "phone";
  /** Subject the admin is viewing — included in audit log. */
  targetUserId?: string;
  /** How long the unmasked value stays visible (ms). */
  revealMs?: number;
}

const mask = (raw: string, kind: Props["kind"]): string => {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (kind === "aadhaar") return `XXXX XXXX ${digits.slice(-4)}`;
  if (kind === "card")    return `**** **** **** ${digits.slice(-4)}`;
  if (kind === "pan")     return `${raw.slice(0, 3)}XXXX${raw.slice(-1)}`;
  if (kind === "phone")   return `+91 XXXXX${digits.slice(-5)}`;
  return raw;
};

/**
 * Masked sensitive data with PIN-gated reveal. Every reveal writes an audit_logs entry.
 * Reveal auto-hides after `revealMs` (default 30s).
 */
export const MaskedReveal = ({ value, kind, targetUserId, revealMs = 30_000 }: Props) => {
  const [revealed, setRevealed] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), revealMs);
    return () => clearTimeout(t);
  }, [revealed, revealMs]);

  const handleVerify = async () => {
    if (!/^\d{4}$/.test(pin)) { toast.error("Enter your 4-digit PIN"); return; }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-pin", {
        body: { action: "verify", pin },
      });
      if (error) throw error;
      if (!data?.valid) { toast.error("Incorrect PIN"); setVerifying(false); return; }

      // Audit the reveal
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        await supabase.from("audit_logs").insert({
          admin_user_id: auth.user.id,
          action: "reveal_sensitive_data",
          target_type: kind,
          target_id: targetUserId || null,
          details: { kind, masked: mask(value, kind) },
        });
      }
      setRevealed(true);
      setPinOpen(false);
      setPin("");
      toast.success(`${kind.toUpperCase()} revealed for 30s · logged to audit trail`);
    } catch (e: any) {
      toast.error(e?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <span className="inline-flex items-center gap-1.5 font-mono text-xs">
        <span className="tabular-nums">{revealed ? value : mask(value, kind)}</span>
        <button
          onClick={() => revealed ? setRevealed(false) : setPinOpen(true)}
          className="p-1 rounded-md hover:bg-white/[0.06] transition-colors"
          title={revealed ? "Hide" : "Reveal (requires PIN)"}
          style={{ color: revealed ? "#22c55e" : "rgba(255,255,255,0.4)" }}
        >
          {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      </span>

      {pinOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={() => setPinOpen(false)}>
          <div className="w-full max-w-sm rounded-[20px] overflow-hidden"
            style={{ background: "#0d0e12", border: "1px solid rgba(200,149,46,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                  style={{ background: "rgba(200,149,46,0.15)", border: "1px solid rgba(200,149,46,0.33)" }}>
                  <Lock className="w-5 h-5" style={{ color: "#c8952e" }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">Enter your PIN</h3>
                  <p className="text-[11px] mt-1 text-white/55">
                    Revealing sensitive data is logged to the audit trail.
                  </p>
                </div>
                <button onClick={() => setPinOpen(false)} className="p-1.5 rounded-md hover:bg-white/[0.04] text-white/55">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={e => { if (e.key === "Enter" && pin.length === 4) handleVerify(); }}
                placeholder="••••"
                className="w-full h-14 px-3 rounded-[10px] font-mono text-2xl text-center tracking-[0.5em] focus:outline-none mb-4"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(200,149,46,0.12)",
                  color: "#fff",
                }}
              />
              <div className="flex gap-2">
                <button onClick={() => setPinOpen(false)}
                  className="flex-1 h-10 rounded-[10px] text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.04)", color: "#fff", border: "1px solid rgba(200,149,46,0.12)" }}>
                  Cancel
                </button>
                <button disabled={pin.length !== 4 || verifying} onClick={handleVerify}
                  className="flex-1 h-10 rounded-[10px] text-xs font-semibold text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #c8952e, #d4a84b)" }}>
                  {verifying ? "Verifying…" : "Reveal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MaskedReveal;
