import { motion } from "framer-motion";

export default function HomeScreen() {
  return (
    <div className="px-5 pt-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] text-foreground/50 uppercase tracking-wider">Hello, Aarav</div>
          <div className="text-base font-semibold text-foreground">Welcome back 👋</div>
        </div>
        <div
          className="w-9 h-9 rounded-full"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-deep)))" }}
        />
      </div>

      <div
        className="rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.04))",
          border: "1px solid hsl(var(--primary) / 0.3)",
        }}
      >
        <div className="text-[10px] text-foreground/60 uppercase tracking-wider">Wallet balance</div>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-foreground mt-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          ₹3,250.<span className="text-base text-foreground/60">00</span>
        </motion.div>
        <div className="flex gap-2 mt-3">
          <div
            className="flex-1 py-2 text-xs text-center rounded-lg text-primary-foreground font-semibold"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-bright)))" }}
          >
            Scan & Pay
          </div>
          <div className="flex-1 py-2 text-xs text-center rounded-lg text-foreground/80 border border-foreground/10">
            Add Money
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {[
          ["☕", "Cafe Mocha", "-₹149", "now"],
          ["🍕", "Domino's", "-₹420", "2h ago"],
          ["💰", "Pocket money", "+₹500", "Mon"],
        ].map(([emoji, name, amt, when], i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.15 }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-foreground/[0.03]"
          >
            <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center text-sm">{emoji}</div>
            <div className="flex-1">
              <div className="text-xs text-foreground font-medium">{name}</div>
              <div className="text-[10px] text-foreground/40">{when}</div>
            </div>
            <div
              className={`text-xs font-semibold ${(amt as string).startsWith("+") ? "text-success" : "text-foreground/80"}`}
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {amt}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
