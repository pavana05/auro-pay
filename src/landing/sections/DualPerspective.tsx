import { motion } from "framer-motion";
import { useState } from "react";
import { Check, ArrowUpRight } from "lucide-react";
import PhoneMockup from "../PhoneMockup";

export default function DualPerspective({ onCTA }: { onCTA: () => void }) {
  const [view, setView] = useState<"teen" | "parent">("teen");

  const Side = ({ kind }: { kind: "teen" | "parent" }) => {
    const data = kind === "teen"
      ? { eyebrow: "For Teens", title: "Freedom, finally.", points: ["Scan & pay anywhere", "Get pocket money instantly", "Save for goals", "Track your spending"], cta: "Get the App", screen: "home" as const, align: "lg:text-right" as const }
      : { eyebrow: "For Parents", title: "Peace of mind, finally.", points: ["See every transaction", "Set spending limits", "Schedule pocket money", "Freeze card instantly"], cta: "Take Control", screen: "parent" as const, align: "lg:text-left" as const };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`space-y-6 text-center ${data.align}`}
      >
        <div className="inline-block">
          <span className="lux-eyebrow">{data.eyebrow}</span>
        </div>
        <motion.h3
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl lg:text-5xl font-bold tracking-tight"
          style={{
            fontFamily: "Sora, sans-serif",
            letterSpacing: "-0.03em",
            lineHeight: 1.04,
            backgroundImage:
              "linear-gradient(180deg,#fff7e3 0%,#ffffff 30%,#e0b048 70%,#c8952e 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 40px rgba(200,149,46,0.25)",
          }}>
          {data.title}
        </motion.h3>
        <ul className={`space-y-2.5 text-white/65 inline-block text-left`}>
          {data.points.map((p) => (
            <li key={p} className="flex items-center gap-2.5">
              <span className="inline-flex w-5 h-5 rounded-full items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg,#c8952e,#e0b048)",
                  boxShadow: "0 0 12px rgba(200,149,46,0.4)",
                }}>
                <Check size={11} className="text-black" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <div className={kind === "teen" ? "lg:flex lg:justify-end" : ""}>
          <button onClick={onCTA}
            className="inline-flex items-center gap-1.5 pl-5 pr-2 h-12 rounded-full font-semibold text-black lux-shimmer"
            style={{
              background: "linear-gradient(135deg,#c8952e,#e0b048)",
              boxShadow: "0 8px 28px rgba(200,149,46,0.45), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}>
            <span className="text-[14px]">{data.cta}</span>
            <span className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.18)" }}>
              <ArrowUpRight size={14} strokeWidth={2.5} />
            </span>
          </button>
        </div>
        <div className="flex justify-center lg:hidden pt-4">
          <PhoneMockup screen={data.screen} scale={0.7} />
        </div>
      </motion.div>
    );
  };

  return (
    <section className="relative py-32 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Mobile toggle */}
        <div className="lg:hidden flex justify-center mb-10">
          <div className="inline-flex p-1 rounded-full lux-glass">
            {(["teen", "parent"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className="relative px-5 py-2 rounded-full text-sm font-medium transition"
                style={{ color: view === v ? "#0a0a0a" : "rgba(255,255,255,0.6)" }}>
                {view === v && (
                  <motion.span layoutId="dual-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "linear-gradient(135deg,#c8952e,#e0b048)",
                      boxShadow: "0 4px 14px rgba(200,149,46,0.45)",
                    }} />
                )}
                <span className="relative">For {v === "teen" ? "Teens" : "Parents"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] gap-16 items-center">
          <Side kind="teen" />
          <div className="flex flex-col items-center gap-5 relative">
            <div className="absolute inset-0 m-auto w-72 h-72 rounded-full blur-3xl opacity-50 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(200,149,46,0.4), transparent 70%)" }} />
            <div style={{ transform: "rotateY(-6deg) rotateX(2deg)", perspective: 1200 }}>
              <PhoneMockup screen="home" scale={0.7} />
            </div>
            <div className="text-[10px] text-white/30 uppercase tracking-[0.32em] font-semibold">vs</div>
            <div style={{ transform: "rotateY(6deg) rotateX(2deg)", perspective: 1200 }}>
              <PhoneMockup screen="parent" scale={0.7} />
            </div>
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
