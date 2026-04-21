import { motion } from "framer-motion";
import { Gift, Sparkles, Trophy, Coins, Zap, Star } from "lucide-react";
import PremiumHeading from "../PremiumHeading";

const ITEMS = [
  { icon: Gift, t: "Scratch cards on every UPI payment" },
  { icon: Coins, t: "Earn AuroCoins on streaks & lessons" },
  { icon: Trophy, t: "Unlock achievements as you grow" },
  { icon: Zap, t: "Spin the wheel for instant cashback" },
  { icon: Star, t: "Exclusive teen brand discounts" },
  { icon: Sparkles, t: "Refer friends, both get ₹50" },
];

export default function RewardsSection() {
  return (
    <section className="relative py-32 px-6 lg:px-12 overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 30% 50%, rgba(200,149,46,0.08), transparent 70%)" }} />
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex justify-center"
        >
          <div className="relative w-80 h-80">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, transparent, rgba(200,149,46,0.55), transparent 30%)",
                mask: "radial-gradient(circle, transparent 58%, black 60%, black 64%, transparent 66%)",
                WebkitMask: "radial-gradient(circle, transparent 58%, black 60%, black 64%, transparent 66%)",
              }}
            />
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 5, 0, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-8 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 35% 30%, rgba(255,247,227,0.18), rgba(200,149,46,0.06) 60%, transparent)",
                border: "1px solid rgba(200,149,46,0.35)",
                boxShadow: "0 0 80px rgba(200,149,46,0.3), inset 0 0 60px rgba(200,149,46,0.12), inset 0 1px 0 rgba(255,247,227,0.2)",
                backdropFilter: "blur(20px)",
              }}
            >
              <Gift size={88} style={{ color: "#e0b048" }} strokeWidth={1.2} />
            </motion.div>
            {/* Sparkle bursts */}
            {[...Array(8)].map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const r = 140;
              return (
                <motion.div
                  key={i}
                  animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    left: `calc(50% + ${Math.cos(angle) * r}px - 3px)`,
                    top: `calc(50% + ${Math.sin(angle) * r}px - 3px)`,
                    background: "#e0b048",
                    boxShadow: "0 0 10px rgba(224,176,72,0.8)",
                  }}
                />
              );
            })}
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

        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mb-5"
          >
            <span className="lux-eyebrow">Rewards</span>
          </motion.div>
          <PremiumHeading
            className="mb-10"
            lines={[
              { text: "Every payment pays" },
              { text: "you back.", accent: "gold" },
            ]}
          />
          <ul className="space-y-3">
            {ITEMS.map((it, i) => {
              const Icon = it.icon;
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
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
            <div className="text-[10px] text-white/35 uppercase tracking-[0.28em] mb-3 font-semibold">Brand partners</div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/55 text-sm font-medium tracking-tight">
              <span>Zomato</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>Myntra</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>BookMyShow</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>Swiggy</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
