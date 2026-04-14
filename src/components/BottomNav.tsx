import { Home, CreditCard, QrCode, Clock, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/card", icon: CreditCard, label: "Card", badge: "Soon" },
  { path: "/scan", icon: QrCode, label: "Send", center: true },
  { path: "/activity", icon: Clock, label: "Activity" },
  { path: "/profile", icon: UserCircle, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-secondary/80 backdrop-blur-xl border-t border-border">
      <div className="flex items-end justify-around px-4 pb-[env(safe-area-inset-bottom)] max-w-lg mx-auto">
        {tabs.map((tab) =>
          tab.center ? (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative -top-4 w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-[var(--glow-primary)] transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <tab.icon className="w-6 h-6 text-primary-foreground" />
            </button>
          ) : (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center py-3 px-3 transition-colors duration-200 relative ${
                location.pathname === tab.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <tab.icon className="w-5 h-5 mb-1" />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-3 px-1 py-px text-[7px] font-bold rounded-full bg-primary text-primary-foreground leading-none">
                    {tab.badge}
                  </span>
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
