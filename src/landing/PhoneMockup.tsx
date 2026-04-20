import { motion } from "framer-motion";
import { forwardRef } from "react";

/**
 * Pure CSS/SVG iPhone mockup. No images.
 * `screen` prop chooses what app screen renders inside the bezel.
 * forwardRef so framer-motion (and other consumers) can attach refs.
 */
type PhoneMockupProps = {
  screen?: "home" | "scan" | "kyc" | "parent" | "send" | "savings" | "analytics";
  scale?: number;
  className?: string;
};

const PhoneMockup = forwardRef<HTMLDivElement, PhoneMockupProps>(function PhoneMockup(
  { screen = "home", scale = 1, className = "" },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ width: 280 * scale, height: 580 * scale }}
    >
      {/* Outer bezel */}
      <div
        className="absolute inset-0 rounded-[44px] p-2"
        style={{
          background: "linear-gradient(145deg, #1a1a1f, #08080a)",
          boxShadow:
            "0 60px 120px rgba(200,149,46,0.25), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Screen */}
        <div
          className="w-full h-full rounded-[38px] overflow-hidden relative"
          style={{ background: "linear-gradient(180deg, #0a0c0f, #14161b)" }}
        >
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
          {/* Status bar */}
          <div className="flex justify-between items-center px-6 pt-3 pb-1 text-[10px] text-white/80 font-mono">
            <span>9:41</span>
            <span>●●●●● 5G ▮</span>
          </div>

          {screen === "home" && <HomeScreen />}
          {screen === "scan" && <ScanScreen />}
          {screen === "kyc" && <KycScreen />}
          {screen === "parent" && <ParentScreen />}
          {screen === "send" && <SendScreen />}
          {screen === "savings" && <SavingsScreen />}
          {screen === "analytics" && <AnalyticsScreen />}
        </div>
      </div>
    </div>
  );
}

function HomeScreen() {
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

function ScanScreen() {
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

function KycScreen() {
  return (
    <div className="px-5 pt-8 space-y-4">
      <div className="text-xs text-white/60 uppercase tracking-wider text-center">Verify with Aadhaar</div>
      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,149,46,0.25)" }}>
        <div className="text-[10px] text-white/50">Aadhaar number</div>
        <div className="text-base text-white mt-1 font-mono tracking-wider">XXXX XXXX 4321</div>
      </div>
      <div className="text-[10px] text-white/50 text-center">Enter the 6-digit OTP</div>
      <div className="flex gap-2 justify-center">
        {[1,2,3,4,5,6].map(n => (
          <motion.div key={n} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: n*0.1 }}
            className="w-9 h-11 rounded-lg flex items-center justify-center text-white font-mono"
            style={{ background: "rgba(200,149,46,0.1)", border: "1px solid rgba(200,149,46,0.3)" }}>
            {n <= 4 ? "•" : ""}
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: "spring" }}
        className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mt-4"
        style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
      >
        ✓
      </motion.div>
      <div className="text-center text-xs text-emerald-400">Verified instantly</div>
    </div>
  );
}

function ParentScreen() {
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

function SendScreen() {
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

function SavingsScreen() {
  return (
    <div className="px-5 pt-8 space-y-3">
      <div className="text-xs text-white/60 uppercase tracking-wider">Savings goals</div>
      {[["🎮 Gaming console", 65], ["✈️ Goa trip", 40], ["🎧 Headphones", 90]].map(([t, p], i) => (
        <div key={i} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,149,46,0.15)" }}>
          <div className="flex justify-between text-xs text-white mb-1.5">
            <span>{t}</span><span className="text-white/50">{p}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 1, delay: i*0.15 }}
              className="h-full" style={{ background: "linear-gradient(90deg,#c8952e,#e0b048)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsScreen() {
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
