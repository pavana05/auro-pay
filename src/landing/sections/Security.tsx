import { motion } from "framer-motion";
import { Shield, Lock, KeyRound, Eye, Snowflake, ShieldCheck } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, t: "Aadhaar eKYC — UIDAI verified" },
  { icon: Lock, t: "256-bit end-to-end encryption" },
  { icon: Shield, t: "RBI-compliant wallet (Minimum KYC)" },
  { icon: KeyRound, t: "PIN-protected every transaction" },
  { icon: Eye, t: "Real-time parent oversight" },
  { icon: Snowflake, t: "Instant card freeze" },
];

export default function Security() {
  return (
    <section className="relative py-32 px-6 lg:px-12" style={{ background: "linear-gradient(180deg, transparent, rgba(10,9,5,0.4), transparent)" }}>
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="relative flex justify-center"
        >
          <div className="relative w-72 h-80">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute inset-0 rounded-[40%_40%_45%_45%] flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(200,149,46,0.2), rgba(200,149,46,0.04))",
                border: "1px solid rgba(200,149,46,0.4)",
                boxShadow: "0 0 80px rgba(200,149,46,0.25), inset 0 0 60px rgba(200,149,46,0.1)",
              }}
            >
              <Lock size={80} style={{ color: "#c8952e" }} strokeWidth={1.5} />
            </motion.div>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
                className="absolute inset-0 rounded-[40%_40%_45%_45%]"
                style={{ border: "1px solid rgba(200,149,46,0.4)" }}
              />
            ))}
          </div>
        </motion.div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold mb-4" style={{ color: "#c8952e" }}>Security</div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-8" style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}>
            Bank-grade security.<br/><span className="text-white/50">Built for parents.</span>
          </h2>
          <ul className="space-y-3">
            {ITEMS.map((it, i) => {
              const Icon = it.icon;
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 text-white/85"
                >
                  <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center"
                    style={{ background: "rgba(200,149,46,0.15)", border: "1px solid rgba(200,149,46,0.25)" }}>
                    <Icon size={16} style={{ color: "#c8952e" }} />
                  </span>
                  {it.t}
                </motion.li>
              );
            })}
          </ul>
          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Powered by</div>
            <div className="flex flex-wrap gap-4 text-white/50 text-sm font-semibold">
              <span>Razorpay</span><span>·</span><span>UIDAI</span><span>·</span><span>NPCI / UPI</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
