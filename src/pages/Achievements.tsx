import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Trophy, Flame, Star, Target } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string | null;
  icon: string;
  category: string;
  points: number;
}

interface UserAchievement {
  achievement_id: string;
  earned_at: string;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  total_logins: number;
  streak_coins: number;
  last_login_date: string | null;
}

const catColors: Record<string, string> = {
  money: "from-primary/20 to-primary/5",
  savings: "from-amber-500/20 to-amber-500/5",
  budget: "from-amber-600/20 to-amber-600/5",
  streak: "from-primary/20 to-amber-500/5",
  social: "from-primary/15 to-primary/5",
  chores: "from-amber-500/20 to-yellow-600/5",
  rewards: "from-primary/20 to-primary/5",
  account: "from-amber-500/15 to-amber-500/5",
  general: "from-primary/20 to-primary/5",
};

const Achievements = () => {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<UserAchievement[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    recordLogin();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [achRes, earnedRes, streakRes] = await Promise.all([
      supabase.from("achievements").select("*").order("category"),
      supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user.id),
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    setAchievements((achRes.data as any) || []);
    setEarned((earnedRes.data as any) || []);
    setStreak((streakRes.data as any) || null);
    setLoading(false);
  };

  const recordLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle();

    if (!existing) {
      await supabase.from("user_streaks").insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today,
        total_logins: 1,
        streak_coins: 1,
      });
    } else if (existing.last_login_date !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = existing.last_login_date === yesterday.toISOString().split("T")[0];
      const newStreak = isConsecutive ? (existing.current_streak || 0) + 1 : 1;
      const newLongest = Math.max(newStreak, existing.longest_streak || 0);
      const coins = isConsecutive ? Math.min(newStreak, 10) : 1;

      await supabase.from("user_streaks").update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_login_date: today,
        total_logins: (existing.total_logins || 0) + 1,
        streak_coins: (existing.streak_coins || 0) + coins,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
    fetchData();
  };

  const earnedIds = new Set(earned.map(e => e.achievement_id));
  const totalPoints = achievements.filter(a => earnedIds.has(a.id)).reduce((s, a) => s + a.points, 0);
  const categories = [...new Set(achievements.map(a => a.category))];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Achievements</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-5 pt-4 space-y-6">
        {/* Streak Card */}
        <div style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/10 to-yellow-500/10 border border-primary/15 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
                <Flame className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-black">{streak?.current_streak || 0}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="w-3 h-3 text-primary" /> {streak?.longest_streak || 0} best
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="w-3 h-3" /> {streak?.total_logins || 0} logins
                </div>
                <p className="text-sm font-bold text-primary">{streak?.streak_coins || 0} 🪙</p>
              </div>
            </div>

            {/* Streak dots */}
            <div className="flex gap-1 mt-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    i < (streak?.current_streak || 0) % 7 || ((streak?.current_streak || 0) >= 7 && (streak?.current_streak || 0) % 7 === 0)
                      ? "bg-gradient-to-r from-primary to-amber-400"
                      : "bg-white/[0.05]"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="text-[9px] text-muted-foreground flex-1 text-center">{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Points summary */}
        <div className="flex items-center justify-between" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">{earned.length}/{achievements.length} Unlocked</span>
          </div>
          <span className="text-sm font-bold text-primary">{totalPoints} pts</span>
        </div>

        {/* Achievement categories */}
        {categories.map((cat, ci) => (
          <div key={cat} style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.25 + ci * 0.05}s both` }}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
            <div className="grid grid-cols-3 gap-3">
              {achievements.filter(a => a.category === cat).map(ach => {
                const unlocked = earnedIds.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      unlocked
                        ? `bg-gradient-to-b ${catColors[cat] || catColors.general} border-primary/10`
                        : "bg-card/30 border-border/20 opacity-50 grayscale"
                    }`}
                  >
                    <span className="text-2xl">{ach.icon}</span>
                    <p className="text-[11px] font-semibold text-center leading-tight">{ach.title}</p>
                    <span className="text-[9px] text-muted-foreground">{ach.points} pts</span>
                    {unlocked && <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center"><Star className="w-2.5 h-2.5 text-primary" /></div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Achievements;
