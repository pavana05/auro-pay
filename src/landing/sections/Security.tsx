import { motion, useReducedMotion } from "framer-motion";
import { Shield, Lock, KeyRound, Eye, Snowflake, ShieldCheck } from "lucide-react";
import PremiumHeading from "../PremiumHeading";

const ITEMS = [
  { icon: ShieldCheck, t: "Aadhaar eKYC — UIDAI verified" },
  { icon: Lock, t: "256-bit end-to-end encryption" },
  { icon: Shield, t: "RBI-compliant wallet (Minimum KYC)" },
  { icon: KeyRound, t: "PIN-protected every transaction" },
  { icon: Eye, t: "Real-time parent oversight" },
  { icon: Snowflake, t: "Instant card freeze" },
];

export default function Security() {
  const reduceMotion = useReducedMotion();
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
            {/* Conic ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, transparent, rgba(200,149,46,0.55), transparent 30%)",
                mask: "radial-gradient(circle, transparent 58%, black 60%, black 64%, transparent 66%)",
                WebkitMask: "radial-gradient(circle, transparent 58%, black 60%, black 64%, transparent 66%)",
              }}
            />
            {/* Lock orb */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-8 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 35% 30%, rgba(255,247,227,0.18), rgba(200,149,46,0.06) 60%, transparent)",
                border: "1px solid rgba(200,149,46,0.35)",
                boxShadow: "0 0 80px rgba(200,149,46,0.3), inset 0 0 60px rgba(200,149,46,0.12), inset 0 1px 0 rgba(255,247,227,0.2)",
                backdropFilter: "blur(20px)",
              }}
            >
              <Lock size={88} style={{ color: "#e0b048" }} strokeWidth={1.2} />
            </motion.div>
            {/* Pulse rings */}
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
            <span className="lux-eyebrow">Security</span>
          </motion.div>
          <PremiumHeading
            className="mb-10"
            lines={[
              { text: "Bank-grade security." },
              { text: "Built for parents.", accent: "gold" },
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
                  whileHover={{ x: 4, borderColor: "rgba(200,149,46,0.35)" }}
                  className="group relative flex items-center gap-3.5 text-white/85 p-3 rounded-xl lux-glass overflow-hidden"
                >
                  {!reduceMotion && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-y-0 w-1/3 pointer-events-none opacity-0 group-hover:opacity-100"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,231,170,0.18), transparent)" }}
                      initial={{ x: "-150%" }}
                      whileHover={{ x: "350%" }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                    />
                  )}
                  <motion.span className="relative inline-flex w-9 h-9 rounded-xl items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(200,149,46,0.2), rgba(200,149,46,0.05))",
                      border: "1px solid rgba(200,149,46,0.3)",
                      boxShadow: "inset 0 1px 0 rgba(255,247,227,0.1)",
                    }}
                    animate={reduceMotion ? {} : {
                      boxShadow: [
                        "inset 0 1px 0 rgba(255,247,227,0.1), 0 0 0 rgba(200,149,46,0)",
                        "inset 0 1px 0 rgba(255,247,227,0.15), 0 0 14px rgba(200,149,46,0.45)",
                        "inset 0 1px 0 rgba(255,247,227,0.1), 0 0 0 rgba(200,149,46,0)",
                      ],
                    }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                  >
                    <Icon size={16} style={{ color: "#e0b048" }} strokeWidth={1.8} />
                  </motion.span>
                  <span className="relative text-[15px]">{it.t}</span>
                </motion.li>
              );
            })}
          </ul>
          <div className="mt-10 pt-6 border-t border-white/5">
            <div className="text-[10px] text-white/35 uppercase tracking-[0.28em] mb-3 font-semibold">Powered by</div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/55 text-sm font-medium tracking-tight">
              <span>Razorpay</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>UIDAI</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>NPCI / UPI</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
