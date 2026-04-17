import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import {
  LayoutDashboard, Users, ArrowLeftRight, ShieldCheck,
  Wallet, Bell, Settings, LogOut, Activity, Search,
  ChevronLeft, ChevronRight, Crown, Gift, Lock, Eye, EyeOff,
  KeyRound, FileText, Sparkles, Calendar, Menu, X,
  Target, PiggyBank, TrendingUp, Server,
  CreditCard, RefreshCw, Headphones,
  BarChart3, Link2, Flag, DollarSign, ChevronDown, User, Command, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { toast } from "sonner";
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";
import { AdminContextPanelProvider, AdminContextPanelSurface } from "@/components/admin/AdminContextPanel";
import AdminThemeToggle from "@/components/admin/AdminThemeToggle";
import AdminShortcutsHelp from "@/components/admin/AdminShortcutsHelp";
import SessionTimeoutModal from "@/components/admin/SessionTimeoutModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ADMIN_NOTIFICATION_TYPES } from "@/lib/admin-notifications";

const ADMIN_PASSWORD = "180525Pt";

const G = {
  bg: "#0a0c0f",
  sidebar: "#0c0e13",
  card: "#0d0e12",
  primary: "#c8952e",
  secondary: "#d4a84b",
  glow: "#e8c060",
  border: "rgba(200,149,46,0.12)",
  borderSubtle: "rgba(200,149,46,0.08)",
  accent10: "rgba(200,149,46,0.1)",
  accent04: "rgba(200,149,46,0.04)",
  accent15: "rgba(200,149,46,0.15)",
  danger: "#ef4444",
  success: "#22c55e",
  warning: "#f59e0b",
};

interface NavItem {
  path: string; icon: any; label: string;
  badgeKey?: "kyc" | "frozen" | "notif" | "flagged" | "tickets";
}
interface NavSection { title: string; items: NavItem[]; }

const navSections: NavSection[] = [
  { title: "Overview", items: [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/activity-log", icon: Activity, label: "Live Activity" },
  ]},
  { title: "User Management", items: [
    { path: "/admin/users", icon: Users, label: "All Users" },
    { path: "/admin/kyc", icon: ShieldCheck, label: "KYC Requests", badgeKey: "kyc" },
    { path: "/admin/parent-links", icon: Link2, label: "Parent-Teen Links" },
    { path: "/admin/flagged", icon: Flag, label: "Flagged Accounts", badgeKey: "flagged" },
  ]},
  { title: "Financial", items: [
    { path: "/admin/transactions", icon: ArrowLeftRight, label: "Transactions" },
    { path: "/admin/wallets", icon: Wallet, label: "Wallets", badgeKey: "frozen" },
    { path: "/admin/payouts", icon: DollarSign, label: "Payouts" },
    { path: "/admin/refunds", icon: RefreshCw, label: "Refunds" },
  ]},
  { title: "Operations", items: [
    { path: "/admin/notifications", icon: Bell, label: "Notifications", badgeKey: "notif" },
    { path: "/admin/spending-limits", icon: Target, label: "Spending Limits" },
    { path: "/admin/savings-oversight", icon: PiggyBank, label: "Savings Goals" },
    { path: "/admin/pocket-money", icon: Calendar, label: "Pocket Money" },
  ]},
  { title: "Analytics", items: [
    { path: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/admin/reports", icon: FileText, label: "Reports" },
    { path: "/admin/revenue", icon: TrendingUp, label: "Revenue" },
    { path: "/admin/geographic", icon: BarChart3, label: "Geographic" },
    { path: "/admin/rewards", icon: Gift, label: "Rewards" },
  ]},
  { title: "System", items: [
    { path: "/admin/settings", icon: Settings, label: "App Settings" },
    { path: "/admin/health", icon: Server, label: "API Health" },
    { path: "/admin/audit-log", icon: FileText, label: "Audit Logs" },
    { path: "/admin/roles", icon: Crown, label: "Admin Accounts" },
    { path: "/admin/support", icon: Headphones, label: "Support", badgeKey: "tickets" },
  ]},
];

const allNavItems = navSections.flatMap((s) => s.items);

interface BadgeCounts { kyc: number; frozen: number; notif: number; flagged: number; tickets: number; }
type ApiHealth = "green" | "amber" | "red";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [badges, setBadges] = useState<BadgeCounts>({ kyc: 0, frozen: 0, notif: 0, flagged: 0, tickets: 0 });
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [apiHealth, setApiHealth] = useState<ApiHealth>("green");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  /* Auth bootstrap */
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === "true") setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!roleData) { navigate("/home"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    })();
  }, [navigate]);

  /* Badges + recent notifications + simple API health probe */
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchAll = async () => {
      const t0 = performance.now();
      const [kycRes, walletRes, notifRes, ticketsRes, recentRes] = await Promise.all([
        supabase.from("kyc_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("wallets").select("id", { count: "exact", head: true }).eq("is_frozen", true),
        // Only count admin-relevant unread notifications in the bell badge.
        supabase.from("notifications").select("id", { count: "exact", head: true })
          .eq("is_read", false)
          .in("type", ADMIN_NOTIFICATION_TYPES as unknown as string[]),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        // Bell dropdown list — same filter so admins never see user-only noise.
        supabase.from("notifications").select("id, title, body, type, created_at, is_read")
          .in("type", ADMIN_NOTIFICATION_TYPES as unknown as string[])
          .order("created_at", { ascending: false }).limit(6),
      ]);
      const elapsed = performance.now() - t0;
      const anyErr = !!(kycRes.error || walletRes.error || notifRes.error || ticketsRes.error || recentRes.error);
      setApiHealth(anyErr ? "red" : elapsed > 1500 ? "amber" : "green");
      setBadges({
        kyc: kycRes.count || 0,
        frozen: walletRes.count || 0,
        notif: notifRes.count || 0,
        flagged: 0,
        tickets: ticketsRes.count || 0,
      });
      setRecentNotifs(recentRes.data || []);
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => { setMobileOpen(false); setBellOpen(false); setProfileOpen(false); }, [location.pathname]);

  /* ⌘K / Ctrl+K opens command palette globally */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      } else if (e.key === "Escape") {
        setBellOpen(false); setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Click-away for popovers */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /* Session timeout handled by SessionTimeoutModal (2h with 5-min warning) */
  const handleSessionExpire = () => {
    sessionStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
    toast.error("Session expired. Please re-authenticate.");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError("");
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth", "true");
        toast.success("Admin access granted"); haptic.success();
      } else { setAuthError("Incorrect password. Access denied."); haptic.error(); }
      setAuthLoading(false);
    }, 600);
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
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: "rgba(200,149,46,0.05)" }} />
        </div>
        <div className="w-full max-w-md mx-4 relative z-10" style={{ animation: "admin-slide-up 0.6s ease-out" }}>
          <div className="rounded-3xl border p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative overflow-hidden" style={{ borderColor: G.border, background: G.card }}>
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: G.accent10, border: `1px solid rgba(200,149,46,0.2)` }}>
                <KeyRound className="w-9 h-9 drop-shadow-[0_0_12px_rgba(200,149,46,0.5)]" style={{ color: G.primary }} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Admin Access</h1>
              <p className="text-sm mt-1.5 flex items-center gap-1.5 text-white/55">
                <Sparkles className="w-3.5 h-3.5" style={{ color: G.secondary }} />
                Secure admin authentication
              </p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                  placeholder="Enter admin password"
                  className="w-full h-14 rounded-2xl pl-11 pr-12 text-sm focus:outline-none transition-all duration-300 text-white"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${G.border}` }}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {authError && <div className="flex items-center gap-2 text-sm" style={{ color: G.danger }}><ShieldCheck className="w-4 h-4" /><span>{authError}</span></div>}
              <button
                type="submit"
                disabled={authLoading || !password}
                className="w-full h-13 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300 active:scale-[0.97] disabled:opacity-50 text-white"
                style={{ background: `linear-gradient(135deg, ${G.primary}, ${G.secondary})` }}
              >
                {authLoading ? "Verifying..." : "Unlock Admin Panel"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "A";
  const currentItem = allNavItems.find((i) => i.path === location.pathname);
  const currentSection = navSections.find((s) => s.items.some((i) => i.path === location.pathname));
  const totalBadges = badges.kyc + badges.frozen + badges.notif + badges.flagged + badges.tickets;
  const unreadNotifs = recentNotifs.filter((n) => !n.is_read).length;

  /* ─────────── Sidebar ─────────── */
  const SidebarBody = ({ isMobile = false }: { isMobile?: boolean }) => {
    const showLabel = isMobile || !collapsed;
    return (
      <>
        {/* Logo + version */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${G.borderSubtle}` }}>
          {showLabel ? (
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4" style={{ color: G.primary }} />
                AuroPay
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] tracking-[0.2em] uppercase text-white/30">Admin Console</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: G.accent15, color: G.secondary }}>v2.0</span>
              </div>
            </div>
          ) : <Sparkles className="w-5 h-5 mx-auto" style={{ color: G.primary }} />}
          {isMobile ? (
            <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-xl text-white/40">
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>

        {/* Admin profile chip */}
        {showLabel && profile && (
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${G.borderSubtle}` }}>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${G.primary}, ${G.secondary})`, boxShadow: `0 4px 12px rgba(200,149,46,0.3)` }}>
                  {initials}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: G.success, border: `2px solid ${G.sidebar}`, boxShadow: `0 0 6px ${G.success}80` }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">{profile.full_name || "Admin"}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: G.accent15, color: G.secondary }}>
                    <Crown className="w-2.5 h-2.5" /> SUPER ADMIN
                  </span>
                  <span className="text-[9px] flex items-center gap-1" style={{ color: G.success }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: G.success, boxShadow: `0 0 4px ${G.success}` }} />
                    Online
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 mt-1 overflow-y-auto scrollbar-none">
          {navSections.map((section) => {
            const sectionCollapsed = collapsedSections[section.title];
            return (
              <div key={section.title} className="mb-2">
                {showLabel && (
                  <button
                    onClick={() => setCollapsedSections((s) => ({ ...s, [section.title]: !s[section.title] }))}
                    className="w-full flex items-center justify-between px-3 py-2 group"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25 group-hover:text-white/40 transition-colors">{section.title}</p>
                    <ChevronRightIcon
                      className={`w-3 h-3 text-white/20 transition-transform ${sectionCollapsed ? "" : "rotate-90"}`}
                    />
                  </button>
                )}
                {!sectionCollapsed && section.items.map((item) => {
                  const active = location.pathname === item.path;
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <button
                      key={item.path}
                      onClick={() => { haptic.light(); navigate(item.path); if (isMobile) setMobileOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 relative ${!showLabel ? "justify-center px-0" : ""}`}
                      style={{
                        background: active ? "linear-gradient(90deg, rgba(200,149,46,0.18), transparent)" : "transparent",
                        color: active ? "#fff" : "rgba(255,255,255,0.5)",
                        fontWeight: active ? 500 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = "rgba(200,149,46,0.05)";
                          e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                        }
                      }}
                      title={!showLabel ? item.label : undefined}
                    >
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full" style={{ background: G.primary, boxShadow: `0 0 12px ${G.primary}80` }} />}
                      <div className="relative shrink-0">
                        <item.icon className="w-5 h-5" style={{ color: active ? G.primary : "rgba(255,255,255,0.35)" }} />
                        {badgeCount > 0 && !showLabel && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: G.danger }}>
                            {badgeCount > 9 ? "9+" : badgeCount}
                          </span>
                        )}
                      </div>
                      {showLabel && <span className="truncate">{item.label}</span>}
                      {showLabel && badgeCount > 0 && (
                        <span className="ml-auto shrink-0 min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1.5 text-white" style={{ background: G.danger, boxShadow: `0 0 8px ${G.danger}40` }}>
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Collapse button */}
        {!isMobile && (
          <div className="p-3" style={{ borderTop: `1px solid ${G.borderSubtle}` }}>
            <button
              onClick={() => { haptic.light(); setCollapsed(!collapsed); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors ${!showLabel ? "justify-center" : ""}`}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {showLabel && <span>Collapse</span>}
            </button>
          </div>
        )}
      </>
    );
  };

  /* ─────────── Breadcrumbs ─────────── */
  const Breadcrumbs = () => (
    <nav className="flex items-center gap-1.5 text-[12px] font-sora min-w-0">
      <button onClick={() => navigate("/admin")} className="text-white/40 hover:text-white transition-colors shrink-0">
        Dashboard
      </button>
      {currentSection && currentItem && currentItem.path !== "/admin" && (
        <>
          <ChevronRightIcon className="w-3 h-3 text-white/20 shrink-0" />
          <span className="text-white/40 hidden sm:inline shrink-0">{currentSection.title}</span>
          <ChevronRightIcon className="w-3 h-3 text-white/20 hidden sm:inline shrink-0" />
          <span className="text-white font-medium truncate">{currentItem.label}</span>
        </>
      )}
      {currentItem?.path === "/admin" && (
        <span className="text-white font-medium ml-1.5">Mission Control</span>
      )}
    </nav>
  );

  return (
    <AdminContextPanelProvider>
      <div className="flex min-h-screen" style={{ background: G.bg }}>
        {/* Mobile drawer overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)} style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", animation: "fade-in 0.2s ease-out" }} />
        )}

        {/* Mobile sidebar */}
        <aside
          className={`fixed top-0 left-0 bottom-0 w-[260px] flex flex-col z-50 lg:hidden transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ background: "rgba(12,14,19,0.95)", backdropFilter: "blur(24px)", borderRight: `1px solid ${G.border}`, boxShadow: "4px 0 40px rgba(0,0,0,0.5)" }}
        >
          <SidebarBody isMobile />
        </aside>

        {/* Desktop sidebar */}
        <aside
          className={`${collapsed ? "w-[64px]" : "w-[260px]"} shrink-0 flex-col transition-all duration-300 relative hidden lg:flex overflow-hidden`}
          style={{
            background: "rgba(12,14,19,0.7)",
            backdropFilter: "blur(28px) saturate(1.4)",
            borderRight: `1px solid ${G.border}`,
            boxShadow: "inset 0 1px 0 rgba(200,149,46,0.06)",
          }}
        >
          <div className="absolute top-0 left-0 w-[2px] h-full pointer-events-none z-10" style={{ background: `linear-gradient(180deg, transparent, ${G.primary}80, transparent)`, filter: "blur(0.5px)" }} />
          <SidebarBody />
        </aside>

        {/* Main column */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top header */}
          <header
            className="h-16 flex items-center justify-between px-3 sm:px-5 lg:px-6 shrink-0 sticky top-0 z-30"
            style={{ background: "rgba(10,12,15,0.85)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${G.borderSubtle}` }}
          >
            {/* Left: hamburger + breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button onClick={() => { haptic.light(); setMobileOpen(true); }} className="p-2 rounded-xl text-white/50 lg:hidden shrink-0">
                <Menu className="w-5 h-5" />
              </button>
              <Breadcrumbs />
            </div>

            {/* Center: ⌘K search trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2.5 h-9 px-3 mx-3 lg:mx-6 rounded-[10px] text-[12px] text-white/40 hover:text-white/70 transition-all min-w-[200px] lg:min-w-[280px] max-w-[360px]"
              style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${G.borderSubtle}` }}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Search users, transactions, settings…</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-white/40 flex items-center gap-0.5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>

            {/* Right: api health + bell + avatar */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* API health */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px]" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${G.borderSubtle}` }} title={`API health: ${apiHealth}`}>
                <span
                  className="w-1.5 h-1.5 rounded-full relative"
                  style={{
                    background: apiHealth === "green" ? G.success : apiHealth === "amber" ? G.warning : G.danger,
                    boxShadow: `0 0 6px ${apiHealth === "green" ? G.success : apiHealth === "amber" ? G.warning : G.danger}`,
                  }}
                >
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ background: apiHealth === "green" ? G.success : apiHealth === "amber" ? G.warning : G.danger, opacity: 0.4 }} />
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: apiHealth === "green" ? G.success : apiHealth === "amber" ? G.warning : G.danger }}>
                  {apiHealth === "green" ? "Healthy" : apiHealth === "amber" ? "Slow" : "Down"}
                </span>
              </div>

              {/* Mobile search trigger */}
              <button onClick={() => setPaletteOpen(true)} className="md:hidden p-2 rounded-xl text-white/50" title="Search (⌘K)">
                <Search className="w-4 h-4" />
              </button>

              {/* Theme toggle */}
              <AdminThemeToggle />

              {/* Notification bell */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => { setBellOpen((o) => !o); setProfileOpen(false); }}
                  className="relative p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {totalBadges > 0 && (
                    <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center px-1 text-white" style={{ background: G.danger, boxShadow: `0 0 6px ${G.danger}80` }}>
                      {totalBadges > 99 ? "99+" : totalBadges}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div
                    className="absolute top-full right-0 mt-2 w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50"
                    style={{ background: "rgba(15,17,22,0.98)", backdropFilter: "blur(24px)", borderColor: G.border, animation: "scale-in 0.18s ease-out" }}
                  >
                    <div className="px-4 h-12 flex items-center justify-between border-b" style={{ borderColor: G.borderSubtle }}>
                      <span className="text-[13px] font-semibold text-white font-sora">Notifications</span>
                      <span className="text-[10px] text-white/40 font-mono">{unreadNotifs} unread</span>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto">
                      {recentNotifs.length === 0 ? (
                        <div className="py-10 text-center text-[11px] text-white/40 font-sora">All caught up.</div>
                      ) : recentNotifs.map((n) => (
                        <div key={n.id} className="px-4 py-3 border-b last:border-0 hover:bg-white/[0.02] transition-colors" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
                          <div className="flex items-start gap-2">
                            {!n.is_read && <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: G.primary }} />}
                            <div className="flex-1 min-w-0">
                              <p className={`text-[12px] truncate font-sora ${n.is_read ? "text-white/60" : "text-white font-medium"}`}>{n.title}</p>
                              <p className="text-[10px] text-white/40 font-sora line-clamp-2 mt-0.5">{n.body}</p>
                              <p className="text-[9px] text-white/30 font-mono mt-1">{n.created_at ? new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : ""}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => { navigate("/admin/notifications"); setBellOpen(false); }}
                      className="w-full h-10 text-[11px] font-medium border-t hover:bg-white/[0.03] transition-colors"
                      style={{ borderColor: G.borderSubtle, color: G.secondary }}
                    >
                      View all notifications →
                    </button>
                  </div>
                )}
              </div>

              {/* Avatar dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setProfileOpen((o) => !o); setBellOpen(false); }}
                  className="flex items-center gap-2 pl-1 pr-2 h-10 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${G.primary}, ${G.secondary})` }}>
                    {initials}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-white/40 hidden sm:block" />
                </button>
                {profileOpen && (
                  <div
                    className="absolute top-full right-0 mt-2 w-[240px] rounded-2xl border overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50"
                    style={{ background: "rgba(15,17,22,0.98)", backdropFilter: "blur(24px)", borderColor: G.border, animation: "scale-in 0.18s ease-out" }}
                  >
                    <div className="p-4 border-b" style={{ borderColor: G.borderSubtle }}>
                      <p className="text-[13px] font-semibold text-white font-sora truncate">{profile?.full_name || "Admin"}</p>
                      <p className="text-[10px] text-white/40 font-sora truncate">{profile?.phone || "Super admin"}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { navigate("/admin/roles"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors font-sora"
                      >
                        <User className="w-3.5 h-3.5" /> Admin accounts
                      </button>
                      <button
                        onClick={() => { navigate("/admin/settings"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors font-sora"
                      >
                        <Settings className="w-3.5 h-3.5" /> App settings
                      </button>
                      <button
                        onClick={() => { navigate("/admin/audit-log"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors font-sora"
                      >
                        <FileText className="w-3.5 h-3.5" /> Audit logs
                      </button>
                    </div>
                    <div className="border-t" style={{ borderColor: G.borderSubtle }}>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] hover:bg-destructive/10 transition-colors font-sora"
                        style={{ color: G.danger }}
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main + slide-in context panel */}
          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 overflow-auto" style={{ background: G.bg }}>
              <ErrorBoundary label="This page" onRetry={() => window.location.reload()}>
                {children}
              </ErrorBoundary>
            </main>
            <AdminContextPanelSurface />
          </div>
        </div>

        {/* Command palette + global helpers */}
        <AdminCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <AdminShortcutsHelp />
        <SessionTimeoutModal enabled={isAuthenticated} onLogout={handleSessionExpire} />
      </div>
    </AdminContextPanelProvider>
  );
};

export default AdminLayout;
