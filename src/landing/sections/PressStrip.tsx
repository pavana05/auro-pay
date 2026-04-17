import { motion } from "framer-motion";

const LOGOS = [
  "YourStory", "Inc42", "Economic Times", "TechCrunch India",
  "Mint", "Forbes India", "BloombergQuint", "ProductHunt",
];

export default function PressStrip() {
  return (
    <section className="relative py-14 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-7"
        >
          <span className="lux-eyebrow">As featured in</span>
        </motion.div>
        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
            style={{ background: "linear-gradient(90deg, #050507 10%, transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
            style={{ background: "linear-gradient(-90deg, #050507 10%, transparent)" }} />
          <motion.div
            className="flex gap-14 lg:gap-20 items-center"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
            style={{ width: "max-content" }}
          >
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <div
                key={i}
                className="text-lg lg:text-xl font-medium text-white/30 hover:text-amber-200 transition-colors duration-500 whitespace-nowrap shrink-0 tracking-tight"
                style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.015em" }}
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
