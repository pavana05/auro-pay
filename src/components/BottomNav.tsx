import { Home, CreditCard, QrCode, Clock, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/card", icon: CreditCard, label: "Card" },
  { path: "/scan", icon: QrCode, label: "Pay", center: true },
  { path: "/activity", icon: Clock, label: "Activity" },
  { path: "/profile", icon: UserCircle, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-secondary/90 backdrop-blur-xl border-t border-border">
      <div className="flex items-end justify-around px-4 pb-[env(safe-area-inset-bottom)] max-w-lg mx-auto">
        {tabs.map((tab) =>
          tab.center ? (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative -top-4 w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-[var(--glow-primary)] transition-all duration-300 hover:scale-105 active:scale-90 animate-glow-pulse"
            >
              <tab.icon className="w-6 h-6 text-primary-foreground" />
            </button>
          ) : (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center py-3 px-3 transition-all duration-300 relative ${
                location.pathname === tab.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <tab.icon className={`w-5 h-5 mb-1 transition-transform duration-300 ${location.pathname === tab.path ? "scale-110" : ""}`} />
                {location.pathname === tab.path && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
