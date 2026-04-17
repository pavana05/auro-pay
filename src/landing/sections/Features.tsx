import { motion } from "framer-motion";
import { Scan, ShieldCheck, Users, Send, PiggyBank, BarChart3 } from "lucide-react";
import PhoneMockup from "../PhoneMockup";

const FEATURES = [
  { icon: Scan, title: "Scan Any QR Code in India", body: "Point at any UPI QR — Paytm, PhonePe, GPay, any bank. Pay in 3 seconds.", stat: "300M+ QR codes accepted", screen: "scan" as const },
  { icon: ShieldCheck, title: "Just Your Aadhaar. No PAN Needed.", body: "Sign up in 2 minutes with only your Aadhaar. The only teen app in India that doesn't require PAN.", stat: "₹0 documents cost", screen: "kyc" as const },
  { icon: Users, title: "Parents in Complete Control", body: "Set spending limits per category, get instant alerts, freeze the card from anywhere.", stat: "Real-time notifications", screen: "parent" as const },
  { icon: Send, title: "Send Money to Friends Instantly", body: "Split bills, send pocket money, pay a friend — all in seconds via UPI. Free, always.", stat: "2.3s average transfer", screen: "send" as const },
  { icon: PiggyBank, title: "Save Towards What You Love", body: "Set a goal, track progress, celebrate when you reach it. Built for Gen Z.", stat: "Avg goal in 23 days", screen: "savings" as const },
  { icon: BarChart3, title: "Understand Your Money", body: "See where every rupee goes — food, transport, shopping — with weekly insights.", stat: "Weekly insights", screen: "analytics" as const },
];

export default function Features() {
  return (
    <section id="features" className="relative py-32 px-6 lg:px-12" style={{ background: "linear-gradient(180deg, transparent, rgba(10,9,5,0.6))" }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="text-[11px] uppercase tracking-[0.1em] font-semibold mb-4"
          style={{ color: "#c8952e" }}
        >Features</motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl sm:text-5xl font-bold text-white max-w-2xl mb-16"
          style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}
        >
          Everything a teen needs.<br/><span className="text-white/40">Nothing they don't.</span>
        </motion.h2>

        <div className="space-y-32">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const reverse = i % 2 === 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={`grid lg:grid-cols-2 gap-12 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="space-y-5">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl"
                    style={{ background: "rgba(200,149,46,0.15)", border: "1px solid rgba(200,149,46,0.3)" }}>
                    <Icon size={22} style={{ color: "#c8952e" }} />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}>
                    {f.title}
                  </h3>
                  <p className="text-white/60 text-base lg:text-lg" style={{ lineHeight: 1.7 }}>{f.body}</p>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "#e0b048" }}>
                    ✦ {f.stat}
                  </div>
                </div>
                <div className="flex justify-center">
                  <PhoneMockup screen={f.screen} scale={0.85} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
