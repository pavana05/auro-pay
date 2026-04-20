import { motion } from "framer-motion";

export default function ParentScreen() {
  return (
    <div className="px-5 pt-8 space-y-3">
      <div className="text-xs text-foreground/60 uppercase tracking-wider">Your teen</div>
      <div
        className="rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.18), transparent)",
          border: "1px solid hsl(var(--primary) / 0.25)",
        }}
      >
        <div className="text-sm text-foreground font-semibold">Aarav</div>
        <div className="text-[11px] text-foreground/50">Spent today: ₹240 / ₹500</div>
        <div className="h-1.5 rounded-full bg-foreground/10 mt-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "48%" }}
            transition={{ duration: 1 }}
            className="h-full"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-bright)))" }}
          />
        </div>
      </div>
      {["🍔 Food limit", "🛍️ Shopping", "🚗 Transport"].map((l, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-foreground/[0.03]">
          <span className="text-xs text-foreground">{l}</span>
          <div
            className="w-8 h-4 rounded-full"
            style={{ background: i === 1 ? "hsl(var(--foreground) / 0.1)" : "hsl(var(--primary))" }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full bg-foreground mt-0.25"
              style={{ marginLeft: i === 1 ? 2 : 16 }}
            />
          </div>
        </div>
      ))}
      <button
        className="w-full py-2.5 rounded-xl text-xs font-semibold text-primary-foreground"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-bright)))" }}
      >
        Freeze card
      </button>
    </div>
  );
}
