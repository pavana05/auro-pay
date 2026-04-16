import { Play, Pause, IndianRupee, CheckCheck } from "lucide-react";
import { useState, useRef } from "react";

interface MessageBubbleProps {
  content: string | null;
  messageType: "text" | "voice" | "payment";
  voiceUrl: string | null;
  paymentAmount: number | null;
  paymentStatus: string | null;
  isMine: boolean;
  timestamp: string;
  senderName?: string;
}

const MessageBubble = ({
  content, messageType, voiceUrl, paymentAmount, paymentStatus,
  isMine, timestamp, senderName,
}: MessageBubbleProps) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const toggleAudio = () => {
    if (!audioRef.current && voiceUrl) {
      audioRef.current = new Audio(voiceUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) { audioRef.current?.pause(); setPlaying(false); }
    else { audioRef.current?.play(); setPlaying(true); }
  };

  /* ── Payment bubble ── */
  if (messageType === "payment") {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3`} style={{ animation: "slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div className={`max-w-[78%] rounded-[20px] p-4 ${
          isMine
            ? "bg-gradient-to-br from-emerald-500/90 to-emerald-700/90 text-white rounded-br-[6px]"
            : "bg-[hsl(220_18%_11%)] border border-white/[0.06] text-foreground rounded-bl-[6px]"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[14px] bg-white/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] opacity-60">{isMine ? "You sent" : senderName || "Received"}</p>
              <p className="text-xl font-bold">₹{((paymentAmount || 0) / 100).toLocaleString()}</p>
            </div>
          </div>
          {content && <p className="text-[12px] opacity-60 mt-1">{content}</p>}
          <div className="flex items-center justify-between mt-2.5">
            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
              paymentStatus === "success" ? "bg-white/15 text-emerald-200" :
              paymentStatus === "failed" ? "bg-white/15 text-rose-300" :
              "bg-white/15 text-amber-200"
            }`}>
              {paymentStatus === "success" ? "✓ Sent" : paymentStatus === "failed" ? "✗ Failed" : "⏳ Pending"}
            </span>
            <span className="text-[9px] opacity-40">{time}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Voice bubble ── */
  if (messageType === "voice") {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3`} style={{ animation: "slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div className={`max-w-[78%] rounded-[20px] px-4 py-3 ${
          isMine
            ? "bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground rounded-br-[6px]"
            : "bg-[hsl(152_60%_45%/0.12)] border border-[hsl(152_60%_45%/0.1)] text-foreground rounded-bl-[6px]"
        }`}>
          <div className="flex items-center gap-3">
            <button onClick={toggleAudio} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 active:scale-90 transition-transform">
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex gap-[2px] items-center h-6 flex-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className={`w-[2px] rounded-full transition-all ${playing ? "animate-pulse" : ""}`}
                  style={{
                    height: `${Math.random() * 16 + 4}px`,
                    backgroundColor: isMine ? "rgba(255,255,255,0.5)" : "hsl(152 60% 45% / 0.5)",
                    animationDelay: `${i * 50}ms`
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1.5">
            <span className="text-[9px] opacity-40">{time}</span>
            {isMine && <CheckCheck className="w-3 h-3 opacity-40" />}
          </div>
        </div>
      </div>
    );
  }

  /* ── Text bubble ── */
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2.5`} style={{ animation: "slide-up-spring 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}>
      <div className={`max-w-[78%] rounded-[20px] px-4 py-2.5 ${
        isMine
          ? "bg-gradient-to-r from-primary/90 to-primary/75 text-primary-foreground rounded-br-[6px]"
          : "bg-[hsl(152_60%_45%/0.10)] border border-[hsl(152_60%_45%/0.08)] text-foreground rounded-bl-[6px]"
      }`}>
        {!isMine && senderName && (
          <p className="text-[10px] font-semibold text-emerald-400 mb-0.5">{senderName}</p>
        )}
        <p className="text-[14px] leading-relaxed">{content}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[9px] opacity-40">{time}</span>
          {isMine && <CheckCheck className="w-3 h-3 opacity-50" />}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
