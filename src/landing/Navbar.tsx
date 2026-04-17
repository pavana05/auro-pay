import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar({ onCTA }: { onCTA: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Features", id: "features" },
    { label: "How It Works", id: "how" },
    { label: "Security", id: "security" },
    { label: "Waitlist", id: "waitlist" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 transition-all"
        style={{
          height: 72,
          background: "rgba(8,7,12,0.6)",
          backdropFilter: "blur(24px) saturate(180%)",
          borderBottom: scrolled ? "1px solid rgba(200,149,46,0.25)" : "1px solid rgba(200,149,46,0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto h-full px-6 lg:px-8 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl"
              style={{ background: "linear-gradient(135deg,#c8952e,#8a6520)", boxShadow: "0 0 20px rgba(200,149,46,0.4)" }} />
            <span className="text-white font-bold text-lg" style={{ fontFamily: "Sora, sans-serif" }}>AuroPay</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {links.map((l, i) => (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7 + i * 0.08 }}
                onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" })}
                className="text-sm text-white/70 hover:text-white transition relative group"
              >
                {l.label}
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                  style={{ background: "#c8952e" }} />
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 2 }}
              onClick={onCTA}
              className="hidden sm:inline-flex h-10 px-5 rounded-full text-sm font-semibold text-black items-center transition hover:scale-[1.04]"
              style={{
                background: "linear-gradient(135deg,#c8952e,#e0b048)",
                boxShadow: "0 4px 24px rgba(200,149,46,0.4)",
              }}
            >Get Early Access</motion.button>
            <button onClick={() => setOpen(true)} className="md:hidden text-white p-2" aria-label="Menu">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[60] bg-[#050507] flex flex-col md:hidden"
          >
            <div className="h-18 px-6 flex items-center justify-between" style={{ height: 72 }}>
              <span className="text-white font-bold text-lg">AuroPay</span>
              <button onClick={() => setOpen(false)} className="text-white p-2"><X size={22} /></button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              {links.map(l => (
                <button key={l.id}
                  onClick={() => { setOpen(false); setTimeout(() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" }), 100); }}
                  className="text-2xl text-white font-semibold">
                  {l.label}
                </button>
              ))}
              
            </div>
            <div className="p-6">
              <button onClick={() => { setOpen(false); onCTA(); }}
                className="w-full h-13 rounded-full font-semibold text-black"
                style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)" }}>Get Early Access</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
