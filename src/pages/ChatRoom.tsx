import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Phone, Video, MoreVertical } from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import PaymentCard from "@/components/chat/PaymentCard";
import { haptic } from "@/lib/haptics";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  voice_url: string | null;
  payment_amount: number | null;
  payment_status: string | null;
  created_at: string;
}

const AVATAR_COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-500",
  "from-rose-400 to-pink-500",
  "from-primary to-amber-600",
];

const getAvatarColor = (name: string) => {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const ChatRoom = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientAvatar, setRecipientAvatar] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    loadChat();
  }, [conversationId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        haptic.light();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const loadChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !conversationId) return;
    setUserId(user.id);

    const { data: members } = await supabase
      .from("conversation_members").select("user_id")
      .eq("conversation_id", conversationId).neq("user_id", user.id);

    if (members?.length) {
      const otherId = members[0].user_id;
      setRecipientId(otherId);
      const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", otherId).single();
      setRecipientName(profile?.full_name || "User");
      setRecipientAvatar(profile?.avatar_url || null);
    }

    const { data: msgs } = await supabase
      .from("messages").select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }).limit(100);

    setMessages(msgs || []);
    setLoading(false);

    await supabase.from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId).eq("user_id", user.id);
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendText = async (text: string) => {
    if (!conversationId || !userId) return;
    await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, content: text, message_type: "text" });
  };

  const sendVoice = async (url: string) => {
    if (!conversationId || !userId) return;
    await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, message_type: "voice", voice_url: url });
  };

  const handlePaymentSent = async (amount: number, note: string) => {
    if (!conversationId || !userId) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId, sender_id: userId, content: note,
      message_type: "payment", payment_amount: amount, payment_status: "success",
    });
    setShowPayment(false);
  };

  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const groupByDate = (msgs: Message[]) => {
    const groups: { label: string; messages: Message[] }[] = [];
    let currentLabel = "";
    msgs.forEach(m => {
      const d = new Date(m.created_at);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      let label = d.toLocaleDateString([], { month: "long", day: "numeric" });
      if (diff < 86400000 && d.getDate() === now.getDate()) label = "Today";
      else if (diff < 172800000) label = "Yesterday";
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, messages: [m] });
      } else {
        groups[groups.length - 1].messages.push(m);
      }
    });
    return groups;
  };

  return (
    <div className="h-screen flex flex-col bg-background relative">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.02] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-3 pt-14 border-b border-white/[0.04]" style={{ background: "linear-gradient(180deg, hsl(220 18% 7%), hsl(220 18% 6%))" }}>
        <button onClick={() => navigate("/chats")} className="w-[38px] h-[38px] rounded-[12px] bg-white/[0.04] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5 text-muted-foreground/60" />
        </button>

        <div className="relative shrink-0">
          {recipientAvatar ? (
            <img src={recipientAvatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white/[0.06]" />
          ) : (
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(recipientName)} flex items-center justify-center text-white font-bold text-xs ring-2 ring-white/[0.06]`}>
              {getInitials(recipientName)}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate">{recipientName}</p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
            <span className="w-1 h-1 rounded-full bg-emerald-400" /> Online
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button className="w-[36px] h-[36px] rounded-[12px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
            <Phone className="w-4 h-4 text-primary/70" />
          </button>
          <button className="w-[36px] h-[36px] rounded-[12px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
            <Video className="w-4 h-4 text-primary/70" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-primary/[0.06] flex items-center justify-center mb-3">
              {recipientAvatar ? (
                <img src={recipientAvatar} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <span className="text-xl font-bold text-primary">{getInitials(recipientName)}</span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground/40">Say hello to {recipientName}! 👋</p>
          </div>
        ) : (
          groupByDate(messages).map(group => (
            <div key={group.label}>
              <div className="flex items-center justify-center my-4">
                <span className="text-[10px] text-muted-foreground/40 bg-white/[0.03] border border-white/[0.04] px-3.5 py-1 rounded-full font-medium">{group.label}</span>
              </div>
              {group.messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  content={msg.content}
                  messageType={msg.message_type as any}
                  voiceUrl={msg.voice_url}
                  paymentAmount={msg.payment_amount}
                  paymentStatus={msg.payment_status}
                  isMine={msg.sender_id === userId}
                  timestamp={msg.created_at}
                  senderName={recipientName}
                />
              ))}
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Payment panel */}
      {showPayment && (
        <div className="px-4 pb-2 relative z-10">
          <PaymentCard
            recipientId={recipientId}
            recipientName={recipientName}
            conversationId={conversationId || ""}
            onPaymentSent={handlePaymentSent}
            onClose={() => setShowPayment(false)}
          />
        </div>
      )}

      {/* Input */}
      <div className="relative z-10">
        <ChatInput
          onSendText={sendText}
          onSendVoice={sendVoice}
          onPaymentToggle={() => setShowPayment(!showPayment)}
        />
      </div>
    </div>
  );
};

export default ChatRoom;
