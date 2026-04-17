import { motion } from "framer-motion";

export default function AuroLogo({
  size = 32,
  glow = true,
}: {
  size?: number;
  glow?: boolean;
}) {
  return (
    <motion.div
      className="grid place-items-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #c8952e 0%, #e6b347 50%, #ffd97a 100%)",
        boxShadow: glow ? "0 0 24px rgba(200,149,46,0.45)" : "none",
      }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      <span
        className="font-extrabold leading-none text-[#1a1208]"
        style={{ fontSize: size * 0.55 }}
      >
        A
      </span>
    </motion.div>
  );
}
