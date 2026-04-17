import { useEffect, useRef, useState } from "react";

/**
 * Premium cursor: small gold dot + trailing ring.
 * Desktop + fine-pointer only. Disabled on touch / coarse pointers / reduced motion.
 * Expands the ring when hovering interactive elements.
 */
export default function PremiumCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx - 4}px, ${my - 4}px, 0)`;
      }
      const target = e.target as HTMLElement | null;
      const interactive = !!target?.closest(
        'a, button, [role="button"], input, textarea, select, [data-cursor="hover"]'
      );
      setHovering(interactive);
    };

    const tick = () => {
      // ease ring toward dot
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        const size = hovering ? 56 : 32;
        ringRef.current.style.transform = `translate3d(${rx - size / 2}px, ${ry - size / 2}px, 0)`;
        ringRef.current.style.width = `${size}px`;
        ringRef.current.style.height = `${size}px`;
        ringRef.current.style.opacity = hovering ? "1" : "0.7";
      }
      raf = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (dotRef.current) dotRef.current.style.opacity = "1";
      if (ringRef.current) ringRef.current.style.opacity = "0.7";
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(tick);

    // Hide native cursor for premium feel — but only on desktop
    document.documentElement.style.cursor = "none";
    const style = document.createElement("style");
    style.id = "premium-cursor-style";
    style.textContent = `* { cursor: none !important; }`;
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(raf);
      document.documentElement.style.cursor = "";
      document.getElementById("premium-cursor-style")?.remove();
    };
  }, [hovering]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="fixed top-0 left-0 z-[9999] pointer-events-none rounded-full"
        style={{
          width: 8,
          height: 8,
          background: "radial-gradient(circle, #f0cc6a 0%, #c8952e 70%, transparent 100%)",
          boxShadow: "0 0 12px rgba(224,176,72,0.9), 0 0 24px rgba(200,149,46,0.5)",
          transition: "opacity 0.2s ease",
          willChange: "transform",
          mixBlendMode: "screen",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="fixed top-0 left-0 z-[9998] pointer-events-none rounded-full"
        style={{
          border: "1px solid rgba(224,176,72,0.55)",
          background:
            "radial-gradient(circle, rgba(200,149,46,0.06) 0%, transparent 70%)",
          backdropFilter: "blur(2px)",
          transition: "width 0.25s cubic-bezier(0.16,1,0.3,1), height 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease",
          willChange: "transform, width, height",
        }}
      />
    </>
  );
}
