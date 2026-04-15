import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, Coins, Sparkles, Clock, Lock, Gift } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SEGMENTS = [
  { label: "5 🪙", value: 5, color: "hsl(42, 78%, 50%)", accent: "hsl(42, 78%, 62%)" },
  { label: "10 🪙", value: 10, color: "hsl(210, 70%, 48%)", accent: "hsl(210, 70%, 60%)" },
  { label: "2 🪙", value: 2, color: "hsl(350, 65%, 48%)", accent: "hsl(350, 65%, 60%)" },
  { label: "20 🪙", value: 20, color: "hsl(152, 55%, 42%)", accent: "hsl(152, 55%, 55%)" },
  { label: "1 🪙", value: 1, color: "hsl(280, 55%, 48%)", accent: "hsl(280, 55%, 60%)" },
  { label: "50 🪙", value: 50, color: "hsl(42, 90%, 55%)", accent: "hsl(42, 90%, 68%)" },
  { label: "3 🪙", value: 3, color: "hsl(170, 55%, 42%)", accent: "hsl(170, 55%, 55%)" },
  { label: "15 🪙", value: 15, color: "hsl(20, 75%, 50%)", accent: "hsl(20, 75%, 63%)" },
];

const COOLDOWN_KEY = "spin_wheel_last_spin";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

const getTimeLeft = (): number => {
  const last = localStorage.getItem(COOLDOWN_KEY);
  if (!last) return 0;
  const elapsed = Date.now() - parseInt(last);
  return Math.max(0, COOLDOWN_MS - elapsed);
};

const formatCountdown = (ms: number): string => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const SpinWheel = () => {
  const navigate = useNavigate();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(getTimeLeft());
  const [suspensePhase, setSuspensePhase] = useState<"idle" | "spinning" | "slowing" | "reveal">("idle");
  const [mounted, setMounted] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const isLocked = cooldownLeft > 0;

  useEffect(() => { setMounted(true); }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (!isLocked) return;
    const interval = setInterval(() => {
      const left = getTimeLeft();
      setCooldownLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked]);

  // Decorative LED dots around wheel
  const ledDots = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => {
      const angle = (i * 360) / 24;
      const rad = (angle - 90) * Math.PI / 180;
      const r = 156;
      return { x: 50 + (r / 3.12) * Math.cos(rad), y: 50 + (r / 3.12) * Math.sin(rad), delay: i * 0.08 };
    }), []);

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
    if (spinning || isLocked) return;
    haptic.heavy();
    setSpinning(true);
    setResult(null);
    setShowConfetti(false);
    setSuspensePhase("spinning");

    const segmentAngle = 360 / SEGMENTS.length;
    const winIdx = Math.floor(Math.random() * SEGMENTS.length);
    const extraSpins = 7 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + (360 - winIdx * segmentAngle - segmentAngle / 2);
    const newRotation = rotation + targetAngle;
    setRotation(newRotation);

    // Phase: slowing down suspense
    setTimeout(() => setSuspensePhase("slowing"), 3000);

    // Phase: reveal
    setTimeout(() => {
      setSuspensePhase("reveal");
      setSpinning(false);
      const won = SEGMENTS[winIdx].value;
      setResult(won);
      setSessionCoins(p => p + won);
      setShowConfetti(true);
      haptic.success();
      toast.success(`You won ${won} coins! 🎉`);
      creditCoins(won);

      // Set 24hr cooldown
      localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
      setCooldownLeft(COOLDOWN_MS);

      setTimeout(() => { setShowConfetti(false); setSuspensePhase("idle"); }, 4000);
    }, 5500);
  };

  const segmentAngle = 360 / SEGMENTS.length;

  return (
    <div className="min-h-screen bg-background pb-24 overflow-hidden relative">
      {/* Deep ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full" style={{
          background: "radial-gradient(circle, hsl(42 78% 55% / 0.06), transparent 65%)",
          animation: spinning ? "glow-pulse 1s ease-in-out infinite" : "glow-pulse 4s ease-in-out infinite"
        }} />
        <div className="absolute bottom-[15%] left-[10%] w-[300px] h-[300px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, hsl(280 60% 50%), transparent 70%)" }} />
        <div className="absolute top-[30%] right-[5%] w-[200px] h-[200px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, hsl(152 60% 45%), transparent 70%)" }} />
      </div>

      {/* Sparkle particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/30" style={{
            left: `${5 + (i * 6)}%`,
            animation: `star-fall ${3 + (i % 4) * 1.5}s linear infinite ${i * 0.4}s`,
            opacity: 0
          }} />
        ))}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/[0.04]" style={{ animation: mounted ? "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" : "none" }}>
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Spin & Win
          </h1>
          <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 flex items-center gap-1">
            <Gift className="w-3 h-3" /> Daily
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center px-5 pt-5">
        {/* Session coins */}
        <div className="mb-5 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]" style={{ animation: mounted ? "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.05s both" : "none" }}>
          <Coins className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary tabular-nums">{sessionCoins}</span>
          <span className="text-[10px] text-white/25 font-medium">coins won</span>
        </div>

        {/* Pointer - premium triangle */}
        <div className="relative z-20 mb-[-20px]" style={{ animation: mounted ? "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" : "none" }}>
          <div className="relative">
            <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-primary" style={{ filter: "drop-shadow(0 0 12px hsl(42 78% 55% / 0.6))" }} />
            {/* Pointer glow */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" style={{ boxShadow: "0 0 12px hsl(42 78% 55% / 0.8)", animation: suspensePhase === "slowing" ? "gentle-pulse 0.3s ease-in-out infinite" : "none" }} />
          </div>
        </div>

        {/* Wheel container */}
        <div className="relative w-[310px] h-[310px]" style={{ animation: mounted ? "scale-bounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both" : "none" }}>
          {/* LED dots ring */}
          <div className="absolute inset-0">
            {ledDots.map((dot, i) => (
              <div key={i} className="absolute w-2 h-2 rounded-full" style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                transform: "translate(-50%, -50%)",
                background: spinning
                  ? `hsl(42 78% ${55 + Math.sin(Date.now() / 200 + i) * 15}% / ${0.6 + Math.sin(Date.now() / 150 + i) * 0.4})`
                  : `hsl(42 78% 55% / ${0.15 + (i % 3) * 0.1})`,
                boxShadow: spinning ? `0 0 8px hsl(42 78% 55% / 0.5)` : `0 0 4px hsl(42 78% 55% / 0.1)`,
                animation: spinning ? `led-blink 0.6s ease-in-out ${dot.delay}s infinite alternate` : "none",
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>

          {/* Outer premium ring */}
          <div className="absolute -inset-4 rounded-full" style={{
            background: "conic-gradient(from 0deg, hsl(42 78% 55% / 0.08), hsl(42 78% 55% / 0.02), hsl(42 78% 55% / 0.08), hsl(42 78% 55% / 0.02), hsl(42 78% 55% / 0.08))",
            animation: spinning ? "spin-ring 3s linear infinite" : "none",
            border: "2px solid hsl(42 78% 55% / 0.12)",
            boxShadow: spinning
              ? "0 0 50px hsl(42 78% 55% / 0.2), 0 0 100px hsl(42 78% 55% / 0.08), inset 0 0 40px hsl(42 78% 55% / 0.06)"
              : "0 0 20px hsl(42 78% 55% / 0.06), inset 0 0 15px hsl(42 78% 55% / 0.02)",
            transition: "box-shadow 0.5s ease",
          }} />

          {/* Inner decorative ring */}
          <div className="absolute -inset-1 rounded-full border border-white/[0.06]" style={{
            boxShadow: "inset 0 0 20px hsl(220 20% 4% / 0.5)",
          }} />

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 5.5s cubic-bezier(0.12, 0.8, 0.1, 1)" : "none",
              boxShadow: "0 0 0 4px hsl(42 78% 55% / 0.12), 0 0 60px hsl(42 78% 55% / 0.06), inset 0 0 30px hsl(0 0% 0% / 0.3)"
            }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                {SEGMENTS.map((seg, i) => (
                  <linearGradient key={`g${i}`} id={`seg-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={seg.accent} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={seg.color} stopOpacity="1" />
                  </linearGradient>
                ))}
                <radialGradient id="inner-shadow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="black" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="black" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
                <filter id="segment-shadow">
                  <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)" />
                </filter>
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
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth="0.8"
                    />
                    {/* Inner shine on each segment */}
                    <path
                      d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                      fill="url(#inner-shadow)"
                      opacity="0.2"
                    />
                    {/* Divider line highlight */}
                    <line x1="100" y1="100" x2={x1} y2={y1} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="900"
                      transform={`rotate(${textAngle}, ${labelX}, ${labelY})`}
                      style={{ textShadow: "0 2px 4px rgba(0,0,0,0.6)" } as any}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
              {/* Center glass effect */}
              <circle cx="100" cy="100" r="12" fill="url(#inner-shadow)" opacity="0.1" />
            </svg>
          </div>

          {/* Center hub - premium layered design */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              {/* Outer hub ring */}
              <div className="absolute -inset-2 rounded-full border border-primary/20" style={{ boxShadow: "0 0 20px hsl(42 78% 55% / 0.15)" }} />
              {/* Hub */}
              <div className="w-[72px] h-[72px] rounded-full gradient-primary flex items-center justify-center relative overflow-hidden" style={{
                boxShadow: "0 0 30px hsl(42 78% 55% / 0.4), 0 6px 20px hsl(220 20% 4% / 0.6), inset 0 2px 0 hsl(42 78% 70% / 0.4), inset 0 -2px 0 hsl(42 78% 40% / 0.3)"
              }}>
                {/* Shine overlay */}
                <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full bg-white/[0.12]" />
                <span className="relative text-xl font-black text-primary-foreground tracking-wider" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                  {spinning ? "🎰" : "GO"}
                </span>
              </div>
            </div>
          </div>

          {/* Suspense pulse ring during slowing */}
          {suspensePhase === "slowing" && (
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{
              border: "3px solid hsl(42 78% 55% / 0.3)",
              animation: "scanner-ring 0.8s ease-in-out infinite",
              boxShadow: "0 0 30px hsl(42 78% 55% / 0.2)",
            }} />
          )}
        </div>

        {/* Confetti */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="absolute" style={{
                width: 3 + Math.random() * 5,
                height: 3 + Math.random() * 5,
                borderRadius: i % 3 === 0 ? "50%" : "2px",
                left: `${10 + Math.random() * 80}%`,
                top: `${20 + Math.random() * 30}%`,
                background: [
                  "hsl(42 78% 55%)", "hsl(210 70% 55%)", "hsl(152 60% 50%)",
                  "hsl(350 70% 55%)", "hsl(280 60% 55%)", "hsl(42 90% 65%)"
                ][i % 6],
                animation: `confetti-fall ${1.5 + Math.random() * 2.5}s ease-out ${i * 0.08}s both`,
                opacity: 0.8,
              }} />
            ))}
          </div>
        )}

        {/* Result card */}
        {result !== null && (
          <div className="mt-8 text-center" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <div className="inline-flex flex-col items-center px-10 py-6 rounded-[28px] border border-primary/20 bg-white/[0.03] backdrop-blur-sm relative overflow-hidden" style={{
              boxShadow: "0 0 40px hsl(42 78% 55% / 0.12), inset 0 1px 0 hsl(42 78% 55% / 0.1)"
            }}>
              {/* Shimmer sweep on result card */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(110deg, transparent 30%, hsl(42 78% 55% / 0.04) 45%, hsl(42 78% 55% / 0.08) 50%, hsl(42 78% 55% / 0.04) 55%, transparent 70%)", backgroundSize: "300% 100%", animation: "ref-shimmer-sweep 2s ease-in-out 0.5s both" }} />
              <div className="relative z-10">
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold mb-2">You Won</p>
                <p className="text-5xl font-black text-primary mb-1" style={{ textShadow: "0 0 40px hsl(42 78% 55% / 0.4)", animation: "coin-counter 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>{result} 🪙</p>
                <p className="text-[11px] text-white/30">Added to your wallet!</p>
              </div>
            </div>
          </div>
        )}

        {/* Spin / Locked button */}
        <div className="mt-8 w-full max-w-xs" style={{ animation: mounted ? "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" : "none" }}>
          {isLocked && !spinning ? (
            <div className="text-center">
              <button disabled className="w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 bg-white/[0.04] border border-white/[0.08] text-white/30 cursor-not-allowed">
                <Lock className="w-4 h-4" /> Next spin available in
              </button>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary/50" />
                <span className="text-lg font-bold text-primary tabular-nums" style={{ textShadow: "0 0 20px hsl(42 78% 55% / 0.15)" }}>
                  {formatCountdown(cooldownLeft)}
                </span>
              </div>
              <p className="text-[10px] text-white/20 mt-1">Come back tomorrow for another spin!</p>
            </div>
          ) : (
            <button
              onClick={spin}
              disabled={spinning}
              className="w-full h-14 rounded-2xl font-bold text-base active:scale-[0.97] transition-all disabled:cursor-not-allowed relative overflow-hidden"
              style={{
                background: spinning ? "hsl(220 15% 10%)" : "linear-gradient(135deg, hsl(42 78% 55%), hsl(36 80% 42%))",
                color: spinning ? "hsl(40 20% 90%)" : "hsl(220 20% 4%)",
                boxShadow: !spinning
                  ? "0 0 30px hsl(42 78% 55% / 0.3), 0 4px 20px hsl(42 78% 55% / 0.2)"
                  : "none"
              }}
            >
              {!spinning && <div className="absolute inset-0 shimmer-border rounded-2xl" />}
              {spinning ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
                  {suspensePhase === "slowing" ? "Almost there..." : "Spinning..."}
                </span>
              ) : (
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" /> SPIN NOW 🎰
                </span>
              )}
            </button>
          )}
        </div>

        <p className="text-[10px] text-white/15 mt-4 text-center" style={{ animation: mounted ? "fade-in 0.5s ease-out 0.3s both" : "none" }}>
          1 free spin every 24 hours · Earn coins for rewards!
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default SpinWheel;
