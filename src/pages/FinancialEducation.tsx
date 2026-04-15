import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, BookOpen, TrendingUp, PiggyBank, Coins, CheckCircle2, XCircle, Star, Sparkles, ChevronRight, Trophy, Zap, Flame, Medal, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_json: any;
  coin_reward: number;
  order_index: number;
}

interface LessonContent {
  cards: { title: string; body: string; emoji: string }[];
  quiz: { question: string; options: string[]; correct: number }[];
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_coins: number;
  lessons_completed: number;
}

const SpringIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <div className={className} style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both` }}>
    {children}
  </div>
);

const CATEGORIES = [
  { key: "budgeting", label: "Budgeting", icon: BookOpen, color: "hsl(210 80% 55%)", emoji: "📊" },
  { key: "saving", label: "Saving", icon: PiggyBank, color: "hsl(152 60% 45%)", emoji: "🐷" },
  { key: "investing", label: "Investing", icon: TrendingUp, color: "hsl(42 78% 55%)", emoji: "📈" },
];

// Built-in lessons for when DB is empty
const BUILTIN_LESSONS: Record<string, (LessonContent & { title: string; description: string; coin_reward: number })[]> = {
  budgeting: [
    {
      title: "Budget Basics",
      description: "Learn the 50/30/20 rule",
      coin_reward: 15,
      cards: [
        { title: "What is a Budget?", body: "A budget is a plan for how you spend your money each month. It helps you make sure you have enough for things you need and want.", emoji: "📋" },
        { title: "The 50/30/20 Rule", body: "Spend 50% on needs (food, transport), 30% on wants (games, movies), and save 20%. This simple rule keeps your money balanced!", emoji: "⚖️" },
        { title: "Track Everything", body: "Write down every purchase. Small expenses add up fast! Use AuroPay's analytics to see where your money goes.", emoji: "🔍" },
      ],
      quiz: [
        { question: "What percentage should go to savings in the 50/30/20 rule?", options: ["10%", "20%", "30%", "50%"], correct: 1 },
        { question: "Which is a 'need' expense?", options: ["Video games", "School lunch", "Movie tickets", "New shoes"], correct: 1 },
        { question: "Why should you track expenses?", options: ["It's fun", "To find small leaks", "Your parents said so", "No reason"], correct: 1 },
      ],
    },
    {
      title: "Spending Smart",
      description: "Make every rupee count",
      coin_reward: 15,
      cards: [
        { title: "Needs vs Wants", body: "Before buying, ask: 'Do I need this or want this?' Needs are essentials like food and transport. Wants are nice-to-haves.", emoji: "🤔" },
        { title: "The 24-Hour Rule", body: "For any purchase over ₹500, wait 24 hours before buying. If you still want it the next day, it might be worth it!", emoji: "⏰" },
        { title: "Compare Prices", body: "Always check at least 2-3 options before buying. You'd be surprised how much you can save by shopping around.", emoji: "🏷️" },
      ],
      quiz: [
        { question: "What is the 24-hour rule for?", options: ["Sleeping", "Impulse purchases", "Homework", "Exercise"], correct: 1 },
        { question: "Which is a 'want'?", options: ["Bus fare", "Lunch", "New headphones", "School supplies"], correct: 2 },
        { question: "How many options should you compare?", options: ["Just 1", "At least 2-3", "10+", "None"], correct: 1 },
      ],
    },
  ],
  saving: [
    {
      title: "Saving Foundations",
      description: "Why saving matters",
      coin_reward: 20,
      cards: [
        { title: "Pay Yourself First", body: "Before spending on anything, set aside your savings. Treat savings like a bill you must pay — to your future self!", emoji: "💰" },
        { title: "Emergency Fund", body: "Life throws surprises. Having 3 months of expenses saved up means you're prepared for anything — a broken phone, medical needs, etc.", emoji: "🛡️" },
        { title: "Set Goals", body: "Saving for something specific (new phone, trip, college) makes it easier to stay motivated. Use AuroPay savings goals!", emoji: "🎯" },
      ],
      quiz: [
        { question: "What does 'pay yourself first' mean?", options: ["Buy treats", "Save before spending", "Get a job", "Ask parents"], correct: 1 },
        { question: "How many months should an emergency fund cover?", options: ["1 month", "3 months", "1 week", "1 year"], correct: 1 },
        { question: "Why set savings goals?", options: ["To brag", "Stay motivated", "It's required", "No reason"], correct: 1 },
      ],
    },
  ],
  investing: [
    {
      title: "Compound Interest",
      description: "The 8th wonder of the world",
      coin_reward: 25,
      cards: [
        { title: "What is Interest?", body: "Interest is money paid to you for letting someone else use your money. Banks pay interest on your savings!", emoji: "🏦" },
        { title: "The Power of Compounding", body: "Compound interest means earning interest on your interest. ₹1,000 at 10% becomes ₹1,100 in year 1, then ₹1,210 in year 2 — it snowballs!", emoji: "❄️" },
        { title: "Start Early!", body: "Starting to invest at 15 vs 25 can mean 2-3x more money by retirement. Time is your biggest advantage as a teen!", emoji: "🚀" },
      ],
      quiz: [
        { question: "What is compound interest?", options: ["Simple interest", "Interest on interest", "A type of loan", "A tax"], correct: 1 },
        { question: "₹1,000 at 10% for 2 years with compounding becomes?", options: ["₹1,100", "₹1,200", "₹1,210", "₹1,300"], correct: 2 },
        { question: "Why should teens start investing early?", options: ["More risk", "More time for compounding", "Parents want it", "No reason"], correct: 1 },
      ],
    },
  ],
};

const FinancialEducation = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [quizDone, setQuizDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [dbLessons, setDbLessons] = useState<Lesson[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const [lessonsRes, completionsRes, streakRes] = await Promise.all([
      supabase.from("financial_lessons").select("*").order("order_index"),
      supabase.from("lesson_completions").select("lesson_id, completed_at").eq("user_id", user.id),
      supabase.from("user_streaks").select("*").eq("user_id", user.id).single(),
    ]);

    if (lessonsRes.data) setDbLessons(lessonsRes.data as Lesson[]);
    if (completionsRes.data) {
      setCompletedLessons(new Set(completionsRes.data.map((c: any) => c.lesson_id)));
      // Calculate lesson streak from completion dates
      const dates = completionsRes.data
        .map((c: any) => new Date(c.completed_at).toDateString())
        .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
        .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
      
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < dates.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        if (dates[i] === expected.toDateString()) {
          streak++;
        } else break;
      }
      setStreakDays(streak);
    }

    // Fetch leaderboard
    fetchLeaderboard();
  };

  const fetchLeaderboard = async () => {
    // Get all lesson completions with user info
    const { data: completions } = await supabase
      .from("lesson_completions")
      .select("user_id, lesson_id");
    
    if (!completions || completions.length === 0) return;

    // Get unique user IDs
    const userIds = [...new Set(completions.map(c => c.user_id))];
    
    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    // Get streak coins
    const { data: streaks } = await supabase
      .from("user_streaks")
      .select("user_id, streak_coins")
      .in("user_id", userIds);

    // Build leaderboard
    const board: LeaderboardEntry[] = userIds.map(uid => {
      const profile = profiles?.find(p => p.id === uid);
      const userCompletions = completions.filter(c => c.user_id === uid);
      const streak = streaks?.find(s => s.user_id === uid);
      return {
        user_id: uid,
        full_name: profile?.full_name || "Learner",
        avatar_url: profile?.avatar_url || null,
        total_coins: streak?.streak_coins || 0,
        lessons_completed: userCompletions.length,
      };
    });

    board.sort((a, b) => b.total_coins - a.total_coins);
    setLeaderboard(board.slice(0, 20));
  };

  const getLessonsForCategory = (cat: string): (LessonContent & { title: string; description: string; coin_reward: number; id: string })[] => {
    const fromDb = dbLessons.filter(l => l.category === cat);
    if (fromDb.length > 0) return fromDb.map(l => {
      const content = l.content_json as any[];
      if (Array.isArray(content)) {
        const cards = content.filter((c: any) => c.type === "slide").map((c: any) => ({ title: c.title, body: c.body, emoji: c.emoji }));
        const quiz = content.filter((c: any) => c.type === "quiz").map((c: any) => ({ question: c.question, options: c.options, correct: c.correct }));
        return { title: l.title, description: l.description || "", coin_reward: l.coin_reward, cards, quiz, id: l.id };
      }
      return { title: l.title, description: l.description || "", coin_reward: l.coin_reward, ...(content as unknown as LessonContent), id: l.id };
    });
    return BUILTIN_LESSONS[cat]?.map((l, i) => ({ ...l, id: `builtin-${cat}-${i}` })) || [];
  };

  const currentLessons = selectedCategory ? getLessonsForCategory(selectedCategory) : [];
  const activeLesson = selectedLesson !== null ? currentLessons[selectedLesson] : null;

  const handleAnswer = (optIdx: number) => {
    if (answered !== null) return;
    setAnswered(optIdx);
    const isCorrect = optIdx === activeLesson!.quiz[quizIndex].correct;
    if (isCorrect) {
      setScore(s => s + 1);
      haptic.success();
    } else {
      haptic.error();
    }

    setTimeout(() => {
      if (quizIndex < activeLesson!.quiz.length - 1) {
        setQuizIndex(qi => qi + 1);
        setAnswered(null);
      } else {
        setQuizDone(true);
        const passed = score + (isCorrect ? 1 : 0) >= 2;
        if (passed) {
          completeLesson();
          setTimeout(() => setShowCelebration(true), 300);
        }
      }
    }, 1200);
  };

  const completeLesson = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !activeLesson) return;

    if (!activeLesson.id.startsWith("builtin-")) {
      await supabase.from("lesson_completions").upsert({
        user_id: user.id,
        lesson_id: activeLesson.id,
        score: score + 1,
      }, { onConflict: "user_id,lesson_id" });
    }

    const { data: streak } = await supabase.from("user_streaks").select("*").eq("user_id", user.id).single();
    if (streak) {
      await supabase.from("user_streaks").update({
        streak_coins: (streak.streak_coins || 0) + activeLesson.coin_reward,
      }).eq("id", streak.id);
    }

    setCompletedLessons(prev => new Set([...prev, activeLesson.id]));
    setStreakDays(prev => prev + (prev === 0 ? 1 : 0)); // bump if first today
    haptic.success();
    toast.success(`+${activeLesson.coin_reward} coins earned! 🎉`);
  };

  const resetLesson = () => {
    setSelectedLesson(null);
    setCardIndex(0);
    setQuizMode(false);
    setQuizIndex(0);
    setScore(0);
    setAnswered(null);
    setQuizDone(false);
    setShowCelebration(false);
  };

  const confettiParticles = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      dur: 2 + Math.random() * 3,
      size: 4 + Math.random() * 8,
      color: ['hsl(42 78% 55%)', 'hsl(152 60% 45%)', 'hsl(210 80% 55%)', 'hsl(330 70% 55%)', 'hsl(280 60% 55%)', 'hsl(42 90% 65%)'][i % 6],
      rotation: Math.random() * 360,
      type: i % 3,
    })),
  []);

  const rankIcons = [
    <Crown key="1" className="w-5 h-5 text-[hsl(42_78%_55%)]" />,
    <Medal key="2" className="w-5 h-5 text-[hsl(220_20%_70%)]" />,
    <Medal key="3" className="w-5 h-5 text-[hsl(25_60%_50%)]" />,
  ];

  // Leaderboard view
  if (showLeaderboard) {
    return (
      <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[120px]" style={{ background: "hsl(42 78% 55%)" }} />
        </div>

        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-5 py-4">
            <button onClick={() => setShowLeaderboard(false)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Leaderboard</h1>
            <Trophy className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="relative z-10 px-5 pt-5 space-y-3">
          {/* Top 3 podium */}
          {leaderboard.length >= 3 && (
            <SpringIn delay={0.05}>
              <div className="flex items-end justify-center gap-3 mb-6 pt-4">
                {[1, 0, 2].map((rank) => {
                  const entry = leaderboard[rank];
                  if (!entry) return null;
                  const isFirst = rank === 0;
                  return (
                    <div key={rank} className="flex flex-col items-center" style={{ marginTop: isFirst ? 0 : 24 }}>
                      <div className={`relative w-${isFirst ? 16 : 14} h-${isFirst ? 16 : 14} rounded-full flex items-center justify-center mb-2`}
                        style={{
                          width: isFirst ? 64 : 52,
                          height: isFirst ? 64 : 52,
                          background: `linear-gradient(160deg, hsl(220 18% 12%), hsl(220 18% 8%))`,
                          border: `2px solid ${isFirst ? 'hsl(42 78% 55% / 0.5)' : 'hsl(220 15% 25%)'}`,
                          boxShadow: isFirst ? '0 0 25px hsl(42 78% 55% / 0.2)' : 'none',
                        }}>
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">{entry.full_name.charAt(0)}</span>
                        )}
                        <div className="absolute -top-2 -right-1">{rankIcons[rank]}</div>
                      </div>
                      <p className="text-[11px] font-semibold truncate max-w-[80px] text-center">{entry.full_name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Coins className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary">{entry.total_coins}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SpringIn>
          )}

          {/* Full list */}
          {leaderboard.map((entry, i) => {
            const isMe = entry.user_id === currentUserId;
            return (
              <SpringIn key={entry.user_id} delay={0.1 + i * 0.04}>
                <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  isMe ? 'border-primary/20 bg-primary/[0.04]' : 'border-white/[0.04] bg-white/[0.02]'
                }`}>
                  <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                    {i < 3 ? rankIcons[i] : `#${i + 1}`}
                  </span>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: 'hsl(220 18% 12%)', border: '1px solid hsl(220 15% 20%)' }}>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{entry.full_name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{entry.full_name} {isMe && <span className="text-[10px] text-primary">(You)</span>}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.lessons_completed} lessons completed</p>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/[0.08]">
                    <Coins className="w-3 h-3 text-primary" />
                    <span className="text-[11px] font-bold text-primary">{entry.total_coins}</span>
                  </div>
                </div>
              </SpringIn>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="text-center py-16">
              <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No learners yet. Be the first!</p>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  // Quiz complete screen
  if (quizDone && activeLesson) {
    const passed = score >= 2;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[120px]"
            style={{ background: passed ? "hsl(152 60% 45%)" : "hsl(0 72% 51%)" }} />
          {passed && <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-[0.06] blur-[100px]"
            style={{ background: "hsl(42 78% 55%)" }} />}
        </div>

        {passed && showCelebration && confettiParticles.map((p, i) => (
          <div key={i} className="fixed pointer-events-none z-30"
            style={{
              left: `${p.left}%`,
              top: '-5%',
              width: p.type === 2 ? `${p.size * 0.4}px` : `${p.size}px`,
              height: p.type === 2 ? `${p.size * 1.5}px` : `${p.size}px`,
              borderRadius: p.type === 1 ? '50%' : p.type === 2 ? '2px' : '2px',
              background: p.color,
              transform: `rotate(${p.rotation}deg)`,
              animation: `confetti-fall ${p.dur}s ease-in ${p.delay}s both`,
              boxShadow: `0 0 ${p.size}px ${p.color}`,
              opacity: 0.9,
            }}
          />
        ))}

        {passed && showCelebration && Array.from({ length: 8 }).map((_, i) => (
          <div key={`coin-${i}`} className="absolute z-20 pointer-events-none"
            style={{
              left: '50%',
              top: '40%',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, hsl(42 78% 55%), hsl(42 90% 70%))',
              boxShadow: '0 0 10px hsl(42 78% 55% / 0.5)',
              animation: `coin-burst 1s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + i * 0.05}s both`,
              transform: `rotate(${i * 45}deg) translateY(-60px)`,
            }}
          />
        ))}

        <div className="relative z-10 text-center w-full max-w-sm">
          <div style={{ animation: passed ? "celebration-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both" : "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="relative w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{
                background: passed
                  ? "linear-gradient(160deg, hsl(152 60% 45% / 0.15), hsl(42 78% 55% / 0.1))"
                  : "hsl(0 72% 51% / 0.12)",
                boxShadow: passed
                  ? "0 0 40px hsl(152 60% 45% / 0.15), 0 0 80px hsl(42 78% 55% / 0.08)"
                  : "0 0 30px hsl(0 72% 51% / 0.1)",
              }}>
              {passed && (
                <div className="absolute -inset-1 rounded-full"
                  style={{
                    background: "conic-gradient(from 0deg, transparent, hsl(42 78% 55% / 0.3), transparent, hsl(152 60% 45% / 0.3), transparent)",
                  }} />
              )}
              <div className="relative">
                {passed ? <Trophy className="w-12 h-12 text-[hsl(42_78%_55%)]" /> : <XCircle className="w-12 h-12 text-destructive" />}
              </div>
            </div>
          </div>

          <div style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s both" }}>
            <h2 className="text-3xl font-bold mb-2">{passed ? "Lesson Complete! 🎉" : "Not Quite!"}</h2>
            <p className="text-sm text-muted-foreground">
              {passed ? "Outstanding work! You've mastered this lesson." : "Don't worry — review the lesson and try again."}
            </p>
          </div>

          <div style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both" }}>
            <div className="mt-6 rounded-2xl border border-white/[0.06] p-5 relative overflow-hidden"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 10%), hsl(220 20% 5.5%))" }}>
              <div className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: passed ? "linear-gradient(90deg, transparent, hsl(152 60% 45% / 0.4), transparent)" : "linear-gradient(90deg, transparent, hsl(0 72% 51% / 0.3), transparent)" }} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Quiz Results</p>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{score}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Correct</p>
                </div>
                <div className="w-[1px] h-10 bg-white/[0.06]" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-muted-foreground">{activeLesson.quiz.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Total</p>
                </div>
                {passed && (
                  <>
                    <div className="w-[1px] h-10 bg-white/[0.06]" />
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{Math.round((score / activeLesson.quiz.length) * 100)}%</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Score</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {passed && (
            <div style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.65s both" }}>
              <div className="mt-4 rounded-2xl border border-primary/20 p-4 relative overflow-hidden"
                style={{ background: "linear-gradient(160deg, hsl(42 60% 15% / 0.15), hsl(220 18% 8%))" }}>
                <div className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.5), transparent)" }} />
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, hsl(42 78% 55% / 0.2), hsl(42 90% 65% / 0.1))",
                      boxShadow: "0 0 20px hsl(42 78% 55% / 0.15)",
                      animation: "glow-pulse 2s ease-in-out infinite",
                    }}>
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-primary"
                      style={{ animation: showCelebration ? "coin-counter 1s ease-out 0.8s both" : "none" }}>
                      +{activeLesson.coin_reward}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Coins earned</p>
                  </div>
                  <Zap className="w-5 h-5 text-primary/50 ml-auto" style={{ animation: "glow-pulse 1.5s ease-in-out infinite" }} />
                </div>
              </div>
            </div>
          )}

          <div style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both" }}>
            <button onClick={resetLesson}
              className="mt-6 w-full h-14 rounded-2xl font-semibold active:scale-[0.97] transition-all relative overflow-hidden"
              style={{
                background: passed
                  ? "linear-gradient(135deg, hsl(152 60% 40%), hsl(152 50% 35%))"
                  : "linear-gradient(135deg, hsl(42 78% 50%), hsl(42 68% 40%))",
                boxShadow: passed
                  ? "0 4px 20px hsl(152 60% 45% / 0.25)"
                  : "0 4px 20px hsl(42 78% 55% / 0.25)",
              }}>
              <span className="relative z-10 text-white font-bold">
                {passed ? "Continue Learning" : "Retry Lesson"}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active lesson (cards + quiz)
  if (activeLesson) {
    if (quizMode) {
      const q = activeLesson.quiz[quizIndex];
      return (
        <div className="min-h-screen bg-background px-5 pt-6 pb-24 relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[120px]" style={{ background: "hsl(42 78% 55%)" }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
              <button onClick={resetLesson} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Quiz — Question {quizIndex + 1}/{activeLesson.quiz.length}</p>
                <div className="flex gap-1.5 mt-2">{activeLesson.quiz.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i <= quizIndex ? "hsl(42 78% 55%)" : "hsl(220 15% 15%)" }} />
                ))}</div>
              </div>
            </div>

            <SpringIn delay={0.1}>
              <div className="rounded-[24px] p-6 mb-6 border border-white/[0.04]" style={{ background: "linear-gradient(160deg, hsl(220 18% 10%), hsl(220 20% 5.5%))" }}>
                <p className="text-lg font-bold leading-relaxed">{q.question}</p>
              </div>
            </SpringIn>

            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                let bg = "hsl(220 18% 9%)";
                let border = "hsl(220 15% 15%)";
                if (answered !== null) {
                  if (idx === q.correct) { bg = "hsl(152 60% 45% / 0.1)"; border = "hsl(152 60% 45% / 0.4)"; }
                  else if (idx === answered && idx !== q.correct) { bg = "hsl(0 72% 51% / 0.1)"; border = "hsl(0 72% 51% / 0.4)"; }
                }
                return (
                  <SpringIn key={idx} delay={0.15 + idx * 0.05}>
                    <button
                      onClick={() => handleAnswer(idx)}
                      disabled={answered !== null}
                      className="w-full text-left p-4 rounded-[16px] transition-all active:scale-[0.97]"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "hsl(220 15% 15%)" }}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <p className="text-sm font-medium">{opt}</p>
                        {answered !== null && idx === q.correct && <CheckCircle2 className="w-5 h-5 text-[hsl(152_60%_45%)] ml-auto shrink-0" />}
                        {answered !== null && idx === answered && idx !== q.correct && <XCircle className="w-5 h-5 text-destructive ml-auto shrink-0" />}
                      </div>
                    </button>
                  </SpringIn>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Card view
    const card = activeLesson.cards[cardIndex];
    return (
      <div className="min-h-screen bg-background px-5 pt-6 pb-24 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[120px]" style={{ background: "hsl(42 78% 55%)" }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <button onClick={resetLesson} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <p className="text-sm font-semibold">{activeLesson.title}</p>
              <p className="text-[10px] text-muted-foreground">Card {cardIndex + 1} of {activeLesson.cards.length}</p>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Coins className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">{activeLesson.coin_reward}</span>
            </div>
          </div>

          <div className="flex gap-1.5 mb-6">{activeLesson.cards.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{ background: i <= cardIndex ? "hsl(42 78% 55%)" : "hsl(220 15% 15%)" }} />
          ))}</div>

          <SpringIn key={cardIndex} delay={0}>
            <div className="rounded-[28px] p-8 border border-white/[0.04] min-h-[320px] flex flex-col justify-center"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 10%), hsl(220 20% 5.5%))" }}>
              <span className="text-5xl mb-5">{card.emoji}</span>
              <h3 className="text-xl font-bold mb-3">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
            </div>
          </SpringIn>

          <div className="flex gap-3 mt-6">
            {cardIndex > 0 && (
              <button onClick={() => { haptic.light(); setCardIndex(c => c - 1); }}
                className="flex-1 h-14 rounded-2xl border border-white/[0.06] bg-white/[0.03] font-semibold text-sm active:scale-[0.97] transition-all">
                Previous
              </button>
            )}
            <button
              onClick={() => {
                haptic.light();
                if (cardIndex < activeLesson.cards.length - 1) {
                  setCardIndex(c => c + 1);
                } else {
                  setQuizMode(true);
                }
              }}
              className="flex-1 h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
            >
              {cardIndex < activeLesson.cards.length - 1 ? (
                <>Next <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Start Quiz <Sparkles className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Category lessons list
  if (selectedCategory) {
    const cat = CATEGORIES.find(c => c.key === selectedCategory)!;
    const lessons = getLessonsForCategory(selectedCategory);
    const completed = lessons.filter(l => completedLessons.has(l.id)).length;
    const progress = lessons.length > 0 ? (completed / lessons.length) * 100 : 0;

    return (
      <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[120px]" style={{ background: cat.color }} />
        </div>

        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-5 py-4">
            <button onClick={() => setSelectedCategory(null)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">{cat.label}</h1>
            <div className="w-9" />
          </div>
        </div>

        <div className="relative z-10 px-5 pt-5 space-y-4">
          <SpringIn delay={0.05}>
            <div className="rounded-[24px] p-5 border border-white/[0.04] flex items-center gap-5" style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(220 15% 15%)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke={cat.color} strokeWidth="3" strokeDasharray={`${progress * 0.94} 100`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{Math.round(progress)}%</span>
              </div>
              <div>
                <p className="text-sm font-bold">{completed}/{lessons.length} Completed</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Keep learning to earn coins!</p>
              </div>
            </div>
          </SpringIn>

          {lessons.map((lesson, i) => {
            const isDone = completedLessons.has(lesson.id);
            return (
              <SpringIn key={lesson.id} delay={0.1 + i * 0.06}>
                <button
                  onClick={() => { haptic.light(); setSelectedLesson(i); setCardIndex(0); }}
                  className="w-full text-left rounded-[20px] p-4 border border-white/[0.04] transition-all active:scale-[0.97]"
                  style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}25` }}>
                      {isDone ? <CheckCircle2 className="w-6 h-6" style={{ color: cat.color }} /> : <BookOpen className="w-5 h-5" style={{ color: cat.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{lesson.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{lesson.description}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/[0.06]">
                      <Coins className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary">{lesson.coin_reward}</span>
                    </div>
                  </div>
                </button>
              </SpringIn>
            );
          })}
        </div>
        <BottomNav />
      </div>
    );
  }

  // Main category selection
  const totalLessons = CATEGORIES.reduce((s, c) => s + getLessonsForCategory(c.key).length, 0);
  const totalCompleted = CATEGORIES.reduce((s, c) => s + getLessonsForCategory(c.key).filter(l => completedLessons.has(l.id)).length, 0);

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[120px]" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute bottom-1/3 -left-40 w-[300px] h-[300px] rounded-full opacity-[0.02] blur-[100px]" style={{ background: "hsl(210 80% 55%)" }} />
      </div>

      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Learn & Earn</h1>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-primary">{totalCompleted}/{totalLessons}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-5 pt-5 space-y-4">
        {/* Streak + Leaderboard row */}
        <div className="flex gap-3">
          <SpringIn delay={0.05} className="flex-1">
            <div className="rounded-[20px] p-4 border border-white/[0.04] h-full"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: streakDays > 0 ? "linear-gradient(135deg, hsl(25 90% 50% / 0.15), hsl(0 80% 50% / 0.1))" : "hsl(220 15% 12%)",
                    border: streakDays > 0 ? "1px solid hsl(25 90% 50% / 0.25)" : "1px solid hsl(220 15% 18%)",
                  }}>
                  <Flame className={`w-6 h-6 ${streakDays > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{streakDays}</p>
                  <p className="text-[10px] text-muted-foreground">Day streak</p>
                </div>
              </div>
            </div>
          </SpringIn>

          <SpringIn delay={0.08} className="flex-1">
            <button
              onClick={() => { haptic.light(); setShowLeaderboard(true); }}
              className="w-full rounded-[20px] p-4 border border-white/[0.04] h-full text-left active:scale-[0.97] transition-all"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary/[0.08] border border-primary/20">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">Leaderboard</p>
                  <p className="text-[10px] text-muted-foreground">Top learners</p>
                </div>
              </div>
            </button>
          </SpringIn>
        </div>

        {/* Hero */}
        <SpringIn delay={0.12}>
          <div className="rounded-[24px] p-6 border border-primary/[0.1] overflow-hidden relative"
            style={{ background: "linear-gradient(160deg, hsl(42 78% 55% / 0.06), hsl(220 18% 7%))" }}>
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shadow-[0_0_30px_hsl(42_78%_55%/0.1)]">
                📚
              </div>
              <div>
                <h2 className="text-lg font-bold">Financial Education</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Learn money skills, earn coins</p>
              </div>
            </div>
          </div>
        </SpringIn>

        {/* Categories */}
        {CATEGORIES.map((cat, i) => {
          const lessons = getLessonsForCategory(cat.key);
          const completed = lessons.filter(l => completedLessons.has(l.id)).length;
          const progress = lessons.length > 0 ? (completed / lessons.length) * 100 : 0;

          return (
            <SpringIn key={cat.key} delay={0.18 + i * 0.06}>
              <button
                onClick={() => { haptic.light(); setSelectedCategory(cat.key); }}
                className="w-full text-left rounded-[20px] p-5 border border-white/[0.04] transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}
              >
                <div className="flex items-center gap-4 mb-3.5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${cat.color}12`, border: `1px solid ${cat.color}20` }}>
                    {cat.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{cat.label}</p>
                    <p className="text-[10px] text-muted-foreground">{lessons.length} lessons • {completed} completed</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: cat.color }} />
                </div>
              </button>
            </SpringIn>
          );
        })}

        {/* Tips */}
        <SpringIn delay={0.4}>
          <div className="rounded-[20px] p-4 border border-white/[0.04]" style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold">How it works</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">Read bite-sized cards, take a quiz, and earn coins! Score 2/3 or higher to unlock rewards.</p>
          </div>
        </SpringIn>
      </div>
      <BottomNav />
    </div>
  );
};

export default FinancialEducation;
