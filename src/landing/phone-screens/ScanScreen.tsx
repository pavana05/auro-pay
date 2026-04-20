import { motion } from "framer-motion";

export default function ScanScreen() {
  return (
    <div className="px-5 pt-8 flex flex-col items-center">
      <div className="text-xs text-white/60 mb-3">Point at any QR</div>
      <div className="relative w-48 h-48 rounded-2xl overflow-hidden" style={{ background: "rgba(0,0,0,0.6)", border: "2px solid rgba(200,149,46,0.4)" }}>
        <div className="absolute inset-3 rounded-lg" style={{ border: "1px dashed rgba(200,149,46,0.5)" }} />
        <motion.div
          className="absolute left-3 right-3 h-0.5"
          style={{ background: "linear-gradient(90deg, transparent, #c8952e, transparent)", boxShadow: "0 0 12px #c8952e" }}
          animate={{ top: ["12px", "calc(100% - 12px)", "12px"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: "#c8952e" }} />
        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: "#c8952e" }} />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2" style={{ borderColor: "#c8952e" }} />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2" style={{ borderColor: "#c8952e" }} />
      </div>
      <div className="mt-6 text-center">
        <div className="text-[10px] text-white/50 uppercase tracking-wider">Pay anywhere</div>
        <div className="text-sm text-white mt-1">300M+ UPI merchants</div>
      </div>
    </div>
  );
}
