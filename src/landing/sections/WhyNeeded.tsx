import { motion } from "framer-motion";
import { AlertTriangle, Wallet, Eye, Clock, BookOpen, Lock } from "lucide-react";

const PROBLEMS = [
  {
    icon: AlertTriangle,
    stat: "73%",
    title: "of teens carry cash to school",
    body: "Cash gets lost, stolen, or spent on impulse. There's no record, no safety, no learning.",
  },
  {
    icon: Eye,
    stat: "0",
    title: "visibility for parents",
    body: "Parents have no idea where pocket money goes — until the wallet is empty and the conversation gets awkward.",
  },
  {
    icon: Clock,
    stat: "8 hrs",
    title: "to open a teen bank account",
    body: "Banks demand PAN, in-person KYC, parent escort, branch visits. Most teens give up before finishing.",
  },
  {
    icon: Wallet,
    stat: "₹0",
    title: "saved by Indian teens monthly",
    body: "No tools to set goals, track spending, or learn financial habits. They graduate into adulthood unprepared.",
  },
  {
    icon: BookOpen,
    stat: "0%",
    title: "of schools teach money management",
    body: "Yet money is the #1 cause of stress in adult life. We learned algebra. We never learned to budget.",
  },
  {
    icon: Lock,
    stat: "1 in 4",
    title: "teens fall for online scams",
    body: "UPI scams targeting teens have tripled. Without parental controls and limits, one bad QR ruins a month.",
  },
];

export default function WhyNeeded() {
  return (
    <section className="relative py-32 px-6 lg:px-12 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center top, rgba(200,149,46,0.08), transparent 60%)" }}
      />
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-4"
          style={{ color: "#c8952e" }}
        >
          Why It Matters
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white max-w-3xl mb-6"
          style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          India's teens deserve better than{" "}
          <span style={{
            backgroundImage: "linear-gradient(90deg,#c8952e,#e0b048,#fff7e3)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            cash and chaos.
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-base lg:text-lg text-white/60 max-w-2xl mb-16"
          style={{ lineHeight: 1.7 }}
        >
          The current system fails 253 million Indian teenagers every day. AuroPay was built to fix it — one scan, one rupee, one habit at a time.
        </motion.p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6 }}
                className="group relative rounded-3xl p-7 overflow-hidden transition-all"
                style={{
                  background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-700"
                  style={{ background: "rgba(200,149,46,0.25)" }}
                />
                <div
                  className="relative inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
                  style={{ background: "rgba(200,149,46,0.12)", border: "1px solid rgba(200,149,46,0.3)" }}
                >
                  <Icon size={20} style={{ color: "#e0b048" }} />
                </div>
                <div className="relative">
                  <div
                    className="text-4xl font-bold mb-2"
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      backgroundImage: "linear-gradient(135deg,#c8952e,#fff7e3)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}
                  >
                    {p.stat}
                  </div>
                  <div className="text-base font-semibold text-white mb-2" style={{ fontFamily: "Sora, sans-serif" }}>
                    {p.title}
                  </div>
                  <p className="text-sm text-white/55" style={{ lineHeight: 1.65 }}>{p.body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
