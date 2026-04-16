import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Command } from "lucide-react";
import {
  LayoutDashboard, Users, ShieldCheck, ArrowLeftRight, Wallet, Bell,
  Settings, Activity, Gift, Target, PiggyBank, Calendar, BarChart3,
  TrendingUp, Server, FileText, Crown, Headphones, DollarSign, RefreshCw,
  Link2, Flag,
} from "lucide-react";

interface Cmd { label: string; path: string; section: string; icon: any; keywords?: string }

const COMMANDS: Cmd[] = [
  { label: "Dashboard", path: "/admin", section: "Overview", icon: LayoutDashboard },
  { label: "Live Activity", path: "/admin/activity-log", section: "Overview", icon: Activity },
  { label: "All Users", path: "/admin/users", section: "Users", icon: Users },
  { label: "KYC Requests", path: "/admin/kyc", section: "Users", icon: ShieldCheck, keywords: "verify aadhaar" },
  { label: "Parent-Teen Links", path: "/admin/parent-links", section: "Users", icon: Link2 },
  { label: "Flagged Accounts", path: "/admin/flagged", section: "Users", icon: Flag, keywords: "fraud risk" },
  { label: "Transactions", path: "/admin/transactions", section: "Financial", icon: ArrowLeftRight },
  { label: "Wallet Management", path: "/admin/wallets", section: "Financial", icon: Wallet, keywords: "balance freeze" },
  { label: "Payouts", path: "/admin/payouts", section: "Financial", icon: DollarSign, keywords: "settlement" },
  { label: "Refunds & Disputes", path: "/admin/refunds", section: "Financial", icon: RefreshCw },
  { label: "Notifications", path: "/admin/notifications", section: "Ops", icon: Bell },
  { label: "Spending Limits", path: "/admin/spending-limits", section: "Ops", icon: Target },
  { label: "Savings Goals", path: "/admin/savings-oversight", section: "Ops", icon: PiggyBank },
  { label: "Pocket Money", path: "/admin/pocket-money", section: "Ops", icon: Calendar },
  { label: "Reports & Insights", path: "/admin/analytics", section: "Analytics", icon: BarChart3 },
  { label: "Revenue Analytics", path: "/admin/revenue", section: "Analytics", icon: TrendingUp },
  { label: "Rewards", path: "/admin/rewards", section: "Analytics", icon: Gift },
  { label: "App Settings", path: "/admin/settings", section: "System", icon: Settings },
  { label: "API Health", path: "/admin/health", section: "System", icon: Server },
  { label: "Audit Logs", path: "/admin/audit-log", section: "System", icon: FileText },
  { label: "Admin Accounts", path: "/admin/roles", section: "System", icon: Crown },
  { label: "Support Tickets", path: "/admin/support", section: "System", icon: Headphones },
];

const G = { primary: "#c8952e", secondary: "#d4a84b", border: "rgba(200,149,46,0.18)" };

interface Props { open: boolean; onClose: () => void; }

const AdminCommandPalette = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  useEffect(() => { if (open) { setQuery(""); setHighlight(0); } }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.section.toLowerCase().includes(q) ||
      c.keywords?.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => { setHighlight(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const target = filtered[highlight];
        if (target) { navigate(target.path); onClose(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, highlight, navigate, onClose]);

  if (!open) return null;

  // Group by section
  const grouped = filtered.reduce<Record<string, Cmd[]>>((acc, c) => {
    (acc[c.section] = acc[c.section] || []).push(c);
    return acc;
  }, {});
  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(5,6,9,0.7)", backdropFilter: "blur(14px)", animation: "fade-in 0.18s ease-out" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[20px] border overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        style={{ background: "rgba(13,14,18,0.96)", borderColor: G.border, animation: "scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b" style={{ borderColor: "rgba(200,149,46,0.08)" }}>
          <Search className="w-4 h-4" style={{ color: G.secondary }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to anything in the admin console…"
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30 font-sora"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/40">ESC</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/40 font-sora">No matches for "{query}"</div>
          ) : (
            Object.entries(grouped).map(([section, items]) => (
              <div key={section} className="mb-2">
                <p className="px-4 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/30 font-sora font-semibold">{section}</p>
                {items.map((c) => {
                  runningIndex++;
                  const active = runningIndex === highlight;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.path}
                      onMouseEnter={() => setHighlight(filtered.indexOf(c))}
                      onClick={() => { navigate(c.path); onClose(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-sora transition-colors"
                      style={{
                        background: active ? "rgba(200,149,46,0.1)" : "transparent",
                        color: active ? "#fff" : "rgba(255,255,255,0.7)",
                      }}
                    >
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(200,149,46,0.08)", border: "1px solid rgba(200,149,46,0.12)" }}>
                        <Icon className="w-4 h-4" style={{ color: active ? G.primary : G.secondary }} />
                      </div>
                      <span className="flex-1">{c.label}</span>
                      {active && <ArrowRight className="w-3.5 h-3.5" style={{ color: G.primary }} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 h-9 border-t text-[10px] text-white/40 font-sora" style={{ borderColor: "rgba(200,149,46,0.08)" }}>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-white/10">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-white/10">↵</kbd> open</span>
          </span>
          <span className="flex items-center gap-1"><Command className="w-3 h-3" /> AuroPay Admin</span>
        </div>
      </div>
    </div>
  );
};

export default AdminCommandPalette;
