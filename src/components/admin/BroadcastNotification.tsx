import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Send, Loader2 } from "lucide-react";

const SEGMENTS = [
  { value: "all", label: "All Users" },
  { value: "teens", label: "Teens Only" },
  { value: "parents", label: "Parents Only" },
  { value: "kyc_pending", label: "KYC Pending" },
  { value: "kyc_verified", label: "KYC Verified" },
];

export default function BroadcastNotification() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body required");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-broadcast-notification", {
        body: { title: title.trim(), body: body.trim(), segment, type: "broadcast" },
      });
      if (error) throw error;
      toast.success(`Broadcast sent to ${data?.sent ?? 0} users`);
      setTitle(""); setBody("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="rounded-[16px] border p-4 lg:p-5 space-y-3"
      style={{ background: "rgba(13,14,18,0.85)", borderColor: "rgba(200,149,46,0.14)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4" style={{ color: "#c8952e" }} />
        <h3 className="text-[13px] font-semibold text-white font-sora">Broadcast Notification</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={80}
          className="md:col-span-1 px-3 py-2 rounded-[10px] bg-white/[0.04] border border-white/[0.08] text-[12px] text-white placeholder:text-white/30 outline-none focus:border-[#c8952e]/40"
        />
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="md:col-span-1 px-3 py-2 rounded-[10px] bg-white/[0.04] border border-white/[0.08] text-[12px] text-white outline-none focus:border-[#c8952e]/40"
        >
          {SEGMENTS.map((s) => (
            <option key={s.value} value={s.value} className="bg-[#0d0e12]">{s.label}</option>
          ))}
        </select>
        <button
          onClick={send}
          disabled={sending}
          className="md:col-span-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-semibold text-black disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#e8c060,#c8952e)" }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending…" : "Send"}
        </button>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message body…"
        rows={2}
        maxLength={240}
        className="w-full px-3 py-2 rounded-[10px] bg-white/[0.04] border border-white/[0.08] text-[12px] text-white placeholder:text-white/30 outline-none focus:border-[#c8952e]/40 resize-none"
      />
      <div className="text-[10px] text-white/40 font-sora">
        Sent as in-app notifications. Push delivered to users with FCM tokens.
      </div>
    </div>
  );
}
