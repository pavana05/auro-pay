import { motion } from "framer-motion";

const LOGOS = [
  "YourStory", "Inc42", "Economic Times", "TechCrunch India",
  "Mint", "Forbes India", "BloombergQuint", "ProductHunt",
];

export default function PressStrip() {
  return (
    <section className="relative py-12 px-6 border-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-[10px] uppercase tracking-[0.3em] text-white/40 text-center mb-6 font-semibold"
        >
          As featured in
        </motion.div>
        <div className="relative overflow-hidden">
          {/* Edge fades */}
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: "linear-gradient(90deg, #050507, transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: "linear-gradient(-90deg, #050507, transparent)" }} />
          <motion.div
            className="flex gap-12 lg:gap-16 items-center"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
            style={{ width: "max-content" }}
          >
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <div
                key={i}
                className="text-xl lg:text-2xl font-bold text-white/35 hover:text-amber-200 transition-colors whitespace-nowrap shrink-0"
                style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}
              >
                {l}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
