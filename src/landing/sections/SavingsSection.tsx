import { motion } from "framer-motion";
import { PiggyBank, Target, TrendingUp, Calendar, Repeat, Award } from "lucide-react";

const ITEMS = [
  { icon: Target, t: "Set goals — iPhone, trip, gaming PC" },
  { icon: Repeat, t: "Auto-save weekly without thinking" },
  { icon: Calendar, t: "Visual progress with deadlines" },
  { icon: TrendingUp, t: "Round-up spare change automatically" },
  { icon: Award, t: "Milestone rewards as you save" },
  { icon: PiggyBank, t: "Locked savings — no impulse withdrawals" },
];

export default function SavingsSection() {
  return (
    <section className="relative py-32 px-6 lg:px-12 overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 70% 50%, rgba(200,149,46,0.08), transparent 70%)" }} />
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mb-5"
          >
            <span className="lux-eyebrow">Savings Goals</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-10 tracking-tight"
            style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.025em", lineHeight: 1.04 }}
          >
            Dream big.<br/><span className="text-white/40">Save smarter.</span>
          </motion.h2>
          <ul className="space-y-3">
            {ITEMS.map((it, i) => {
              const Icon = it.icon;
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3.5 text-white/85 p-3 rounded-xl lux-glass"
                >
                  <span className="inline-flex w-9 h-9 rounded-xl items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(200,149,46,0.2), rgba(200,149,46,0.05))",
                      border: "1px solid rgba(200,149,46,0.3)",
                      boxShadow: "inset 0 1px 0 rgba(255,247,227,0.1)",
                    }}>
                    <Icon size={16} style={{ color: "#e0b048" }} strokeWidth={1.8} />
                  </span>
                  <span className="text-[15px]">{it.t}</span>
                </motion.li>
              );
            })}
          </ul>
          <div className="mt-10 pt-6 border-t border-white/5">
            <div className="text-[10px] text-white/35 uppercase tracking-[0.28em] mb-3 font-semibold">Goals reached this month</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight" style={{ color: "#e0b048" }}>1,247</span>
              <span className="text-white/55 text-sm">teen savers won 🏆</span>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex justify-center order-1 lg:order-2"
        >
          <div className="relative w-80 h-80">
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 180deg, transparent, rgba(200,149,46,0.55), transparent 30%)",
                mask: "radial-gradient(circle, transparent 58%, black 60%, black 64%, transparent 66%)",
                WebkitMask: "radial-gradient(circle, transparent 58%, black 60%, black 64%, transparent 66%)",
              }}
            />
            {/* Progress ring */}
            <svg className="absolute inset-4 w-72 h-72 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(200,149,46,0.12)" strokeWidth="2" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none" stroke="#e0b048" strokeWidth="2" strokeLinecap="round"
                strokeDasharray="264"
                initial={{ strokeDashoffset: 264 }}
                whileInView={{ strokeDashoffset: 66 }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                style={{ filter: "drop-shadow(0 0 6px rgba(224,176,72,0.6))" }}
              />
            </svg>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-8 rounded-full flex flex-col items-center justify-center"
              style={{
                background: "radial-gradient(circle at 35% 30%, rgba(255,247,227,0.18), rgba(200,149,46,0.06) 60%, transparent)",
                border: "1px solid rgba(200,149,46,0.35)",
                boxShadow: "0 0 80px rgba(200,149,46,0.3), inset 0 0 60px rgba(200,149,46,0.12), inset 0 1px 0 rgba(255,247,227,0.2)",
                backdropFilter: "blur(20px)",
              }}
            >
              <PiggyBank size={64} style={{ color: "#e0b048" }} strokeWidth={1.2} />
              <div className="mt-2 text-2xl font-bold" style={{ color: "#e0b048", fontFamily: "Sora, sans-serif" }}>75%</div>
              <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] mt-0.5">to your goal</div>
            </motion.div>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1.5], opacity: [0.4, 0, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 1.2, ease: "easeOut" }}
                className="absolute inset-8 rounded-full"
                style={{ border: "1px solid rgba(200,149,46,0.45)" }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
