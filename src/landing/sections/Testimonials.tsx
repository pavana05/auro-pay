import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { Star, Quote } from "lucide-react";
import PremiumHeading from "../PremiumHeading";

const ITEMS = [
  { q: "My son uses AuroPay for canteen every day. I get alerts for every rupee. Perfect.", n: "Rekha S.", r: "Parent · Mysuru" },
  { q: "Finally I can pay at the canteen without asking Amma for cash every day!", n: "Arjun K.", r: "Teen · Hubli" },
  { q: "Setup took 2 minutes. The Aadhaar-only process is so easy even my dad could do it.", n: "Priya M.", r: "Parent · Davangere" },
  { q: "The savings goals feature kept me focused. Bought my headphones in 3 weeks!", n: "Rahul V.", r: "Teen · Bengaluru" },
  { q: "Real-time spending alerts changed how we talk about money at home.", n: "Anand P.", r: "Parent · Pune" },
  { q: "Splitting bills with friends is genuinely instant. Game changer.", n: "Sana T.", r: "Teen · Mumbai" },
];

const CARD_WIDTH = 340; // px
const GAP = 20; // px (gap-5)
const STEP = CARD_WIDTH + GAP;
const SPEED = STEP / 9; // px per second — completes one card every 9s (~55s for 6 cards)

export default function Testimonials() {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [paused, setPaused] = useState(false);

  // Loop length = one full set of original ITEMS
  const loopWidth = ITEMS.length * STEP;

  // Auto-scroll: advance x continuously, wrap when crossing -loopWidth
  useAnimationFrame((_t, delta) => {
    if (reduceMotion || isDragging || paused) return;
    const next = x.get() - (SPEED * delta) / 1000;
    // wrap into [-loopWidth, 0]
    const wrapped = next <= -loopWidth ? next + loopWidth : next;
    x.set(wrapped);
  });

  // Keep drag in seamless range by wrapping after drag ends
  const handleDragEnd = () => {
    setIsDragging(false);
    let v = x.get();
    while (v <= -loopWidth) v += loopWidth;
    while (v > 0) v -= loopWidth;
    x.set(v);
  };

  // Snap-to-card on swipe button press (also accessible)
  const nudge = (dir: 1 | -1) => {
    const v = x.get() - dir * STEP;
    let wrapped = v;
    while (wrapped <= -loopWidth) wrapped += loopWidth;
    while (wrapped > 0) wrapped -= loopWidth;
    x.set(wrapped);
  };

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-5"
        >
          <span className="lux-eyebrow">Loved by Families</span>
        </motion.div>
        <PremiumHeading
          className="text-center mb-5"
          underlineAlign="center"
          lines={[
            { text: <span className="tabular-nums">12,847 families</span>, accent: "gold" },
            { text: "already trust AuroPay." },
          ]}
        />
        <div className="flex items-center justify-center gap-2 text-white/55 mb-16">
          {[1,2,3,4,5].map(i => <Star key={i} size={15} fill="#e0b048" stroke="#e0b048" />)}
          <span className="ml-2 text-sm">4.9 / 5.0 from 2,847 reviews</span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, #050507 10%, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(-90deg, #050507 10%, transparent)" }} />

        <motion.div
          ref={trackRef}
          className="flex gap-5 cursor-grab active:cursor-grabbing select-none touch-pan-y"
          style={{ x, width: "max-content", willChange: "transform" }}
          drag="x"
          dragConstraints={{ left: -Infinity, right: Infinity }}
          dragElastic={0.05}
          dragMomentum={true}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          role="region"
          aria-label="Customer testimonials, swipe to browse"
          aria-roledescription="carousel"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") { e.preventDefault(); nudge(1); }
            if (e.key === "ArrowLeft")  { e.preventDefault(); nudge(-1); }
          }}
        >
          {/* Render 3 copies so drag in either direction always has content visible during wrap */}
          {[...ITEMS, ...ITEMS, ...ITEMS].map((t, i) => (
            <div key={i}
              className="w-[340px] shrink-0 rounded-3xl p-7 lux-glass relative">
              <Quote size={28} className="absolute top-5 right-5 opacity-30" style={{ color: "#c8952e" }} />
              <div className="flex gap-0.5 mb-4">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} fill="#e0b048" stroke="#e0b048" />)}
              </div>
              <p className="text-[15px] text-white/85 leading-relaxed mb-6" style={{ lineHeight: 1.6 }}>"{t.q}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full"
                  style={{
                    background: `linear-gradient(135deg,#c8952e,#8a6520)`,
                    boxShadow: "inset 0 1px 0 rgba(255,247,227,0.35), 0 4px 12px rgba(200,149,46,0.3)",
                  }} />
                <div>
                  <div className="text-sm text-white font-medium">{t.n}</div>
                  <div className="text-[11px] text-white/45">{t.r}</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Hint for mobile users that this is swipeable */}
        <div className="mt-6 text-center text-[11px] uppercase tracking-[0.22em] text-white/35">
          {reduceMotion ? "Swipe or use ← → keys" : "Swipe • drag • or hover to pause"}
        </div>
      </div>
    </section>
  );
}
