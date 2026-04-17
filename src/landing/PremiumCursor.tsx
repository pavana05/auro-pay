import { useEffect, useRef, useState } from "react";

/**
 * Premium cursor: small gold dot + trailing ring.
 * Desktop + fine-pointer only. Disabled on touch / coarse pointers / reduced motion.
 *
 * Ring grows on interactive elements. To avoid the "ring flying in" look,
 * we instantly snap the ring's eased position to the cursor at the exact
 * moment hover-state flips, then let the easing resume.
 */
export default function PremiumCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

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

    // Track hover via ref so handlers always see latest value without re-binding
    let hovering = false;
    // Animated size with easing (decoupled from CSS transition to avoid offset glitches)
    let curSize = 32;
    const SIZE_IDLE = 32;
    const SIZE_HOVER = 56;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx - 4}px, ${my - 4}px, 0)`;
      }
      const target = e.target as HTMLElement | null;
      const isInteractive = !!target?.closest(
        'a, button, [role="button"], input, textarea, select, [data-cursor="hover"]'
      );
      if (isInteractive !== hovering) {
        hovering = isInteractive;
        // Snap ring to cursor so the size morph happens centered on the pointer,
        // not from wherever the trailing ring happened to be.
        rx = mx;
        ry = my;
        if (ringRef.current) {
          ringRef.current.style.opacity = isInteractive ? "1" : "0.7";
        }
      }
    };

    const tick = () => {
      // Ease ring position toward cursor (faster when hovering for tighter feel)
      const ease = hovering ? 0.32 : 0.18;
      rx += (mx - rx) * ease;
      ry += (my - ry) * ease;

      // Ease size toward target — animated in JS so it stays centered on cursor
      const targetSize = hovering ? SIZE_HOVER : SIZE_IDLE;
      curSize += (targetSize - curSize) * 0.22;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx - curSize / 2}px, ${ry - curSize / 2}px, 0)`;
        ringRef.current.style.width = `${curSize}px`;
        ringRef.current.style.height = `${curSize}px`;
      }
      raf = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (dotRef.current) dotRef.current.style.opacity = "1";
      if (ringRef.current) ringRef.current.style.opacity = hovering ? "1" : "0.7";
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(tick);

    // Hide native cursor for premium feel — desktop only
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
  }, []);

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
          // NOTE: no width/height transition — size is animated in JS so the ring stays centered on the cursor.
          transition: "opacity 0.2s ease",
          willChange: "transform, width, height",
        }}
      />
    </>
  );
}
