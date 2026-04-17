import { motion } from "framer-motion";
import { Download, ShieldCheck, QrCode } from "lucide-react";

const STEPS = [
  { n: "1", icon: Download, title: "Download AuroPay", body: "Get it from Play Store or App Store in seconds." },
  { n: "2", icon: ShieldCheck, title: "Verify with Aadhaar", body: "Enter your Aadhaar number, confirm OTP, done." },
  { n: "3", icon: QrCode, title: "Start Paying", body: "Scan any UPI QR and pay. That's it." },
];

export default function HowItWorks() {
  return (
    <section className="relative py-32 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl sm:text-5xl font-bold text-white mb-4 text-center"
          style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}
        >Up and running in 2 minutes.</motion.h2>
        <p className="text-white/50 text-center mb-16 max-w-xl mx-auto">No paperwork. No bank visits. No PAN.</p>

        <div className="relative grid md:grid-cols-3 gap-6">
          {/* connecting line */}
          <motion.div
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.4 }}
            className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-px origin-left -translate-y-1/2"
            style={{ background: "repeating-linear-gradient(90deg, rgba(200,149,46,0.4) 0 8px, transparent 8px 16px)" }}
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative rounded-3xl p-8 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(200,149,46,0.06), rgba(255,255,255,0.02))",
                  border: "1px solid rgba(200,149,46,0.18)",
                }}
              >
                <div className="absolute top-2 right-4 text-[80px] font-extrabold text-white/[0.04]"
                  style={{ fontFamily: "Sora, sans-serif", lineHeight: 1 }}>{s.n}</div>
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                    style={{ background: "linear-gradient(135deg,#c8952e,#8a6520)" }}>
                    <Icon size={22} className="text-black" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-white/60">{s.body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
