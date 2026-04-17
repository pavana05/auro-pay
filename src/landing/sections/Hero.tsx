import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Sparkles, Play, ChevronRight } from "lucide-react";
import PhoneMockup from "../PhoneMockup";
import heroIllustration from "@/assets/hero-illustration.png";

const TABS = [
  { id: "home" as const, label: "Wallet", emoji: "💰" },
  { id: "scan" as const, label: "Scan", emoji: "📲" },
  { id: "savings" as const, label: "Save", emoji: "🎯" },
  { id: "parent" as const, label: "Parent", emoji: "👨‍👩‍👧" },
];

export default function Hero({ onCTA }: { onCTA: () => void }) {
  const [count, setCount] = useState(12000);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]["id"]>("home");

  useEffect(() => {
    const target = 12847;
    let v = 12000;
    const id = setInterval(() => {
      v += 23;
      if (v >= target) { v = target; clearInterval(id); }
      setCount(v);
    }, 18);
    return () => clearInterval(id);
  }, []);

  // Auto-cycle tabs every 3.5s
  useEffect(() => {
    const id = setInterval(() => {
      setActiveTab((prev) => {
        const idx = TABS.findIndex((t) => t.id === prev);
        return TABS[(idx + 1) % TABS.length].id;
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-16 px-5 lg:px-12">
      {/* Soft mesh blobs */}
      <div className="absolute top-32 -left-20 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(200,149,46,0.5), transparent 70%)" }} />
      <div className="absolute bottom-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,247,227,0.4), transparent 70%)" }} />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 lg:gap-12 w-full items-center relative">
        <div className="lg:col-span-7 space-y-7">
          {/* Pill */}
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }}
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 pl-1 pr-4 py-1 rounded-full text-xs font-medium border"
            style={{ background: "rgba(200,149,46,0.08)", borderColor: "rgba(200,149,46,0.3)" }}
          >
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-black uppercase tracking-wider"
              style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)" }}>New</span>
            <span className="text-amber-100/90">India's first scan-and-pay app for teens</span>
            <ChevronRight size={12} className="text-amber-200" />
          </motion.button>

          {/* Headline */}
          <h1 style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.035em", lineHeight: 1.02 }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-[92px] font-extrabold text-white">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              The grown-up way to
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block">
              <span style={{
                backgroundImage: "linear-gradient(90deg,#c8952e 0%,#e0b048 40%,#fff7e3 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>spend smart</span>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              as a teen.
            </motion.div>
          </h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}
            className="text-base lg:text-xl text-white/65 max-w-xl" style={{ lineHeight: 1.65 }}>
            Scan any QR. Pay instantly. Save for what matters. Parents stay in the loop —
            you get the freedom. <span className="text-white">Aadhaar only. No PAN. No paperwork.</span>
          </motion.p>

          {/* Social proof */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.7 }}
            className="flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {[
                { grad: "linear-gradient(135deg,#c8952e,#8a6520)", initial: "A" },
                { grad: "linear-gradient(135deg,#e0b048,#c8952e)", initial: "P" },
                { grad: "linear-gradient(135deg,#8a6520,#5a3f12)", initial: "R" },
                { grad: "linear-gradient(135deg,#fff7e3,#e0b048)", initial: "S" },
                { grad: "linear-gradient(135deg,#c8952e,#e0b048)", initial: "K" },
              ].map((a, i) => (
                <motion.div key={i}
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 2.8 + i * 0.06, type: "spring", stiffness: 220, damping: 16 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{
                    background: a.grad,
                    border: "2px solid #0a0c0f",
                    color: "#1a1206",
                    boxShadow: "0 4px 12px rgba(200,149,46,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
                    fontFamily: "Sora, sans-serif",
                  }}>
                  {a.initial}
                </motion.div>
              ))}
              <motion.div
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 3.15, type: "spring", stiffness: 220, damping: 16 }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white/90"
                style={{
                  background: "rgba(200,149,46,0.18)",
                  border: "2px solid #0a0c0f",
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                +12K
              </motion.div>
            </div>
            <span className="text-sm text-white/60">
              Joined by <span className="text-white font-semibold tabular-nums">{count.toLocaleString()}</span> teens & parents
            </span>
          </motion.div>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.9 }}
            className="flex flex-wrap gap-3 pt-1">
            <button onClick={onCTA}
              className="group relative overflow-hidden px-7 h-14 py-3.5 rounded-full font-semibold text-base text-black transition hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg,#c8952e,#e0b048)",
                boxShadow: "0 8px 32px rgba(200,149,46,0.45)",
              }}>
              <Sparkles size={18} className="relative z-10" />
              <span className="relative z-10">Get Early Access</span>
              <ChevronRight size={18} className="relative z-10 transition group-hover:translate-x-0.5" />
              <motion.div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </button>
            <button className="px-6 h-14 py-3.5 rounded-full font-medium text-base text-white border transition hover:bg-white/5 inline-flex items-center gap-2"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}>
              <Play size={16} fill="currentColor" /> Watch 60s demo
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/55 uppercase tracking-wider pt-2">
            <span className="inline-flex items-center gap-1.5">🔒 RBI Compliant</span>
            <span className="w-px h-3 bg-white/15" />
            <span className="inline-flex items-center gap-1.5">🛡️ Aadhaar Verified</span>
            <span className="w-px h-3 bg-white/15" />
            <span className="inline-flex items-center gap-1.5">⚡ Instant UPI</span>
          </motion.div>
        </div>

        {/* Phone with interactive tabs */}
        <div className="lg:col-span-5 relative flex flex-col items-center gap-5">
          {/* Ambient hero illustration behind the phone */}
          <motion.img
            src={heroIllustration}
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.55, scale: 1 }}
            transition={{ delay: 2.6, duration: 1.4, ease: "easeOut" }}
            className="pointer-events-none select-none absolute -top-10 -left-16 lg:-left-32 w-[120%] max-w-none z-0"
            style={{
              filter: "drop-shadow(0 30px 60px rgba(200,149,46,0.25))",
              mixBlendMode: "screen",
            }}
          />
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -top-6 -left-10 lg:-left-20 w-[110%] max-w-none z-0 opacity-40"
            aria-hidden="true"
          >
            <img src={heroIllustration} alt="" className="w-full" style={{ filter: "blur(24px) saturate(140%)" }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4, duration: 0.8, type: "spring", stiffness: 60, damping: 16 }}
            style={{ perspective: 1200 }}
            className="relative z-10"
          >
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transform: "rotateY(-6deg) rotateX(3deg)" }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35 }}
                >
                  <PhoneMockup screen={activeTab} />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Floating sticker badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: -6 }}
              transition={{ delay: 3.2, type: "spring", stiffness: 220, damping: 14 }}
              className="hidden md:flex absolute -top-4 -left-8 lg:-left-10 items-center gap-2 px-3 py-2 rounded-2xl text-xs text-white"
              style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))",
                boxShadow: "0 12px 30px rgba(34,197,94,0.4)",
              }}
            >
              <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">✓</span>
              <span className="font-semibold">Paid ₹149</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: 8 }} animate={{ opacity: 1, scale: 1, rotate: 5 }}
              transition={{ delay: 3.4, type: "spring", stiffness: 220, damping: 14 }}
              className="hidden md:flex absolute bottom-24 -right-6 lg:-right-4 items-center gap-2 px-3 py-2 rounded-2xl text-xs text-white"
              style={{
                background: "linear-gradient(135deg, rgba(20,20,25,0.95), rgba(30,28,22,0.95))",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(200,149,46,0.4)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
              }}
            >
              <span className="text-base">🎉</span>
              <div>
                <div className="font-semibold">Dad sent ₹500</div>
                <div className="text-[9px] text-white/50">Just now</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: 5 }} animate={{ opacity: 1, scale: 1, rotate: 4 }}
              transition={{ delay: 3.6, type: "spring", stiffness: 220, damping: 14 }}
              className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-12 items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
              style={{
                background: "rgba(200,149,46,0.95)",
                color: "#1a1206",
                boxShadow: "0 8px 24px rgba(200,149,46,0.5)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              ⚡ 2.3s
            </motion.div>
          </motion.div>

          {/* Interactive tab switcher */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.5 }}
            className="flex items-center gap-1 p-1 rounded-full border"
            style={{
              background: "rgba(20,20,25,0.85)",
              borderColor: "rgba(200,149,46,0.25)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="relative px-3.5 py-2 rounded-full text-xs font-medium transition"
                style={{ color: activeTab === t.id ? "#1a1206" : "rgba(255,255,255,0.7)" }}
              >
                {activeTab === t.id && (
                  <motion.div
                    layoutId="hero-tab-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "linear-gradient(135deg,#c8952e,#e0b048)",
                      boxShadow: "0 4px 12px rgba(200,149,46,0.5)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative inline-flex items-center gap-1.5">
                  <span>{t.emoji}</span>{t.label}
                </span>
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
