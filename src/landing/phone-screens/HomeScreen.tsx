import { motion } from "framer-motion";

export default function HomeScreen() {
  return (
    <div className="px-5 pt-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] text-white/50 uppercase tracking-wider">Hello, Aarav</div>
          <div className="text-base font-semibold text-white">Welcome back 👋</div>
        </div>
        <div className="w-9 h-9 rounded-full" style={{ background: "linear-gradient(135deg,#c8952e,#8a6520)" }} />
      </div>

      <div
        className="rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, rgba(200,149,46,0.18), rgba(200,149,46,0.04))",
          border: "1px solid rgba(200,149,46,0.3)",
        }}
      >
        <div className="text-[10px] text-white/60 uppercase tracking-wider">Wallet balance</div>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-white mt-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          ₹3,250.<span className="text-base text-white/60">00</span>
        </motion.div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 py-2 text-xs text-center rounded-lg text-black font-semibold"
            style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)" }}>Scan & Pay</div>
          <div className="flex-1 py-2 text-xs text-center rounded-lg text-white/80 border border-white/10">Add Money</div>
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
            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">{emoji}</div>
            <div className="flex-1">
              <div className="text-xs text-white font-medium">{name}</div>
              <div className="text-[10px] text-white/40">{when}</div>
            </div>
            <div className={`text-xs font-semibold ${(amt as string).startsWith("+") ? "text-emerald-400" : "text-white/80"}`}
              style={{ fontFamily: "JetBrains Mono, monospace" }}>{amt}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
