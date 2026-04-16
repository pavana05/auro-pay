import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import {
  LayoutDashboard, Users, ArrowLeftRight, ShieldCheck,
  Wallet, Bell, Settings, LogOut, Activity, Search,
  ChevronLeft, ChevronRight, Crown, Gift, Lock, Eye, EyeOff,
  KeyRound, FileText, Sparkles, Calendar,
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
  { path: "/admin/support", icon: Bell, label: "Support Tickets" },
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === "true") setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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

  // Password gate screen — ultra premium
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Ambient floating orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${120 + i * 60}px`,
                height: `${120 + i * 60}px`,
                top: `${10 + i * 15}%`,
                left: `${15 + (i % 3) * 30}%`,
                background: `radial-gradient(circle, hsl(42 78% 55% / ${0.03 + i * 0.005}), transparent 70%)`,
                animation: `admin-orb-drift ${18 + i * 4}s ease-in-out infinite`,
                animationDelay: `${i * -3}s`,
              }}
            />
          ))}
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[120px]" />
        </div>

        <div className="w-full max-w-md mx-4 relative z-10" style={{ animation: "admin-slide-up 0.6s ease-out" }}>
          {/* Frosted glass card */}
          <div className="rounded-3xl border border-white/[0.06] bg-card/60 backdrop-blur-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative overflow-hidden">
            {/* Top shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
              background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.5), transparent)",
              backgroundSize: "200% 100%",
              animation: "admin-shimmer 3s linear infinite",
            }} />

            <div className="flex flex-col items-center mb-8">
              <div
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-5 relative"
                style={{ animation: "admin-glow-pulse 3s ease-in-out infinite" }}
              >
                <KeyRound className="w-9 h-9 text-primary drop-shadow-[0_0_12px_hsl(42_78%_55%/0.5)]" style={{ animation: "admin-lock-float 4s ease-in-out infinite" }} />
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary/40 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-primary/40 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-primary/40 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary/40 rounded-br-lg" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight gradient-text">Admin Access</h1>
              <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                Secure admin authentication
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                  placeholder="Enter admin password"
                  className="w-full h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] pl-11 pr-12 text-sm focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_4px_hsl(42_78%_55%/0.1),0_0_30px_hsl(42_78%_55%/0.08)] transition-all duration-300"
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
                <div className="flex items-center gap-2 text-destructive text-sm px-1" style={{ animation: "admin-slide-up 0.3s ease-out" }}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || !password}
                className="w-full h-13 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_40px_hsl(42_78%_55%/0.35)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {/* Button shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                {authLoading ? (
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Verifying...
                  </div>
                ) : (
                  <span className="relative z-10">Unlock Admin Panel</span>
                )}
              </button>
            </form>

            <p className="text-center text-[11px] text-muted-foreground/50 mt-6 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              Protected by AuroPay Security
            </p>
          </div>
        </div>
      </div>
    );
  }

  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "A";
  const currentPage = navItems.find(i => i.path === location.pathname)?.label || "Dashboard";
  const totalBadges = badges.kyc + badges.frozen + badges.notif;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Premium Sidebar */}
      <aside className={`${collapsed ? "w-[72px]" : "w-64"} shrink-0 bg-card/40 backdrop-blur-2xl border-r border-white/[0.04] flex flex-col transition-all duration-400 relative`}>
        {/* Animated gradient left edge */}
        <div className="absolute top-0 left-0 w-[2px] h-full" style={{
          background: "linear-gradient(180deg, transparent, hsl(42 78% 55% / 0.4) 30%, hsl(42 78% 55% / 0.6) 50%, hsl(42 78% 55% / 0.4) 70%, transparent)",
          animation: "admin-glow-pulse 4s ease-in-out infinite",
        }} />
        {/* Top shimmer */}
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
          background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.5), transparent)",
          backgroundSize: "200% 100%",
          animation: "admin-shimmer 4s linear infinite",
        }} />

        {/* Logo section */}
        <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
          {!collapsed && (
            <div style={{ animation: "admin-slide-up 0.4s ease-out" }}>
              <h1 className="text-lg font-bold gradient-text flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AuroPay
              </h1>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 tracking-[0.2em] uppercase">Admin Console</p>
            </div>
          )}
          {collapsed && <Sparkles className="w-5 h-5 text-primary mx-auto" />}
          <button
            onClick={() => { haptic.light(); setCollapsed(!collapsed); }}
            className="p-1.5 rounded-xl hover:bg-white/[0.04] transition-all duration-200 text-muted-foreground active:scale-90"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav items with stagger animation */}
        <nav className="flex-1 p-2 space-y-0.5 mt-1 overflow-y-auto scrollbar-none">
          {navItems.map((item, idx) => {
            const active = location.pathname === item.path;
            const badgeCount = (item as any).badgeKey ? badges[(item as any).badgeKey as keyof BadgeCounts] : 0;
            return (
              <button
                key={item.path}
                onClick={() => { haptic.light(); navigate(item.path); }}
                style={{ animationDelay: `${idx * 30}ms` }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group relative ${
                  active
                    ? "bg-primary/[0.08] text-primary font-medium"
                    : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {/* Active glow indicator */}
                {active && (
                  <>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary shadow-[0_0_12px_hsl(42_78%_55%/0.6),0_0_4px_hsl(42_78%_55%/0.8)]" />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/[0.06] to-transparent pointer-events-none" />
                  </>
                )}
                <div className="relative">
                  <item.icon className={`w-[18px] h-[18px] shrink-0 transition-all duration-300 ${active ? "drop-shadow-[0_0_8px_hsl(42_78%_55%/0.5)]" : "group-hover:scale-110"}`} />
                  {badgeCount > 0 && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center" style={{ animation: "admin-count-pop 0.4s ease-out" }}>
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && badgeCount > 0 && (
                  <span className="ml-auto shrink-0 min-w-[20px] h-5 rounded-full bg-destructive/90 text-[10px] font-bold text-destructive-foreground flex items-center justify-center px-1.5 shadow-[0_0_8px_hsl(0_72%_51%/0.3)]" style={{ animation: "admin-count-pop 0.4s ease-out" }}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/[0.04]">
          <div className={`flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] transition-all duration-300 hover:border-primary/10 ${collapsed ? "justify-center px-2" : ""}`}>
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-[0_4px_12px_hsl(42_78%_55%/0.3)]">
                {initials}
              </div>
              {/* Online ring */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card shadow-[0_0_6px_hsl(152_60%_45%/0.5)]" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-primary/80 flex items-center gap-1 font-medium">
                  <Crown className="w-3 h-3" /> Administrator
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
        {/* Premium Header */}
        <header className="h-16 border-b border-white/[0.04] bg-card/20 backdrop-blur-2xl flex items-center justify-between px-6 shrink-0 relative">
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
            background: "linear-gradient(90deg, transparent 10%, hsl(42 78% 55% / 0.1) 50%, transparent 90%)"
          }} />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{currentPage}</h2>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-[11px] text-muted-foreground/60">AuroPay Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
              <input
                placeholder="Quick search..."
                className="h-9 w-52 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-9 pr-3 text-xs focus:outline-none focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] focus:w-64 transition-all duration-300"
              />
            </div>

            {/* Date/Time */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground/60">
              <Calendar className="w-3.5 h-3.5" />
              <span>{currentTime.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span className="text-primary/50">|</span>
              <span className="tabular-nums font-medium text-muted-foreground/80">{currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>

            {/* Notification bell */}
            <button className="relative p-2 rounded-xl hover:bg-white/[0.04] transition-all duration-200">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {totalBadges > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive shadow-[0_0_6px_hsl(0_72%_51%/0.5)]" style={{ animation: "admin-glow-pulse 2s ease-in-out infinite" }} />
              )}
            </button>

            {/* Live badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/[0.08] border border-success/10 relative">
              <div className="absolute inset-0 rounded-full" style={{ animation: "admin-border-glow 3s ease-in-out infinite", borderWidth: "1px", borderStyle: "solid", borderColor: "hsl(152 60% 45% / 0.1)" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-success relative">
                <div className="absolute inset-0 rounded-full bg-success" style={{ animation: "admin-ripple 2s ease-out infinite" }} />
              </div>
              <span className="text-[10px] text-success font-semibold tracking-wider">LIVE</span>
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
