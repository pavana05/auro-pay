import { motion } from "framer-motion";
import { Scan, ShieldCheck, Users, Send, PiggyBank, BarChart3 } from "lucide-react";
import PhoneMockup from "../PhoneMockup";

const FEATURES = [
  { icon: Scan, tag: "Pay", title: "Scan any QR. Anywhere in India.", body: "Point at any UPI QR — Paytm, PhonePe, GPay, any bank. Pay in 3 seconds. Works everywhere your friends do.", stat: "300M+ QR codes accepted", screen: "scan" as const },
  { icon: ShieldCheck, tag: "Onboarding", title: "Just your Aadhaar. No PAN. No problem.", body: "Sign up in 2 minutes with only your Aadhaar. The only teen app in India that doesn't make you chase a PAN card.", stat: "₹0 documents · 2 min setup", screen: "kyc" as const },
  { icon: Users, tag: "For Parents", title: "Parents in complete control.", body: "Set spending limits per category, get instant alerts, freeze the card from anywhere — without snooping.", stat: "Real-time, every transaction", screen: "parent" as const },
  { icon: Send, tag: "Social", title: "Send money to friends instantly.", body: "Split bills, send pocket money, pay back a friend — all in seconds via UPI. Free, always.", stat: "2.3s average transfer", screen: "send" as const },
  { icon: PiggyBank, tag: "Save", title: "Save towards what you actually want.", body: "Headphones, a Goa trip, a new console. Set a goal, track progress, celebrate when you hit it. Built for Gen Z.", stat: "Avg goal hit in 23 days", screen: "savings" as const },
  { icon: BarChart3, tag: "Insights", title: "Understand where your money goes.", body: "Food, transport, shopping — see it all in beautiful weekly insights. Become the money person in your friend group.", stat: "Weekly auto-reports", screen: "analytics" as const },
];

export default function Features() {
  return (
    <section id="features" className="relative py-32 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-4"
          style={{ color: "#c8952e" }}
        >Everything you need</motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white max-w-3xl mb-4"
          style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          Everything a teen needs.
          <br/><span className="text-white/40">Nothing they don't.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-base text-white/55 max-w-xl mb-20"
        >
          Six things, done obsessively well. Skip the fluff.
        </motion.p>

        <div className="space-y-28 lg:space-y-36">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const reverse = i % 2 === 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-semibold"
                    style={{ background: "rgba(200,149,46,0.1)", color: "#e0b048", border: "1px solid rgba(200,149,46,0.25)" }}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                      style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)" }}>
                      <Icon size={12} className="text-black" strokeWidth={2.5} />
                    </span>
                    {f.tag}
                  </div>
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white"
                    style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.025em", lineHeight: 1.05 }}>
                    {f.title}
                  </h3>
                  <p className="text-white/60 text-base lg:text-lg max-w-lg" style={{ lineHeight: 1.65 }}>{f.body}</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                    style={{ background: "rgba(200,149,46,0.1)", color: "#e0b048", border: "1px solid rgba(200,149,46,0.2)" }}>
                    <span>✦</span> {f.stat}
                  </div>
                </div>
                <div className="flex justify-center relative">
                  {/* Glow puddle */}
                  <div className="absolute inset-0 m-auto w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(200,149,46,0.5), transparent 70%)" }} />
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                    className="relative"
                    style={{ transform: reverse ? "rotateY(6deg) rotateX(2deg)" : "rotateY(-6deg) rotateX(2deg)", perspective: 1200 }}
                  >
                    <PhoneMockup screen={f.screen} scale={0.85} />
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
