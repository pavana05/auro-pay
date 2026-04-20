import { motion } from "framer-motion";

export default function AnalyticsScreen() {
  return (
    <div className="px-5 pt-8 space-y-3">
      <div className="text-xs text-white/60 uppercase tracking-wider">This week</div>
      <div className="text-2xl text-white font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>₹1,840</div>
      <div className="flex items-end gap-1.5 h-24">
        {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }}
            transition={{ delay: i*0.08, duration: 0.5 }}
            className="flex-1 rounded-t" style={{ background: "linear-gradient(180deg,#c8952e,#8a6520)" }} />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-white/40">
        {["M", "T", "W", "Th", "F", "Sa", "Su"].map((d) => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}
