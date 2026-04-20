import { forwardRef } from "react";
import HomeScreen from "./phone-screens/HomeScreen";
import ScanScreen from "./phone-screens/ScanScreen";
import KycScreen from "./phone-screens/KycScreen";
import ParentScreen from "./phone-screens/ParentScreen";
import SendScreen from "./phone-screens/SendScreen";
import SavingsScreen from "./phone-screens/SavingsScreen";
import AnalyticsScreen from "./phone-screens/AnalyticsScreen";

/**
 * Pure CSS/SVG iPhone mockup. No images.
 * `screen` prop chooses what app screen renders inside the bezel.
 * forwardRef so framer-motion (and other consumers) can attach refs.
 */
type PhoneMockupProps = {
  screen?: "home" | "scan" | "kyc" | "parent" | "send" | "savings" | "analytics";
  scale?: number;
  className?: string;
};

const PhoneMockup = forwardRef<HTMLDivElement, PhoneMockupProps>(function PhoneMockup(
  { screen = "home", scale = 1, className = "" },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ width: 280 * scale, height: 580 * scale }}
    >
      {/* Outer bezel */}
      <div
        className="absolute inset-0 rounded-[44px] p-2"
        style={{
          background:
            "linear-gradient(145deg, hsl(220 12% 11%), hsl(var(--background)))",
          boxShadow:
            "0 60px 120px hsl(var(--primary) / 0.25), 0 0 0 1px hsl(var(--foreground) / 0.06), inset 0 1px 0 hsl(var(--foreground) / 0.08)",
        }}
      >
        {/* Screen */}
        <div
          className="w-full h-full rounded-[38px] overflow-hidden relative"
          style={{ background: "linear-gradient(180deg, hsl(var(--background)), hsl(var(--card)))" }}
        >
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full z-10" style={{ background: "hsl(var(--background))" }} />
          {/* Status bar */}
          <div className="flex justify-between items-center px-6 pt-3 pb-1 text-[10px] text-foreground/80 font-mono">
            <span>9:41</span>
            <span>●●●●● 5G ▮</span>
          </div>

          {screen === "home" && <HomeScreen />}
          {screen === "scan" && <ScanScreen />}
          {screen === "kyc" && <KycScreen />}
          {screen === "parent" && <ParentScreen />}
          {screen === "send" && <SendScreen />}
          {screen === "savings" && <SavingsScreen />}
          {screen === "analytics" && <AnalyticsScreen />}
        </div>
      </div>
    </div>
  );
});

export default PhoneMockup;
