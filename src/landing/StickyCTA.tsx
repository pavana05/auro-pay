import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MagneticCTA from "./MagneticCTA";

export default function StickyCTA({ onCTA }: { onCTA: () => void }) {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.body.scrollHeight - window.innerHeight;
      setVisible(y > window.innerHeight * 0.8 && y < max - 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.rpc("get_waitlist_count").then(({ data }) => {
      if (typeof data === "number") setCount(data + 12000);
    });
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
          className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40"
        >
          <div
            className="flex items-center gap-3 sm:gap-4 pl-4 pr-1.5 py-1.5 rounded-full"
            style={{
              background: "rgba(13,12,18,0.88)",
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
              border: "1px solid rgba(200,149,46,0.32)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div className="hidden sm:flex items-center gap-2 pr-1">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-xs text-white/65">
                <span className="text-white font-semibold tabular-nums">
                  {count ? count.toLocaleString() : "12,847"}
                </span>{" "}
                joined
              </span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-white/10" />
            <div className="text-sm text-white font-medium pr-1 sm:pr-0 tracking-tight">
              Be first in line.
            </div>
            <div className="ml-auto sm:ml-0">
              <MagneticCTA onClick={onCTA} className="h-11 pl-4 pr-1.5 text-sm" radius={130}>
                <span>Early Access</span>
                <span className="w-8 h-8 rounded-full flex items-center justify-center ml-1"
                  style={{ background: "rgba(0,0,0,0.18)" }}>
                  <ArrowUpRight size={13} strokeWidth={2.5} />
                </span>
              </MagneticCTA>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
