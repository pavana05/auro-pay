import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Coins, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SEGMENTS = [
  { label: "5 🪙", value: 5, color: "hsl(42, 78%, 55%)", accent: "hsl(42, 78%, 65%)" },
  { label: "10 🪙", value: 10, color: "hsl(200, 70%, 50%)", accent: "hsl(200, 70%, 62%)" },
  { label: "2 🪙", value: 2, color: "hsl(350, 70%, 50%)", accent: "hsl(350, 70%, 62%)" },
  { label: "20 🪙", value: 20, color: "hsl(152, 60%, 45%)", accent: "hsl(152, 60%, 58%)" },
  { label: "1 🪙", value: 1, color: "hsl(280, 60%, 50%)", accent: "hsl(280, 60%, 62%)" },
  { label: "50 🪙", value: 50, color: "hsl(42, 90%, 60%)", accent: "hsl(42, 90%, 72%)" },
  { label: "3 🪙", value: 3, color: "hsl(170, 60%, 45%)", accent: "hsl(170, 60%, 58%)" },
  { label: "15 🪙", value: 15, color: "hsl(20, 80%, 55%)", accent: "hsl(20, 80%, 68%)" },
];

const SpinWheel = () => {
  const navigate = useNavigate();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const creditCoins = async (coins: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase.from("user_streaks").select("id, streak_coins").eq("user_id", user.id).maybeSingle();
      if (existing) {
        await supabase.from("user_streaks").update({ streak_coins: (existing.streak_coins || 0) + coins, updated_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("user_streaks").insert({ user_id: user.id, streak_coins: coins });
      }
    } catch (e) {
      console.error("Failed to credit coins:", e);
    }
  };

  const spin = () => {
    if (spinning || spinsLeft <= 0) return;
    haptic.heavy();
    setSpinning(true);
    setResult(null);
    setShowConfetti(false);

    const segmentAngle = 360 / SEGMENTS.length;
    const winIdx = Math.floor(Math.random() * SEGMENTS.length);
    const extraSpins = 6 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + (360 - winIdx * segmentAngle - segmentAngle / 2);
    const newRotation = rotation + targetAngle;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      const won = SEGMENTS[winIdx].value;
      setResult(won);
      setSessionCoins(p => p + won);
      setSpinsLeft(p => p - 1);
      setShowConfetti(true);
      haptic.success();
      toast.success(`You won ${won} coins! 🎉`);
      creditCoins(won);
      setTimeout(() => setShowConfetti(false), 3000);
    }, 4500);
  };

  const segmentAngle = 360 / SEGMENTS.length;

  return (
    <div className="min-h-screen bg-background pb-24 overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[15%] w-[300px] h-[300px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent 70%)", animation: "glow-pulse 4s ease-in-out infinite" }} />
        <div className="absolute bottom-[20%] right-[10%] w-[250px] h-[250px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, hsl(200 70% 50%), transparent 70%)", animation: "glow-pulse 5s ease-in-out infinite 1s" }} />
      </div>

      {/* Falling sparkles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/40" style={{
            left: `${8 + (i * 7.5)}%`,
            animation: `star-fall ${4 + (i % 3) * 2}s linear infinite ${i * 0.6}s`,
            opacity: 0
          }} />
        ))}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Spin & Win
          </h1>
          <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            {spinsLeft} spins
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center px-5 pt-6">
        {/* Session coins counter */}
        <div className="mb-5 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05]" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <Coins className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary tabular-nums">{sessionCoins}</span>
          <span className="text-[10px] text-white/30 font-medium">coins this session</span>
        </div>

        {/* Pointer */}
        <div className="relative z-20 mb-[-18px]">
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-primary" style={{ filter: "drop-shadow(0 0 10px hsl(42 78% 55% / 0.5))" }} />
        </div>

        {/* Wheel container with glow ring */}
        <div className="relative w-[300px] h-[300px]">
          {/* Outer glow ring */}
          <div className="absolute -inset-3 rounded-full shimmer-border" style={{
            background: "transparent",
            boxShadow: spinning
              ? "0 0 40px hsl(42 78% 55% / 0.2), 0 0 80px hsl(42 78% 55% / 0.08), inset 0 0 30px hsl(42 78% 55% / 0.05)"
              : "0 0 20px hsl(42 78% 55% / 0.08), inset 0 0 15px hsl(42 78% 55% / 0.03)",
            transition: "box-shadow 0.5s ease",
            border: "2px solid hsl(42 78% 55% / 0.15)"
          }} />

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 4.5s cubic-bezier(0.15, 0.85, 0.15, 1)" : "none",
              boxShadow: "0 0 0 3px hsl(42 78% 55% / 0.15), 0 0 60px hsl(42 78% 55% / 0.08)"
            }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                {SEGMENTS.map((seg, i) => (
                  <radialGradient key={`g${i}`} id={`seg-grad-${i}`} cx="50%" cy="50%" r="55%">
                    <stop offset="30%" stopColor={seg.accent} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={seg.color} stopOpacity="1" />
                  </radialGradient>
                ))}
              </defs>
              {SEGMENTS.map((seg, i) => {
                const startAngle = i * segmentAngle;
                const endAngle = startAngle + segmentAngle;
                const startRad = (startAngle - 90) * Math.PI / 180;
                const endRad = (endAngle - 90) * Math.PI / 180;
                const x1 = 100 + 100 * Math.cos(startRad);
                const y1 = 100 + 100 * Math.sin(startRad);
                const x2 = 100 + 100 * Math.cos(endRad);
                const y2 = 100 + 100 * Math.sin(endRad);
                const largeArc = segmentAngle > 180 ? 1 : 0;
                const midRad = ((startAngle + endAngle) / 2 - 90) * Math.PI / 180;
                const labelX = 100 + 62 * Math.cos(midRad);
                const labelY = 100 + 62 * Math.sin(midRad);
                const textAngle = (startAngle + endAngle) / 2;

                return (
                  <g key={i}>
                    <path
                      d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                      fill={`url(#seg-grad-${i})`}
                      stroke="rgba(0,0,0,0.25)"
                      strokeWidth="0.5"
                    />
                    <path
                      d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                      fill="url(#inner-shadow)"
                      opacity="0.15"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="11"
                      fontWeight="800"
                      transform={`rotate(${textAngle}, ${labelX}, ${labelY})`}
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" } as any}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
              <defs>
                <radialGradient id="inner-shadow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="black" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          {/* Center button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[68px] h-[68px] rounded-full gradient-primary flex items-center justify-center" style={{
              boxShadow: "0 0 24px hsl(42 78% 55% / 0.4), 0 4px 16px hsl(220 20% 4% / 0.5), inset 0 1px 0 hsl(42 78% 70% / 0.3)"
            }}>
              <span className="text-lg font-black text-primary-foreground tracking-wider">GO</span>
            </div>
          </div>
        </div>

        {/* Confetti particles */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="absolute w-2 h-2 rounded-full" style={{
                left: `${20 + Math.random() * 60}%`,
                top: `30%`,
                background: [
                  "hsl(42 78% 55%)", "hsl(200 70% 50%)", "hsl(152 60% 45%)",
                  "hsl(350 70% 50%)", "hsl(280 60% 50%)"
                ][i % 5],
                animation: `sparkle-twinkle ${1 + Math.random() * 2}s ease-out ${i * 0.1}s both`,
              }} />
            ))}
          </div>
        )}

        {/* Result */}
        {result !== null && (
          <div className="mt-8 text-center" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <div className="inline-flex flex-col items-center px-8 py-5 rounded-[24px] border border-primary/20 bg-white/[0.03] backdrop-blur-sm" style={{
              boxShadow: "0 0 30px hsl(42 78% 55% / 0.1), inset 0 1px 0 hsl(42 78% 55% / 0.08)"
            }}>
              <p className="text-4xl font-black text-primary mb-1" style={{ textShadow: "0 0 30px hsl(42 78% 55% / 0.3)" }}>{result} 🪙</p>
              <p className="text-xs text-muted-foreground">Added to your rewards!</p>
            </div>
          </div>
        )}

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={spinning || spinsLeft <= 0}
          className="mt-8 w-full max-w-xs h-14 rounded-2xl font-bold text-base active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed shimmer-border relative overflow-hidden"
          style={{
            background: spinning ? "hsl(220 15% 12%)" : "linear-gradient(135deg, hsl(42 78% 55%), hsl(36 80% 42%))",
            color: spinning ? "hsl(40 20% 95%)" : "hsl(220 20% 4%)",
            boxShadow: spinsLeft > 0 && !spinning
              ? "0 0 30px hsl(42 78% 55% / 0.25), 0 4px 20px hsl(42 78% 55% / 0.15)"
              : "none"
          }}
        >
          {spinning ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Spinning...
            </span>
          ) : spinsLeft <= 0 ? (
            "No spins left today"
          ) : (
            `SPIN NOW 🎰`
          )}
        </button>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Earn spins by completing transactions and daily logins!
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default SpinWheel;
