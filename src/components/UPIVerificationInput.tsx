// Auto-verifying recipient input. Detects 10-digit phone vs UPI VPA, debounces,
// calls the verify-upi-id edge function, and surfaces the registered name when
// the recipient is a Zenzo user. Format-only verifications still pass through
// (UI shows "Verified format" without inventing a name).
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VerifiedRecipient {
  verified: boolean;
  is_zenzo_user: boolean;
  name: string | null;
  upi_id: string;
  avatar_url?: string | null;
  source: "zenzo_user" | "format_check" | "phone_format";
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onVerified: (data: VerifiedRecipient | null) => void;
  mode: "upi" | "phone";
  /** Optional: skip verification entirely (used when mode="contact"). */
  disabled?: boolean;
}

const PHONE_RE = /^\d{10}$/;
// Mirrors the edge function regex (case-insensitive lowered before test).
const UPI_RE = /^[a-z0-9._-]{2,}@[a-z]{2,}$/i;

export const UPIVerificationInput = ({ value, onChange, onVerified, mode, disabled }: Props) => {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<VerifiedRecipient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>(""); // prevents stale responses

  const verify = useCallback(
    async (q: string) => {
      lastQueryRef.current = q;
      setVerifying(true);
      setError(null);
      try {
        const payload =
          mode === "phone" ? { phone: q.replace(/\D/g, "").slice(-10) } : { upi_id: q.trim() };
        const { data, error: fnErr } = await supabase.functions.invoke("verify-upi-id", {
          body: payload,
        });
        // If user kept typing, drop this stale response.
        if (lastQueryRef.current !== q) return;
        if (fnErr) throw fnErr;
        if (data?.verified) {
          setVerified(data as VerifiedRecipient);
          onVerified(data as VerifiedRecipient);
        } else {
          setVerified(null);
          onVerified(null);
          setError(data?.error || "Could not verify");
        }
      } catch (e) {
        if (lastQueryRef.current !== q) return;
        const msg = e instanceof Error ? e.message : "Verification failed";
        setError(msg);
        setVerified(null);
        onVerified(null);
        toast.error("Verification failed", { description: msg });
      } finally {
        if (lastQueryRef.current === q) setVerifying(false);
      }
    },
    [mode, onVerified],
  );

  // Auto-verify on input change (debounced).
  useEffect(() => {
    if (disabled) return;
    setVerified(null);
    setError(null);
    onVerified(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const v = value.trim();
    if (!v) return;

    if (mode === "phone") {
      const digits = v.replace(/\D/g, "").slice(-10);
      if (!PHONE_RE.test(digits)) return;
      debounceRef.current = setTimeout(() => verify(digits), 450);
    } else {
      if (!UPI_RE.test(v)) return;
      debounceRef.current = setTimeout(() => verify(v.toLowerCase()), 700);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode, disabled]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === "phone" ? "98765 43210" : "name@bank"}
          inputMode={mode === "phone" ? "numeric" : "text"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          className="w-full bg-transparent border-b-2 border-foreground/15 focus:border-primary/60 outline-none py-2 pr-10 text-base font-sora text-foreground placeholder:text-foreground/30 transition-colors disabled:opacity-50"
        />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {verifying && (
              <motion.div key="v" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </motion.div>
            )}
            {!verifying && verified && (
              <motion.div
                key="ok"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-6 h-6 rounded-full bg-success flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-background" strokeWidth={3} />
              </motion.div>
            )}
            {!verifying && error && (
              <motion.div
                key="err"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-destructive" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Helper / error line */}
      <div className="text-[11px] min-h-[14px]">
        {error && <span className="text-destructive">{error}</span>}
        {!error && verifying && <span className="text-foreground/50">Verifying…</span>}
        {!error && !verifying && !verified && value && (
          <span className="text-foreground/35">
            {mode === "phone" ? "Enter 10-digit number" : "Enter a valid UPI ID"}
          </span>
        )}
      </div>

      {/* Verified card */}
      <AnimatePresence>
        {verified && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="zen-card flex items-center gap-3 p-3"
          >
            <div
              className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-primary-foreground font-semibold shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(42 78% 55%), hsl(36 80% 42%))" }}
            >
              {verified.avatar_url ? (
                <img src={verified.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (verified.name?.[0] || verified.upi_id[0] || "?").toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                {verified.name || "Verified UPI ID"}
                {verified.is_zenzo_user && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 h-4 rounded-full text-[9px] font-bold bg-primary/15 text-primary">
                    <Sparkles className="w-2.5 h-2.5" /> ZENZO
                  </span>
                )}
              </div>
              <div className="text-[11px] text-foreground/50 font-mono-num truncate">{verified.upi_id}</div>
            </div>
            <span className="text-[10px] font-bold text-success">VERIFIED ✓</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UPIVerificationInput;
