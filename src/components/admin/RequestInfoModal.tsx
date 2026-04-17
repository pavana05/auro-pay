import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquareWarning, X } from "lucide-react";

const PRESETS = [
  "Please upload a clearer photo of your Aadhaar card.",
  "Could you confirm your full name as per the document?",
  "We need additional details about this transaction. Please reply with context.",
  "Please share a screenshot or invoice for this payment.",
  "Your details don't match our records. Kindly review and resubmit.",
];

interface RequestInfoModalProps {
  open: boolean;
  onClose: () => void;
  /** User to notify */
  targetUserId: string;
  /** User's display name (for confirmation) */
  targetName?: string | null;
  /** "kyc" | "transaction" | etc. — used for audit_logs.target_type */
  targetType: string;
  /** Row id (kyc_request id, transaction id…) for audit_logs.target_id */
  targetId: string;
  /** Notification title shown to user */
  notificationTitle?: string;
  /** Audit log action key */
  auditAction?: string;
  onSent?: () => void;
}

const RequestInfoModal = ({
  open,
  onClose,
  targetUserId,
  targetName,
  targetType,
  targetId,
  notificationTitle = "ℹ️ More info needed",
  auditAction = "request_more_info",
  onSent,
}: RequestInfoModalProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    const body = message.trim();
    if (body.length < 5) {
      toast.error("Please enter a message (min 5 chars)");
      return;
    }
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not signed in");
      setSending(false);
      return;
    }

    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: targetUserId,
      title: notificationTitle,
      body,
      type: "info_request",
    });
    if (notifErr) {
      toast.error(notifErr.message);
      setSending(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      admin_user_id: user.id,
      action: auditAction,
      target_type: targetType,
      target_id: targetId,
      details: { message: body, target_user_id: targetUserId, target_user_name: targetName ?? null },
    });

    toast.success(`Message sent to ${targetName || "user"}`);
    setSending(false);
    setMessage("");
    onSent?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-5 space-y-4"
        style={{
          background: "rgba(13,14,18,0.95)",
          borderColor: "hsl(var(--primary) / 0.25)",
          boxShadow: "0 20px 60px hsl(var(--primary) / 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(var(--primary) / 0.15)" }}
            >
              <MessageSquareWarning className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-sora">Request more info</h3>
              <p className="text-[11px] text-white/50">
                Notify {targetName || "user"} with a custom message
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-sora">
            Quick presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setMessage(p)}
                className="text-[10px] px-2 py-1 rounded-md border text-white/70 hover:text-white hover:border-primary/40 transition-colors"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                {p.length > 40 ? p.slice(0, 40) + "…" : p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-sora">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type the message the user will receive…"
            rows={4}
            maxLength={500}
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40 resize-none"
          />
          <div className="flex justify-between text-[10px] text-white/40">
            <span>Sent as in-app notification + logged to audit trail</span>
            <span>{message.length}/500</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl text-xs font-semibold text-white/70 border border-white/[0.08] hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || message.trim().length < 5}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(38 85% 45%))",
              boxShadow: "0 4px 14px hsl(var(--primary) / 0.35)",
            }}
          >
            {sending ? "Sending…" : "Send & log"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestInfoModal;
