import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import AuroLogo from "./AuroLogo";
import GoldButton from "./GoldButton";

interface NavbarProps {
  onOpenWaitlist: () => void;
  onLogin: () => void;
}

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Security", href: "#security" },
  { label: "For parents", href: "#dual" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar({ onOpenWaitlist, onLogin }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-40"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: scrolled ? "rgba(5,6,8,0.7)" : "rgba(5,6,8,0.4)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderBottom: scrolled
            ? "1px solid rgba(200,149,46,0.22)"
            : "1px solid rgba(200,149,46,0.08)",
        }}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 md:px-8">
          <motion.button
            onClick={() => scrollTo("#top")}
            className="flex items-center gap-2.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7 }}
          >
            <AuroLogo size={32} />
            <span className="text-lg font-bold tracking-tight text-white">AuroPay</span>
          </motion.button>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link, i) => (
              <motion.button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="group relative rounded-full px-3 py-2 text-[13px] font-medium text-white/65 transition-colors hover:text-white"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.75 + i * 0.06 }}
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#c8952e] opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.button>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={onLogin}
              className="hidden text-[13px] font-medium text-white/70 transition-colors hover:text-white sm:inline-block"
            >
              Log in
            </button>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.95, type: "spring", stiffness: 300, damping: 20 }}
            >
              <GoldButton onClick={onOpenWaitlist} shimmer className="h-10 px-5 text-[13px]">
                Get early access
              </GoldButton>
            </motion.div>
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-[#050608]/95 backdrop-blur-2xl md:hidden"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center justify-between px-5 pt-6">
              <div className="flex items-center gap-2.5">
                <AuroLogo size={32} />
                <span className="text-lg font-bold text-white">AuroPay</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-12 flex flex-col items-center gap-2 px-6">
              {NAV_LINKS.map((link, i) => (
                <motion.button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="w-full rounded-2xl py-4 text-center text-2xl font-semibold text-white"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  {link.label}
                </motion.button>
              ))}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onLogin();
                }}
                className="mt-4 text-base font-medium text-white/70"
              >
                Log in
              </button>
              <div className="mt-6 w-full">
                <GoldButton
                  className="w-full"
                  size="lg"
                  shimmer
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenWaitlist();
                  }}
                >
                  Get early access
                </GoldButton>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
