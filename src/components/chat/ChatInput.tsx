import { useState } from "react";
import { Send, IndianRupee, Smile } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";
import { haptic } from "@/lib/haptics";

interface ChatInputProps {
  onSendText: (text: string) => void;
  onSendVoice: (url: string) => void;
  onPaymentToggle: () => void;
}

const ChatInput = ({ onSendText, onSendVoice, onPaymentToggle }: ChatInputProps) => {
  const [text, setText] = useState("");
  const [showVoice, setShowVoice] = useState(false);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendText(text.trim());
    setText("");
    haptic.light();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (showVoice) {
    return (
      <div className="flex items-center gap-2 p-3 border-t border-white/[0.04]" style={{ background: "hsl(220 18% 7%)" }}>
        <VoiceRecorder onSend={(url) => { onSendVoice(url); setShowVoice(false); }} onCancel={() => setShowVoice(false)} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 p-3 border-t border-white/[0.04]" style={{ background: "hsl(220 18% 7%)" }}>
      <button
        onClick={onPaymentToggle}
        className="w-[40px] h-[40px] rounded-[14px] bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
      >
        <IndianRupee className="w-4 h-4 text-emerald-400" />
      </button>

      <div className="flex-1 flex items-center bg-white/[0.03] rounded-[14px] border border-white/[0.04] px-3.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-transparent py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
        />
        <Smile className="w-5 h-5 text-muted-foreground/20 ml-1" />
      </div>

      {text.trim() ? (
        <button
          onClick={handleSend}
          className="w-[40px] h-[40px] rounded-[14px] gradient-primary flex items-center justify-center flex-shrink-0 active:scale-90 transition-all shadow-[0_4px_16px_hsl(42_78%_55%/0.3)]"
        >
          <Send className="w-4 h-4 text-primary-foreground ml-0.5" />
        </button>
      ) : (
        <VoiceRecorder onSend={onSendVoice} onCancel={() => {}} />
      )}
    </div>
  );
};

export default ChatInput;
