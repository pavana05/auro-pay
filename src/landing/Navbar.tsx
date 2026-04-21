import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowUpRight, HelpCircle } from "lucide-react";
import MagneticCTA from "./MagneticCTA";

export default function Navbar({ onCTA }: { onCTA: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      // Active section detection
      const ids = ["features", "how", "security"];
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 140) current = id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Features", id: "features" },
    { label: "How", id: "how" },
    { label: "Security", id: "security" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none"
      >
        <div
          className="pointer-events-auto mt-3 sm:mt-4 mx-3 sm:mx-6 w-[min(1180px,calc(100vw-24px))] flex items-center justify-between gap-4 transition-all duration-500"
          style={{
            height: scrolled ? 60 : 68,
            paddingLeft: 18,
            paddingRight: 8,
            borderRadius: 999,
            background: scrolled ? "rgba(10,9,14,0.72)" : "rgba(10,9,14,0.42)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: `1px solid ${scrolled ? "rgba(200,149,46,0.28)" : "rgba(255,255,255,0.08)"}`,
            boxShadow: scrolled
              ? "0 20px 60px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)"
              : "0 10px 40px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative w-8 h-8 rounded-xl overflow-hidden"
              style={{
                background: "conic-gradient(from 220deg, #c8952e, #fff7e3, #c8952e, #8a6520, #c8952e)",
                boxShadow: "0 0 24px rgba(200,149,46,0.5), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}>
              <div className="absolute inset-[2px] rounded-[10px]"
                style={{ background: "linear-gradient(135deg,#1a1206,#0a0c0f)" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black lux-text-gold" style={{ fontFamily: "Sora, sans-serif" }}>A</span>
              </div>
            </div>
            <span className="text-white font-semibold text-[15px] tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
              AuroPay
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1 px-1">
            {links.map((l) => {
              const active = activeId === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" })}
                  className="relative px-4 py-1.5 text-[13px] font-medium transition-colors"
                  style={{ color: active ? "#fff7e3" : "rgba(255,255,255,0.62)" }}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "rgba(200,149,46,0.12)",
                        border: "1px solid rgba(200,149,46,0.3)",
                      }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/landing-help"
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-[13px] font-medium text-white/70 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <HelpCircle size={14} /> Help
            </Link>
            <div className="hidden sm:inline-flex">
              <MagneticCTA onClick={onCTA} className="h-10 pl-4 pr-2 text-[13px]" radius={120}>
                Early Access
                <span className="w-7 h-7 rounded-full flex items-center justify-center ml-1"
                  style={{ background: "rgba(0,0,0,0.18)" }}>
                  <ArrowUpRight size={13} strokeWidth={2.5} />
                </span>
              </MagneticCTA>
            </div>
            <button onClick={() => setOpen(true)} className="md:hidden text-white p-2.5" aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] md:hidden"
            style={{ background: "rgba(5,5,7,0.96)", backdropFilter: "blur(20px)" }}
          >
            <div className="h-[68px] px-6 flex items-center justify-between">
              <span className="text-white font-semibold text-[15px]">AuroPay</span>
              <button onClick={() => setOpen(false)} className="text-white p-2" aria-label="Close"><X size={22} /></button>
            </div>
            <motion.div
              initial="hidden" animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
              className="flex-1 flex flex-col items-center justify-center gap-5 pt-12"
            >
              {links.map(l => (
                <motion.button
                  key={l.id}
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                  onClick={() => { setOpen(false); setTimeout(() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" }), 100); }}
                  className="text-3xl text-white font-semibold tracking-tight"
                  style={{ fontFamily: "Sora, sans-serif" }}
                >
                  {l.label}
                </motion.button>
              ))}
            </motion.div>
            <div className="absolute bottom-0 inset-x-0 p-6">
              <button onClick={() => { setOpen(false); onCTA(); }}
                className="w-full h-14 rounded-full font-semibold text-black"
                style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)", boxShadow: "0 8px 28px rgba(200,149,46,0.45)" }}>
                Get Early Access
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
