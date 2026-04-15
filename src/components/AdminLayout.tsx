import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import {
  LayoutDashboard, Users, ArrowLeftRight, ShieldCheck,
  Wallet, Bell, Settings, LogOut, Activity, Search,
  ChevronLeft, ChevronRight, Crown, Gift,
} from "lucide-react";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/users", icon: Users, label: "Users" },
  { path: "/admin/roles", icon: Crown, label: "Roles" },
  { path: "/admin/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { path: "/admin/kyc", icon: ShieldCheck, label: "KYC Requests" },
  { path: "/admin/wallets", icon: Wallet, label: "Wallets" },
  { path: "/admin/notifications", icon: Bell, label: "Notifications" },
  { path: "/admin/activity-log", icon: Activity, label: "Activity Log" },
  { path: "/admin/rewards", icon: Gift, label: "Rewards" },
  { path: "/admin/settings", icon: Settings, label: "Settings" },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!roleData) { navigate("/home"); return; }

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    haptic.heavy();
    await supabase.auth.signOut();
    navigate("/");
  };

  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "A";
  const currentPage = navItems.find(i => i.path === location.pathname)?.label || "Dashboard";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-[68px]" : "w-60"} shrink-0 bg-secondary/80 backdrop-blur-xl border-r border-border flex flex-col transition-all duration-300 relative`}>
        {/* Subtle gold accent at top */}
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.3), transparent)" }} />

        <div className="p-4 border-b border-border flex items-center justify-between">
          {!collapsed && (
            <div className="animate-fade-in-up">
              <h1 className="text-lg font-bold gradient-text">AuroPay</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => { haptic.light(); setCollapsed(!collapsed); }}
            className="p-1.5 rounded-lg hover:bg-muted transition-all duration-200 text-muted-foreground active:scale-90"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 mt-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { haptic.light(); navigate(item.path); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative">
                  <item.icon className={`w-[18px] h-[18px] shrink-0 transition-all duration-200 group-active:scale-75 ${active ? "drop-shadow-[0_0_6px_hsl(42_78%_55%/0.3)]" : ""}`} />
                  {active && (
                    <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                  )}
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${collapsed ? "justify-center px-0" : ""}`}>
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0 shadow-[0_2px_10px_hsl(42_78%_55%/0.2)]">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-muted-foreground">Admin</p>
              </div>
            )}
            <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-all duration-200 active:scale-90" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-secondary/40 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">{currentPage}</h2>
            <span className="text-[10px] text-muted-foreground">/ AuroPay Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                placeholder="Quick search..."
                className="h-8 w-48 rounded-xl bg-input border border-border pl-9 pr-3 text-xs focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.1)] transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-success font-medium">Online</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto noise-overlay">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
