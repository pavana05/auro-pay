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
        el.style.opacity = "0";
        el.style.transform = "translateY(6px)";
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          requestAnimationFrame(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
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
        transition: "opacity 0.18s ease-out, transform 0.18s ease-out",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
