import { motion } from "framer-motion";
import { Download, ShieldCheck, QrCode } from "lucide-react";

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
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-4 text-center"
          style={{ color: "#c8952e" }}
        >How It Works</motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white text-center mb-4"
          style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          Up & running in{" "}
          <span style={{
            backgroundImage: "linear-gradient(90deg,#c8952e,#fff7e3)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>2 minutes.</span>
        </motion.h2>
        <p className="text-white/55 text-center mb-16 max-w-xl mx-auto">No paperwork. No bank visits. No PAN.</p>

        <div className="relative grid md:grid-cols-3 gap-5">
          {/* connecting line */}
          <motion.div
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
            transition={{ duration: 1.4, delay: 0.4, ease: "easeInOut" }}
            className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-px origin-left"
            style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.6), transparent)" }}
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6 }}
                className="group relative rounded-3xl p-7 lg:p-8 overflow-hidden transition-all"
                style={{
                  background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                  border: "1px solid rgba(200,149,46,0.18)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-700"
                  style={{ background: "rgba(200,149,46,0.4)" }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
                      style={{
                        background: "linear-gradient(135deg,#c8952e,#e0b048)",
                        boxShadow: "0 8px 24px rgba(200,149,46,0.4)",
                      }}>
                      <Icon size={24} className="text-black" strokeWidth={2.2} />
                    </div>
                    <span className="text-3xl font-extrabold tracking-tighter"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        backgroundImage: "linear-gradient(135deg, rgba(200,149,46,0.45), rgba(200,149,46,0.1))",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      }}>
                      {s.n}
                    </span>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white mb-2"
                    style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.01em" }}>
                    {s.title}
                  </h3>
                  <p className="text-sm lg:text-[15px] text-white/55" style={{ lineHeight: 1.6 }}>{s.body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
