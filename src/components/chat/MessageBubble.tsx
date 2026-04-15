import { Play, Pause, IndianRupee, Check, CheckCheck } from "lucide-react";
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
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      audioRef.current?.play();
      setPlaying(true);
    }
  };

  if (messageType === "payment") {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3 animate-fade-in`}>
        <div className={`max-w-[75%] rounded-2xl p-3 ${
          isMine
            ? "bg-gradient-to-br from-emerald-600/90 to-emerald-800/90 text-white"
            : "bg-[#1a1d25] text-white border border-border/30"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-white/60">{isMine ? "You sent" : `${senderName || "Received"}`}</p>
              <p className="text-lg font-bold">₹{((paymentAmount || 0) / 100).toLocaleString()}</p>
            </div>
          </div>
          {content && <p className="text-xs text-white/70 mt-1">{content}</p>}
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              paymentStatus === "success" ? "bg-emerald-400/20 text-emerald-300" :
              paymentStatus === "failed" ? "bg-red-400/20 text-red-300" :
              "bg-yellow-400/20 text-yellow-300"
            }`}>
              {paymentStatus === "success" ? "✓ Sent" : paymentStatus === "failed" ? "✗ Failed" : "⏳ Pending"}
            </span>
            <span className="text-[10px] text-white/40">{time}</span>
          </div>
        </div>
      </div>
    );
  }

  if (messageType === "voice") {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3 animate-fade-in`}>
        <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
          isMine ? "bg-blue-600 text-white" : "bg-[#1a1d25] text-white border border-border/30"
        }`}>
          <div className="flex items-center gap-3">
            <button onClick={toggleAudio} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex gap-[2px] items-center h-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className={`w-[2px] rounded-full ${playing ? "animate-pulse" : ""}`}
                  style={{
                    height: `${Math.random() * 16 + 6}px`,
                    backgroundColor: isMine ? "rgba(255,255,255,0.6)" : "rgba(59,130,246,0.6)",
                    animationDelay: `${i * 50}ms`
                  }}
                />
              ))}
            </div>
          </div>
          <span className="text-[10px] text-white/40 block text-right mt-1">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3 animate-fade-in`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        isMine
          ? "bg-blue-600 text-white rounded-br-md"
          : "bg-[#1a1d25] text-white border border-border/30 rounded-bl-md"
      }`}>
        <p className="text-sm leading-relaxed">{content}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-white/40">{time}</span>
          {isMine && <CheckCheck className="w-3 h-3 text-white/40" />}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
