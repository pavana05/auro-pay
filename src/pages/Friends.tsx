import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, UserPlus, Users, Trophy, Search, Check, X, MessageCircle, Sparkles, Crown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/toast";
import { EmptyState } from "@/components/feedback";

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  profile?: { full_name: string; avatar_url: string | null };
}

const AVATAR_COLORS = [
  "from-amber-500 to-orange-600",
  "from-yellow-500 to-amber-600",
  "from-primary to-amber-600",
  "from-amber-400 to-yellow-500",
  "from-orange-400 to-primary",
  "from-primary to-yellow-500",
];

const getColor = (name: string) => {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const SpringIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <div className={className} style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both` }}>
    {children}
  </div>
);

const Friends = () => {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"friends" | "leaderboard" | "requests">("friends");
  const [searchPhone, setSearchPhone] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: sent } = await supabase.from("friendships").select("*").eq("user_id", user.id).eq("status", "accepted");
    const { data: received } = await supabase.from("friendships").select("*").eq("friend_id", user.id).eq("status", "accepted");
    const { data: pendingReqs } = await supabase.from("friendships").select("*").eq("friend_id", user.id).eq("status", "pending");

    const allFriendIds = [
      ...(sent || []).map(f => f.friend_id),
      ...(received || []).map(f => f.user_id),
    ];

    if (allFriendIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", allFriendIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const friendList = [
        ...(sent || []).map(f => ({ ...f, profile: profileMap[f.friend_id] })),
        ...(received || []).map(f => ({ ...f, profile: profileMap[f.user_id] })),
      ];
      setFriends(friendList as any);
    }

    if (pendingReqs?.length) {
      const reqUserIds = pendingReqs.map(r => r.user_id);
      const { data: reqProfiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", reqUserIds);
      const profileMap = Object.fromEntries((reqProfiles || []).map(p => [p.id, p]));
      setRequests(pendingReqs.map(r => ({ ...r, profile: profileMap[r.user_id] })) as any);
    }

    setLoading(false);
  };

  const sendRequest = async () => {
    if (!searchPhone) return;
    const { data: profile } = await supabase.from("profiles").select("id").eq("phone", searchPhone).maybeSingle();
    if (!profile) { toast.fail("User not found"); return; }
    if (profile.id === userId) { toast.fail("Can't add yourself"); return; }

    const { error } = await supabase.from("friendships").insert({
      user_id: userId,
      friend_id: profile.id,
      status: "pending",
    });

    if (!error) {
      haptic.success();
      toast.ok("Friend request sent");
      setShowAdd(false);
      setSearchPhone("");
    } else {
      toast.fail("Couldn't send request", { description: "Already sent or already friends" });
    }
  };

  const handleRequest = async (id: string, accept: boolean) => {
    haptic.medium();
    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
      toast.ok("Friend added");
    } else {
      await supabase.from("friendships").update({ status: "rejected" }).eq("id", id);
    }
    fetchData();
  };

  const tabs = [
    { key: "friends" as const, label: "Friends", icon: Users, count: friends.length },
    { key: "requests" as const, label: "Requests", icon: UserPlus, count: requests.length },
    { key: "leaderboard" as const, label: "Board", icon: Trophy, count: 0 },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[120px]" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.02] blur-[100px]" style={{ background: "hsl(152 60% 45%)" }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/[0.04]" style={{ background: "linear-gradient(180deg, hsl(220 18% 7%), hsl(220 18% 6% / 0.95))" }}>
        <PageHeader
          title="Friends"
          fallback="/profile"
          sticky={false}
          className="pb-4"
          right={
            <button onClick={() => { haptic.light(); setShowAdd(true); }} className="w-[42px] h-[42px] rounded-[14px] bg-primary/10 border border-primary/15 flex items-center justify-center active:scale-90 transition-all" aria-label="Add friend">
              <UserPlus className="w-5 h-5 text-primary" />
            </button>
          }
        />

        {/* Tabs */}
        <div className="flex px-5 gap-2 pb-3">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { haptic.light(); setTab(t.key); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] text-[11px] font-semibold transition-all ${
                tab === t.key
                  ? "bg-primary/10 text-primary border border-primary/15 shadow-[0_0_16px_hsl(42_78%_55%/0.08)]"
                  : "text-muted-foreground/40 border border-white/[0.03]"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 px-5 pt-4 space-y-3">
        {/* Online Friends Strip */}
        {tab === "friends" && friends.length > 0 && (
          <SpringIn delay={0.05}>
            <div className="flex items-center gap-4 px-1 pb-2 overflow-x-auto scrollbar-none">
              {friends.map((f) => {
                const name = f.profile?.full_name || "?";
                return (
                  <div key={f.id} className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="relative">
                      {f.profile?.avatar_url ? (
                        <img src={f.profile.avatar_url} className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20" alt="" />
                      ) : (
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getColor(name)} flex items-center justify-center text-white font-bold text-sm ring-2 ring-primary/20`}>
                          {name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[2.5px] border-background" />
                    </div>
                    <p className="text-[10px] text-muted-foreground/40 font-medium max-w-[56px] truncate">{name.split(" ")[0]}</p>
                  </div>
                );
              })}
            </div>
          </SpringIn>
        )}

        {tab === "friends" && friends.map((f, i) => {
          const name = f.profile?.full_name || "Friend";
          return (
            <SpringIn key={f.id} delay={0.1 + i * 0.06}>
              <div className="flex items-center gap-3.5 p-4 rounded-[20px] border border-white/[0.03] transition-all"
                style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
                <div className="relative">
                  {f.profile?.avatar_url ? (
                    <img src={f.profile.avatar_url} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/[0.06]" alt="" />
                  ) : (
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getColor(name)} flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/[0.06]`}>
                      {name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate">{name}</p>
                  <p className="text-[10px] text-emerald-400/60 flex items-center gap-1 font-medium">
                    <span className="w-1 h-1 rounded-full bg-emerald-400/60" /> Online
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("/chats")}
                    className="w-[38px] h-[38px] rounded-[12px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all"
                  >
                    <MessageCircle className="w-4 h-4 text-primary/70" />
                  </button>
                  <button
                    onClick={() => navigate("/quick-pay")}
                    className="px-4 py-2 rounded-[12px] bg-primary/10 border border-primary/15 text-primary text-[11px] font-semibold active:scale-90 transition-all"
                  >
                    Pay
                  </button>
                </div>
              </div>
            </SpringIn>
          );
        })}

        {tab === "requests" && requests.map((r, i) => {
          const name = r.profile?.full_name || "Someone";
          return (
            <SpringIn key={r.id} delay={0.1 + i * 0.06}>
              <div className="flex items-center gap-3.5 p-4 rounded-[20px] border border-white/[0.03]"
                style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getColor(name)} flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/[0.06]`}>
                  {name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate">{name}</p>
                  <p className="text-[10px] text-muted-foreground/30 font-medium">Wants to connect</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRequest(r.id, true)} className="w-[38px] h-[38px] rounded-[12px] bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 flex items-center justify-center active:scale-90 transition-all">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleRequest(r.id, false)} className="w-[38px] h-[38px] rounded-[12px] bg-rose-500/10 border border-rose-500/15 text-rose-400 flex items-center justify-center active:scale-90 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </SpringIn>
          );
        })}

        {tab === "leaderboard" && (
          <SpringIn delay={0.1}>
            <div className="rounded-[24px] p-6 border border-primary/[0.08] text-center relative overflow-hidden"
              style={{ background: "linear-gradient(160deg, hsl(42 78% 55% / 0.06), hsl(220 18% 7%))" }}>
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                <Crown className="w-8 h-8 text-primary" />
              </div>
              <p className="text-[15px] font-bold">Savings Leaderboard</p>
              <p className="text-[11px] text-muted-foreground/30 mt-1.5">Add friends to compare savings progress!</p>
            </div>
          </SpringIn>
        )}

        {tab === "friends" && !loading && friends.length === 0 && (
          <SpringIn delay={0.1}>
            <EmptyState
              icon={<Users className="w-6 h-6 text-primary/70" />}
              title="No friends yet"
              description="Add someone by phone number to start sending money and chatting."
              action={
                <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-[14px] bg-primary/10 text-primary text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all">
                  <UserPlus className="w-3.5 h-3.5" /> Add friend
                </button>
              }
            />
          </SpringIn>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAdd(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-[28px] p-6 space-y-4 border-t border-white/[0.04]"
            style={{ background: "hsl(220 18% 7%)", animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            <div className="w-10 h-1 rounded-full bg-white/[0.06] mx-auto" />
            <h2 className="text-lg font-bold">Add Friend</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
              <input
                placeholder="Enter phone number..."
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                className="w-full h-[52px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/30 transition-colors"
              />
            </div>
            <button
              onClick={sendRequest}
              disabled={!searchPhone}
              className="w-full h-[52px] rounded-[16px] gradient-primary text-primary-foreground font-bold text-sm active:scale-[0.97] transition-all disabled:opacity-40 shadow-[0_8px_32px_hsl(42_78%_55%/0.2)]"
            >
              Send Request 🤝
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Friends;
