// Public help page for visitors on the marketing site (/landing-help).
// Mirrors the landing page's dark-gold premium look. No auth required.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, MessageCircle, Plus, Shield, Smartphone, CreditCard, Users } from "lucide-react";

const FAQS = [
  { q: "How do I sign up for AuroPay?",
    a: "Download the AuroPay Android app from the Play Store, enter your Indian mobile number, verify the OTP, and complete a 2-minute Aadhaar-based KYC. No PAN required." },
  { q: "Is my money safe?",
    a: "Yes. AuroPay is built on RBI-compliant infrastructure with bank-grade encryption. Your balance is held in regulated partner wallets, and every payment requires a 4-digit PIN or biometric." },
  { q: "What if I forget my PIN?",
    a: "Tap 'Forgot PIN' on the lock screen. We'll re-verify your identity through Aadhaar OTP, then let you set a new PIN. Your wallet stays safe throughout." },
  { q: "How do parental controls work?",
    a: "Parents link to their teen with a one-tap invite. Once linked, parents can set spending limits per category, approve large payments, and view a real-time activity feed — without ever touching the teen's money." },
  { q: "Are there any fees?",
    a: "UPI payments, money transfers, and signups are completely free. We never charge hidden fees on basic usage." },
  { q: "Which cities is AuroPay available in?",
    a: "We're rolling out across India through 2026, starting with Bengaluru, Mysuru, Hubli, and Mumbai. Join the waitlist to get notified when we launch in your city." },
  { q: "How do I delete my account?",
    a: "Open the app → Profile → Account → Delete Account. We permanently erase your personal data within 30 days, in line with our privacy policy." },
  { q: "I'm having a payment issue. What do I do?",
    a: "Open the app → Help & Support → Raise a Ticket. Our support team responds within 24 hours. For urgent issues, email support@auropay.app." },
];

const TOPICS = [
  { icon: Smartphone, title: "Getting Started", desc: "Download, sign up, and set up your AuroPay wallet in minutes." },
  { icon: Shield, title: "Security & PIN", desc: "Protect your account with PIN, biometric, and Aadhaar verification." },
  { icon: CreditCard, title: "Payments & UPI", desc: "Send money, scan QR codes, and pay bills instantly." },
  { icon: Users, title: "Parent & Teen", desc: "Link accounts, set limits, and approve payments together." },
];

export default function LandingHelp() {
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    document.title = "Help & Support — AuroPay";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Get help with AuroPay — answers to common questions about signup, payments, parental controls, and security. Contact our support team 24/7.");

    const id = "auropay-landing-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div
      className="relative min-h-screen text-white overflow-x-hidden"
      style={{ background: "#050507", fontFamily: "Sora, sans-serif" }}
    >
      {/* Ambient gold glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, rgba(200,149,46,0.10), transparent 60%)" }}
      />

      {/* Top nav */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 pt-8 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to AuroPay
        </Link>
        <Link
          to="/"
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          AuroPay
        </Link>
      </div>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 pt-16 pb-12 text-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-5"
          style={{
            color: "#fff7e3",
            background: "rgba(200,149,46,0.14)",
            border: "1px solid rgba(200,149,46,0.32)",
          }}
        >
          Help Centre
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
          style={{
            background: "linear-gradient(135deg,#fff,#fff7e3 50%,#c8952e)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          How can we help?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mt-5 text-base sm:text-lg text-white/65 max-w-xl mx-auto"
        >
          Answers to common questions about AuroPay — and a real human team when you need one.
        </motion.p>
      </section>

      {/* Topic grid */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOPICS.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group relative p-5 rounded-2xl transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{
                  background: "rgba(200,149,46,0.12)",
                  border: "1px solid rgba(200,149,46,0.28)",
                }}
              >
                <t.icon size={18} className="text-[#e0b048]" />
              </div>
              <h3 className="text-base font-semibold text-white">{t.title}</h3>
              <p className="mt-1.5 text-[13px] text-white/55 leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 lg:px-12 pb-16">
        <h2
          className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-8"
          style={{
            background: "linear-gradient(135deg,#fff,#fff7e3)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Frequently asked
        </h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: isOpen ? "rgba(200,149,46,0.05)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${isOpen ? "rgba(200,149,46,0.28)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-[15px] sm:text-base font-medium text-white">{f.q}</span>
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform"
                    style={{
                      background: "rgba(200,149,46,0.14)",
                      border: "1px solid rgba(200,149,46,0.3)",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                    }}
                  >
                    <Plus size={14} className="text-[#e0b048]" />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-[14px] text-white/65 leading-relaxed">
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 lg:px-12 pb-24">
        <div
          className="rounded-3xl p-8 sm:p-10 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(200,149,46,0.10), rgba(200,149,46,0.02))",
            border: "1px solid rgba(200,149,46,0.28)",
            boxShadow: "0 30px 80px -40px rgba(200,149,46,0.4)",
          }}
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Still need help?</h3>
          <p className="mt-3 text-[14px] sm:text-base text-white/65 max-w-md mx-auto">
            Our support team is here 24/7. Reach out and we'll get back within a few hours.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:support@auropay.app"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)", boxShadow: "0 8px 28px rgba(200,149,46,0.45)" }}
            >
              <Mail size={16} /> Email Support
            </a>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-sm font-semibold text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <MessageCircle size={16} /> Back to home
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-[12px] text-white/40">
        © {new Date().getFullYear()} AuroPay. Built in India.
      </footer>
    </div>
  );
}
