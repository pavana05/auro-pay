import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, UserPlus, Users, Trophy, Search, Check, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  profile?: { full_name: string; avatar_url: string | null };
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  streak: number;
  savings: number;
}

const Friends = () => {
  const navigate = useNavigate();
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
    if (!profile) { toast.error("User not found"); return; }
    if (profile.id === userId) { toast.error("Can't add yourself!"); return; }

    const { error } = await supabase.from("friendships").insert({
      user_id: userId,
      friend_id: profile.id,
      status: "pending",
    });

    if (!error) {
      haptic.success();
      toast.success("Friend request sent! 🎉");
      setShowAdd(false);
      setSearchPhone("");
    } else {
      toast.error("Already sent or already friends");
    }
  };

  const handleRequest = async (id: string, accept: boolean) => {
    haptic.medium();
    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
      toast.success("Friend added! 🤝");
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
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Friends</h1>
          <button onClick={() => { haptic.light(); setShowAdd(true); }} className="p-2 -mr-2 rounded-xl bg-primary/10 text-primary active:scale-90 transition-all">
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 gap-1 pb-3">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
                tab === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground"
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

      <div className="px-5 pt-4 space-y-3">
        {tab === "friends" && friends.map((f, i) => (
          <div
            key={f.id}
            style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.1 + i * 0.06}s both` }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-card/50 border border-border/30"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
              {f.profile?.full_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{f.profile?.full_name || "Friend"}</p>
              <p className="text-[11px] text-muted-foreground">Connected</p>
            </div>
            <button
              onClick={() => navigate("/quick-pay")}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold active:scale-90 transition-all"
            >
              Pay
            </button>
          </div>
        ))}

        {tab === "requests" && requests.map((r, i) => (
          <div
            key={r.id}
            style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.1 + i * 0.06}s both` }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-card/50 border border-border/30"
          >
            <div className="w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center text-lg font-bold text-blue-400">
              {r.profile?.full_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{r.profile?.full_name || "Someone"}</p>
              <p className="text-[11px] text-muted-foreground">Wants to connect</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleRequest(r.id, true)} className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center active:scale-90 transition-all">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => handleRequest(r.id, false)} className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center active:scale-90 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {tab === "leaderboard" && (
          <div className="space-y-3">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10 text-center">
              <Trophy className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">Savings Leaderboard</p>
              <p className="text-xs text-muted-foreground mt-1">Add friends to compare savings progress!</p>
            </div>
            {friends.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Add friends to see the leaderboard 🏆</p>
            )}
          </div>
        )}

        {tab === "friends" && !loading && friends.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-4xl">👋</div>
            <p className="text-sm text-muted-foreground">No friends yet. Add someone!</p>
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAdd(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-card border-t border-border/50 rounded-t-3xl p-6 space-y-4"
            style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto" />
            <h2 className="text-lg font-bold">Add Friend</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Enter phone number..."
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                className="w-full h-12 rounded-xl bg-background border border-border pl-11 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <button
              onClick={sendRequest}
              disabled={!searchPhone}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-all disabled:opacity-50"
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
