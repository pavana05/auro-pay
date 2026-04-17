import { useEffect, useState, useRef, useCallback } from "react";
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
  points: "from-primary/30 to-amber-600/20",
  bonus: "from-amber-500/30 to-primary/20",
};

// Canvas scratch component
const ScratchCanvas = ({ width, height, onComplete, children }: {
  width: number; height: number; onComplete: () => void; children: React.ReactNode;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const scratchedPercent = useRef(0);
  const completed = useRef(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Premium gradient scratch surface
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#b8860b");
    grad.addColorStop(0.3, "#c8952e");
    grad.addColorStop(0.5, "#d4a843");
    grad.addColorStop(0.7, "#c8952e");
    grad.addColorStop(1, "#a67a1e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Diamond pattern overlay
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 12) {
      for (let y = 0; y < height; y += 12) {
        ctx.beginPath();
        ctx.moveTo(x + 6, y);
        ctx.lineTo(x + 12, y + 6);
        ctx.lineTo(x + 6, y + 12);
        ctx.lineTo(x, y + 6);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // "SCRATCH HERE" text
    ctx.save();
    ctx.font = `bold ${Math.min(width * 0.07, 11)}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "4px";
    ctx.fillText("SCRATCH HERE", width / 2, height / 2 - 8);

    // Gift icon area
    ctx.font = `${Math.min(width * 0.15, 28)}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillText("🎁", width / 2, height / 2 + 16);
    ctx.restore();

    // Shimmer highlight
    const shimmer = ctx.createLinearGradient(0, 0, width * 0.6, height * 0.6);
    shimmer.addColorStop(0, "rgba(255,255,255,0)");
    shimmer.addColorStop(0.5, "rgba(255,255,255,0.06)");
    shimmer.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || completed.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Check scratch percentage
    const dpr = window.devicePixelRatio || 1;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) cleared++;
    }
    scratchedPercent.current = (cleared / (imageData.data.length / 4)) * 100;

    if (scratchedPercent.current > 45 && !completed.current) {
      completed.current = true;
      // Animate remaining away
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(0, 0, width * dpr, height * dpr);
      haptic.success();
      onComplete();
    }
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const p = getPos(e);
    scratch(p.x, p.y);
    haptic.light();
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const p = getPos(e);
    scratch(p.x, p.y);
  };

  const handleEnd = () => { isDrawing.current = false; };

  return (
    <div className="relative" style={{ width, height }}>
      {/* Reward content underneath */}
      <div className="absolute inset-0 z-0">{children}</div>
      {/* Scratch canvas on top */}
      <canvas ref={canvasRef} style={{ width, height, position: "absolute", inset: 0, zIndex: 10, borderRadius: "inherit", touchAction: "none", cursor: "crosshair" }}
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd} />
    </div>
  );
};

const ScratchCards = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<ScratchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [confettiCards, setConfettiCards] = useState<Set<string>>(new Set());

  useEffect(() => { fetchCards(); }, []);

  const fetchCards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("scratch_cards").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setCards((data as any) || []);
    setLoading(false);
  };

  const handleScratchComplete = async (card: ScratchCard) => {
    const { error } = await supabase.from("scratch_cards")
      .update({ is_scratched: true, scratched_at: new Date().toISOString() })
      .eq("id", card.id);

    if (!error) {
      setRevealedCards(prev => new Set([...prev, card.id]));
      setConfettiCards(prev => new Set([...prev, card.id]));
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, is_scratched: true } : c));
      toast.success(`You won ${card.reward_value} ${card.reward_type}! 🎉`);
      setTimeout(() => setConfettiCards(prev => { const n = new Set(prev); n.delete(card.id); return n; }), 3000);
    }
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
          <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/40"
            style={{ left: `${10 + i * 12}%`, top: `${5 + (i % 3) * 30}%`, animation: `star-fall ${4 + i * 0.7}s linear infinite ${i * 0.5}s` }} />
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
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" style={{ animation: "admin-shimmer 3s ease-in-out infinite" }} />
            <div className="flex items-center gap-4 relative z-10">
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
              <Zap className="w-3.5 h-3.5 text-primary" /> Scratch with your finger
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {unscratched.map((card, i) => (
                <div key={card.id}
                  style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.25 + i * 0.1}s both` }}
                  className="relative rounded-2xl overflow-hidden">
                  {/* Card border glow */}
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-primary/40 via-primary/10 to-primary/30 z-0" />

                  {/* LED dots around border */}
                  {[...Array(12)].map((_, d) => (
                    <div key={d} className="absolute w-1 h-1 rounded-full bg-primary/50 z-20 pointer-events-none"
                      style={{
                        top: d < 3 ? '4px' : d < 6 ? `${25 + (d-3) * 25}%` : d < 9 ? 'calc(100% - 4px)' : `${25 + (d-9) * 25}%`,
                        left: d < 3 ? `${25 + d * 25}%` : d < 6 ? 'calc(100% - 4px)' : d < 9 ? `${75 - (d-6) * 25}%` : '4px',
                        animation: `admin-glow-pulse 2s ease-in-out infinite ${d * 0.15}s`,
                      }} />
                  ))}

                  {/* Scratch Canvas Card */}
                  <div className="relative aspect-[3/4] m-[1px] rounded-2xl overflow-hidden">
                    <ScratchCanvas width={170} height={227} onComplete={() => handleScratchComplete(card)}>
                      {/* Reward content underneath */}
                      <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${rewardColors[card.reward_type] || rewardColors.bonus} border border-white/[0.06] flex flex-col items-center justify-center gap-2 backdrop-blur-xl`}>
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
                    </ScratchCanvas>
                  </div>

                  {/* Confetti burst */}
                  {confettiCards.has(card.id) && (
                    <div className="absolute inset-0 z-30 pointer-events-none">
                      {[...Array(20)].map((_, c) => {
                        const angle = c * 18;
                        const dist = 50 + Math.random() * 40;
                        const tx = Math.cos(angle * Math.PI / 180) * dist;
                        const ty = Math.sin(angle * Math.PI / 180) * dist;
                        return (
                          <div key={c} className="absolute w-1.5 h-1.5 rounded-full"
                            style={{
                              top: '50%', left: '50%',
                              backgroundColor: ['#c8952e', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'][c % 6],
                              animation: `confetti-fall 1.2s ease-out forwards ${c * 0.04}s`,
                              '--tx': `${tx}px`, '--ty': `${ty}px`,
                            } as any} />
                        );
                      })}
                    </div>
                  )}
                </div>
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
                <div key={card.id}
                  className="relative flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-lg hover:bg-white/[0.05] transition-all group"
                  style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.35 + i * 0.06}s both` }}>
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
      `}</style>
    </div>
  );
};

export default ScratchCards;
