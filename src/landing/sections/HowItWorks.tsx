import { motion } from "framer-motion";
import { Download, ShieldCheck, QrCode } from "lucide-react";
import PremiumHeading from "../PremiumHeading";

const STEPS = [
  { n: "01", icon: Download, title: "Download AuroPay", body: "Get it on Play Store or App Store. ~12 MB, no bloat." },
  { n: "02", icon: ShieldCheck, title: "Verify with Aadhaar", body: "Enter Aadhaar, confirm OTP. No PAN. No paperwork." },
  { n: "03", icon: QrCode, title: "Start paying", body: "Scan any UPI QR and pay. That's it. Welcome to AuroPay." },
];

export default function HowItWorks() {
  return (
    <section className="relative py-32 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-5"
        >
          <span className="lux-eyebrow">How It Works</span>
        </motion.div>
        <PremiumHeading
          className="text-center mb-5"
          lines={[
            { text: "Up & running" },
            { text: "in 2 minutes.", accent: "gold" },
          ]}
        />
        <p className="text-white/55 text-center mb-20 max-w-xl mx-auto">No paperwork. No bank visits. No PAN.</p>

        <div className="relative grid md:grid-cols-3 gap-5">
          {/* Connecting hairline */}
          <motion.div
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
            transition={{ duration: 1.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:block absolute top-[68px] left-[15%] right-[15%] h-px origin-left"
            style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.6), rgba(255,247,227,0.5), rgba(200,149,46,0.6), transparent)" }}
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.18, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="group relative rounded-3xl p-8 lg:p-9 lux-glass lux-rise overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-700"
                  style={{ background: "rgba(200,149,46,0.4)" }} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-7">
                    <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl"
                      style={{
                        background: "linear-gradient(135deg,#c8952e,#e0b048)",
                        boxShadow: "0 10px 30px rgba(200,149,46,0.45), inset 0 1px 0 rgba(255,255,255,0.4)",
                      }}>
                      <Icon size={24} className="text-black" strokeWidth={2.2} />
                    </div>
                    <span className="text-3xl font-extrabold tracking-tighter tabular-nums"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        backgroundImage: "linear-gradient(135deg, rgba(200,149,46,0.6), rgba(200,149,46,0.08))",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      }}>
                      {s.n}
                    </span>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white mb-2 tracking-tight"
                    style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}>
                    {s.title}
                  </h3>
                  <p className="text-sm lg:text-[15px] text-white/55" style={{ lineHeight: 1.65 }}>{s.body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
