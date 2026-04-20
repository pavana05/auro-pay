import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Play, ChevronRight } from "lucide-react";
import PhoneMockup from "../PhoneMockup";
import MagneticCTA from "../MagneticCTA";
import heroIllustration from "@/assets/hero-illustration.png";

import { Wallet, ScanLine, Target, Users2 } from "lucide-react";

const TABS = [
  { id: "home" as const, label: "Wallet", Icon: Wallet },
  { id: "scan" as const, label: "Scan", Icon: ScanLine },
  { id: "savings" as const, label: "Save", Icon: Target },
  { id: "parent" as const, label: "Parent", Icon: Users2 },
];

export default function Hero({ onCTA }: { onCTA: () => void }) {
  const [count, setCount] = useState(12000);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]["id"]>("home");
  const reduceMotion = useReducedMotion();

  // Mouse parallax — normalized -0.5..0.5 around the parallax container center
  const parallaxRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 80, damping: 18, mass: 0.6 });

  // Depth layers (px) — phone subtle, stickers more pronounced
  const phoneX = useTransform(sx, (v) => v * 18);
  const phoneY = useTransform(sy, (v) => v * 14);
  const phoneRY = useTransform(sx, (v) => -6 + v * 6);
  const phoneRX = useTransform(sy, (v) => 3 + v * -4);

  const stickerAX = useTransform(sx, (v) => v * -34);
  const stickerAY = useTransform(sy, (v) => v * -22);
  const stickerBX = useTransform(sx, (v) => v * 38);
  const stickerBY = useTransform(sy, (v) => v * 24);
  const stickerCX = useTransform(sx, (v) => v * 28);
  const stickerCY = useTransform(sy, (v) => v * -18);

  useEffect(() => {
    if (reduceMotion) return;
    const el = parallaxRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      mx.set(Math.max(-0.5, Math.min(0.5, nx)));
      my.set(Math.max(-0.5, Math.min(0.5, ny)));
    };
    const onLeave = () => { mx.set(0); my.set(0); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [mx, my, reduceMotion]);

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
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
            <motion.div initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.3, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}>
              The grown-up way to
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.45, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block">
              <span style={{
                backgroundImage: "linear-gradient(180deg,#fff7e3 0%,#ffffff 30%,#e0b048 70%,#c8952e 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                textShadow: "0 0 40px rgba(200,149,46,0.25)",
              }}>spend smart</span>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.6, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}>
              as a teen.
            </motion.div>
          </h1>

          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-base lg:text-xl text-white/65 max-w-xl" style={{ lineHeight: 1.65 }}>
            Scan any QR. Pay instantly. Save for what matters. Parents stay in the loop —
            you get the freedom. <span className="text-white">Aadhaar only. No PAN. No paperwork.</span>
          </motion.p>

          {/* Social proof */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0, duration: 0.5 }}
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
                  transition={{ delay: 1.05 + i * 0.06, type: "spring", stiffness: 220, damping: 16 }}
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
                transition={{ delay: 1.4, type: "spring", stiffness: 220, damping: 16 }}
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
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap gap-3 pt-1">
            <MagneticCTA onClick={onCTA} className="px-7 h-14 text-base">
              <Sparkles size={18} />
              <span>Get Early Access</span>
              <ChevronRight size={18} />
            </MagneticCTA>
            <button className="px-6 h-14 py-3.5 rounded-full font-medium text-base text-white border transition hover:bg-white/5 inline-flex items-center gap-2"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}>
              <Play size={16} fill="currentColor" /> Watch 60s demo
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.5 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-white/45 uppercase tracking-[0.22em] font-semibold pt-2">
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: "#c8952e" }} /> RBI Compliant</span>
            <span className="w-px h-3 bg-white/15" />
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: "#c8952e" }} /> Aadhaar Verified</span>
            <span className="w-px h-3 bg-white/15" />
            <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: "#c8952e" }} /> Instant UPI</span>
          </motion.div>
        </div>

        {/* Phone with interactive tabs */}
        <div ref={parallaxRef} className="lg:col-span-5 relative flex flex-col items-center gap-5">
          {/* Ambient illustration removed per design feedback */}

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 1.0, type: "spring", stiffness: 60, damping: 16 }}
            style={{ perspective: 1200 }}
            className="relative z-10"
          >
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ x: phoneX, y: phoneY, rotateY: phoneRY, rotateX: phoneRX, transformStyle: "preserve-3d" }}
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
              transition={{ delay: 1.5, type: "spring", stiffness: 220, damping: 14 }}
              style={{ x: stickerAX, y: stickerAY }}
              className="hidden md:flex absolute -top-4 -left-8 lg:-left-10 items-center gap-2 px-3 py-2 rounded-2xl text-xs text-white"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))",
                  boxShadow: "0 12px 30px rgba(34,197,94,0.4)",
                }}>
                <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">✓</span>
                <span className="font-semibold">Paid ₹149</span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: 8 }} animate={{ opacity: 1, scale: 1, rotate: 5 }}
              transition={{ delay: 1.7, type: "spring", stiffness: 220, damping: 14 }}
              style={{ x: stickerBX, y: stickerBY }}
              className="hidden md:flex absolute bottom-24 -right-6 lg:-right-4 items-center gap-2 px-3 py-2 rounded-2xl text-xs text-white"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(20,20,25,0.95), rgba(30,28,22,0.95))",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(200,149,46,0.4)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                }}>
                <span className="text-base">🎉</span>
                <div>
                  <div className="font-semibold">Dad sent ₹500</div>
                  <div className="text-[9px] text-white/50">Just now</div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: 5 }} animate={{ opacity: 1, scale: 1, rotate: 4 }}
              transition={{ delay: 1.9, type: "spring", stiffness: 220, damping: 14 }}
              style={{ x: stickerCX, y: stickerCY }}
              className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-12 items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(200,149,46,0.95)",
                  color: "#1a1206",
                  boxShadow: "0 8px 24px rgba(200,149,46,0.5)",
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                ⚡ 2.3s
              </div>
            </motion.div>
          </motion.div>

          {/* Interactive tab switcher */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-1 p-1 rounded-full border"
            style={{
              background: "rgba(20,20,25,0.85)",
              borderColor: "rgba(200,149,46,0.25)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
            }}
          >
            {TABS.map((t) => {
              const Icon = t.Icon;
              return (
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
                        boxShadow: "0 4px 14px rgba(200,149,46,0.55), inset 0 1px 0 rgba(255,255,255,0.4)",
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    <Icon size={13} strokeWidth={activeTab === t.id ? 2.4 : 1.8} />
                    {t.label}
                  </span>
                </button>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
