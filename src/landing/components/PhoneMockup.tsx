import { motion } from "framer-motion";
import { CreditCard, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface PhoneMockupProps {
  variant?: "home" | "scan" | "send" | "kyc" | "parent" | "savings" | "analytics";
  className?: string;
  scale?: number;
}

/**
 * Detailed iPhone-15-Pro–style mockup rendered entirely in CSS/SVG.
 * The `variant` switches the screen content shown inside the bezel.
 */
export default function PhoneMockup({
  variant = "home",
  className = "",
  scale = 1,
}: PhoneMockupProps) {
  return (
    <div
      className={"relative " + className}
      style={{
        width: 280 * scale,
        height: 580 * scale,
        filter: "drop-shadow(0 60px 100px hsl(42 78% 30% / 0.4))",
      }}
    >
      {/* Outer titanium frame */}
      <div
        className="absolute inset-0 rounded-[44px] p-[3px]"
        style={{
          background:
            "linear-gradient(135deg, #2a2620 0%, #1a1814 35%, #3a3428 65%, #1a1814 100%)",
          boxShadow:
            "inset 0 0 0 0.5px hsl(42 50% 40% / 0.4), 0 30px 60px hsl(220 30% 0% / 0.6)",
        }}
      >
        {/* Bezel */}
        <div
          className="relative h-full w-full overflow-hidden rounded-[42px]"
          style={{
            background: "linear-gradient(180deg, #050608 0%, #0e0c08 100%)",
          }}
        >
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-2 z-20 h-[26px] w-[88px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/5" />

          {/* Status bar */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 pt-[14px] text-[10px] font-semibold text-white/90">
            <span className="font-mono">9:41</span>
            <div className="flex items-center gap-1">
              <span>•••</span>
              <span>📶</span>
              <span>🔋</span>
            </div>
          </div>

          {/* Screen content */}
          <div className="relative h-full w-full pt-12">
            <ScreenContent variant={variant} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenContent({ variant }: { variant: PhoneMockupProps["variant"] }) {
  switch (variant) {
    case "scan":
      return <ScanScreen />;
    case "send":
      return <SendScreen />;
    case "kyc":
      return <KycScreen />;
    case "parent":
      return <ParentScreen />;
    case "savings":
      return <SavingsScreen />;
    case "analytics":
      return <AnalyticsScreen />;
    case "home":
    default:
      return <HomeScreen />;
  }
}

const goldGradient = "linear-gradient(135deg, #c8952e 0%, #e6b347 50%, #ffd97a 100%)";

function HomeScreen() {
  return (
    <div className="flex h-full flex-col px-4 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Hi, Aarav</p>
          <p className="text-sm font-semibold text-white">Welcome back 👋</p>
        </div>
        <div
          className="h-9 w-9 rounded-full"
          style={{ background: goldGradient }}
        />
      </div>

      <div
        className="mt-4 rounded-2xl p-4"
        style={{ background: goldGradient, color: "#1a1208" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
          Wallet balance
        </p>
        <motion.p
          className="mt-1 font-mono text-2xl font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          ₹ 4,820.50
        </motion.p>
        <div className="mt-3 flex gap-2">
          <button className="flex-1 rounded-lg bg-black/20 py-2 text-[11px] font-semibold text-black backdrop-blur">
            Add money
          </button>
          <button className="flex-1 rounded-lg bg-white/30 py-2 text-[11px] font-semibold text-black backdrop-blur">
            Pay
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {["Scan", "Send", "Save", "Cards"].map((t) => (
          <div key={t} className="flex flex-col items-center gap-1">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <span className="text-[14px]">
                {t === "Scan" ? "📷" : t === "Send" ? "💸" : t === "Save" ? "🐷" : "💳"}
              </span>
            </div>
            <span className="text-[9px] text-white/60">{t}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-widest text-white/50">
        Recent activity
      </p>
      <div className="mt-2 space-y-2">
        {[
          { icon: <ArrowUpRight className="h-3 w-3" />, name: "Ramu Canteen", amount: "-₹149", t: "Just now" },
          { icon: <ArrowDownLeft className="h-3 w-3" />, name: "From Dad", amount: "+₹500", t: "2h" },
          { icon: <ArrowUpRight className="h-3 w-3" />, name: "Cafe Coffee", amount: "-₹220", t: "Yesterday" },
        ].map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.15 }}
            className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/5"
          >
            <div className="flex items-center gap-2">
              <div
                className="grid h-7 w-7 place-items-center rounded-full text-white"
                style={{ background: row.amount.startsWith("+") ? "#16a34a40" : "#c8952e30" }}
              >
                {row.icon}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-white">{row.name}</p>
                <p className="text-[9px] text-white/50">{row.t}</p>
              </div>
            </div>
            <span
              className={
                "font-mono text-[12px] font-semibold " +
                (row.amount.startsWith("+") ? "text-emerald-400" : "text-white")
              }
            >
              {row.amount}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ScanScreen() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-4 pb-10">
      <p className="text-[10px] uppercase tracking-widest text-white/50">Scan & Pay</p>
      <p className="mt-1 text-sm font-semibold text-white">Point at any UPI QR</p>
      <div className="relative mt-5 h-44 w-44 overflow-hidden rounded-2xl ring-1 ring-[#c8952e]/40">
        <div className="absolute inset-0 grid grid-cols-7 grid-rows-7 gap-[2px] bg-black p-2">
          {Array.from({ length: 49 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[2px]"
              style={{
                background:
                  Math.random() > 0.45 ? "#c8952e" : "transparent",
              }}
            />
          ))}
        </div>
        <motion.div
          className="absolute left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, #ffd97a, transparent)",
            boxShadow: "0 0 16px #ffd97a",
          }}
          initial={{ top: 0 }}
          animate={{ top: "100%" }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
        {/* Corner brackets */}
        {["top-2 left-2 border-l-2 border-t-2", "top-2 right-2 border-r-2 border-t-2", "bottom-2 left-2 border-l-2 border-b-2", "bottom-2 right-2 border-r-2 border-b-2"].map((c) => (
          <div key={c} className={"absolute h-5 w-5 border-[#c8952e] " + c} />
        ))}
      </div>
      <p className="mt-4 text-[10px] text-white/60">Aligning QR code…</p>
    </div>
  );
}

function SendScreen() {
  return (
    <div className="flex h-full flex-col px-4 pb-10">
      <p className="text-[10px] uppercase tracking-widest text-white/50">Send money</p>
      <p className="mt-1 text-sm font-semibold text-white">Confirm payment</p>
      <div
        className="mt-4 rounded-2xl p-4"
        style={{ background: goldGradient, color: "#1a1208" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Sending to</p>
        <p className="mt-1 text-sm font-bold">Priya Sharma</p>
        <p className="text-[10px] opacity-70">priya@upi · Hubli</p>
        <p className="mt-3 font-mono text-3xl font-bold">₹ 350</p>
      </div>
      <div className="mt-4 space-y-2">
        {["For", "From", "PIN"].map((label, i) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/5 text-[11px]"
          >
            <span className="text-white/50">{label}</span>
            <span className="text-white font-medium">
              {i === 0 ? "Lunch split 🍕" : i === 1 ? "Wallet · ₹4,820" : "••••"}
            </span>
          </div>
        ))}
      </div>
      <button
        className="mt-auto rounded-2xl py-3 text-sm font-semibold text-black"
        style={{ background: goldGradient }}
      >
        Pay ₹350
      </button>
      <p className="mt-1 text-center text-[9px] text-white/40">Avg transfer · 2.3s</p>
    </div>
  );
}

function KycScreen() {
  return (
    <div className="flex h-full flex-col px-4 pb-10">
      <p className="text-[10px] uppercase tracking-widest text-white/50">Verify identity</p>
      <p className="mt-1 text-sm font-semibold text-white">Just your Aadhaar</p>
      <div className="mt-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <CreditCard className="h-5 w-5 text-[#c8952e]" />
          <span className="rounded-full bg-emerald-500/15 px-2 py-[2px] text-[9px] font-semibold text-emerald-400">
            VERIFIED
          </span>
        </div>
        <p className="mt-3 font-mono text-sm tracking-widest text-white">XXXX XXXX 4821</p>
        <p className="mt-1 text-[10px] text-white/50">Aarav Mehta · DOB 12/04/2008</p>
      </div>
      <p className="mt-5 text-[10px] uppercase tracking-widest text-white/50">Enter OTP</p>
      <div className="mt-2 flex gap-2">
        {[4, 8, 2, 1, 9, 0].map((d, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="grid h-10 w-9 place-items-center rounded-lg bg-white/[0.06] font-mono text-base font-bold text-white ring-1 ring-[#c8952e]/30"
          >
            {d}
          </motion.div>
        ))}
      </div>
      <button
        className="mt-auto rounded-2xl py-3 text-sm font-semibold text-black"
        style={{ background: goldGradient }}
      >
        Verify with UIDAI
      </button>
    </div>
  );
}

function ParentScreen() {
  return (
    <div className="flex h-full flex-col px-4 pb-10">
      <p className="text-[10px] uppercase tracking-widest text-white/50">Parent dashboard</p>
      <p className="mt-1 text-sm font-semibold text-white">Aarav · Teen</p>
      <div
        className="mt-3 rounded-2xl p-3 text-black"
        style={{ background: goldGradient }}
      >
        <p className="text-[10px] uppercase tracking-widest opacity-70">Spent today</p>
        <p className="font-mono text-lg font-bold">₹ 449 / ₹ 1,000</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/20">
          <div className="h-full w-[44%] bg-black/40" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {[
          { label: "Daily limit", val: "₹1,000", on: true },
          { label: "Online payments", val: "Allowed", on: true },
          { label: "ATM withdraw", val: "Off", on: false },
        ].map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/5"
          >
            <span className="text-[11px] text-white/70">{r.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-white">{r.val}</span>
              <div
                className={
                  "h-4 w-7 rounded-full p-[2px] " +
                  (r.on ? "bg-emerald-500" : "bg-white/15")
                }
              >
                <div
                  className={
                    "h-3 w-3 rounded-full bg-white transition-transform " +
                    (r.on ? "translate-x-3" : "translate-x-0")
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        className="mt-auto rounded-2xl bg-rose-500/90 py-2.5 text-sm font-semibold text-white"
      >
        Freeze card now
      </button>
    </div>
  );
}

function SavingsScreen() {
  const goals = [
    { name: "AirPods Pro", progress: 72, color: "#c8952e", target: "₹26,900" },
    { name: "Goa trip", progress: 38, color: "#e6b347", target: "₹15,000" },
    { name: "PS5 fund", progress: 22, color: "#a87a24", target: "₹54,990" },
  ];
  return (
    <div className="flex h-full flex-col px-4 pb-10">
      <p className="text-[10px] uppercase tracking-widest text-white/50">Savings goals</p>
      <p className="mt-1 text-sm font-semibold text-white">3 active goals</p>
      <div className="mt-4 space-y-3">
        {goals.map((g) => (
          <div
            key={g.name}
            className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/5"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-white">{g.name}</p>
              <p className="font-mono text-[10px] text-white/60">{g.target}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: g.color }}
                initial={{ width: 0 }}
                animate={{ width: `${g.progress}%` }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1 text-right text-[9px] text-white/50">{g.progress}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsScreen() {
  const cats = [
    { c: "Food", v: 38, color: "#c8952e" },
    { c: "Transport", v: 22, color: "#e6b347" },
    { c: "Shopping", v: 18, color: "#ffd97a" },
    { c: "Other", v: 22, color: "#a87a24" },
  ];
  return (
    <div className="flex h-full flex-col px-4 pb-10">
      <p className="text-[10px] uppercase tracking-widest text-white/50">This week</p>
      <p className="mt-1 text-sm font-semibold text-white">You spent ₹1,840</p>
      <div className="mt-4 flex h-32 items-end gap-1.5">
        {[40, 65, 30, 80, 55, 95, 70].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
            className="flex-1 rounded-t-md"
            style={{ background: goldGradient }}
          />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {cats.map((c) => (
          <div key={c.c} className="flex items-center gap-2 text-[11px]">
            <div className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            <span className="flex-1 text-white/80">{c.c}</span>
            <span className="font-mono text-white/60">{c.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
