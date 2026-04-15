import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import {
  LayoutDashboard, Users, ArrowLeftRight, ShieldCheck,
  Wallet, Bell, Settings, LogOut, Activity, Search,
  ChevronLeft, ChevronRight, Crown, Gift, Lock, Eye, EyeOff,
  KeyRound, FileText,
} from "lucide-react";
import { toast } from "sonner";

const ADMIN_PASSWORD = "180525Pt";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/users", icon: Users, label: "Users" },
  { path: "/admin/roles", icon: Crown, label: "Roles" },
  { path: "/admin/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { path: "/admin/kyc", icon: ShieldCheck, label: "KYC Requests", badgeKey: "kyc" as const },
  { path: "/admin/wallets", icon: Wallet, label: "Wallets", badgeKey: "frozen" as const },
  { path: "/admin/notifications", icon: Bell, label: "Notifications", badgeKey: "notif" as const },
  { path: "/admin/activity-log", icon: Activity, label: "Activity Log" },
  { path: "/admin/audit-log", icon: FileText, label: "Audit Log" },
  { path: "/admin/rewards", icon: Gift, label: "Rewards" },
  { path: "/admin/analytics", icon: Activity, label: "Analytics" },
  { path: "/admin/settings", icon: Settings, label: "Settings" },
];

interface BadgeCounts {
  kyc: number;
  frozen: number;
  notif: number;
}

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [badges, setBadges] = useState<BadgeCounts>({ kyc: 0, frozen: 0, notif: 0 });

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === "true") setIsAuthenticated(true);
  }, []);

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

  // Fetch badge counts
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchBadges = async () => {
      const [kycRes, walletRes, notifRes] = await Promise.all([
        supabase.from("kyc_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("wallets").select("id", { count: "exact", head: true }).eq("is_frozen", true),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      setBadges({
        kyc: kycRes.count || 0,
        frozen: walletRes.count || 0,
        notif: notifRes.count || 0,
      });
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth", "true");
        toast.success("Admin access granted");
        haptic.success();
      } else {
        setAuthError("Incorrect password. Access denied.");
        haptic.error();
      }
      setAuthLoading(false);
    }, 800);
  };

  const handleLogout = async () => {
    haptic.heavy();
    sessionStorage.removeItem("admin_auth");
    await supabase.auth.signOut();
    navigate("/");
  };

  // Password gate screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />
        </div>

        <div className="w-full max-w-md mx-4 relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 shadow-[0_0_40px_hsl(42_78%_55%/0.15)]">
              <KeyRound className="w-9 h-9 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Access</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Enter your admin password to continue</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                placeholder="Enter admin password"
                className="w-full h-13 rounded-xl bg-card border border-border pl-11 pr-12 text-sm focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_4px_hsl(42_78%_55%/0.1)] transition-all duration-300"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-destructive text-sm px-1 animate-fade-in">
                <ShieldCheck className="w-4 h-4" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !password}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_30px_hsl(42_78%_55%/0.3)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                "Unlock Admin Panel"
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            Protected by AuroPay Security
          </p>
        </div>
      </div>
    );
  }

  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "A";
  const currentPage = navItems.find(i => i.path === location.pathname)?.label || "Dashboard";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-[68px]" : "w-60"} shrink-0 bg-card/50 backdrop-blur-xl border-r border-white/[0.04] flex flex-col transition-all duration-300 relative`}>
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.4), transparent)" }} />

        <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
          {!collapsed && (
            <div className="animate-fade-in-up">
              <h1 className="text-lg font-bold gradient-text">AuroPay</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">Admin Console</p>
            </div>
          )}
          <button
            onClick={() => { haptic.light(); setCollapsed(!collapsed); }}
            className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-all duration-200 text-muted-foreground active:scale-90"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 mt-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const badgeCount = (item as any).badgeKey ? badges[(item as any).badgeKey as keyof BadgeCounts] : 0;
            return (
              <button
                key={item.path}
                onClick={() => { haptic.light(); navigate(item.path); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative ${
                  active
                    ? "bg-primary/10 text-primary font-medium shadow-[inset_0_0_20px_hsl(42_78%_55%/0.05)]"
                    : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative">
                  <item.icon className={`w-[18px] h-[18px] shrink-0 transition-all duration-200 group-active:scale-75 ${active ? "drop-shadow-[0_0_6px_hsl(42_78%_55%/0.4)]" : ""}`} />
                  {active && (
                    <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary shadow-[0_0_8px_hsl(42_78%_55%/0.5)]" />
                  )}
                  {badgeCount > 0 && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center animate-pulse">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && badgeCount > 0 && (
                  <span className="ml-auto shrink-0 min-w-[20px] h-5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center px-1.5 animate-pulse">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-white/[0.04]">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${collapsed ? "justify-center px-0" : ""}`}>
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0 shadow-[0_2px_10px_hsl(42_78%_55%/0.25)]">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-primary" /> Admin
                </p>
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
        <header className="h-14 border-b border-white/[0.04] bg-card/30 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">{currentPage}</h2>
            <span className="text-[10px] text-muted-foreground">/ AuroPay Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                placeholder="Quick search..."
                className="h-8 w-48 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-9 pr-3 text-xs focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.1)] transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/10">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-success font-medium">Live</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
