import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, ArrowLeftRight, ShieldCheck,
  Wallet, Bell, Settings, LogOut, Activity, Search,
  ChevronLeft, ChevronRight, Crown,
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
    await supabase.auth.signOut();
    navigate("/");
  };

  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "A";
  const currentPage = navItems.find(i => i.path === location.pathname)?.label || "Dashboard";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} shrink-0 bg-secondary border-r border-border flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold gradient-primary bg-clip-text text-transparent">AuroPay</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary border-l-2 border-primary font-medium"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border">
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? "justify-center px-0" : ""}`}>
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-muted-foreground">Admin</p>
              </div>
            )}
            <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-secondary/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">{currentPage}</h2>
            <span className="text-[10px] text-muted-foreground">/ AuroPay Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                placeholder="Quick search..."
                className="h-8 w-48 rounded-lg bg-input border border-border pl-9 pr-3 text-xs focus:outline-none focus:border-border-active transition-colors"
              />
            </div>
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" title="System online" />
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
