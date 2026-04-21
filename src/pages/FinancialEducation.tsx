import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft, BookOpen, TrendingUp, PiggyBank, Coins, CheckCircle2, XCircle,
  Sparkles, ChevronRight, Trophy, Flame, Medal, Crown, CreditCard, ShieldAlert,
  Receipt, LineChart,
} from "lucide-react";
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

/* ────────────────────────────────────────────────────────────────────────────
 * Motion primitives — calm, editorial. Short translate, soft cubic-bezier,
 * tiny stagger. No bouncy spring on cards (kept only for hero / celebration).
 * ──────────────────────────────────────────────────────────────────────────── */
const Reveal = ({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) => (
  <div
    className={className}
    style={{ animation: `learn-reveal 520ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both` }}
  >
    {children}
  </div>
);

const SpringIn = ({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) => (
  <div
    className={className}
    style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both` }}
  >
    {children}
  </div>
);

/* ────────────────────────────────────────────────────────────────────────────
 * Categories — restrained palette. Gold is the only saturated accent;
 * the others sit at lower chroma so the page reads editorial, not arcade.
 * ──────────────────────────────────────────────────────────────────────────── */
const CATEGORIES: {
  key: string; label: string; tagline: string; icon: any; color: string; emoji: string;
}[] = [
  { key: "budgeting", label: "Budgeting",   tagline: "Plan every rupee",          icon: BookOpen,    color: "hsl(210 60% 60%)", emoji: "📊" },
  { key: "saving",    label: "Saving",      tagline: "Build the cushion",         icon: PiggyBank,   color: "hsl(152 45% 55%)", emoji: "🏦" },
  { key: "investing", label: "Investing",   tagline: "Make money work",           icon: TrendingUp,  color: "hsl(42 78% 55%)",  emoji: "📈" },
  { key: "credit",    label: "Credit & Debt", tagline: "Borrow without regret",   icon: CreditCard,  color: "hsl(265 45% 65%)", emoji: "💳" },
  { key: "taxes",     label: "Taxes 101",   tagline: "What gets deducted, why",   icon: Receipt,     color: "hsl(195 50% 55%)", emoji: "🧾" },
  { key: "scams",     label: "Avoiding Scams", tagline: "Protect your money",     icon: ShieldAlert, color: "hsl(15 70% 60%)",  emoji: "🛡️" },
  { key: "markets",   label: "Markets Basics", tagline: "Stocks, funds, and you", icon: LineChart,   color: "hsl(35 65% 55%)",  emoji: "📉" },
];

const BUILTIN_LESSONS: Record<string, (LessonContent & { title: string; description: string; coin_reward: number })[]> = {
  budgeting: [
    {
      title: "Budget Basics",
      description: "The 50/30/20 rule, demystified",
      coin_reward: 15,
      cards: [
        { title: "What a budget really is", body: "A budget is not a restriction. It's a plan for where your money goes before it gets there. People with budgets feel less anxious about money — that's the whole point.", emoji: "📋" },
        { title: "The 50/30/20 rule", body: "50% on needs (food, transport, bills). 30% on wants (games, eating out). 20% to savings. It's a starting point — your numbers will shift, and that's fine.", emoji: "⚖️" },
        { title: "Track every rupee", body: "Small leaks sink big budgets. Open AuroPay's analytics every Sunday for two minutes — that's enough to spot drift before it becomes a habit.", emoji: "🔍" },
      ],
      quiz: [
        { question: "In the 50/30/20 rule, how much should go to savings?", options: ["10%", "20%", "30%", "50%"], correct: 1 },
        { question: "Which of these is a 'need'?", options: ["Streaming subscription", "School transport", "Concert ticket", "New game"], correct: 1 },
        { question: "Why review your spending weekly?", options: ["It's required", "Spot drift early", "To impress parents", "No real reason"], correct: 1 },
      ],
    },
    {
      title: "Spending Smart",
      description: "Make every rupee count",
      coin_reward: 15,
      cards: [
        { title: "Need or want?", body: "Before any purchase, ask one question: would I still want this in a week? If you can't answer yes, walk away. Future-you will thank you.", emoji: "🤔" },
        { title: "The 24-hour rule", body: "For anything over ₹500, sleep on it. Impulse fades. Real desire doesn't. The rule is boring on purpose — that's what makes it work.", emoji: "⏰" },
        { title: "Compare three", body: "Always check at least three options before buying online. Five minutes of comparison routinely saves 15–30%. That's a free raise.", emoji: "🏷️" },
      ],
      quiz: [
        { question: "What's the 24-hour rule designed to defeat?", options: ["Boredom", "Impulse buys", "Procrastination", "FOMO marketing"], correct: 1 },
        { question: "How many options should you compare?", options: ["One", "At least three", "Ten or more", "None — go fast"], correct: 1 },
        { question: "A 'want' becomes a 'need' when…", options: ["You really want it", "It replaces something essential", "It's on sale", "Friends have it"], correct: 1 },
      ],
    },
  ],

  saving: [
    {
      title: "Saving Foundations",
      description: "Why saving matters more than earning",
      coin_reward: 20,
      cards: [
        { title: "Pay yourself first", body: "The moment money lands in your wallet, move savings out before you spend a thing. It's a tiny ritual that changes everything over time.", emoji: "💰" },
        { title: "An emergency cushion", body: "Aim for 3 months of essentials saved up. It turns life's surprises — broken phone, exam fees, sick days — from crises into footnotes.", emoji: "🛡️" },
        { title: "Goals beat willpower", body: "Saving for 'something one day' rarely sticks. Saving for 'a Pixel 9 by August' does. Name it, see it, and your brain treats it as real.", emoji: "🎯" },
      ],
      quiz: [
        { question: "'Pay yourself first' means…", options: ["Buy yourself treats", "Save before you spend", "Get a job", "Ask parents for more"], correct: 1 },
        { question: "How many months should an emergency fund cover?", options: ["1 week", "1 month", "3 months", "1 year"], correct: 2 },
        { question: "Why do specific goals beat vague ones?", options: ["They feel real", "They're shorter", "Parents like them", "No reason"], correct: 0 },
      ],
    },
    {
      title: "Where to Park Money",
      description: "Savings account vs FD vs liquid funds",
      coin_reward: 20,
      cards: [
        { title: "Savings account", body: "Boring, instant, safe. Earns ~3% in India. Use it for your emergency fund and money you'll touch this month.", emoji: "🏦" },
        { title: "Fixed deposits", body: "Lock money away for 6–12 months and earn 6–7%. Trade-off: you can't touch it without a small penalty. Good for short-term goals.", emoji: "🔒" },
        { title: "Liquid mutual funds", body: "A middle ground: ~5–6% returns, money out in 1 working day. Slightly more paperwork to start, but worth it for amounts above ₹10k.", emoji: "🌊" },
      ],
      quiz: [
        { question: "Where should an emergency fund live?", options: ["Stocks", "Savings account", "Crypto", "Locked FD"], correct: 1 },
        { question: "Main trade-off of a fixed deposit?", options: ["Lower returns", "No interest", "Locked-in money", "It's risky"], correct: 2 },
        { question: "Liquid funds typically return…", options: ["Around 5–6%", "1%", "20%", "Nothing"], correct: 0 },
      ],
    },
  ],

  investing: [
    {
      title: "Compound Interest",
      description: "Why time matters more than money",
      coin_reward: 25,
      cards: [
        { title: "Interest, in one line", body: "Interest is the rent someone pays for using your money. Banks pay you for parking it. Lenders charge you for borrowing it. Same idea, both directions.", emoji: "🏦" },
        { title: "The compounding snowball", body: "₹1,000 at 10% becomes ₹1,100 in year one — then ₹1,210 in year two, because you earn interest on the interest. Boring at first, magical after a decade.", emoji: "❄️" },
        { title: "Start now, even tiny", body: "Investing ₹500/month from age 15 ends up larger than ₹2,000/month from age 25. Time does most of the work. You just have to start.", emoji: "🚀" },
      ],
      quiz: [
        { question: "What's compound interest?", options: ["A type of loan", "Interest on interest", "Bank fee", "A tax"], correct: 1 },
        { question: "₹1,000 at 10% for 2 years compounded becomes…", options: ["₹1,100", "₹1,200", "₹1,210", "₹1,300"], correct: 2 },
        { question: "Why does starting early matter most?", options: ["Less risk", "Time multiplies returns", "Fewer rules", "It doesn't"], correct: 1 },
      ],
    },
  ],

  credit: [
    {
      title: "Credit Without Regret",
      description: "How borrowing actually works",
      coin_reward: 25,
      cards: [
        { title: "Credit is borrowed time", body: "When you use a credit card, you're borrowing the bank's money for ~30 days for free. Pay the full bill on time and it costs nothing. Miss it, and rates jump to 30–40% per year.", emoji: "💳" },
        { title: "The minimum-due trap", body: "Paying just the 'minimum due' keeps you out of trouble with the bank — but interest piles on the rest. A ₹10,000 balance at minimum-due payments can take 10+ years to clear.", emoji: "🪤" },
        { title: "Your credit score", body: "Lenders rate you 300–900 based on how reliably you pay. Higher score = lower interest on future loans. Pay every bill on time, keep usage under 30% of your limit.", emoji: "📊" },
      ],
      quiz: [
        { question: "When does credit-card borrowing cost you nothing?", options: ["Always", "If you pay the full bill on time", "If you spend under ₹500", "Never"], correct: 1 },
        { question: "What's the danger of paying only the minimum due?", options: ["Bank gets angry", "Interest piles up forever", "Card gets cancelled", "Nothing"], correct: 1 },
        { question: "Healthy credit usage stays under…", options: ["10%", "30%", "70%", "100%"], correct: 1 },
      ],
    },
  ],

  taxes: [
    {
      title: "Taxes 101",
      description: "Where your salary goes before it arrives",
      coin_reward: 20,
      cards: [
        { title: "Why we pay tax", body: "Tax funds roads, schools, hospitals, defence. In India, anyone earning above ₹3 lakh/year pays income tax. Even your part-time gig income counts above that limit.", emoji: "🧾" },
        { title: "Slabs, not flat rates", body: "Indian income tax is tiered: the first ₹3 lakh is free, the next slab pays 5%, then 10%, and so on. You're never taxed on your full income at the top rate — only the slice in each slab.", emoji: "🪜" },
        { title: "GST hides in plain sight", body: "Every time you buy chips, clothes, or a phone, GST is built into the price (5–28%). You pay tax constantly without noticing — that's the design.", emoji: "🛒" },
      ],
      quiz: [
        { question: "Income tax in India starts at…", options: ["Any income", "₹3 lakh/year", "₹10 lakh/year", "₹1 crore/year"], correct: 1 },
        { question: "Indian income tax uses…", options: ["A flat rate", "Slabs / tiers", "Random rates", "Lottery"], correct: 1 },
        { question: "GST is added…", options: ["Only on luxuries", "Only on food", "On most goods and services", "Only at restaurants"], correct: 2 },
      ],
    },
  ],

  scams: [
    {
      title: "Spotting a Scam",
      description: "The patterns that always repeat",
      coin_reward: 25,
      cards: [
        { title: "Urgency is the red flag", body: "Real banks never say 'do this in the next 5 minutes or your account closes'. Scammers do, every single time. Slow down. Hang up. Call your bank from the number on your card.", emoji: "🚨" },
        { title: "OTPs are the keys", body: "An OTP is a one-time password — it's the literal key to your money. No real employee, ever, will ask for it. If someone does, it's a scam. Full stop.", emoji: "🔑" },
        { title: "If it's too good, it isn't", body: "₹5,000 'bonus' for clicking a link. Unbelievable returns. A celebrity DM-ing you about a deal. The size of the offer is the warning sign — not the headline.", emoji: "🎣" },
      ],
      quiz: [
        { question: "Who can legitimately ask for your OTP?", options: ["Your bank", "Police", "Customer support", "Nobody, ever"], correct: 3 },
        { question: "The single biggest red flag in scam calls is…", options: ["Politeness", "A foreign accent", "Artificial urgency", "Long pauses"], correct: 2 },
        { question: "When someone offers absurdly high returns, you should…", options: ["Invest a little to test", "Walk away", "Ask for proof", "Tell friends first"], correct: 1 },
      ],
    },
  ],

  markets: [
    {
      title: "Stocks, Funds, and You",
      description: "What you're actually buying",
      coin_reward: 25,
      cards: [
        { title: "A stock is a slice", body: "When you buy a share of Reliance, you own a tiny slice of the company. If it grows, your slice gets more valuable. If it shrinks, so does your slice.", emoji: "🍰" },
        { title: "Mutual funds = teamwork", body: "Instead of picking stocks yourself, you pool money with thousands of others. A fund manager picks 30–50 companies. Lower risk than betting on one stock — and you don't need a finance degree.", emoji: "🤝" },
        { title: "Index funds, the boring winner", body: "An index fund just owns 'all the big companies in the market'. No clever picking. They quietly beat ~80% of professional fund managers over 10+ years. Boring works.", emoji: "📈" },
      ],
      quiz: [
        { question: "Buying a stock means you own…", options: ["A loan to the company", "A slice of the company", "A bond", "Nothing"], correct: 1 },
        { question: "The main benefit of a mutual fund is…", options: ["Guaranteed returns", "Diversification", "No fees", "Tax-free profits"], correct: 1 },
        { question: "Index funds typically beat…", options: ["No one", "About 20% of pros", "About 80% of pros over 10 yrs", "Always 100%"], correct: 2 },
      ],
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════ */

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
  const [totalCoins, setTotalCoins] = useState(0);

  useEffect(() => { fetchData(); }, []);

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
    if (streakRes.data) setTotalCoins(streakRes.data.streak_coins || 0);
    if (completionsRes.data) {
      setCompletedLessons(new Set(completionsRes.data.map((c: any) => c.lesson_id)));
      const dates = completionsRes.data
        .map((c: any) => new Date(c.completed_at).toDateString())
        .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
        .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < dates.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        if (dates[i] === expected.toDateString()) streak++;
        else break;
      }
      setStreakDays(streak);
    }
    fetchLeaderboard();
  };

  const fetchLeaderboard = async () => {
    const { data: completions } = await supabase
      .from("lesson_completions").select("user_id, lesson_id");
    if (!completions || completions.length === 0) return;
    const userIds = [...new Set(completions.map(c => c.user_id))];
    const [{ data: profiles }, { data: streaks }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds),
      supabase.from("user_streaks").select("user_id, streak_coins").in("user_id", userIds),
    ]);
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
    if (isCorrect) { setScore(s => s + 1); haptic.success(); } else { haptic.error(); }
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
        user_id: user.id, lesson_id: activeLesson.id, score: score + 1,
      }, { onConflict: "user_id,lesson_id" });
    }
    const { data: streak } = await supabase.from("user_streaks").select("*").eq("user_id", user.id).single();
    if (streak) {
      await supabase.from("user_streaks").update({
        streak_coins: (streak.streak_coins || 0) + activeLesson.coin_reward,
      }).eq("id", streak.id);
    }
    setCompletedLessons(prev => new Set([...prev, activeLesson.id]));
    setTotalCoins(c => c + activeLesson.coin_reward);
    setStreakDays(prev => prev + (prev === 0 ? 1 : 0));
    haptic.success();
    toast.success(`+${activeLesson.coin_reward} coins earned`);
  };

  const resetLesson = () => {
    setSelectedLesson(null);
    setCardIndex(0); setQuizMode(false); setQuizIndex(0);
    setScore(0); setAnswered(null); setQuizDone(false); setShowCelebration(false);
  };

  const confettiParticles = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.4,
      dur: 2.4 + Math.random() * 2.5,
      size: 4 + Math.random() * 6,
      // Editorial palette: gold + restrained accents only.
      color: ['hsl(42 78% 55%)', 'hsl(42 90% 70%)', 'hsl(42 60% 45%)', 'hsl(0 0% 92%)'][i % 4],
      rotation: Math.random() * 360,
      type: i % 3,
    })),
  []);

  const rankIcons = [
    <Crown key="1"  className="w-4 h-4 text-[hsl(42_78%_55%)]" />,
    <Medal key="2"  className="w-4 h-4 text-[hsl(0_0%_70%)]" />,
    <Medal key="3"  className="w-4 h-4 text-[hsl(25_55%_50%)]" />,
  ];

  /* ─────────────────────── LEADERBOARD ─────────────────────── */
  if (showLeaderboard) {
    return (
      <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
        <AmbientGlow />

        <div className="sticky top-0 z-30 bg-background/75 backdrop-blur-2xl border-b border-white/[0.04]">
          <div className="flex items-center justify-between px-5 py-4">
            <button onClick={() => setShowLeaderboard(false)}
              className="p-2 -ml-2 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Top learners</p>
              <h1 className="text-base font-semibold tracking-tight">Leaderboard</h1>
            </div>
            <Trophy className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="relative z-10 px-5 pt-6 space-y-3">
          {leaderboard.length >= 3 && (
            <Reveal delay={0.05}>
              <div className="flex items-end justify-center gap-4 mb-8 pt-2">
                {[1, 0, 2].map((rank) => {
                  const entry = leaderboard[rank];
                  if (!entry) return null;
                  const isFirst = rank === 0;
                  return (
                    <div key={rank} className="flex flex-col items-center" style={{ marginTop: isFirst ? 0 : 28 }}>
                      <div className="relative flex items-center justify-center mb-2.5"
                        style={{
                          width: isFirst ? 72 : 56, height: isFirst ? 72 : 56, borderRadius: 999,
                          background: "linear-gradient(160deg, hsl(220 18% 11%), hsl(220 22% 6%))",
                          border: isFirst ? "1px solid hsl(42 78% 55% / 0.45)" : "1px solid hsl(0 0% 100% / 0.06)",
                          boxShadow: isFirst
                            ? "0 0 0 4px hsl(42 78% 55% / 0.06), 0 14px 40px -10px hsl(42 78% 55% / 0.35)"
                            : "0 8px 24px -10px hsl(0 0% 0% / 0.6)",
                        }}>
                        {entry.avatar_url
                          ? <img src={entry.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                          : <span className={`font-semibold text-muted-foreground ${isFirst ? "text-xl" : "text-base"}`}>{entry.full_name.charAt(0)}</span>}
                        <div className="absolute -top-2 -right-1.5 w-6 h-6 rounded-full bg-background border border-white/[0.06] flex items-center justify-center">
                          {rankIcons[rank]}
                        </div>
                      </div>
                      <p className="text-[11px] font-medium truncate max-w-[88px] text-center text-foreground/90">{entry.full_name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Coins className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-semibold text-primary tracking-wide">{entry.total_coins}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          )}

          {leaderboard.map((entry, i) => {
            const isMe = entry.user_id === currentUserId;
            return (
              <Reveal key={entry.user_id} delay={0.08 + Math.min(i, 8) * 0.035}>
                <div
                  className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                  style={{
                    background: isMe
                      ? "linear-gradient(160deg, hsl(42 78% 55% / 0.06), hsl(220 18% 7%))"
                      : "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 6%))",
                    border: isMe ? "1px solid hsl(42 78% 55% / 0.25)" : "1px solid hsl(0 0% 100% / 0.04)",
                  }}>
                  <span className="text-[11px] font-semibold text-muted-foreground w-6 text-center tabular-nums">
                    {i < 3 ? rankIcons[i] : `#${i + 1}`}
                  </span>
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ background: 'hsl(220 18% 12%)', border: '1px solid hsl(0 0% 100% / 0.04)' }}>
                    {entry.avatar_url
                      ? <img src={entry.avatar_url} className="w-full h-full object-cover" alt="" />
                      : <span className="text-sm font-semibold text-muted-foreground">{entry.full_name.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">
                      {entry.full_name}
                      {isMe && <span className="text-[10px] text-primary ml-1.5 font-normal">· You</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{entry.lessons_completed} {entry.lessons_completed === 1 ? "lesson" : "lessons"}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/[0.08] border border-primary/[0.15]">
                    <Coins className="w-3 h-3 text-primary" />
                    <span className="text-[11px] font-semibold text-primary tabular-nums">{entry.total_coins}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="text-center py-20">
              <Trophy className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No learners yet — be the first.</p>
            </div>
          )}
        </div>
        <BottomNav />
        <LearnStyles />
      </div>
    );
  }

  /* ─────────────────────── QUIZ COMPLETE ─────────────────────── */
  if (quizDone && activeLesson) {
    const passed = score >= 2;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-[0.07] blur-[140px]"
            style={{ background: passed ? "hsl(42 78% 55%)" : "hsl(0 65% 50%)" }} />
        </div>

        {passed && showCelebration && confettiParticles.map((p, i) => (
          <div key={i} className="fixed pointer-events-none z-30"
            style={{
              left: `${p.left}%`, top: '-5%',
              width: p.type === 2 ? `${p.size * 0.4}px` : `${p.size}px`,
              height: p.type === 2 ? `${p.size * 1.5}px` : `${p.size}px`,
              borderRadius: p.type === 1 ? '50%' : '2px',
              background: p.color,
              transform: `rotate(${p.rotation}deg)`,
              animation: `confetti-fall ${p.dur}s ease-in ${p.delay}s both`,
              boxShadow: `0 0 ${p.size}px ${p.color}`,
              opacity: 0.85,
            }}
          />
        ))}

        <div className="relative z-10 text-center w-full max-w-sm">
          <div style={{ animation: passed ? "celebration-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both" : "learn-reveal 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="relative w-20 h-20 rounded-full mx-auto mb-7 flex items-center justify-center"
              style={{
                background: passed
                  ? "linear-gradient(160deg, hsl(42 78% 55% / 0.16), hsl(220 18% 8%))"
                  : "hsl(0 65% 50% / 0.1)",
                border: passed ? "1px solid hsl(42 78% 55% / 0.35)" : "1px solid hsl(0 65% 50% / 0.3)",
                boxShadow: passed
                  ? "0 0 0 6px hsl(42 78% 55% / 0.04), 0 20px 60px -10px hsl(42 78% 55% / 0.35)"
                  : "0 0 30px hsl(0 65% 50% / 0.15)",
              }}>
              {passed
                ? <Trophy className="w-9 h-9 text-[hsl(42_78%_55%)]" strokeWidth={1.5} />
                : <XCircle className="w-9 h-9 text-destructive" strokeWidth={1.5} />}
            </div>
          </div>

          <Reveal delay={0.15}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary mb-3">
              {passed ? "Lesson complete" : "Almost there"}
            </p>
            <h2 className="text-[28px] font-semibold tracking-tight mb-2 leading-[1.1]">
              {passed ? "Beautifully done." : "Not quite yet."}
            </h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
              {passed
                ? "You absorbed the concept and proved it. The next lesson is waiting whenever you are."
                : "Review the cards and give it another go — the concept is right there."}
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="mt-7 rounded-2xl border border-white/[0.05] p-5 relative overflow-hidden"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5.5%))" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: passed
                  ? "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.5), transparent)"
                  : "linear-gradient(90deg, transparent, hsl(0 65% 50% / 0.3), transparent)" }} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-4">Quiz results</p>
              <div className="flex items-center justify-center gap-7">
                <div className="text-center">
                  <p className="text-[28px] font-semibold tabular-nums">{score}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">Correct</p>
                </div>
                <div className="w-px h-9 bg-white/[0.06]" />
                <div className="text-center">
                  <p className="text-[28px] font-semibold text-muted-foreground tabular-nums">{activeLesson.quiz.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">Total</p>
                </div>
                {passed && (
                  <>
                    <div className="w-px h-9 bg-white/[0.06]" />
                    <div className="text-center">
                      <p className="text-[28px] font-semibold text-primary tabular-nums">{Math.round((score / activeLesson.quiz.length) * 100)}%</p>
                      <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">Score</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Reveal>

          {passed && (
            <Reveal delay={0.35}>
              <div className="mt-3.5 rounded-2xl border border-primary/20 p-4 relative overflow-hidden"
                style={{ background: "linear-gradient(160deg, hsl(42 60% 18% / 0.12), hsl(220 18% 7%))" }}>
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.55), transparent)" }} />
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, hsl(42 78% 55% / 0.18), hsl(42 90% 65% / 0.08))",
                      border: "1px solid hsl(42 78% 55% / 0.25)",
                    }}>
                    <Coins className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-[20px] font-semibold text-primary tabular-nums leading-none">+{activeLesson.coin_reward}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5">coins added to your balance</p>
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          <Reveal delay={0.45}>
            <button onClick={resetLesson}
              className="mt-7 w-full h-13 py-3.5 rounded-2xl font-medium text-[14px] tracking-wide active:scale-[0.98] transition-all"
              style={{
                background: passed
                  ? "linear-gradient(180deg, hsl(42 78% 55%), hsl(42 70% 48%))"
                  : "hsl(220 18% 12%)",
                color: passed ? "hsl(220 25% 8%)" : "hsl(0 0% 95%)",
                border: passed ? "1px solid hsl(42 78% 55% / 0.4)" : "1px solid hsl(0 0% 100% / 0.06)",
                boxShadow: passed ? "0 14px 36px -12px hsl(42 78% 55% / 0.5)" : "none",
              }}>
              {passed ? "Continue learning" : "Try again"}
            </button>
          </Reveal>
        </div>
        <LearnStyles />
      </div>
    );
  }

  /* ─────────────────────── LESSON PLAYER (cards + quiz) ─────────────────────── */
  if (activeLesson) {
    if (quizMode) {
      const q = activeLesson.quiz[quizIndex];
      return (
        <div className="min-h-screen bg-background px-5 pt-6 pb-24 relative overflow-hidden">
          <AmbientGlow />
          <div className="relative z-10">
            <Reveal>
              <div className="flex items-center gap-3 mb-7">
                <button onClick={resetLesson}
                  className="p-2 -ml-2 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Quiz</p>
                  <p className="text-[13px] font-medium mt-0.5">Question {quizIndex + 1} of {activeLesson.quiz.length}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mb-7">
                {activeLesson.quiz.map((_, i) => (
                  <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/[0.05]">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: i <= quizIndex ? '100%' : '0%', background: "hsl(42 78% 55%)" }} />
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.08} key={quizIndex}>
              <div className="rounded-[24px] p-6 mb-6 border border-white/[0.05]"
                style={{ background: "linear-gradient(160deg, hsl(220 18% 10%), hsl(220 22% 6%))" }}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary/80 mb-3">Question</p>
                <p className="text-[19px] font-medium leading-snug tracking-tight">{q.question}</p>
              </div>
            </Reveal>

            <div className="space-y-2.5">
              {q.options.map((opt, idx) => {
                let bg = "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 6%))";
                let border = "hsl(0 0% 100% / 0.05)";
                let textColor = "hsl(0 0% 95%)";
                if (answered !== null) {
                  if (idx === q.correct) {
                    bg = "linear-gradient(160deg, hsl(152 50% 25% / 0.15), hsl(220 18% 7%))";
                    border = "hsl(152 50% 50% / 0.45)";
                  } else if (idx === answered) {
                    bg = "linear-gradient(160deg, hsl(0 60% 25% / 0.15), hsl(220 18% 7%))";
                    border = "hsl(0 60% 55% / 0.4)";
                    textColor = "hsl(0 0% 70%)";
                  } else {
                    textColor = "hsl(0 0% 50%)";
                  }
                }
                return (
                  <Reveal key={`${quizIndex}-${idx}`} delay={0.12 + idx * 0.04}>
                    <button
                      onClick={() => handleAnswer(idx)}
                      disabled={answered !== null}
                      className="w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98]"
                      style={{ background: bg, border: `1px solid ${border}`, color: textColor }}>
                      <div className="flex items-center gap-3.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                          style={{
                            background: answered !== null && idx === q.correct ? "hsl(152 50% 50% / 0.2)"
                                      : answered !== null && idx === answered ? "hsl(0 60% 55% / 0.2)"
                                      : "hsl(220 15% 14%)",
                            border: "1px solid hsl(0 0% 100% / 0.06)",
                          }}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <p className="text-[13.5px] font-normal leading-snug flex-1">{opt}</p>
                        {answered !== null && idx === q.correct && <CheckCircle2 className="w-4.5 h-4.5 text-[hsl(152_50%_55%)] shrink-0" strokeWidth={1.8} />}
                        {answered !== null && idx === answered && idx !== q.correct && <XCircle className="w-4.5 h-4.5 text-destructive shrink-0" strokeWidth={1.8} />}
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>
          <LearnStyles />
        </div>
      );
    }

    // Card view
    const card = activeLesson.cards[cardIndex];
    return (
      <div className="min-h-screen bg-background px-5 pt-6 pb-24 relative overflow-hidden">
        <AmbientGlow />
        <div className="relative z-10">
          <Reveal>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={resetLesson}
                className="p-2 -ml-2 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Lesson</p>
                <p className="text-[13px] font-medium mt-0.5 truncate">{activeLesson.title}</p>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/[0.08] border border-primary/[0.18]">
                <Coins className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary tabular-nums">{activeLesson.coin_reward}</span>
              </div>
            </div>

            <div className="flex gap-1.5 mb-6">
              {activeLesson.cards.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/[0.05]">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: i <= cardIndex ? '100%' : '0%', background: "hsl(42 78% 55%)" }} />
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal key={cardIndex} delay={0.05}>
            <div className="rounded-[28px] p-7 border border-white/[0.05] min-h-[340px] flex flex-col justify-center relative overflow-hidden"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 10%), hsl(220 22% 5.5%))" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.35), transparent)" }} />
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary/80 mb-4">Card {cardIndex + 1} · {activeLesson.cards.length}</p>
              <span className="text-[42px] mb-5 leading-none">{card.emoji}</span>
              <h3 className="text-[22px] font-semibold tracking-tight mb-3 leading-[1.15]">{card.title}</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">{card.body}</p>
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="flex gap-2.5 mt-6">
              {cardIndex > 0 && (
                <button onClick={() => { haptic.light(); setCardIndex(c => c - 1); }}
                  className="flex-1 h-13 py-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] font-medium text-[13.5px] tracking-wide active:scale-[0.98] transition-all">
                  Previous
                </button>
              )}
              <button
                onClick={() => {
                  haptic.light();
                  if (cardIndex < activeLesson.cards.length - 1) setCardIndex(c => c + 1);
                  else setQuizMode(true);
                }}
                className="flex-1 h-13 py-3.5 rounded-2xl font-medium text-[13.5px] tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                style={{
                  background: "linear-gradient(180deg, hsl(42 78% 55%), hsl(42 70% 48%))",
                  color: "hsl(220 25% 8%)",
                  border: "1px solid hsl(42 78% 55% / 0.4)",
                  boxShadow: "0 14px 32px -14px hsl(42 78% 55% / 0.55)",
                }}>
                {cardIndex < activeLesson.cards.length - 1 ? (
                  <>Next <ChevronRight className="w-4 h-4" strokeWidth={2.2} /></>
                ) : (
                  <>Start quiz <Sparkles className="w-3.5 h-3.5" strokeWidth={2} /></>
                )}
              </button>
            </div>
          </Reveal>
        </div>
        <LearnStyles />
      </div>
    );
  }

  /* ─────────────────────── CATEGORY DETAIL ─────────────────────── */
  if (selectedCategory) {
    const cat = CATEGORIES.find(c => c.key === selectedCategory)!;
    const lessons = getLessonsForCategory(selectedCategory);
    const completed = lessons.filter(l => completedLessons.has(l.id)).length;
    const progress = lessons.length > 0 ? (completed / lessons.length) * 100 : 0;

    return (
      <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
        <AmbientGlow accent={cat.color} />

        <div className="sticky top-0 z-30 bg-background/75 backdrop-blur-2xl border-b border-white/[0.04]">
          <div className="flex items-center justify-between px-5 py-4">
            <button onClick={() => setSelectedCategory(null)}
              className="p-2 -ml-2 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Category</p>
              <h1 className="text-base font-semibold tracking-tight">{cat.label}</h1>
            </div>
            <div className="w-9" />
          </div>
        </div>

        <div className="relative z-10 px-5 pt-6 space-y-3">
          <Reveal>
            <div className="rounded-[24px] p-6 border border-white/[0.05] relative overflow-hidden"
              style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5.5%))" }}>
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-[0.07]"
                style={{ background: `radial-gradient(circle, ${cat.color}, transparent 65%)` }} />
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{cat.tagline}</p>
              <h2 className="text-[26px] font-semibold tracking-tight mb-5 leading-[1.1]">{cat.label}</h2>
              <div className="flex items-center gap-5">
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(0 0% 100% / 0.05)" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={cat.color} strokeWidth="2.5"
                      strokeDasharray={`${progress * 0.94} 100`} strokeLinecap="round"
                      style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)" }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">{Math.round(progress)}%</span>
                </div>
                <div>
                  <p className="text-[14px] font-medium tabular-nums">{completed} of {lessons.length} complete</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Each lesson takes about 3 minutes.</p>
                </div>
              </div>
            </div>
          </Reveal>

          {lessons.map((lesson, i) => {
            const isDone = completedLessons.has(lesson.id);
            return (
              <Reveal key={lesson.id} delay={0.06 + Math.min(i, 6) * 0.04}>
                <button
                  onClick={() => { haptic.light(); setSelectedLesson(i); setCardIndex(0); }}
                  className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] group"
                  style={{
                    background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5.5%))",
                    border: `1px solid ${isDone ? `${cat.color}30` : "hsl(0 0% 100% / 0.05)"}`,
                  }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-active:scale-95"
                      style={{
                        background: isDone ? `${cat.color}18` : "hsl(220 18% 12%)",
                        border: `1px solid ${isDone ? `${cat.color}40` : "hsl(0 0% 100% / 0.05)"}`,
                      }}>
                      {isDone
                        ? <CheckCircle2 className="w-5 h-5" style={{ color: cat.color }} strokeWidth={1.8} />
                        : <span className="text-base font-medium text-muted-foreground tabular-nums">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium truncate leading-tight">{lesson.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate leading-snug">{lesson.description}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/[0.06] border border-primary/[0.12]">
                      <Coins className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary tabular-nums">{lesson.coin_reward}</span>
                    </div>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
        <BottomNav />
        <LearnStyles />
      </div>
    );
  }

  /* ─────────────────────── INDEX (entry screen) ─────────────────────── */
  const totalLessons = CATEGORIES.reduce((s, c) => s + getLessonsForCategory(c.key).length, 0);
  const totalCompleted = CATEGORIES.reduce((s, c) => s + getLessonsForCategory(c.key).filter(l => completedLessons.has(l.id)).length, 0);
  const overallProgress = totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      <AmbientGlow />

      <div className="sticky top-0 z-30 bg-background/75 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Money skills</p>
            <h1 className="text-base font-semibold tracking-tight">Learn</h1>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary/[0.08] border border-primary/[0.18]">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary tabular-nums">{totalCoins}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-5 pt-7 space-y-7">
        {/* HERO — editorial title block */}
        <Reveal>
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-primary mb-3">A premium curriculum</p>
            <h2 className="text-[34px] font-semibold tracking-[-0.02em] leading-[1.05] mb-3">
              Money,<br />
              <span className="text-primary italic font-serif" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>actually</span>{" "}
              understood.
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[420px]">
              Short, beautifully written lessons on the things schools never teach.
              Three minutes a day. Coins as you go.
            </p>
          </div>
        </Reveal>

        {/* PROGRESS RAIL */}
        <Reveal delay={0.08}>
          <div className="rounded-2xl p-5 border border-white/[0.05] relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, hsl(42 60% 14% / 0.1), hsl(220 22% 6%))" }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.45), transparent)" }} />
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your progress</p>
              <p className="text-[11px] font-semibold tabular-nums text-primary">{totalCompleted}<span className="text-muted-foreground font-normal"> / {totalLessons}</span></p>
            </div>
            <div className="h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${overallProgress}%`, background: "linear-gradient(90deg, hsl(42 78% 55%), hsl(42 90% 65%))" }} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <Stat label="Day streak" value={streakDays} icon={<Flame className="w-3.5 h-3.5 text-[hsl(25_85%_55%)]" />} />
              <Stat label="Coins" value={totalCoins} icon={<Coins className="w-3.5 h-3.5 text-primary" />} />
              <Stat label="Lessons" value={totalCompleted} icon={<BookOpen className="w-3.5 h-3.5 text-[hsl(210_60%_60%)]" />} />
            </div>
          </div>
        </Reveal>

        {/* LEADERBOARD CTA */}
        <Reveal delay={0.14}>
          <button
            onClick={() => { haptic.light(); setShowLeaderboard(true); }}
            className="w-full text-left rounded-2xl p-4 border border-white/[0.05] active:scale-[0.98] transition-all flex items-center gap-4"
            style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5.5%))" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/[0.08] border border-primary/[0.2]">
              <Trophy className="w-5 h-5 text-primary" strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium leading-tight">Leaderboard</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">See where you stand among other learners.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
          </button>
        </Reveal>

        {/* CATEGORIES — section heading */}
        <Reveal delay={0.18}>
          <div className="flex items-baseline justify-between pt-2">
            <h3 className="text-[18px] font-semibold tracking-tight">Categories</h3>
            <p className="text-[11px] text-muted-foreground">{CATEGORIES.length} tracks</p>
          </div>
        </Reveal>

        <div className="space-y-2.5">
          {CATEGORIES.map((cat, i) => {
            const lessons = getLessonsForCategory(cat.key);
            const completed = lessons.filter(l => completedLessons.has(l.id)).length;
            const progress = lessons.length > 0 ? (completed / lessons.length) * 100 : 0;
            const Icon = cat.icon;
            return (
              <Reveal key={cat.key} delay={0.22 + i * 0.04}>
                <button
                  onClick={() => { haptic.light(); setSelectedCategory(cat.key); }}
                  className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] group relative overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5.5%))",
                    border: "1px solid hsl(0 0% 100% / 0.05)",
                  }}>
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.06] transition-opacity group-hover:opacity-[0.1]"
                    style={{ background: `radial-gradient(circle, ${cat.color}, transparent 65%)` }} />

                  <div className="flex items-center gap-4 mb-3 relative">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${cat.color}14`, border: `1px solid ${cat.color}28` }}>
                      <Icon className="w-5 h-5" style={{ color: cat.color }} strokeWidth={1.7} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium leading-tight">{cat.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{cat.tagline}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-semibold tabular-nums text-foreground/90">{completed}<span className="text-muted-foreground font-normal">/{lessons.length}</span></p>
                      <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mt-0.5">lessons</p>
                    </div>
                  </div>

                  <div className="h-[2px] rounded-full bg-white/[0.04] overflow-hidden relative">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progress}%`, background: cat.color }} />
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>

        {/* HOW IT WORKS — quiet footer */}
        <Reveal delay={0.5}>
          <div className="pt-4 pb-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">How it works</p>
            <div className="space-y-2.5">
              {[
                { n: "01", t: "Read three short cards.", d: "Plain language, no jargon." },
                { n: "02", t: "Take a three-question quiz.", d: "Two correct unlocks the reward." },
                { n: "03", t: "Earn coins.", d: "Spend them in the rewards store." },
              ].map((step) => (
                <div key={step.n} className="flex items-start gap-4">
                  <span className="text-[11px] font-semibold tracking-[0.15em] text-primary tabular-nums pt-0.5">{step.n}</span>
                  <div>
                    <p className="text-[13px] font-medium leading-tight">{step.t}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <BottomNav />
      <LearnStyles />
    </div>
  );
};

/* ──────────────────────────── helpers ──────────────────────────── */

const Stat = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.04]">
    <div className="flex items-center gap-1.5 mb-1.5">
      {icon}
      <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
    <p className="text-[18px] font-semibold tabular-nums leading-none">{value}</p>
  </div>
);

const AmbientGlow = ({ accent }: { accent?: string }) => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full opacity-[0.04] blur-[140px]"
      style={{ background: accent || "hsl(42 78% 55%)" }} />
    <div className="absolute bottom-0 -left-40 w-[360px] h-[360px] rounded-full opacity-[0.025] blur-[120px]"
      style={{ background: "hsl(220 60% 50%)" }} />
  </div>
);

const LearnStyles = () => (
  <style>{`
    /* Editorial reveal — short translate, soft easing. */
    @keyframes learn-reveal {
      0%   { opacity: 0; transform: translateY(8px); filter: blur(2px); }
      100% { opacity: 1; transform: translateY(0);   filter: blur(0);   }
    }
  `}</style>
);

export default FinancialEducation;
