import { motion } from "framer-motion";

export default function ParentScreen() {
  return (
    <div className="px-5 pt-8 space-y-3">
      <div className="text-xs text-white/60 uppercase tracking-wider">Your teen</div>
      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(200,149,46,0.18), transparent)", border: "1px solid rgba(200,149,46,0.25)" }}>
        <div className="text-sm text-white font-semibold">Aarav</div>
        <div className="text-[11px] text-white/50">Spent today: ₹240 / ₹500</div>
        <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: "48%" }} transition={{ duration: 1 }}
            className="h-full" style={{ background: "linear-gradient(90deg,#c8952e,#e0b048)" }} />
        </div>
      </div>
      {["🍔 Food limit", "🛍️ Shopping", "🚗 Transport"].map((l, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
          <span className="text-xs text-white">{l}</span>
          <div className="w-8 h-4 rounded-full" style={{ background: i === 1 ? "rgba(255,255,255,0.1)" : "#c8952e" }}>
            <div className="w-3.5 h-3.5 rounded-full bg-white mt-0.25" style={{ marginLeft: i === 1 ? 2 : 16 }} />
          </div>
        </div>
      ))}
      <button className="w-full py-2.5 rounded-xl text-xs font-semibold text-black"
        style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)" }}>Freeze card</button>
    </div>
  );
}
