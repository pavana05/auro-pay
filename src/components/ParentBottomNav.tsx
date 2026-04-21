// Parent-side bottom nav. Mirrors BottomNav styling so the visual language
// stays consistent across personas, but exposes parent-relevant tabs only.
import { useState } from "react";
import { Home, ClipboardCheck, Users, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

type Tab = { path: string; icon: typeof Home; label: string; matches?: string[] };

const tabs: Tab[] = [
  { path: "/parent", icon: Home, label: "Home", matches: ["/parent/add-money"] },
  { path: "/parent/approvals", icon: ClipboardCheck, label: "Approvals" },
  // Teens lists all linked teens; tapping a teen goes to /parent/teen/:id which
  // we keep highlighted as Teens for orientation.
  { path: "/linked-teens", icon: Users, label: "Teens", matches: ["/parent/teen"] },
  { path: "/profile", icon: UserCircle, label: "Profile", matches: ["/personal-info", "/security", "/parent-controls", "/help", "/about"] },
];

const isMatch = (current: string, tab: Tab) => {
  if (current === tab.path) return true;
  if (tab.matches?.some((p) => current.startsWith(p))) return true;
  return false;
};

const ParentBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pressedTab, setPressedTab] = useState<string | null>(null);

  const handleTap = (path: string) => {
    setPressedTab(path);
    haptic.light();
    navigate(path);
    setTimeout(() => setPressedTab(null), 400);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40">
      <div className="absolute inset-0 bg-secondary/95 backdrop-blur-2xl border-t border-border rounded-t-2xl" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[1px]"
        style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.4), transparent)" }} />

      <div className="relative flex items-end justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {tabs.map((tab) => {
          const active = isMatch(location.pathname, tab);
          const pressed = pressedTab === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => handleTap(tab.path)}
              className="flex flex-col items-center py-3 px-3 transition-all duration-300 relative group"
            >
              <div className={`relative transition-all duration-300 ${pressed ? "animate-icon-bounce" : ""}`}>
                <tab.icon
                  className={`w-[22px] h-[22px] transition-all duration-300 ${
                    active ? "text-primary drop-shadow-[0_0_8px_hsl(42_78%_55%/0.4)]" : "text-muted-foreground group-active:text-foreground"
                  }`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
              </div>
              <span className={`text-[10px] mt-1 transition-all duration-300 ${
                active ? "font-semibold text-primary" : "font-medium text-muted-foreground"
              }`}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute -bottom-0 left-1/2 -translate-x-1/2">
                  <div className="h-[3px] w-6 rounded-full bg-primary animate-nav-indicator" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ParentBottomNav;
