import { useEffect, useRef } from "react";

/**
 * Subtle gold particle field with mouse-parallax.
 * Three depth layers drift at different speeds; mouse offset shifts each layer
 * inversely-proportional to its depth (closer particles move more).
 * Disabled on reduced-motion.
 */
export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    type P = {
      x: number; y: number; r: number;
      vx: number; vy: number;
      depth: number; // 0..1 (1 = closest)
      hueWhite: boolean;
      twinkle: number;
    };

    const COUNT = Math.min(90, Math.floor((w * h) / 18000));
    const particles: P[] = Array.from({ length: COUNT }).map(() => {
      const depth = Math.random();
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + depth * 1.8,
        vx: (Math.random() - 0.5) * 0.08 * (0.3 + depth),
        vy: -0.05 - Math.random() * 0.12 * (0.3 + depth),
        depth,
        hueWhite: Math.random() < 0.18,
        twinkle: Math.random() * Math.PI * 2,
      };
    });

    let mx = w / 2, my = h / 2;
    let tmx = mx, tmy = my;
    const onMouse = (e: MouseEvent) => { tmx = e.clientX; tmy = e.clientY; };
    window.addEventListener("mousemove", onMouse);

    let raf = 0;
    let visible = true;
    const onVis = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    const draw = () => {
      // ease mouse for smoothness
      mx += (tmx - mx) * 0.06;
      my += (tmy - my) * 0.06;
      const offX = (mx - w / 2) / w; // -0.5..0.5
      const offY = (my - h / 2) / h;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (const p of particles) {
        // drift
        p.x += p.vx;
        p.y += p.vy;
        p.twinkle += 0.02 + p.depth * 0.02;

        // wrap
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        // parallax displacement (closer particles move more — up to ~28px)
        const px = p.x - offX * (10 + p.depth * 28);
        const py = p.y - offY * (10 + p.depth * 28);

        const tw = 0.55 + 0.45 * Math.sin(p.twinkle);
        const alpha = (0.18 + p.depth * 0.45) * tw;

        // glow halo
        const grad = ctx.createRadialGradient(px, py, 0, px, py, p.r * 6);
        if (p.hueWhite) {
          grad.addColorStop(0, `rgba(255,247,227,${alpha})`);
          grad.addColorStop(1, "rgba(255,247,227,0)");
        } else {
          grad.addColorStop(0, `rgba(224,176,72,${alpha})`);
          grad.addColorStop(0.5, `rgba(200,149,46,${alpha * 0.5})`);
          grad.addColorStop(1, "rgba(200,149,46,0)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, p.r * 6, 0, Math.PI * 2);
        ctx.fill();

        // core dot
        ctx.fillStyle = p.hueWhite
          ? `rgba(255,247,227,${Math.min(1, alpha + 0.25)})`
          : `rgba(240,204,106,${Math.min(1, alpha + 0.2)})`;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      if (visible) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 -z-[4] pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
