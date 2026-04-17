import { useEffect, useRef, useState, ImgHTMLAttributes } from "react";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading"> {
  src: string;
  alt: string;
  /** Optional tiny placeholder URL — rendered blurred until full image loads. */
  placeholder?: string;
  className?: string;
}

/**
 * Lazy-loaded image with blur-up. Uses IntersectionObserver to defer the
 * network request and crossfades from a blurred placeholder to the full image.
 */
export const LazyImage = ({ src, alt, placeholder, className = "", ...rest }: Props) => {
  const ref = useRef<HTMLImageElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ref.current || inView) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) { setInView(true); obs.disconnect(); }
      },
      { rootMargin: "200px" }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [inView]);

  return (
    <span className={`relative inline-block overflow-hidden ${className}`} style={{ background: "rgba(255,255,255,0.03)" }}>
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ filter: "blur(12px)", transform: "scale(1.1)", opacity: loaded ? 0 : 1 }}
        />
      )}
      <img
        ref={ref}
        src={inView ? src : undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0 }}
        {...rest}
      />
    </span>
  );
};

export default LazyImage;
