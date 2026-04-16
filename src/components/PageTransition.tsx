import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      const el = containerRef.current;
      if (el) {
        // Instant hide
        el.style.transition = "none";
        el.style.opacity = "0";
        el.style.transform = "translateY(12px) scale(0.98)";
        el.style.filter = "blur(2px)";

        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          requestAnimationFrame(() => {
            // Smooth spring-like entrance
            el.style.transition =
              "opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease-out";
            el.style.opacity = "1";
            el.style.transform = "translateY(0) scale(1)";
            el.style.filter = "blur(0px)";
          });
        });
      } else {
        window.scrollTo(0, 0);
      }
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <div
      ref={containerRef}
      style={{
        willChange: "opacity, transform, filter",
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
