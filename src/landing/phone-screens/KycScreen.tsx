import { motion } from "framer-motion";

export default function KycScreen() {
  return (
    <div className="px-5 pt-8 space-y-4">
      <div className="text-xs text-foreground/60 uppercase tracking-wider text-center">Verify with Aadhaar</div>
      <div
        className="rounded-2xl p-4"
        style={{ background: "hsl(var(--foreground) / 0.04)", border: "1px solid hsl(var(--primary) / 0.25)" }}
      >
        <div className="text-[10px] text-foreground/50">Aadhaar number</div>
        <div className="text-base text-foreground mt-1 font-mono tracking-wider">XXXX XXXX 4321</div>
      </div>
      <div className="text-[10px] text-foreground/50 text-center">Enter the 6-digit OTP</div>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <motion.div
            key={n}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: n * 0.1 }}
            className="w-9 h-11 rounded-lg flex items-center justify-center text-foreground font-mono"
            style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.3)" }}
          >
            {n <= 4 ? "•" : ""}
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: "spring" }}
        className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mt-4 text-primary-foreground"
        style={{ background: "linear-gradient(135deg, hsl(var(--success)), hsl(var(--success-deep)))" }}
      >
        ✓
      </motion.div>
      <div className="text-center text-xs text-success">Verified instantly</div>
    </div>
  );
}
