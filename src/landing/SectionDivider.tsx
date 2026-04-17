import { motion } from "framer-motion";

/**
 * Hairline gold divider for premium section separation.
 * Animates in on view; pure decoration.
 */
export default function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="lux-hairline origin-center"
      />
      {label && (
        <div className="flex items-center justify-center -mt-2.5">
          <span className="px-4 text-[10px] tracking-[0.32em] uppercase text-white/35 bg-[#050507]">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
