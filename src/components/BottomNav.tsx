import { useState, useRef } from "react";
import { Home, Clock, QrCode, MessageCircle, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

const tabs = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/activity", icon: Clock, label: "History" },
  { path: "/scan", icon: QrCode, label: "Pay", center: true },
  { path: "/chats", icon: MessageCircle, label: "Chats" },
  { path: "/profile", icon: UserCircle, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pressedTab, setPressedTab] = useState<string | null>(null);

  const handleTap = (path: string, isCenter: boolean) => {
    setPressedTab(path);
    isCenter ? haptic.medium() : haptic.light();
    navigate(path);
    setTimeout(() => setPressedTab(null), 400);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-secondary/95 backdrop-blur-2xl border-t border-border rounded-t-2xl" />
      
      {/* Top gold accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.4), transparent)" }} />

      <div className="relative flex items-end justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const isPressed = pressedTab === tab.path;

          if (tab.center) {
            return (
              <button
                key={tab.path}
                onClick={() => handleTap(tab.path, true)}
                className="relative -top-5 group"
              >
                {/* Outer glow ring */}
                <div className="absolute inset-[-6px] rounded-full opacity-0 group-active:opacity-100 transition-opacity duration-300"
                  style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.2), transparent)" }}
                />
                {/* Main button */}
                <div className={`w-[56px] h-[56px] rounded-full gradient-primary flex items-center justify-center shadow-[0_4px_24px_hsl(42_78%_55%/0.35)] transition-all duration-300 active:scale-90 ${isPressed ? "animate-icon-press" : ""}`}>
                  <tab.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                {/* Label */}
                <span className="text-[9px] font-semibold text-primary block text-center mt-1">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => handleTap(tab.path, false)}
              className="flex flex-col items-center py-3 px-4 transition-all duration-300 relative group"
            >
              <div className={`relative transition-all duration-300 ${isPressed ? "animate-icon-bounce" : ""}`}>
                <tab.icon
                  className={`w-[22px] h-[22px] transition-all duration-300 ${
                    isActive ? "text-primary drop-shadow-[0_0_8px_hsl(42_78%_55%/0.4)]" : "text-muted-foreground group-active:text-foreground"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </div>

              <span className={`text-[10px] mt-1 transition-all duration-300 ${
                isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground"
              }`}>
                {tab.label}
              </span>

              {/* Active indicator dot with animation */}
              {isActive && (
                <div className="absolute -bottom-0 left-1/2 -translate-x-1/2">
                  <div className="h-[3px] rounded-full bg-primary animate-nav-indicator" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
