import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Phone, Video } from "lucide-react";
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
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

    // Get other member
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id);

    if (members?.length) {
      const otherId = members[0].user_id;
      setRecipientId(otherId);
      const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", otherId).single();
      setRecipientName(profile?.full_name || "User");
      setRecipientAvatar(profile?.avatar_url || null);
    }

    // Load messages
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    setMessages(msgs || []);
    setLoading(false);

    // Mark as read
    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendText = async (text: string) => {
    if (!conversationId || !userId) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: text,
      message_type: "text",
    });
  };

  const sendVoice = async (url: string) => {
    if (!conversationId || !userId) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      message_type: "voice",
      voice_url: url,
    });
  };

  const handlePaymentSent = async (amount: number, note: string) => {
    if (!conversationId || !userId) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: note,
      message_type: "payment",
      payment_amount: amount,
      payment_status: "success",
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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1017] border-b border-border/30 pt-14">
        <button onClick={() => navigate("/chats")} className="active:scale-90 transition-transform">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        {recipientAvatar ? (
          <img src={recipientAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm">
            {getInitials(recipientName)}
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{recipientName}</p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
          </p>
        </div>
        <button className="w-9 h-9 rounded-full bg-[#141820] flex items-center justify-center">
          <Phone className="w-4 h-4 text-blue-400" />
        </button>
        <button className="w-9 h-9 rounded-full bg-[#141820] flex items-center justify-center">
          <Video className="w-4 h-4 text-blue-400" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center mb-3">
              {recipientAvatar ? (
                <img src={recipientAvatar} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <span className="text-xl font-bold text-blue-400">{getInitials(recipientName)}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Say hello to {recipientName}! 👋</p>
          </div>
        ) : (
          groupByDate(messages).map(group => (
            <div key={group.label}>
              <div className="flex items-center justify-center my-4">
                <span className="text-[10px] text-muted-foreground bg-[#141820] px-3 py-1 rounded-full">{group.label}</span>
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
        <div className="px-4 pb-2">
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
      <ChatInput
        onSendText={sendText}
        onSendVoice={sendVoice}
        onPaymentToggle={() => setShowPayment(!showPayment)}
      />
    </div>
  );
};

export default ChatRoom;
