import { motion } from "framer-motion";

export default function SavingsScreen() {
  return (
    <div className="px-5 pt-8 space-y-3">
      <div className="text-xs text-foreground/60 uppercase tracking-wider">Savings goals</div>
      {[["🎮 Gaming console", 65], ["✈️ Goa trip", 40], ["🎧 Headphones", 90]].map(([t, p], i) => (
        <div
          key={i}
          className="rounded-xl p-3"
          style={{ background: "hsl(var(--foreground) / 0.04)", border: "1px solid hsl(var(--primary) / 0.15)" }}
        >
          <div className="flex justify-between text-xs text-foreground mb-1.5">
            <span>{t}</span>
            <span className="text-foreground/50">{p}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${p}%` }}
              transition={{ duration: 1, delay: i * 0.15 }}
              className="h-full"
              style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-bright)))" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
