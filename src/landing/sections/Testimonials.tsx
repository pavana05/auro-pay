import { motion } from "framer-motion";
import { Star } from "lucide-react";

const ITEMS = [
  { q: "My son uses AuroPay for canteen every day. I get alerts for every rupee. Perfect.", n: "Rekha S.", r: "Parent · Mysuru" },
  { q: "Finally I can pay at the canteen without asking Amma for cash every day!", n: "Arjun K.", r: "Teen · Hubli" },
  { q: "Setup took 2 minutes. The Aadhaar-only process is so easy even my dad could do it.", n: "Priya M.", r: "Parent · Davangere" },
  { q: "The savings goals feature kept me focused. Bought my headphones in 3 weeks!", n: "Rahul V.", r: "Teen · Bengaluru" },
  { q: "Real-time spending alerts changed how we talk about money at home.", n: "Anand P.", r: "Parent · Pune" },
  { q: "Splitting bills with friends is genuinely instant. Game changer.", n: "Sana T.", r: "Teen · Mumbai" },
];

export default function Testimonials() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl sm:text-5xl font-bold text-white text-center mb-4"
          style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}>
          12,847 families already trust AuroPay.
        </h2>
        <div className="flex items-center justify-center gap-2 text-white/60 mb-12">
          {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="#c8952e" stroke="#c8952e" />)}
          <span className="ml-2 text-sm">4.9 / 5.0 from 2,847 reviews</span>
        </div>
      </div>

      <div className="relative">
        <motion.div
          className="flex gap-5"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          style={{ width: "max-content" }}
        >
          {[...ITEMS, ...ITEMS].map((t, i) => (
            <div key={i}
              className="w-[340px] shrink-0 rounded-3xl p-6 backdrop-blur-md"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} fill="#c8952e" stroke="#c8952e" />)}
              </div>
              <p className="text-sm text-white/85 leading-relaxed mb-5">"{t.q}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full"
                  style={{ background: `linear-gradient(135deg,#c8952e,#8a6520)` }} />
                <div>
                  <div className="text-sm text-white font-medium">{t.n}</div>
                  <div className="text-[11px] text-white/50">{t.r}</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
