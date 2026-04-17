import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import ThreeBackground from "@/landing/ThreeBackground";
import Navbar from "@/landing/Navbar";
import EntryAnimation from "@/landing/EntryAnimation";
import WaitlistModal from "@/landing/WaitlistModal";
import Hero from "@/landing/sections/Hero";
import Features from "@/landing/sections/Features";
import HowItWorks from "@/landing/sections/HowItWorks";
import Stats from "@/landing/sections/Stats";
import WhyNeeded from "@/landing/sections/WhyNeeded";
import Comparison from "@/landing/sections/Comparison";
import Security from "@/landing/sections/Security";
import DualPerspective from "@/landing/sections/DualPerspective";
import Testimonials from "@/landing/sections/Testimonials";
import Waitlist from "@/landing/sections/Waitlist";
import Footer from "@/landing/sections/Footer";

/**
 * AuroPay landing page — public marketing surface at /landing.
 * Dark gold premium theme. Three.js background, Framer Motion sections.
 */
export default function Landing() {
  const reduceMotion = useReducedMotion();
  const [modalOpen, setModalOpen] = useState(false);
  const [entryDone, setEntryDone] = useState(false);

  // Safety net: ensure the page is always visible after 2.5s even if the
  // entry animation never fires onDone (e.g. tab was backgrounded).
  useEffect(() => {
    if (reduceMotion) { setEntryDone(true); return; }
    const t = setTimeout(() => setEntryDone(true), 3000);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  useEffect(() => {
    document.title = "AuroPay — Teen Payments Reimagined";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "India's first scan-and-pay app for teens. Sign up with just your Aadhaar. No PAN needed.");

    // Inject premium fonts once (only on this page)
    const id = "auropay-landing-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white" style={{ background: "#050507", fontFamily: "Sora, sans-serif" }}>
      {!reduceMotion && <EntryAnimation onDone={() => setEntryDone(true)} />}
      <ThreeBackground />

      {/* Subtle radial gold glow over scene */}
      <div className="fixed inset-0 -z-[5] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, rgba(200,149,46,0.12), transparent 60%)" }} />

      <Navbar onCTA={() => setModalOpen(true)} />

      <main style={{ opacity: entryDone ? 1 : 0, transition: "opacity 0.6s ease-out" }}>
        <Hero onCTA={() => setModalOpen(true)} />
        <Stats />
        <WhyNeeded />
        <Features />
        <div id="how"><HowItWorks /></div>
        <Comparison />
        <div id="security"><Security /></div>
        <DualPerspective onCTA={() => setModalOpen(true)} />
        <Testimonials />
        <Waitlist />
        <Footer />
      </main>

      <WaitlistModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
