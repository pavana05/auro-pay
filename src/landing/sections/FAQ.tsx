import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "Is AuroPay safe for my teen?",
    a: "Absolutely. We're RBI-compliant, KYC-verified through Aadhaar, and parents get real-time alerts on every rupee spent. You can set per-category limits, freeze the card instantly, and our fraud detection blocks suspicious QRs before payment.",
  },
  {
    q: "Why no PAN card requirement?",
    a: "Most teens don't have a PAN — and getting one takes weeks. We worked closely with banking partners to design an Aadhaar-only flow that's fully compliant with RBI guidelines for minor accounts. You're set up in 2 minutes, not 2 weeks.",
  },
  {
    q: "What ages can use AuroPay?",
    a: "AuroPay is built for teens aged 13–19. Younger users get a parent-supervised account; once they turn 18, the account auto-graduates to full independence. Parents always have visibility tools they can opt into or out of.",
  },
  {
    q: "Are there any hidden charges?",
    a: "No. UPI payments are free, transfers are free, signing up is free. We make money through optional premium features (advanced parental controls, savings boosters) and merchant partnerships — never by charging teens or families.",
  },
  {
    q: "How is this different from FamPay or Junio?",
    a: "Three things: (1) Aadhaar-only signup — no PAN, ever. (2) Built-in goal-based saving and weekly insights, not bolted on. (3) Real per-category controls and bill-split designed for Indian Tier 2/3 cities, not just metros. See our full comparison above.",
  },
  {
    q: "Can my teen use AuroPay without a parent?",
    a: "Teens 18+ can sign up solo. For 13–17, we require parent linking — but that takes one tap. The parent doesn't need to be on AuroPay either; they can approve via SMS link. Once linked, the teen has full payment freedom within agreed limits.",
  },
  {
    q: "What happens to my data?",
    a: "Your data stays in India on RBI-approved infrastructure. We never sell, share, or use your personal info for ads. Aadhaar details are encrypted and never stored in plaintext. You can delete your account and all data anytime from settings.",
  },
  {
    q: "When does AuroPay launch?",
    a: "We're rolling out city by city through 2026, starting with Bengaluru, Mysuru, Hubli, and Mumbai. Waitlist members get access first, plus a ₹100 bonus and the Founding Member badge — forever.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-32 px-6 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-4 text-center"
          style={{ color: "#c8952e" }}
        >
          Frequently Asked
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white text-center mb-4"
          style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          Real questions.{" "}
          <span style={{
            backgroundImage: "linear-gradient(90deg,#c8952e,#fff7e3)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Honest answers.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-base text-white/55 text-center mb-14"
        >
          From teens, parents, and skeptics alike.
        </motion.p>

        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: isOpen
                    ? "linear-gradient(160deg, rgba(200,149,46,0.08), rgba(255,255,255,0.02))"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isOpen ? "rgba(200,149,46,0.35)" : "rgba(255,255,255,0.08)"}`,
                  boxShadow: isOpen ? "0 12px 40px rgba(0,0,0,0.3)" : "none",
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 lg:p-6 text-left group"
                >
                  <span
                    className="text-base lg:text-lg font-semibold text-white"
                    style={{ fontFamily: "Sora, sans-serif" }}
                  >
                    {f.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background: isOpen ? "linear-gradient(135deg,#c8952e,#e0b048)" : "rgba(255,255,255,0.06)",
                      color: isOpen ? "#1a1206" : "rgba(255,255,255,0.7)",
                      boxShadow: isOpen ? "0 4px 16px rgba(200,149,46,0.4)" : undefined,
                    }}
                  >
                    <Plus size={18} strokeWidth={3} />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="px-5 lg:px-6 pb-5 lg:pb-6 text-[15px] text-white/65" style={{ lineHeight: 1.7 }}>
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-10 text-sm text-white/50"
        >
          Still curious?{" "}
          <a href="mailto:hello@auropay.in" className="text-amber-200 hover:text-amber-100 underline underline-offset-4">
            Talk to a human →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
