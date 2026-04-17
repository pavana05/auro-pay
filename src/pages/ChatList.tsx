import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MessageCircle, ChevronLeft, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { haptic } from "@/lib/haptics";

interface ChatPreview {
  conversationId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isTyping?: boolean;
}

interface ContactOption {
  id: string;
  name: string;
  avatar: string | null;
  type: "friend" | "recent";
}

const AVATAR_COLORS = [
  "from-primary to-amber-600",
  "from-amber-400 to-orange-500",
  "from-yellow-500 to-primary",
  "from-amber-500 to-yellow-600",
  "from-orange-400 to-primary",
  "from-primary to-yellow-500",
];

const getAvatarColor = (name: string) => {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const ChatList = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadChats(); }, []);

  const loadChats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);

    if (!memberships?.length) {
      setLoading(false);
      await loadContacts(user.id);
      return;
    }

    const chatPreviews: ChatPreview[] = [];

    for (const membership of memberships) {
      const { data: otherMembers } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", membership.conversation_id)
        .neq("user_id", user.id);

      if (!otherMembers?.length) continue;

      const otherId = otherMembers[0].user_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", otherId)
        .single();

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, message_type, created_at, payment_amount")
        .eq("conversation_id", membership.conversation_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { count: unread } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", membership.conversation_id)
        .neq("sender_id", user.id)
        .gt("created_at", membership.last_read_at || "1970-01-01");

      let preview = lastMsg?.content || "";
      if (lastMsg?.message_type === "voice") preview = "🎤 Voice message";
      if (lastMsg?.message_type === "payment") preview = `💰 ₹${((lastMsg?.payment_amount || 0) / 100).toLocaleString()}`;

      chatPreviews.push({
        conversationId: membership.conversation_id,
        recipientId: otherId,
        recipientName: profile?.full_name || "User",
        recipientAvatar: profile?.avatar_url,
        lastMessage: preview,
        lastMessageTime: lastMsg?.created_at || "",
        unreadCount: unread || 0,
      });
    }

    chatPreviews.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    setChats(chatPreviews);
    setLoading(false);
    await loadContacts(user.id);
  };

  const loadContacts = async (uid: string) => {
    const contactList: ContactOption[] = [];
    const { data: sent } = await supabase.from("friendships").select("friend_id").eq("user_id", uid).eq("status", "accepted");
    const { data: received } = await supabase.from("friendships").select("user_id").eq("friend_id", uid).eq("status", "accepted");
    const friendIds = [...(sent || []).map(f => f.friend_id), ...(received || []).map(f => f.user_id)];

    if (friendIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", friendIds);
      profiles?.forEach(p => contactList.push({ id: p.id, name: p.full_name || "User", avatar: p.avatar_url, type: "friend" }));
    }
    setContacts(contactList);
  };

  const startChat = async (contactId: string) => {
    haptic.medium();
    const { data: myConvs } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", userId);
    if (myConvs?.length) {
      for (const mc of myConvs) {
        const { data: other } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", mc.conversation_id)
          .eq("user_id", contactId);
        if (other?.length) { navigate(`/chat/${mc.conversation_id}`); return; }
      }
    }
    const { data: conv, error } = await supabase.from("conversations").insert({ type: "direct" }).select().single();
    if (error || !conv) return;
    await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: userId },
      { conversation_id: conv.id, user_id: contactId },
    ]);
    navigate(`/chat/${conv.id}`);
  };

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const filtered = chats.filter(c => c.recipientName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pt-6 pb-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-[42px] h-[42px] rounded-[14px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
                <ChevronLeft className="w-5 h-5 text-muted-foreground/60" />
              </button>
              <h1 className="text-[22px] font-bold tracking-[-0.5px]">Chats</h1>
            </div>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              className="w-[42px] h-[42px] rounded-[14px] gradient-primary flex items-center justify-center active:scale-90 transition-all shadow-[0_4px_16px_hsl(42_78%_55%/0.3)]"
            >
              <Plus className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full h-[48px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] pl-11 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground/20 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all outline-none"
            />
          </div>
        </div>

        {/* Friends avatar strip */}
        {contacts.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
              {contacts.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => startChat(c.id)}
                  className="flex flex-col items-center gap-1.5 min-w-[56px]"
                  style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.06}s both` }}
                >
                  <div className="relative">
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className="w-[52px] h-[52px] rounded-full object-cover ring-2 ring-primary/20" />
                    ) : (
                      <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${getAvatarColor(c.name)} flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/[0.06]`}>
                        {getInitials(c.name)}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-primary border-[2.5px] border-background shadow-[0_0_6px_hsl(42_78%_55%/0.5)]" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 truncate max-w-[56px] font-medium">{c.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* New chat modal */}
        {showNewChat && (
          <div className="mx-5 mb-4 rounded-[20px] bg-[hsl(220_18%_9%)] border border-white/[0.04] p-4 overflow-hidden" style={{ animation: "slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold">Start a new chat</h3>
              <button onClick={() => setShowNewChat(false)} className="p-1 rounded-lg hover:bg-white/[0.04]">
                <X className="w-4 h-4 text-muted-foreground/40" />
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-[12px] text-muted-foreground/40 py-4 text-center">Add friends first to start chatting</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {contacts.map(c => (
                  <button key={c.id} onClick={() => { startChat(c.id); setShowNewChat(false); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-[14px] hover:bg-white/[0.03] transition-colors active:scale-[0.98]">
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(c.name)} flex items-center justify-center text-white font-bold text-xs`}>
                        {getInitials(c.name)}
                      </div>
                    )}
                    <span className="text-[13px] font-medium">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section labels */}
        {filtered.length > 0 && (
          <div className="px-5 mb-2">
            <p className="text-[11px] font-semibold text-muted-foreground/30 tracking-[0.1em] uppercase">Recent Chat</p>
          </div>
        )}

        {/* Chat list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-5">
            <div className="w-20 h-20 rounded-full bg-primary/[0.06] flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-primary/30" />
            </div>
            <p className="text-[13px] text-muted-foreground/40 text-center">No chats yet. Start a conversation!</p>
          </div>
        ) : (
          <div className="px-5 space-y-1">
            {filtered.map((chat, i) => (
              <button
                key={chat.conversationId}
                onClick={() => { haptic.light(); navigate(`/chat/${chat.conversationId}`); }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-[18px] hover:bg-white/[0.02] transition-all active:scale-[0.98]"
                style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.05}s both` }}
              >
                <div className="relative shrink-0">
                  {chat.recipientAvatar ? (
                    <img src={chat.recipientAvatar} alt="" className="w-[52px] h-[52px] rounded-full object-cover" />
                  ) : (
                    <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${getAvatarColor(chat.recipientName)} flex items-center justify-center text-white font-bold text-sm`}>
                      {getInitials(chat.recipientName)}
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[14px] font-bold truncate">{chat.recipientName}</span>
                    <span className="text-[10px] text-muted-foreground/40 shrink-0 ml-2">{formatTime(chat.lastMessageTime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground/40 truncate max-w-[200px]">
                      {chat.lastMessage || "Start chatting"}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 rounded-full gradient-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold px-1.5 shrink-0 ml-2 shadow-[0_2px_8px_hsl(42_78%_55%/0.3)]">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ChatList;
