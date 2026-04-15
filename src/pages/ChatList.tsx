import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MessageCircle } from "lucide-react";
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
}

interface ContactOption {
  id: string;
  name: string;
  avatar: string | null;
  type: "friend" | "recent";
}

const ChatList = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get user's conversations
    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);

    if (!memberships?.length) {
      setLoading(false);
      await loadContacts(user.id);
      return;
    }

    const convIds = memberships.map(m => m.conversation_id);

    // Get conversation details and other members
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

    // Friends
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
    // Check existing conversation
    const { data: myConvs } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", userId);
    if (myConvs?.length) {
      for (const mc of myConvs) {
        const { data: other } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", mc.conversation_id)
          .eq("user_id", contactId);
        if (other?.length) {
          navigate(`/chat/${mc.conversation_id}`);
          return;
        }
      }
    }

    // Create new conversation
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-foreground">Chats</h1>
          <button onClick={() => setShowNewChat(!showNewChat)}
            className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-blue-600/30">
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-[#141820] border border-border/30 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Friends avatars strip */}
      {contacts.length > 0 && (
        <div className="px-5 mb-4">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {contacts.map(c => (
              <button key={c.id} onClick={() => startChat(c.id)} className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="relative">
                  {c.avatar ? (
                    <img src={c.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/30" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm border-2 border-blue-500/30">
                      {getInitials(c.name)}
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                </div>
                <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{c.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New chat modal */}
      {showNewChat && (
        <div className="mx-5 mb-4 bg-[#0d1017] border border-border/30 rounded-2xl p-4 animate-slide-up-spring">
          <h3 className="text-sm font-semibold text-foreground mb-3">Start a new chat</h3>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add friends first to start chatting</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {contacts.map(c => (
                <button key={c.id} onClick={() => { startChat(c.id); setShowNewChat(false); }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#141820] transition-colors">
                  {c.avatar ? (
                    <img src={c.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-xs">
                      {getInitials(c.name)}
                    </div>
                  )}
                  <span className="text-sm text-foreground">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-5">
          <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-blue-500/50" />
          </div>
          <p className="text-muted-foreground text-center">No chats yet. Start a conversation with your friends!</p>
        </div>
      ) : (
        <div className="px-5 space-y-1">
          {filtered.map(chat => (
            <button key={chat.conversationId}
              onClick={() => { haptic.light(); navigate(`/chat/${chat.conversationId}`); }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#141820] transition-colors active:scale-[0.98]"
            >
              {chat.recipientAvatar ? (
                <img src={chat.recipientAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(chat.recipientName)}
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{chat.recipientName}</span>
                  <span className="text-[10px] text-muted-foreground">{formatTime(chat.lastMessageTime)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{chat.lastMessage || "Start chatting"}</span>
                  {chat.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ChatList;
