import { forwardRef, useEffect, useRef, useState } from "react";
import { Clock, LogOut } from "lucide-react";

interface Props {
  enabled: boolean;
  /** Total inactivity timeout in ms before forced logout (default 2h). */
  timeoutMs?: number;
  /** Warning window before logout (default 5min). */
  warningMs?: number;
  onLogout: () => void;
}

/**
 * Tracks user activity. When inactive for (timeout - warning) ms, shows a
 * countdown modal. If user clicks "Stay signed in" the timer resets.
 * Otherwise after `warningMs` of further inactivity, fires onLogout.
 *
 * Wrapped in forwardRef so parent layouts that attach refs (e.g. for HMR
 * probing) don't trigger React's "function components cannot be given refs" warning.
 */
export const SessionTimeoutModal = forwardRef<HTMLDivElement, Props>(({
  enabled,
  timeoutMs = 2 * 60 * 60 * 1000,
  warningMs = 5 * 60 * 1000,
  onLogout,
}, _ref) => {
  const [showWarning, setShowWarning] = useState(false);
  const [remaining, setRemaining] = useState(warningMs);
  const lastActivity = useRef(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Activity listeners reset the timer (only when warning isn't shown).
  useEffect(() => {
    if (!enabled) return;
    const reset = () => {
      if (showWarning) return; // don't auto-reset while modal is up
      lastActivity.current = Date.now();
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, reset));
  }, [enabled, showWarning]);

  // Master clock — runs every second.
  useEffect(() => {
    if (!enabled) return;
    tickRef.current = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      const warnAt = timeoutMs - warningMs;
      if (idle >= timeoutMs) {
        setShowWarning(false);
        onLogout();
      } else if (idle >= warnAt) {
        setShowWarning(true);
        setRemaining(timeoutMs - idle);
      }
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [enabled, timeoutMs, warningMs, onLogout]);

  const stay = () => {
    lastActivity.current = Date.now();
    setShowWarning(false);
  };

  if (!showWarning) return null;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm rounded-[20px] overflow-hidden animate-in zoom-in-95"
        style={{ background: "#0d0e12", border: "1px solid rgba(245,158,11,0.5)" }}>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 animate-pulse"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)" }}>
              <Clock className="w-5 h-5" style={{ color: "#f59e0b" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white">Session expiring soon</h3>
              <p className="text-xs mt-1.5 text-white/55">
                You'll be signed out for security in:
              </p>
            </div>
          </div>
          <div className="rounded-[12px] p-5 text-center mb-4"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <p className="text-4xl font-bold tabular-nums" style={{ color: "#f59e0b" }}>
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </p>
            <p className="text-[10px] uppercase tracking-wider mt-1 text-white/40">minutes : seconds</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onLogout}
              className="flex-1 h-10 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(200,149,46,0.12)" }}>
              <LogOut className="w-3 h-3" /> Sign out now
            </button>
            <button onClick={stay}
              className="flex-1 h-10 rounded-[10px] text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #c8952e, #d4a84b)", boxShadow: "0 4px 14px rgba(200,149,46,0.33)" }}>
              Stay signed in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
SessionTimeoutModal.displayName = "SessionTimeoutModal";

export default SessionTimeoutModal;
