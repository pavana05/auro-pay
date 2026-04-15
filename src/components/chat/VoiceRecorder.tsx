import { useState, useRef } from "react";
import { Mic, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";

interface VoiceRecorderProps {
  onSend: (url: string) => void;
  onCancel: () => void;
}

const VoiceRecorder = ({ onSend, onCancel }: VoiceRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUploading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const fileName = `${user.id}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from("voice-messages").upload(fileName, blob);

        if (!error) {
          const { data: urlData } = supabase.storage.from("voice-messages").getPublicUrl(fileName);
          onSend(urlData.publicUrl);
        }
        setUploading(false);
        setRecording(false);
        setDuration(0);
      };

      recorder.start();
      setRecording(true);
      haptic.medium();
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      haptic.heavy();
    }
  };

  const stopAndSend = () => {
    mediaRef.current?.stop();
    haptic.light();
  };

  const cancel = () => {
    if (mediaRef.current && recording) {
      mediaRef.current.stop();
      chunksRef.current = [];
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setDuration(0);
    onCancel();
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (!recording && !uploading) {
    return (
      <button onClick={startRecording} className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center active:scale-90 transition-transform">
        <Mic className="w-5 h-5 text-white" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-1 bg-red-500/10 rounded-full px-4 py-2 animate-fade-in">
      <button onClick={cancel} className="text-red-400">
        <X className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2 flex-1">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm text-red-400 font-mono">{formatDuration(duration)}</span>
        <div className="flex gap-[2px] items-center flex-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="w-[2px] bg-red-400/50 rounded-full animate-pulse"
              style={{ height: `${Math.random() * 14 + 4}px`, animationDelay: `${i * 30}ms` }}
            />
          ))}
        </div>
      </div>
      <button onClick={stopAndSend} disabled={uploading}
        className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center active:scale-90 transition-transform">
        <Send className="w-4 h-4 text-white" />
      </button>
    </div>
  );
};

export default VoiceRecorder;
