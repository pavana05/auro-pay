import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Cinematic entry overlay: logo emerges, particle burst, then ascends/fades.
 * Total duration ~1.6s, then unmounts and lets the page take over.
 */
export default function EntryAnimation({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setShow(false); onDone(); }, 1700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          style={{ background: "#050507" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.05, 1], opacity: [0, 1, 1] }}
            exit={{ scale: 0.5, opacity: 0, y: -200 }}
            transition={{ duration: 1.4, times: [0, 0.4, 0.7] }}
            className="relative w-20 h-20 rounded-2xl"
            style={{
              background: "linear-gradient(135deg,#c8952e,#8a6520)",
              boxShadow: "0 0 80px rgba(200,149,46,0.8)",
            }}
          >
            {/* particle burst */}
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * Math.PI * 2;
              const dist = 100 + Math.random() * 80;
              return (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full"
                  style={{ background: i % 2 ? "#fff7e3" : "#e0b048" }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0 }}
                  transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
                />
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
