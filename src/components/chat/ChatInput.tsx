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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (showVoice) {
    return (
      <div className="flex items-center gap-2 p-3 bg-[#0d1017] border-t border-border/30">
        <VoiceRecorder onSend={(url) => { onSendVoice(url); setShowVoice(false); }} onCancel={() => setShowVoice(false)} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-[#0d1017] border-t border-border/30">
      <button onClick={onPaymentToggle} className="w-9 h-9 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform">
        <IndianRupee className="w-4 h-4 text-emerald-400" />
      </button>

      <div className="flex-1 flex items-center bg-[#141820] rounded-full border border-border/30 px-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        <Smile className="w-5 h-5 text-muted-foreground/50 ml-1" />
      </div>

      {text.trim() ? (
        <button onClick={handleSend} className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform">
          <Send className="w-4 h-4 text-white ml-0.5" />
        </button>
      ) : (
        <VoiceRecorder onSend={onSendVoice} onCancel={() => {}} />
      )}
    </div>
  );
};

export default ChatInput;
