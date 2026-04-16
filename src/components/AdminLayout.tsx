import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import {
  LayoutDashboard, Users, ArrowLeftRight, ShieldCheck,
  Wallet, Bell, Settings, LogOut, Activity, Search,
  ChevronLeft, ChevronRight, Crown, Gift, Lock, Eye, EyeOff,
  KeyRound, FileText, Sparkles, Calendar, Menu, X,
  Target, PiggyBank, TrendingUp, Globe, Server,
  AlertTriangle, CreditCard, RefreshCw, Headphones,
  BarChart3, UserPlus, Link2, Flag, DollarSign,
} from "lucide-react";
import { toast } from "sonner";

const ADMIN_PASSWORD = "180525Pt";

/* Gold theme tokens */
const G = {
  bg: "#0a0c0f",
  sidebar: "#0c0e13",
  card: "#0d0e12",
  primary: "#c8952e",
  secondary: "#d4a84b",
  glow: "#e8c060",
  border: "rgba(200,149,46,0.12)",
  borderHover: "rgba(200,149,46,0.3)",
  borderSubtle: "rgba(200,149,46,0.08)",
  accent10: "rgba(200,149,46,0.1)",
  accent04: "rgba(200,149,46,0.04)",
  accent15: "rgba(200,149,46,0.15)",
  danger: "#ef4444",
  success: "#22c55e",
};

interface NavSection {
  title: string;
  items: {
    path: string;
    icon: any;
    label: string;
    badgeKey?: "kyc" | "frozen" | "notif" | "flagged";
  }[];
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { path: "/admin/activity-log", icon: Activity, label: "Live Activity" },
    ],
  },
  {
    title: "User Management",
    items: [
      { path: "/admin/users", icon: Users, label: "All Users" },
      { path: "/admin/kyc", icon: ShieldCheck, label: "KYC Requests", badgeKey: "kyc" },
      { path: "/admin/parent-links", icon: Link2, label: "Parent-Teen Links" },
      { path: "/admin/flagged", icon: Flag, label: "Flagged Accounts", badgeKey: "flagged" },
    ],
  },
  {
    title: "Financial",
    items: [
      { path: "/admin/transactions", icon: ArrowLeftRight, label: "Transactions" },
      { path: "/admin/wallets", icon: Wallet, label: "Wallet Management", badgeKey: "frozen" },
      { path: "/admin/payouts", icon: DollarSign, label: "Payouts & Settlements" },
      { path: "/admin/refunds", icon: RefreshCw, label: "Refunds & Disputes" },
    ],
  },
  {
    title: "Operations",
    items: [
      { path: "/admin/notifications", icon: Bell, label: "Notifications", badgeKey: "notif" },
      { path: "/admin/spending-limits", icon: Target, label: "Spending Limits" },
      { path: "/admin/savings-oversight", icon: PiggyBank, label: "Savings Goals" },
      { path: "/admin/pocket-money", icon: Calendar, label: "Pocket Money" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { path: "/admin/analytics", icon: BarChart3, label: "Reports & Insights" },
      { path: "/admin/revenue", icon: TrendingUp, label: "Revenue Analytics" },
      { path: "/admin/rewards", icon: Gift, label: "Rewards" },
    ],
  },
  {
    title: "System",
    items: [
      { path: "/admin/settings", icon: Settings, label: "App Settings" },
      { path: "/admin/health", icon: Server, label: "API Health" },
      { path: "/admin/audit-log", icon: FileText, label: "Audit Logs" },
      { path: "/admin/roles", icon: Crown, label: "Admin Accounts" },
      { path: "/admin/support", icon: Headphones, label: "Support Tickets" },
    ],
  },
];

const allNavItems = navSections.flatMap((s) => s.items);

interface BadgeCounts {
  kyc: number;
  frozen: number;
  notif: number;
  flagged: number;
}

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [badges, setBadges] = useState<BadgeCounts>({ kyc: 0, frozen: 0, notif: 0, flagged: 0 });
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
        flagged: 0,
      });
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Session timeout - 2 hours
  useEffect(() => {
    if (!isAuthenticated) return;
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        sessionStorage.removeItem("admin_auth");
        setIsAuthenticated(false);
        toast.error("Session expired. Please re-authenticate.");
      }, 2 * 60 * 60 * 1000);
    };
    resetTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keypress", resetTimer);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keypress", resetTimer);
    };
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: G.bg }}>
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
                background: `radial-gradient(circle, rgba(200,149,46,${0.03 + i * 0.005}), transparent 70%)`,
                animation: `admin-orb-drift ${18 + i * 4}s ease-in-out infinite`,
                animationDelay: `${i * -3}s`,
              }}
            />
          ))}
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: "rgba(200,149,46,0.04)" }} />
        </div>

        <div className="w-full max-w-md mx-4 relative z-10" style={{ animation: "admin-slide-up 0.6s ease-out" }}>
          <div className="rounded-3xl border p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative overflow-hidden" style={{ borderColor: G.border, background: G.card }}>
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
              background: `linear-gradient(90deg, transparent, ${G.primary}, transparent)`,
              backgroundSize: "200% 100%",
              animation: "admin-shimmer 3s linear infinite",
            }} />

            <div className="flex flex-col items-center mb-8">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 relative"
                style={{ background: G.accent10, border: `1px solid rgba(200,149,46,0.2)`, animation: "admin-glow-pulse 3s ease-in-out infinite" }}
              >
                <KeyRound className="w-9 h-9 drop-shadow-[0_0_12px_rgba(200,149,46,0.5)]" style={{ color: G.primary, animation: "admin-lock-float 4s ease-in-out infinite" }} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#fff" }}>Admin Access</h1>
              <p className="text-sm mt-1.5 flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: G.secondary }} />
                Secure admin authentication
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                  placeholder="Enter admin password"
                  className="w-full h-14 rounded-2xl pl-11 pr-12 text-sm focus:outline-none transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${G.border}`, color: "#fff" }}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && (
                <div className="flex items-center gap-2 text-sm px-1" style={{ color: G.danger, animation: "admin-slide-up 0.3s ease-out" }}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || !password}
                className="w-full h-13 rounded-2xl font-semibold text-sm transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden text-white"
                style={{ background: `linear-gradient(135deg, ${G.primary}, ${G.secondary})` }}
              >
                {authLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </div>
                ) : (
                  <span>Unlock Admin Panel</span>
                )}
              </button>
            </form>

            <p className="text-center text-[11px] mt-6 flex items-center justify-center gap-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
              <ShieldCheck className="w-3 h-3" />
              Protected by AuroPay Security
            </p>
          </div>
        </div>
      </div>
    );
  }

  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "A";
  const currentPage = allNavItems.find(i => i.path === location.pathname)?.label || "Dashboard";
  const totalBadges = badges.kyc + badges.frozen + badges.notif + badges.flagged;

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const showLabel = isMobile || !collapsed;
    return (
      <>
        {/* Logo */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${G.borderSubtle}` }}>
          {showLabel && (
            <div style={{ animation: "admin-slide-up 0.4s ease-out" }}>
              <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: "#fff" }}>
                <Sparkles className="w-4 h-4" style={{ color: G.primary }} />
                AuroPay
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>Admin Console</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: G.accent15, color: G.secondary }}>PRO</span>
              </div>
            </div>
          )}
          {collapsed && !isMobile && <Sparkles className="w-5 h-5 mx-auto" style={{ color: G.primary }} />}
          {isMobile ? (
            <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-xl transition-all duration-200 active:scale-90" style={{ color: "rgba(255,255,255,0.3)" }}>
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => { haptic.light(); setCollapsed(!collapsed); }}
              className="p-1.5 rounded-xl transition-all duration-200 active:scale-90 hidden lg:block"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 mt-1 overflow-y-auto scrollbar-none">
          {navSections.map((section) => (
            <div key={section.title} className="mb-2">
              {showLabel && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] px-3 py-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                return (
                  <button
                    key={item.path}
                    onClick={() => { haptic.light(); navigate(item.path); if (isMobile) setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative ${!showLabel ? "justify-center px-0" : ""}`}
                    style={{
                      background: active ? G.accent10 : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,0.45)",
                      fontWeight: active ? 500 : 400,
                    }}
                    title={!showLabel ? item.label : undefined}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full" style={{ background: G.primary, boxShadow: `0 0 12px rgba(200,149,46,0.6)` }} />
                    )}
                    <div className="relative">
                      <item.icon className="w-[18px] h-[18px] shrink-0 transition-all duration-200" style={{ color: active ? G.secondary : "rgba(255,255,255,0.35)" }} />
                      {badgeCount > 0 && !showLabel && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: G.danger }}>
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </span>
                      )}
                      {item.label === "Live Activity" && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: G.danger, animation: "admin-glow-pulse 2s ease-in-out infinite" }} />
                      )}
                    </div>
                    {showLabel && <span className="truncate">{item.label}</span>}
                    {showLabel && badgeCount > 0 && (
                      <span className="ml-auto shrink-0 min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1.5 text-white" style={{ background: "rgba(239,68,68,0.9)", boxShadow: "0 0 8px rgba(239,68,68,0.3)" }}>
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3" style={{ borderTop: `1px solid ${G.borderSubtle}` }}>
          <div className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 ${!showLabel ? "justify-center px-2" : ""}`} style={{ background: G.accent04, border: `1px solid ${G.borderSubtle}` }}>
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${G.primary}, ${G.secondary})`, boxShadow: `0 4px 12px rgba(200,149,46,0.3)` }}>
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: G.success, border: `2px solid ${G.sidebar}`, boxShadow: `0 0 6px rgba(34,197,94,0.5)` }} />
            </div>
            {showLabel && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#fff" }}>{profile?.full_name}</p>
                <p className="text-[10px] flex items-center gap-1 font-medium" style={{ color: G.secondary }}>
                  <Crown className="w-3 h-3" /> Super Admin
                </p>
              </div>
            )}
            <button onClick={handleLogout} className="transition-all duration-200 active:scale-90" style={{ color: "rgba(255,255,255,0.3)" }} title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-screen" style={{ background: G.bg }}>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", animation: "fade-in 0.2s ease-out" }}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[260px] flex flex-col z-50 lg:hidden transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: "rgba(12,14,19,0.75)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          borderRight: `1px solid rgba(200,149,46,0.1)`,
          boxShadow: "inset 0 0 80px rgba(200,149,46,0.03), 4px 0 40px rgba(0,0,0,0.5)",
        }}
      >
        <SidebarContent isMobile />
      </aside>

      {/* Desktop Sidebar — Glassmorphism */}
      <aside
        className={`${collapsed ? "w-[72px]" : "w-[260px]"} shrink-0 flex-col transition-all duration-400 relative hidden lg:flex overflow-hidden`}
        style={{
          background: "rgba(12,14,19,0.6)",
          backdropFilter: "blur(28px) saturate(1.5)",
          WebkitBackdropFilter: "blur(28px) saturate(1.5)",
          borderRight: `1px solid rgba(200,149,46,0.1)`,
          boxShadow: "inset 0 1px 0 rgba(200,149,46,0.08), inset 0 0 120px rgba(200,149,46,0.02)",
        }}
      >
        {/* Gold edge glow */}
        <div className="absolute top-0 left-0 w-[2px] h-full z-10" style={{
          background: `linear-gradient(180deg, transparent 5%, rgba(200,149,46,0.5) 30%, rgba(232,192,96,0.7) 50%, rgba(200,149,46,0.5) 70%, transparent 95%)`,
          animation: "admin-glow-pulse 4s ease-in-out infinite",
          filter: "blur(0.5px)",
        }} />

        {/* Floating gold reflection orbs */}
        <div className="absolute top-[15%] right-[-20px] w-40 h-40 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(200,149,46,0.06) 0%, transparent 70%)",
          animation: "admin-orb-drift 20s ease-in-out infinite",
        }} />
        <div className="absolute bottom-[20%] left-[-30px] w-48 h-48 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(232,192,96,0.04) 0%, transparent 70%)",
          animation: "admin-orb-drift 25s ease-in-out infinite reverse",
        }} />

        {/* Top highlight reflection */}
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{
          background: "linear-gradient(180deg, rgba(200,149,46,0.05) 0%, transparent 100%)",
        }} />

        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-3 sm:px-4 lg:px-8 shrink-0 sticky top-0 z-30" style={{ background: "rgba(10,12,15,0.8)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${G.borderSubtle}` }}>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => { haptic.light(); setMobileOpen(true); }}
              className="p-2 rounded-xl transition-all duration-200 lg:hidden"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold truncate max-w-[120px] sm:max-w-none" style={{ color: "#fff" }}>{currentPage}</h2>
              <span className="hidden sm:inline" style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
              <span className="text-[11px] hidden sm:inline" style={{ color: "rgba(255,255,255,0.3)" }}>AuroPay Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Global search */}
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.25)" }} />
              <input
                placeholder="Search users, transactions..."
                className="h-9 w-32 sm:w-48 lg:w-64 rounded-[10px] pl-9 pr-3 text-xs focus:outline-none transition-all duration-300"
                style={{ background: G.accent04, border: `1px solid ${G.border}`, color: "#fff" }}
              />
            </div>

            {/* Date/Time (IST) */}
            <div className="hidden xl:flex items-center gap-2 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{currentTime.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span style={{ color: "rgba(200,149,46,0.5)" }}>|</span>
              <span className="tabular-nums font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.6)" }}>
                {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" })}
              </span>
            </div>

            {/* Notification bell */}
            <button className="relative p-2 rounded-xl transition-all duration-200" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Bell className="w-4 h-4" />
              {totalBadges > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: G.danger, boxShadow: "0 0 6px rgba(239,68,68,0.5)", animation: "admin-glow-pulse 2s ease-in-out infinite" }} />
              )}
            </button>

            {/* Live badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.1)" }}>
              <div className="w-1.5 h-1.5 rounded-full relative" style={{ background: G.success }}>
                <div className="absolute inset-0 rounded-full" style={{ background: G.success, animation: "admin-ripple 2s ease-out infinite" }} />
              </div>
              <span className="text-[10px] font-semibold tracking-wider" style={{ color: G.success }}>LIVE</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto" style={{ background: G.bg }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;