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

  // Initial fast count-up to ~12,847, then a slow drift upward forever to feel "alive"
  useEffect(() => {
    const target = 12847;
    let v = 12000;
    const fast = setInterval(() => {
      v += 23;
      if (v >= target) { v = target; clearInterval(fast); }
      setCount(v);
    }, 18);

    // Slow live ticker — adds 1 every 4–9s, randomised, paused when tab hidden
    let slowTimer: ReturnType<typeof setTimeout>;
    const scheduleSlow = () => {
      const delay = 4000 + Math.random() * 5000;
      slowTimer = setTimeout(() => {
        if (!document.hidden) {
          setCount((c) => c + 1);
        }
        scheduleSlow();
      }, delay);
    };
    // Kick off the live drift after the initial count-up has time to finish
    const kickoff = setTimeout(scheduleSlow, 2200);

    return () => {
      clearInterval(fast);
      clearTimeout(kickoff);
      clearTimeout(slowTimer);
    };
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
    <section className="relative min-h-screen flex items-center pt-28 pb-16 px-5 lg:px-12 overflow-hidden">
      {/* Animated mesh blobs — slow drift + breathe */}
      <motion.div
        aria-hidden
        className="absolute top-32 -left-20 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(200,149,46,0.55), transparent 70%)" }}
        animate={reduceMotion ? {} : { x: [0, 40, -10, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.96, 1], opacity: [0.28, 0.38, 0.3, 0.28] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-20 -right-20 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,247,227,0.4), transparent 70%)" }}
        animate={reduceMotion ? {} : { x: [0, -50, 20, 0], y: [0, 30, -15, 0], scale: [1, 1.1, 0.95, 1], opacity: [0.18, 0.28, 0.2, 0.18] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Drifting fine grain noise / sparkle dots */}
      {!reduceMotion && (
        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.35]">
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3, height: 3,
                background: "radial-gradient(circle, rgba(255,231,170,0.9), rgba(200,149,46,0))",
                top: `${15 + i * 12}%`,
                left: `${10 + ((i * 17) % 80)}%`,
                boxShadow: "0 0 8px rgba(255,215,140,0.6)",
              }}
              animate={{ y: [0, -18, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 4 + i * 0.6, repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 lg:gap-12 w-full items-center relative">
        <div className="lg:col-span-7 space-y-7">
          {/* Editorial eyebrow — hairline gilded divider + small caps credentials */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 max-w-md"
          >
            <span className="lux-divider flex-1" />
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="relative inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.28em] overflow-hidden group"
              style={{ color: "rgba(255,231,170,0.85)" }}
            >
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: "#e0b048", boxShadow: "0 0 8px rgba(224,176,72,0.85)" }}
              />
              <span>Est. 2025 · Mumbai</span>
              <ChevronRight size={11} className="text-amber-200/70 transition-transform group-hover:translate-x-0.5" />
            </button>
            <span className="lux-divider flex-1" />
          </motion.div>

          {/* Headline — editorial serif accent for couture luxury */}
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
              className="inline-block relative">
              <span className="lux-serif" style={{
                backgroundImage: "linear-gradient(180deg,#fff7e3 0%,#ffffff 28%,#e0b048 68%,#c8952e 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                textShadow: "0 0 50px rgba(200,149,46,0.3)",
                fontSize: "1.05em",
                paddingRight: "0.06em",
              }}>spend smart</span>
              {/* Shimmer sweep across the gold word */}
              {!reduceMotion && (
                <motion.span
                  aria-hidden
                  className="lux-serif absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundSize: "200% 100%",
                    fontSize: "1.05em",
                    paddingRight: "0.06em",
                  }}
                  initial={{ backgroundPositionX: "200%" }}
                  animate={{ backgroundPositionX: "-100%" }}
                  transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut", delay: 1.5 }}
                >
                  spend smart
                </motion.span>
              )}
              {/* Underline accent — draws in once */}
              <motion.span
                aria-hidden
                className="absolute left-0 right-0 -bottom-1 h-[2px] rounded-full origin-left"
                style={{ background: "linear-gradient(90deg, transparent, #c8952e 30%, #fff7e3 50%, #c8952e 70%, transparent)", boxShadow: "0 0 16px rgba(200,149,46,0.65)" }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 1.2, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              />
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
            <span className="text-sm text-white/60 inline-flex items-center gap-1.5">
              <motion.span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.8)" }}
                animate={reduceMotion ? {} : { opacity: [0.5, 1, 0.5], scale: [1, 1.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              Joined by{" "}
              <motion.span
                key={count}
                initial={{ y: -2, opacity: 0.6, color: "#e0b048" }}
                animate={{ y: 0, opacity: 1, color: "#ffffff" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="font-semibold tabular-nums"
              >
                {count.toLocaleString()}
              </motion.span>{" "}
              teens &amp; parents
            </span>
          </motion.div>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap gap-3 pt-1">
            <div className="relative">
              {!reduceMotion && (
                <motion.div
                  aria-hidden
                  className="absolute -inset-2 rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(circle, rgba(200,149,46,0.45), transparent 70%)", filter: "blur(14px)" }}
                  animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <MagneticCTA onClick={onCTA} className="relative px-7 h-14 text-base">
                <Sparkles size={18} />
                <span>Get Early Access</span>
                <ChevronRight size={18} />
              </MagneticCTA>
            </div>
            <button className="relative px-6 h-14 py-3.5 rounded-full font-medium text-[13px] tracking-wide text-white/90 transition hover:text-white inline-flex items-center gap-3 group overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(20,20,25,0.6), rgba(15,14,12,0.5))",
                border: "1px solid rgba(200,149,46,0.28)",
                backdropFilter: "blur(12px)",
                boxShadow: "inset 0 1px 0 rgba(255,231,170,0.06), 0 8px 24px rgba(0,0,0,0.35)",
              }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center transition group-hover:scale-110"
                style={{ background: "rgba(200,149,46,0.18)", border: "1px solid rgba(200,149,46,0.4)" }}>
                <Play size={11} fill="currentColor" className="text-amber-200 ml-0.5" />
              </span>
              <span className="font-sora">Watch the film</span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-mono">60s</span>
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.5 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-white/45 uppercase tracking-[0.22em] font-semibold pt-2">
            {["RBI Compliant", "Aadhaar Verified", "Instant UPI"].map((label, i) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#c8952e", boxShadow: "0 0 8px rgba(200,149,46,0.7)" }}
                  animate={reduceMotion ? {} : { opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
                />
                {label}
                {i < 2 && <span className="w-px h-3 bg-white/15 ml-5" />}
              </span>
            ))}
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
