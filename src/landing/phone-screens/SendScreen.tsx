import { motion } from "framer-motion";

export default function SendScreen() {
  return (
    <div className="px-5 pt-8 text-center space-y-4">
      <div className="text-xs text-white/60 uppercase tracking-wider">Sending to</div>
      <div className="w-16 h-16 mx-auto rounded-full" style={{ background: "linear-gradient(135deg,#c8952e,#8a6520)" }} />
      <div className="text-base text-white font-semibold">Priya M.</div>
      <div className="text-3xl text-white font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>₹250</div>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring" }}
        className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>✓</motion.div>
      <div className="text-xs text-emerald-400">Sent in 2.3s</div>
    </div>
  );
}
