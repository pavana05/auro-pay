import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import PhoneMockup from "../PhoneMockup";

export default function Hero({ onCTA }: { onCTA: () => void }) {
  const [count, setCount] = useState(12000);
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

  const headline = ["The", "Future", "of"];
  const headline2 = ["Teen", "Payments"];

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-12 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-5 gap-12 w-full items-center">
        <div className="lg:col-span-3 space-y-6">
          {/* Pill */}
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }}
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-amber-200 border"
            style={{ background: "rgba(200,149,46,0.12)", borderColor: "rgba(200,149,46,0.3)" }}
          >
            🎉 India's first scan-and-pay app for teens
          </motion.button>

          {/* Headline */}
          <h1 style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.03em", lineHeight: 1.05 }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-[88px] font-extrabold text-white">
            <div className="flex flex-wrap gap-x-4">
              {headline.map((w, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                  {w}
                </motion.span>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4">
              {headline2.map((w, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.15 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={i === 1 ? {
                    backgroundImage: "linear-gradient(90deg,#c8952e,#e0b048,#fff7e3)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  } : undefined}>
                  {w}
                </motion.span>
              ))}
            </div>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              is Here.
            </motion.div>
          </h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}
            className="text-base lg:text-xl text-white/70 max-w-xl" style={{ lineHeight: 1.7 }}>
            Scan any QR, pay instantly, stay safe — all with just your Aadhaar card.
            Designed for the 253 million teens of India.
          </motion.p>

          {/* Social proof */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.7 }}
            className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#c8952e", "#e0b048", "#8a6520", "#fff7e3", "#c8952e"].map((c, i) => (
                <motion.div key={i}
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 2.8 + i * 0.06, type: "spring" }}
                  className="w-7 h-7 rounded-full border-2 border-[#0a0c0f]"
                  style={{ background: `linear-gradient(135deg, ${c}, ${c}aa)` }} />
              ))}
            </div>
            <span className="text-sm text-white/60">
              Joined by <span className="text-white font-semibold tabular-nums">{count.toLocaleString()}</span> teens across India
            </span>
          </motion.div>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.9 }}
            className="flex flex-wrap gap-3 pt-2">
            <button onClick={onCTA}
              className="relative overflow-hidden px-7 h-13 py-3.5 rounded-full font-semibold text-base text-black transition hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg,#c8952e,#e0b048)",
                boxShadow: "0 8px 32px rgba(200,149,46,0.45)",
              }}>
              <span className="relative z-10">Get Early Access →</span>
              <motion.div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </button>
            <button className="px-7 h-13 py-3.5 rounded-full font-medium text-base text-white border transition hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}>
              ▶ Watch Demo
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/50 uppercase tracking-wider pt-2">
            <span>🔒 RBI Compliant</span><span>·</span>
            <span>🛡️ Aadhaar Verified</span><span>·</span>
            <span>⚡ Instant UPI</span>
          </motion.div>
        </div>

        {/* Phone */}
        <div className="lg:col-span-2 relative flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4, duration: 0.8, type: "spring", stiffness: 60, damping: 16 }}
            style={{ perspective: 1200 }}
          >
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ transform: "rotateY(-8deg) rotateX(4deg)" }}
            >
              <PhoneMockup screen="home" />
            </motion.div>
          </motion.div>

          {/* Floating cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 3.2 }}
            className="hidden md:block absolute top-12 -left-4 lg:-left-8 px-3 py-2 rounded-xl text-xs text-white"
            style={{ background: "rgba(20,20,25,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(200,149,46,0.25)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
          >
            ✅ <span className="font-medium">Payment ₹149</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 3.4 }}
            className="hidden md:block absolute bottom-20 -right-4 lg:-right-2 px-3 py-2 rounded-xl text-xs text-white"
            style={{ background: "rgba(20,20,25,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(200,149,46,0.25)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
          >
            🔔 <span className="font-medium">Dad sent ₹500</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
