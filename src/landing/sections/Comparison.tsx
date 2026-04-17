import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

type Cell = { type: "yes"; text?: string } | { type: "no"; text?: string } | { type: "partial"; text?: string };

const ROWS: { feature: string; auro: Cell; fampay: Cell }[] = [
  { feature: "Sign up with just Aadhaar (no PAN)", auro: { type: "yes" }, fampay: { type: "no", text: "PAN required" } },
  { feature: "Setup time", auro: { type: "yes", text: "2 minutes" }, fampay: { type: "partial", text: "10–15 mins" } },
  { feature: "Free for life — no hidden fees", auro: { type: "yes" }, fampay: { type: "partial", text: "Card fees" } },
  { feature: "Real-time parent control & alerts", auro: { type: "yes" }, fampay: { type: "partial", text: "Limited" } },
  { feature: "Per-category spending limits", auro: { type: "yes" }, fampay: { type: "no" } },
  { feature: "Built-in savings goals & autosave", auro: { type: "yes" }, fampay: { type: "no" } },
  { feature: "Bill split with friends", auro: { type: "yes" }, fampay: { type: "no" } },
  { feature: "Financial education lessons", auro: { type: "yes" }, fampay: { type: "no" } },
  { feature: "Pocket money on schedule", auro: { type: "yes" }, fampay: { type: "partial" } },
  { feature: "Designed for Indian teens (Tier 2/3 cities)", auro: { type: "yes" }, fampay: { type: "partial", text: "Metro-first" } },
  { feature: "Made in India · RBI Compliant", auro: { type: "yes" }, fampay: { type: "yes" } },
];

function CellView({ c, primary }: { c: Cell; primary?: boolean }) {
  if (c.type === "yes") {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: primary
              ? "linear-gradient(135deg,#c8952e,#e0b048)"
              : "rgba(34,197,94,0.18)",
            boxShadow: primary ? "0 0 16px rgba(200,149,46,0.5)" : undefined,
          }}
        >
          <Check size={14} className={primary ? "text-black" : "text-emerald-300"} strokeWidth={3} />
        </div>
        {c.text && <span className={`text-sm ${primary ? "text-white" : "text-white/70"}`}>{c.text}</span>}
      </div>
    );
  }
  if (c.type === "no") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
          <X size={14} className="text-rose-400" strokeWidth={3} />
        </div>
        {c.text && <span className="text-sm text-white/40">{c.text}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
        <Minus size={14} className="text-amber-400" strokeWidth={3} />
      </div>
      {c.text && <span className="text-sm text-white/50">{c.text}</span>}
    </div>
  );
}

export default function Comparison() {
  return (
    <section className="relative py-32 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-4 text-center"
          style={{ color: "#c8952e" }}
        >
          AuroPay vs FamPay
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white text-center mb-4"
          style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          Why teens are{" "}
          <span style={{
            backgroundImage: "linear-gradient(90deg,#c8952e,#e0b048,#fff7e3)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>switching</span>.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-base text-white/55 text-center max-w-xl mx-auto mb-14"
        >
          Honest, side-by-side. Built for the next generation of Indian teens — not the last one.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(200,149,46,0.18)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div className="grid grid-cols-[1.4fr_1fr_1fr] sm:grid-cols-[1.6fr_1fr_1fr] border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="p-5 sm:p-7 text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold">
              Feature
            </div>
            <div
              className="relative p-5 sm:p-7 flex items-center gap-2"
              style={{ background: "linear-gradient(180deg, rgba(200,149,46,0.12), rgba(200,149,46,0.02))" }}
            >
              <div
                className="w-7 h-7 rounded-xl shrink-0"
                style={{ background: "linear-gradient(135deg,#c8952e,#8a6520)", boxShadow: "0 0 16px rgba(200,149,46,0.4)" }}
              />
              <div className="text-white font-bold" style={{ fontFamily: "Sora, sans-serif" }}>AuroPay</div>
              <span
                className="ml-2 hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-black"
                style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)" }}
              >
                New
              </span>
            </div>
            <div className="p-5 sm:p-7">
              <div className="text-white/50 font-semibold">FamPay</div>
            </div>
          </div>

          {ROWS.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="grid grid-cols-[1.4fr_1fr_1fr] sm:grid-cols-[1.6fr_1fr_1fr] border-b last:border-b-0 transition-colors hover:bg-white/[0.02]"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div className="p-4 sm:p-5 text-sm text-white/85 flex items-center">{r.feature}</div>
              <div
                className="p-4 sm:p-5 flex items-center"
                style={{ background: "linear-gradient(90deg, rgba(200,149,46,0.05), transparent)" }}
              >
                <CellView c={r.auro} primary />
              </div>
              <div className="p-4 sm:p-5 flex items-center">
                <CellView c={r.fampay} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 text-xs text-white/40"
        >
          Comparison reflects publicly listed features as of 2026. We respect FamPay — we just disagree about what teens deserve.
        </motion.div>
      </div>
    </section>
  );
}
