import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Gift, Sparkles, Star } from "lucide-react";
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

const ScratchCards = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<ScratchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [scratchingId, setScratchingId] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());

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

    // Animate scratch
    await new Promise(r => setTimeout(r, 1500));

    const { error } = await supabase
      .from("scratch_cards")
      .update({ is_scratched: true, scratched_at: new Date().toISOString() })
      .eq("id", card.id);

    if (!error) {
      haptic.success();
      setRevealedCards(prev => new Set([...prev, card.id]));
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, is_scratched: true } : c));
      toast.success(`You won ${card.reward_value} ${card.reward_type}! 🎉`);
    }
    setScratchingId(null);
  };

  const unscratched = cards.filter(c => !c.is_scratched);
  const scratched = cards.filter(c => c.is_scratched);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Scratch & Win</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-5 pt-4 space-y-6">
        {/* Stats */}
        <div style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl">🎰</div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Available Cards</p>
              <p className="text-2xl font-bold">{unscratched.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Won</p>
              <p className="text-lg font-bold text-primary">
                {scratched.reduce((s, c) => s + c.reward_value, 0)} 🪙
              </p>
            </div>
          </div>
        </div>

        {/* Unscratched Cards */}
        {unscratched.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Ready to Scratch
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {unscratched.map((card, i) => (
                <button
                  key={card.id}
                  onClick={() => handleScratch(card)}
                  disabled={!!scratchingId}
                  style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.15 + i * 0.08}s both` }}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden group active:scale-95 transition-transform"
                >
                  {/* Scratch surface */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-primary/40 flex flex-col items-center justify-center gap-2 transition-all duration-700 ${
                    scratchingId === card.id ? "opacity-0 scale-110" : revealedCards.has(card.id) ? "opacity-0" : ""
                  }`}>
                    <div className="w-14 h-14 rounded-2xl bg-background/20 backdrop-blur flex items-center justify-center">
                      <Gift className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <p className="text-xs font-bold text-primary-foreground/90">TAP TO SCRATCH</p>
                    {scratchingId === card.id && (
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-transparent animate-pulse" />
                    )}
                  </div>

                  {/* Reward underneath */}
                  <div className="absolute inset-0 bg-card border border-border/50 flex flex-col items-center justify-center gap-2">
                    <span className="text-4xl">{rewardEmojis[card.reward_type] || "🎁"}</span>
                    <p className="text-2xl font-black text-primary">{card.reward_value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.reward_type}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scratched Cards */}
        {scratched.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" /> History
            </h2>
            <div className="space-y-2">
              {scratched.map(card => (
                <div key={card.id} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30">
                  <span className="text-xl">{rewardEmojis[card.reward_type] || "🎁"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Won {card.reward_value} {card.reward_type}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(card.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs text-primary font-semibold">+{card.reward_value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading cards...</p>
          </div>
        )}

        {!loading && cards.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border/50 flex items-center justify-center text-3xl">🎰</div>
            <p className="text-sm text-muted-foreground text-center">Complete transactions to earn scratch cards!</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ScratchCards;
