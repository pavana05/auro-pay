import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Scan, ShieldCheck, Users, Send, PiggyBank, BarChart3, Sparkle } from "lucide-react";
import { useRef, useState, useEffect } from "react";
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
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Track which feature is in view to swap the sticky phone screen
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const items = trackRef.current?.querySelectorAll("[data-feature-idx]");
    if (!items) return;
    items.forEach((el) => {
      const idx = Number((el as HTMLElement).dataset.featureIdx);
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveIdx(idx);
          }
        },
        { threshold: [0.5, 0.75], rootMargin: "-20% 0px -30% 0px" }
      );
      io.observe(el);
      observers.push(io);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const phoneYSmooth = useSpring(phoneY, { stiffness: 80, damping: 20 });

  return (
    <section id="features" ref={sectionRef} className="relative py-32 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-5"
        >
          <span className="lux-eyebrow">Everything you need</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white max-w-3xl mb-5"
          style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.025em", lineHeight: 1.04 }}
        >
          Everything a teen needs.
          <br/><span className="text-white/35">Nothing they don't.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-base text-white/55 max-w-xl mb-24"
        >
          Six things, done obsessively well. Skip the fluff.
        </motion.p>

        {/* Sticky-phone layout: text column scrolls, phone stays pinned and swaps screens */}
        <div ref={trackRef} className="grid lg:grid-cols-2 gap-16 lg:gap-24 relative">
          {/* LEFT: scrolling feature copy */}
          <div className="space-y-40 lg:space-y-56 lg:py-32">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isActive = i === activeIdx;
              return (
                <motion.div
                  key={i}
                  data-feature-idx={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-15% 0px" }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  animate={{ opacity: isActive ? 1 : 0.45 }}
                  className="space-y-6 max-w-lg"
                >
                  <div className="inline-flex items-center gap-2.5 pl-1 pr-4 py-1 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold lux-glass-gold">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full"
                      style={{
                        background: "linear-gradient(135deg,#c8952e,#e0b048)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px rgba(200,149,46,0.4)",
                      }}>
                      <Icon size={13} className="text-black" strokeWidth={2.4} />
                    </span>
                    <span style={{ color: "#e0b048" }}>{f.tag}</span>
                    <span className="ml-2 text-white/40 font-mono text-[10px]">
                      {String(i + 1).padStart(2, "0")} / {String(FEATURES.length).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight"
                    style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.03em", lineHeight: 1.04 }}>
                    {f.title}
                  </h3>
                  <p className="text-white/55 text-base lg:text-lg" style={{ lineHeight: 1.7 }}>{f.body}</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                    style={{
                      background: "rgba(200,149,46,0.08)",
                      color: "#e0b048",
                      border: "1px solid rgba(200,149,46,0.22)",
                      backdropFilter: "blur(12px)",
                    }}>
                    <Sparkle size={12} fill="#e0b048" stroke="#e0b048" />
                    {f.stat}
                  </div>

                  {/* Mobile-only inline phone (sticky disabled below lg) */}
                  <div className="lg:hidden flex justify-center pt-8 relative">
                    <div className="absolute inset-0 m-auto w-72 h-72 rounded-full blur-3xl opacity-50 pointer-events-none"
                      style={{ background: "radial-gradient(circle, rgba(200,149,46,0.45), transparent 70%)" }} />
                    <div className="relative" style={{ transform: "rotateY(-6deg) rotateX(3deg)", perspective: 1200 }}>
                      <PhoneMockup screen={f.screen} scale={0.75} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* RIGHT: sticky phone (desktop only) */}
          <div className="hidden lg:block">
            <motion.div
              style={{ y: phoneYSmooth }}
              className="sticky top-24 h-[80vh] flex items-center justify-center"
            >
              <div className="relative">
                {/* Ambient glow */}
                <div className="absolute inset-0 m-auto w-96 h-96 rounded-full blur-3xl opacity-60 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, rgba(200,149,46,0.5), transparent 70%)",
                    animation: "lux-orbit-pulse 6s ease-in-out infinite",
                  }} />

                {/* Rotating conic ring behind phone */}
                <div
                  aria-hidden
                  className="absolute inset-0 m-auto w-[420px] h-[420px] rounded-full opacity-30 pointer-events-none"
                  style={{
                    background: "conic-gradient(from 0deg, transparent 0deg, rgba(224,176,72,0.5) 90deg, transparent 180deg, rgba(200,149,46,0.4) 270deg, transparent 360deg)",
                    animation: "lux-spin 18s linear infinite",
                    maskImage: "radial-gradient(circle, transparent 58%, black 60%, black 64%, transparent 66%)",
                    WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 60%, black 64%, transparent 66%)",
                  }}
                />

                {/* Phone with crossfade between screens */}
                <div
                  className="relative"
                  style={{ transform: "rotateY(-8deg) rotateX(3deg)", perspective: 1200 }}
                >
                  {FEATURES.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={false}
                      animate={{
                        opacity: i === activeIdx ? 1 : 0,
                        scale: i === activeIdx ? 1 : 0.96,
                        y: i === activeIdx ? 0 : 12,
                      }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className={i === activeIdx ? "relative" : "absolute inset-0 pointer-events-none"}
                    >
                      <PhoneMockup screen={f.screen} scale={0.9} />
                    </motion.div>
                  ))}
                </div>

                {/* Tag indicator below phone */}
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.25em] font-semibold whitespace-nowrap"
                  style={{
                    background: "rgba(10,12,15,0.8)",
                    border: "1px solid rgba(200,149,46,0.3)",
                    color: "#e0b048",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {FEATURES[activeIdx].tag}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
