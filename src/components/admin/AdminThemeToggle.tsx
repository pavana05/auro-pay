import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Admin-only dark/light toggle. Persists to localStorage. Adds `admin-light`
 * class to <html> which only affects pages inside AdminLayout (scoped via CSS).
 * The user-facing app remains dark-only.
 */
export const AdminThemeToggle = () => {
  const [light, setLight] = useState<boolean>(() => localStorage.getItem("admin_theme") === "light");

  useEffect(() => {
    const root = document.documentElement;
    if (light) root.classList.add("admin-light");
    else root.classList.remove("admin-light");
    localStorage.setItem("admin_theme", light ? "light" : "dark");
  }, [light]);

  return (
    <button
      onClick={() => setLight(l => !l)}
      title={light ? "Switch to dark" : "Switch to light"}
      className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all hover:bg-white/[0.05]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,149,46,0.12)", color: light ? "#f59e0b" : "#c8952e" }}
    >
      {light ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

export default AdminThemeToggle;
