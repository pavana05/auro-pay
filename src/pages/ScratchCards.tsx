import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Gift, Sparkles, Star, Crown, Zap } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface ScratchCard {
  id: string;
  reward_type: string;
  reward_value: number;
  is_scratched: boolean;
  created_at: string;
}

const rewardEmojis: Record<string, string> = {
  coins: "🪙", cashback: "💰", points: "⭐", bonus: "🎁",
};

const rewardColors: Record<string, string> = {
  coins: "from-yellow-500/30 to-amber-600/20",
  cashback: "from-emerald-500/30 to-green-600/20",
  points: "from-blue-500/30 to-indigo-600/20",
  bonus: "from-pink-500/30 to-rose-600/20",
};

const ScratchCards = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<ScratchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [scratchingId, setScratchingId] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [confettiCards, setConfettiCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("scratch_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCards((data as any) || []);
    setLoading(false);
  };

  const handleScratch = async (card: ScratchCard) => {
    if (card.is_scratched || scratchingId) return;
    haptic.medium();
    setScratchingId(card.id);

    await new Promise(r => setTimeout(r, 1800));

    const { error } = await supabase
      .from("scratch_cards")
      .update({ is_scratched: true, scratched_at: new Date().toISOString() })
      .eq("id", card.id);

    if (!error) {
      haptic.success();
      setRevealedCards(prev => new Set([...prev, card.id]));
      setConfettiCards(prev => new Set([...prev, card.id]));
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, is_scratched: true } : c));
      toast.success(`You won ${card.reward_value} ${card.reward_type}! 🎉`);
      setTimeout(() => setConfettiCards(prev => { const n = new Set(prev); n.delete(card.id); return n; }), 3000);
    }
    setScratchingId(null);
  };

  const unscratched = cards.filter(c => !c.is_scratched);
  const scratched = cards.filter(c => c.is_scratched);

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.07] blur-[100px]" style={{ animation: "admin-float 8s ease-in-out infinite" }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-500/[0.05] blur-[100px]" style={{ animation: "admin-float 10s ease-in-out infinite reverse" }} />
        <div className="absolute top-[40%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-primary/[0.04] blur-[80px]" style={{ animation: "admin-float 12s ease-in-out infinite 2s" }} />
      </div>

      {/* Floating Sparkle Particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40"
            style={{
              left: `${10 + i * 12}%`,
              top: `${5 + (i % 3) * 30}%`,
              animation: `star-fall ${4 + i * 0.7}s linear infinite ${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Premium Header */}
      <div className="sticky top-0 z-30 bg-background/60 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05] active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5 text-foreground/80" />
          </button>
          <div className="flex items-center gap-2" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent">
              Scratch & Win
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
              Rewards
            </span>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6 relative z-10">
        {/* Premium Stats Banner */}
        <div style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both" }}>
          <div className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl overflow-hidden">
            {/* Shimmer sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" style={{ animation: "admin-shimmer 3s ease-in-out infinite" }} />
            
            <div className="flex items-center gap-4 relative z-10">
              {/* Icon with glow halo */}
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" style={{ animation: "admin-glow-pulse 2s ease-in-out infinite" }} />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center">
                  <Crown className="w-7 h-7 text-primary" />
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Cards</p>
                <p className="text-3xl font-black text-foreground">{unscratched.length}</p>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Won</p>
                <div className="flex items-center gap-1 justify-end">
                  <p className="text-2xl font-black bg-gradient-to-r from-primary to-yellow-500 bg-clip-text text-transparent">
                    {scratched.reduce((s, c) => s + c.reward_value, 0)}
                  </p>
                  <span className="text-lg">🪙</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unscratched Cards */}
        {unscratched.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider"
                style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
              <Zap className="w-3.5 h-3.5 text-primary" /> Ready to Scratch
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {unscratched.map((card, i) => (
                <button
                  key={card.id}
                  onClick={() => handleScratch(card)}
                  disabled={!!scratchingId}
                  style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.25 + i * 0.1}s both` }}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden group active:scale-[0.97] transition-transform"
                >
                  {/* Card border glow */}
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-primary/40 via-primary/10 to-primary/30 z-0" />
                  
                  {/* LED dots around border */}
                  {[...Array(12)].map((_, d) => (
                    <div
                      key={d}
                      className="absolute w-1 h-1 rounded-full bg-primary/50 z-20"
                      style={{
                        top: d < 3 ? '4px' : d < 6 ? `${25 + (d-3) * 25}%` : d < 9 ? 'calc(100% - 4px)' : `${25 + (d-9) * 25}%`,
                        left: d < 3 ? `${25 + d * 25}%` : d < 6 ? 'calc(100% - 4px)' : d < 9 ? `${75 - (d-6) * 25}%` : '4px',
                        animation: `admin-glow-pulse 2s ease-in-out infinite ${d * 0.15}s`,
                      }}
                    />
                  ))}

                  {/* Scratch surface */}
                  <div className={`absolute inset-[1px] rounded-2xl z-10 flex flex-col items-center justify-center gap-3 transition-all duration-700 ${
                    scratchingId === card.id 
                      ? "opacity-0 scale-110 blur-sm" 
                      : revealedCards.has(card.id) 
                        ? "opacity-0 scale-150 blur-lg" 
                        : ""
                  }`}
                  style={{
                    background: "conic-gradient(from 0deg, hsl(var(--primary)/0.7), hsl(var(--primary)/0.4), hsl(var(--primary)/0.6), hsl(var(--primary)/0.3), hsl(var(--primary)/0.7))",
                  }}>
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" style={{ animation: "admin-shimmer 2s ease-in-out infinite" }} />
                    
                    <div className="relative">
                      <div className="absolute inset-0 rounded-2xl bg-white/10 blur-xl" />
                      <div className="relative w-16 h-16 rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.15] flex items-center justify-center">
                        <Gift className="w-8 h-8 text-white/90" />
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Tap to Scratch</p>
                    
                    {/* Floating particles on card */}
                    {scratchingId === card.id && (
                      <>
                        {[...Array(6)].map((_, p) => (
                          <div
                            key={p}
                            className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
                            style={{
                              top: '50%', left: '50%',
                              animation: `scratch-particle-${p % 3} 0.8s ease-out forwards ${p * 0.1}s`,
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>

                  {/* Reward underneath */}
                  <div className={`absolute inset-[1px] rounded-2xl bg-gradient-to-br ${rewardColors[card.reward_type] || rewardColors.bonus} border border-white/[0.06] flex flex-col items-center justify-center gap-2 backdrop-blur-xl`}>
                    {/* Glow halo behind emoji */}
                    <div className="relative">
                      <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-2xl" style={{ animation: "admin-glow-pulse 2s ease-in-out infinite" }} />
                      <span className="relative text-5xl drop-shadow-lg" style={{ animation: revealedCards.has(card.id) ? "bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none" }}>
                        {rewardEmojis[card.reward_type] || "🎁"}
                      </span>
                    </div>
                    <p className="text-3xl font-black bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
                      {card.reward_value}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.25em] font-bold">{card.reward_type}</p>
                  </div>

                  {/* Confetti burst */}
                  {confettiCards.has(card.id) && (
                    <div className="absolute inset-0 z-30 pointer-events-none">
                      {[...Array(12)].map((_, c) => (
                        <div
                          key={c}
                          className="absolute w-1.5 h-1.5 rounded-full"
                          style={{
                            top: '50%', left: '50%',
                            backgroundColor: ['#c8952e', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'][c % 6],
                            animation: `confetti-burst 1s ease-out forwards ${c * 0.05}s`,
                            transform: `rotate(${c * 30}deg)`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scratched History */}
        {scratched.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider"
                style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both" }}>
              <Star className="w-3.5 h-3.5 text-primary" /> History
            </h2>
            <div className="space-y-2">
              {scratched.map((card, i) => (
                <div
                  key={card.id}
                  className="relative flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-lg hover:bg-white/[0.05] transition-all group"
                  style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.35 + i * 0.06}s both` }}
                >
                  {/* Gold accent line */}
                  <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b from-primary/60 to-primary/10" />
                  
                  <div className="relative ml-1">
                    <div className="absolute inset-0 scale-150 bg-primary/10 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative text-xl">{rewardEmojis[card.reward_type] || "🎁"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground/90">Won {card.reward_value} {card.reward_type}</p>
                    <p className="text-[10px] text-muted-foreground/70">{new Date(card.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                    +{card.reward_value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" style={{ animation: "admin-glow-pulse 1.5s ease-in-out infinite" }} />
              <div className="relative w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Loading cards...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && cards.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-5" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
            <div className="relative">
              <div className="absolute inset-0 scale-150 bg-primary/10 rounded-2xl blur-2xl" style={{ animation: "admin-glow-pulse 3s ease-in-out infinite" }} />
              <div className="relative w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center" style={{ animation: "admin-float 4s ease-in-out infinite" }}>
                <span className="text-4xl">🎰</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground/80">No Cards Yet</p>
              <p className="text-xs text-muted-foreground/60 max-w-[200px]">Complete transactions to earn scratch cards!</p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      {/* Inline keyframes for scratch-specific animations */}
      <style>{`
        @keyframes confetti-burst {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx, 40px), var(--ty, -40px)) scale(0); opacity: 0; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        ${[...Array(12)].map((_, i) => {
          const angle = i * 30;
          const dist = 50 + Math.random() * 30;
          const tx = Math.cos(angle * Math.PI / 180) * dist;
          const ty = Math.sin(angle * Math.PI / 180) * dist;
          return `.absolute:nth-child(${i+1}) { --tx: ${tx}px; --ty: ${ty}px; }`;
        }).join('\n')}
      `}</style>
    </div>
  );
};

export default ScratchCards;
