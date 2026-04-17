import { motion } from "framer-motion";
import { useState } from "react";
import PhoneMockup from "../PhoneMockup";

export default function DualPerspective({ onCTA }: { onCTA: () => void }) {
  const [view, setView] = useState<"teen" | "parent">("teen");

  const Side = ({ kind }: { kind: "teen" | "parent" }) => {
    const data = kind === "teen"
      ? { title: "For teens who want freedom.", points: ["Scan & pay anywhere", "Get pocket money instantly", "Save for goals", "Track your spending"], cta: "Get the App", screen: "home" as const }
      : { title: "For parents who want peace of mind.", points: ["See every transaction", "Set spending limits", "Schedule pocket money", "Freeze card instantly"], cta: "Take Control", screen: "parent" as const };
    return (
      <div className="space-y-6 text-center lg:text-left">
        <h3 className="text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}>
          {data.title}
        </h3>
        <ul className="space-y-2 text-white/70">
          {data.points.map((p) => (
            <li key={p} className="flex items-center gap-2 justify-center lg:justify-start">
              <span style={{ color: "#c8952e" }}>✦</span> {p}
            </li>
          ))}
        </ul>
        <button onClick={onCTA}
          className="px-6 py-3 rounded-full font-semibold text-black"
          style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)", boxShadow: "0 8px 24px rgba(200,149,46,0.4)" }}>
          {data.cta}
        </button>
        <div className="flex justify-center lg:hidden pt-4">
          <PhoneMockup screen={data.screen} scale={0.7} />
        </div>
      </div>
    );
  };

  return (
    <section className="relative py-32 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Mobile toggle */}
        <div className="lg:hidden flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-full border" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(200,149,46,0.2)" }}>
            {(["teen", "parent"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className="px-5 py-2 rounded-full text-sm font-medium transition"
                style={view === v
                  ? { background: "linear-gradient(135deg,#c8952e,#e0b048)", color: "#0a0a0a" }
                  : { color: "rgba(255,255,255,0.6)" }}>
                For {v === "teen" ? "Teens" : "Parents"}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] gap-12 items-center">
          <Side kind="teen" />
          <div className="flex flex-col items-center gap-4">
            <PhoneMockup screen="home" scale={0.7} />
            <div className="text-xs text-white/30 uppercase tracking-wider">vs</div>
            <PhoneMockup screen="parent" scale={0.7} />
          </div>
          <Side kind="parent" />
        </div>

        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="lg:hidden"
        >
          <Side kind={view} />
        </motion.div>
      </div>
    </section>
  );
}
