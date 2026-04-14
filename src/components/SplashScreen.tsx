import { useEffect, useState } from "react";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background noise-overlay">
      <div className="relative">
        {/* Pulsing rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border border-primary/30 animate-pulse-ring" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border border-primary/20 animate-pulse-ring [animation-delay:0.5s]" />
        </div>
        {/* Logo */}
        <h1 className="relative text-4xl font-bold gradient-text z-10">
          AuroPay
        </h1>
      </div>
      <p className="mt-4 text-sm text-muted-foreground tracking-wide">
        Money freedom for teens
      </p>
    </div>
  );
};

export default SplashScreen;
