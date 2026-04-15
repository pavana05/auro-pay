import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitioning, setTransitioning] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      setTransitioning(true);
      // Quick fade out, then swap content & fade in
      const timeout = setTimeout(() => {
        setDisplayChildren(children);
        window.scrollTo(0, 0);
        setTransitioning(false);
        prevPath.current = location.pathname;
      }, 150);
      return () => clearTimeout(timeout);
    } else {
      setDisplayChildren(children);
    }
  }, [children, location.pathname]);

  return (
    <div
      style={{
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? "translateY(6px)" : "translateY(0)",
        transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
        willChange: "opacity, transform",
      }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
