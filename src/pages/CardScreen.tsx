import { useState } from "react";
import {
  ChevronLeft, Wrench, QrCode, Send, Sparkles,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

const CardScreen = () => {
  const navigate = useNavigate();
  const [hovering, setHovering] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[120px]" style={{ background: "hsl(42 78% 55%)" }} />
        <div className="absolute bottom-1/3 -left-32 w-[300px] h-[300px] rounded-full opacity-[0.025] blur-[100px]" style={{ background: "hsl(210 80% 55%)" }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => { haptic.light(); navigate("/home"); }}
            className="w-[42px] h-[42px] rounded-[14px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
            <ChevronLeft className="w-[18px] h-[18px] text-muted-foreground/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold tracking-[-0.4px]">My Card</h1>
            <p className="text-[10px] text-white/25">Virtual Prepaid Card</p>
          </div>
        </div>

        {/* Maintenance Card */}
        <div className="px-5 mt-8 animate-fade-in">
          <div className="relative rounded-[28px] overflow-hidden" style={{
            boxShadow: "0 20px 60px -15px hsl(42 78% 55% / 0.06), 0 0 0 1px hsl(42 30% 30% / 0.08)",
          }}>
            {/* Background */}
            <div className="absolute inset-0" style={{
              background: `
                radial-gradient(ellipse 80% 60% at 70% 10%, hsl(42 78% 55% / 0.06) 0%, transparent 60%),
                radial-gradient(ellipse 50% 40% at 20% 90%, hsl(210 80% 55% / 0.04) 0%, transparent 50%),
                linear-gradient(165deg, hsl(220 22% 11%), hsl(220 24% 5%))
              `
            }} />
            <div className="absolute inset-0 opacity-[0.015] noise-overlay" />
            <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent 10%, hsl(42 78% 55% / 0.15) 50%, transparent 90%)" }} />

            <div className="relative z-10 flex flex-col items-center text-center px-6 py-12">
              {/* Animated icon */}
              <div className="relative mb-6">
                <div className="w-[80px] h-[80px] rounded-[24px] flex items-center justify-center" style={{
                  background: "linear-gradient(135deg, hsl(42 78% 55% / 0.08), hsl(42 78% 55% / 0.02))",
                  border: "1px solid hsl(42 78% 55% / 0.1)",
                  animation: "float-up 3s ease-in-out infinite",
                }}>
                  <Wrench className="w-9 h-9 text-primary/60" strokeWidth={1.5} />
                </div>
                {/* Orbiting sparkle */}
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/15" style={{ animation: "glow-pulse 2s ease-in-out infinite" }}>
                  <Sparkles className="w-3 h-3 text-primary" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-[20px] font-bold tracking-[-0.5px] mb-2">Under Maintenance</h2>

              {/* Divider */}
              <div className="w-12 h-[2px] rounded-full mb-5" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.4), transparent)" }} />

              {/* Message */}
              <p className="text-[13px] text-white/35 leading-[1.7] max-w-[280px] mb-2">
                This card feature is currently under maintenance. this will be available soon.
              </p>
              <p className="text-[12px] text-white/25 leading-[1.6] max-w-[260px] mb-8">
                Until then, please use the <span className="text-primary/70 font-semibold">UPI Scan & Pay</span> option to make payments.
              </p>

              {/* Send Money Button */}
              <button
                onClick={() => { haptic.medium(); navigate("/quick-pay"); }}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                className="group flex items-center gap-3 px-7 py-4 rounded-[18px] gradient-primary active:scale-[0.95] transition-all duration-300"
                style={{
                  boxShadow: hovering
                    ? "0 12px 40px hsl(42 78% 55% / 0.4), 0 4px 12px hsl(42 78% 55% / 0.25), inset 0 1px 0 hsl(48 90% 70% / 0.3)"
                    : "0 8px 28px hsl(42 78% 55% / 0.3), 0 2px 8px hsl(42 78% 55% / 0.15), inset 0 1px 0 hsl(48 90% 70% / 0.3)",
                }}
              >
                <Send className="w-[18px] h-[18px] text-primary-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" strokeWidth={2} />
                <span className="text-[14px] font-bold text-primary-foreground tracking-[-0.3px]">Send Money</span>
              </button>

              {/* Secondary action */}
              <button
                onClick={() => { haptic.light(); navigate("/scan"); }}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-white/[0.03] border border-white/[0.04] active:scale-95 transition-all hover:bg-white/[0.06] hover:border-white/[0.08]"
              >
                <QrCode className="w-4 h-4 text-primary/50" />
                <span className="text-[12px] font-semibold text-white/40">Scan & Pay</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="px-5 mt-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-center gap-2.5 py-3">
            <div className="w-2 h-2 rounded-full bg-[hsl(38_92%_50%)]" style={{ animation: "glow-pulse 1.5s ease-in-out infinite" }} />
            <span className="text-[11px] text-white/20 font-medium">Maintenance in progress — check back soon</span>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CardScreen;
