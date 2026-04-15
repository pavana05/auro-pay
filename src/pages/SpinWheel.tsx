import { useState, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

const SEGMENTS = [
  { label: "5 🪙", value: 5, color: "hsl(42, 78%, 55%)" },
  { label: "10 🪙", value: 10, color: "hsl(200, 70%, 50%)" },
  { label: "2 🪙", value: 2, color: "hsl(350, 70%, 50%)" },
  { label: "20 🪙", value: 20, color: "hsl(130, 60%, 45%)" },
  { label: "1 🪙", value: 1, color: "hsl(280, 60%, 50%)" },
  { label: "50 🪙", value: 50, color: "hsl(42, 90%, 60%)" },
  { label: "3 🪙", value: 3, color: "hsl(170, 60%, 45%)" },
  { label: "15 🪙", value: 15, color: "hsl(20, 80%, 55%)" },
];

const SpinWheel = () => {
  const navigate = useNavigate();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const wheelRef = useRef<HTMLDivElement>(null);

  const spin = () => {
    if (spinning || spinsLeft <= 0) return;
    haptic.heavy();
    setSpinning(true);
    setResult(null);

    const segmentAngle = 360 / SEGMENTS.length;
    const winIdx = Math.floor(Math.random() * SEGMENTS.length);
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + (360 - winIdx * segmentAngle - segmentAngle / 2);
    const newRotation = rotation + targetAngle;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(SEGMENTS[winIdx].value);
      setSpinsLeft(p => p - 1);
      haptic.success();
      toast.success(`You won ${SEGMENTS[winIdx].label}!`);
    }, 4000);
  };

  const segmentAngle = 360 / SEGMENTS.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Spin & Win</h1>
          <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {spinsLeft} spins
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center px-5 pt-8">
        {/* Pointer */}
        <div className="relative z-10 mb-[-16px]">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-[0_0_8px_hsl(42,78%,55%,0.5)]" />
        </div>

        {/* Wheel */}
        <div className="relative w-72 h-72">
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full border-4 border-primary/30 overflow-hidden shadow-[0_0_60px_hsl(42,78%,55%,0.15)]"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
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
                const labelX = 100 + 65 * Math.cos(midRad);
                const labelY = 100 + 65 * Math.sin(midRad);
                const textAngle = (startAngle + endAngle) / 2;

                return (
                  <g key={i}>
                    <path
                      d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                      fill={seg.color}
                      stroke="rgba(0,0,0,0.2)"
                      strokeWidth="0.5"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      transform={`rotate(${textAngle}, ${labelX}, ${labelY})`}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Center button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-background border-4 border-primary shadow-[0_0_20px_hsl(42,78%,55%,0.3)] flex items-center justify-center">
              <span className="text-lg font-black text-primary">GO</span>
            </div>
          </div>
        </div>

        {/* Result */}
        {result !== null && (
          <div className="mt-8 text-center" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <p className="text-3xl font-black text-primary">{result} 🪙</p>
            <p className="text-sm text-muted-foreground mt-1">Added to your rewards!</p>
          </div>
        )}

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={spinning || spinsLeft <= 0}
          className="mt-8 w-full max-w-xs h-14 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-base shadow-[0_0_30px_hsl(42,78%,55%,0.25)] active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {spinning ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
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
