import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import ThreeBackground from "@/landing/ThreeBackground";
import Navbar from "@/landing/Navbar";
import EntryAnimation from "@/landing/EntryAnimation";
import WaitlistModal from "@/landing/WaitlistModal";
import StickyCTA from "@/landing/StickyCTA";
import ScrollProgress from "@/landing/ScrollProgress";
import PremiumCursor from "@/landing/PremiumCursor";
import ParticleField from "@/landing/ParticleField";
import Hero from "@/landing/sections/Hero";
import PressStrip from "@/landing/sections/PressStrip";
import Stats from "@/landing/sections/Stats";
import WhyNeeded from "@/landing/sections/WhyNeeded";
import Features from "@/landing/sections/Features";
import HowItWorks from "@/landing/sections/HowItWorks";
import Comparison from "@/landing/sections/Comparison";
import Security from "@/landing/sections/Security";
import DualPerspective from "@/landing/sections/DualPerspective";
import Testimonials from "@/landing/sections/Testimonials";
import FAQ from "@/landing/sections/FAQ";
import Waitlist from "@/landing/sections/Waitlist";
import Footer from "@/landing/sections/Footer";

/**
 * AuroPay landing — public marketing surface at /.
 * Hybrid premium dark gold + playful Gen-Z layout.
 */
export default function Landing() {
  const reduceMotion = useReducedMotion();
  const [modalOpen, setModalOpen] = useState(false);
  const [entryDone, setEntryDone] = useState(false);

  useEffect(() => {
    if (reduceMotion) { setEntryDone(true); return; }
    const t = setTimeout(() => setEntryDone(true), 3000);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  useEffect(() => {
    document.title = "AuroPay — The grown-up way to spend smart as a teen";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "India's first scan-and-pay app for teens. Aadhaar-only signup, no PAN. Parental controls, savings goals, and instant UPI — built for Gen Z.");

    // If visited with ?ref=AURO-XXX-1234, swap OG image to the personalized one
    // so when the visitor re-shares the URL, the share preview shows the inviter's name.
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^AURO-[A-Z]{3}-\d{4}$/i.test(ref)) {
      const url = `https://mkduupshubnzjwefptcw.functions.supabase.co/og-referral?ref=${encodeURIComponent(ref.toUpperCase())}`;
      document.querySelector('meta[property="og:image"]')?.setAttribute("content", url);
      document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", url);
    }

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
      <ScrollProgress />
      <PremiumCursor />
      <ThreeBackground />
      <ParticleField />

      {/* Subtle radial gold glow over scene */}
      <div className="fixed inset-0 -z-[5] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, rgba(200,149,46,0.12), transparent 60%)" }} />

      <Navbar onCTA={() => setModalOpen(true)} />

      <main style={{ opacity: entryDone ? 1 : 0, transition: "opacity 0.6s ease-out" }}>
        <Hero onCTA={() => setModalOpen(true)} />
        <PressStrip />
        <Stats />
        <WhyNeeded />
        <Features />
        <div id="how"><HowItWorks /></div>
        <Comparison />
        <div id="security"><Security /></div>
        <DualPerspective onCTA={() => setModalOpen(true)} />
        <Testimonials />
        <FAQ />
        <Waitlist />
        <Footer />
      </main>

      <StickyCTA onCTA={() => setModalOpen(true)} />
      <WaitlistModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
