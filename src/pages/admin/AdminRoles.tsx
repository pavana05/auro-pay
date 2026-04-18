import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  Crown, Shield, Eye, UserPlus, X, Check, Phone, Search, MoreVertical,
  CheckCircle2, Circle, Trash2,
} from "lucide-react";

const C = {
  cardBg: "rgba(13,14,18,0.7)",
  cardSolid: "#0d0e12",
  border: "rgba(200,149,46,0.10)",
  primary: "#c8952e",
  secondary: "#d4a84b",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.3)",
};

type AppRole = "admin" | "moderator" | "user";

interface AdminRow {
  user_id: string;
  role: AppRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  last_login: string | null;
  is_online: boolean;
}

const ROLE_META: Record<AppRole, { label: string; icon: any; color: string; desc: string }> = {
  admin:     { label: "Super Admin", icon: Crown,  color: C.primary,        desc: "Full system access" },
  moderator: { label: "Moderator",   icon: Shield, color: C.secondary,      desc: "Review & support actions" },
  user:      { label: "Read-only",   icon: Eye,    color: C.textSecondary,  desc: "Audit & analytics view only" },
};

const PAGES = [
  { key: "dashboard",     label: "Dashboard" },
  { key: "users",         label: "Users" },
  { key: "kyc",           label: "KYC" },
  { key: "transactions",  label: "Transactions" },
  { key: "wallets",       label: "Wallets" },
  { key: "refunds",       label: "Refunds" },
  { key: "notifications", label: "Notifications" },
  { key: "settings",      label: "App Settings" },
  { key: "audit",         label: "Audit Logs" },
  { key: "roles",         label: "Admin Accounts" },
];
type Perm = "write" | "read" | "none";
const ROLE_PERMISSIONS: Record<AppRole, Record<string, Perm>> = {
  admin: PAGES.reduce((a, p) => ({ ...a, [p.key]: "write" as Perm }), {} as Record<string, Perm>),
  moderator: {
    dashboard: "read", users: "write", kyc: "write", transactions: "read", wallets: "read",
    refunds: "write", notifications: "write", settings: "none", audit: "read", roles: "none",
  },
  user: PAGES.reduce((a, p) => ({ ...a, [p.key]: (p.key === "settings" || p.key === "roles" ? "none" : "read") as Perm }), {} as Record<string, Perm>),
};

const AdminRoles = () => {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "matrix">("list");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("moderator");
  const [inviteSending, setInviteSending] = useState(false);
  const [removeOpen, setRemoveOpen] = useState<AdminRow | null>(null);

  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const fetchAdmins = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "moderator"]);
    const ids = (roles || []).map((r: any) => r.user_id);
    if (ids.length === 0) { setAdmins([]); setLoading(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone, avatar_url, created_at").in("id", ids);
    const merged: AdminRow[] = (roles || []).map((r: any) => {
      const p: any = (profiles || []).find((pp: any) => pp.id === r.user_id);
      return {
        user_id: r.user_id,
        role: r.role as AppRole,
        full_name: p?.full_name || "Unknown",
        phone: p?.phone || null,
        avatar_url: p?.avatar_url || null,
        last_login: p?.created_at || null,
        is_online: false,
      };
    });
    setAdmins(merged);
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  /* ── Admin presence (Supabase Realtime) ──
     Every admin/moderator viewing this page (or any admin route via this hook)
     joins the `admin-presence` channel and tracks themselves. Other admins see
     them as Online in real time. */
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase.channel("admin-presence", {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState();
          setOnlineIds(new Set(Object.keys(state)));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel!.track({ online_at: new Date().toISOString() });
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) {
        channel.untrack().catch(() => {});
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return admins;
    const s = search.toLowerCase();
    return admins.filter(a =>
      (a.full_name || "").toLowerCase().includes(s) ||
      (a.phone || "").includes(s) ||
      a.role.toLowerCase().includes(s)
    );
  }, [admins, search]);

  const initials = (n?: string | null) => (n || "A").split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  const fmtRel = (ts: string | null) => {
    if (!ts) return "—";
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const sendInvite = async () => {
    if (!invitePhone.trim()) { toast.error("Phone number required"); return; }
    setInviteSending(true);
    const cleaned = invitePhone.replace(/\D/g, "");
    const { data: profile } = await supabase.from("profiles").select("id, full_name").or(`phone.eq.${cleaned},phone.eq.+91${cleaned}`).maybeSingle();
    if (!profile) {
      setInviteSending(false);
      toast.error("No user found with that phone. They must sign up first.");
      return;
    }
    const { error } = await supabase.from("user_roles").upsert({ user_id: profile.id, role: inviteRole }, { onConflict: "user_id,role" });
    setInviteSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${profile.full_name || "User"} promoted to ${ROLE_META[inviteRole].label}`);
    setInviteOpen(false);
    setInvitePhone(""); setInviteRole("moderator");
    fetchAdmins();
  };

  const removeAdmin = async (row: AdminRow) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", row.user_id).eq("role", row.role);
    if (error) { toast.error(error.message); return; }
    toast.success(`Removed ${row.full_name} from ${ROLE_META[row.role].label}`);
    setRemoveOpen(null);
    fetchAdmins();
  };

  const PermDot = ({ p }: { p: Perm }) => {
    if (p === "write") return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ background: `${C.success}20`, border: `1px solid ${C.success}55` }} title="Read & Write"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: C.success }} /></span>;
    if (p === "read")  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ background: `${C.warning}15`, border: `1px solid ${C.warning}44` }} title="Read only"><Eye className="w-3 h-3" style={{ color: C.warning }} /></span>;
    return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }} title="No access"><Circle className="w-2 h-2" style={{ color: C.textMuted }} /></span>;
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "rgba(200,149,46,0.04)", filter: "blur(120px)" }} />

        <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary }}>Admin Accounts</h1>
            <p className="text-xs mt-1.5" style={{ color: C.textSecondary }}>Role management & permission matrix</p>
          </div>
          <button onClick={() => setInviteOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)`, boxShadow: `0 4px 14px ${C.primary}33` }}>
            <UserPlus className="w-3.5 h-3.5" /> Invite Admin
          </button>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {[
            { k: "list", label: "Admin List", count: admins.length },
            { k: "matrix", label: "Permission Matrix", count: PAGES.length },
          ].map(t => (
            <button key={t.k} onClick={() => setActiveTab(t.k as any)}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-medium transition-all"
              style={{
                background: activeTab === t.k ? `${C.primary}20` : "rgba(255,255,255,0.03)",
                color: activeTab === t.k ? C.primary : C.textSecondary,
                border: `1px solid ${activeTab === t.k ? C.primary + "44" : C.border}`,
              }}>
              {t.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>{t.count}</span>
            </button>
          ))}
        </div>

        {activeTab === "list" ? (
          <>
            <div className="relative z-10 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: C.textMuted }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, role…"
                className="w-full h-9 pl-9 pr-3 rounded-[10px] text-xs focus:outline-none"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
            </div>

            <div className="rounded-[16px] overflow-hidden relative z-10" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
              {loading ? (
                <div className="p-8 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 rounded-[10px] animate-pulse" style={{ background: "rgba(255,255,255,0.02)" }} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-16 text-center">
                  <Crown className="w-10 h-10 mx-auto mb-3" style={{ color: C.textMuted }} />
                  <p className="text-sm" style={{ color: C.textSecondary }}>No admins found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)" }}>
                        {["Admin", "Role", "Permissions", "Last Login", "Status", ""].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a, i) => {
                        const meta = ROLE_META[a.role];
                        const RoleIcon = meta.icon;
                        const perms = ROLE_PERMISSIONS[a.role];
                        const writeCount = Object.values(perms).filter(p => p === "write").length;
                        const readCount = Object.values(perms).filter(p => p === "read").length;
                        return (
                          <tr key={a.user_id} className="hover:bg-white/[0.02] transition-colors"
                            style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                {a.avatar_url ? (
                                  <img src={a.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                                    style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}aa)` }}>
                                    {initials(a.full_name)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium" style={{ color: C.textPrimary }}>{a.full_name}</p>
                                  <p className="text-[10px] flex items-center gap-1" style={{ color: C.textMuted }}>
                                    <Phone className="w-2.5 h-2.5" />{a.phone || "—"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md"
                                style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}33` }}>
                                <RoleIcon className="w-3 h-3" />{meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5" style={{ color: C.textSecondary }}>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${C.success}15`, color: C.success }}>{writeCount} W</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${C.warning}15`, color: C.warning }}>{readCount} R</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 tabular-nums" style={{ color: C.textSecondary }}>{fmtRel(a.last_login)}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.textMuted }} />
                                <span className="text-[11px]" style={{ color: C.textMuted }}>—</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button onClick={() => setRemoveOpen(a)} className="p-1.5 rounded-md hover:bg-white/[0.04]" style={{ color: C.textSecondary }} title="Remove role">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-[16px] overflow-hidden relative z-10" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: C.primary }} />
                <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Role × Permission Matrix</h3>
              </div>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: C.textMuted }}>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" style={{ color: C.success }} /> Write</span>
                <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" style={{ color: C.warning }} /> Read</span>
                <span className="flex items-center gap-1.5"><Circle className="w-2 h-2" style={{ color: C.textMuted }} /> None</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)" }}>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider sticky left-0" style={{ color: C.textMuted, background: "#0d0e12" }}>Page / Action</th>
                    {(Object.keys(ROLE_META) as AppRole[]).map(r => {
                      const m = ROLE_META[r]; const Icon = m.icon;
                      return (
                        <th key={r} className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Icon className="w-4 h-4" style={{ color: m.color }} />
                            <span className="text-[11px] font-semibold" style={{ color: C.textPrimary }}>{m.label}</span>
                            <span className="text-[9px]" style={{ color: C.textMuted }}>{m.desc}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {PAGES.map((p, i) => (
                    <tr key={p.key} className="hover:bg-white/[0.02]" style={{ borderBottom: i < PAGES.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <td className="px-4 py-3 font-medium sticky left-0" style={{ color: C.textPrimary, background: "#0d0e12" }}>{p.label}</td>
                      {(Object.keys(ROLE_META) as AppRole[]).map(r => (
                        <td key={r} className="px-4 py-3 text-center"><PermDot p={ROLE_PERMISSIONS[r][p.key]} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {inviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={() => setInviteOpen(false)}>
            <div className="w-full max-w-md rounded-[20px] overflow-hidden" style={{ background: C.cardSolid, border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}33` }}>
                    <UserPlus className="w-4 h-4" style={{ color: C.primary }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Invite Admin</h3>
                    <p className="text-[11px]" style={{ color: C.textMuted }}>Promote an existing user to a privileged role</p>
                  </div>
                </div>
                <button onClick={() => setInviteOpen(false)} className="p-1.5 rounded-md hover:bg-white/[0.04]" style={{ color: C.textSecondary }}><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-medium mb-1.5 block" style={{ color: C.textSecondary }}>Phone number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: C.textMuted }} />
                    <input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="+91 98765 43210" autoFocus
                      className="w-full h-11 pl-9 pr-3 rounded-[10px] text-sm focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium mb-2 block" style={{ color: C.textSecondary }}>Select role</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(["admin", "moderator", "user"] as AppRole[]).map(r => {
                      const m = ROLE_META[r]; const Icon = m.icon;
                      const selected = inviteRole === r;
                      return (
                        <button key={r} onClick={() => setInviteRole(r)}
                          className="flex items-center gap-3 p-3 rounded-[10px] text-left transition-all"
                          style={{
                            background: selected ? `${m.color}10` : "rgba(255,255,255,0.02)",
                            border: `1px solid ${selected ? m.color + "55" : C.border}`,
                          }}>
                          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: `${m.color}15` }}>
                            <Icon className="w-4 h-4" style={{ color: m.color }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold" style={{ color: C.textPrimary }}>{m.label}</p>
                            <p className="text-[10px]" style={{ color: C.textMuted }}>{m.desc}</p>
                          </div>
                          {selected && <Check className="w-4 h-4" style={{ color: m.color }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-[10px] p-3" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}` }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: C.textMuted }}>Permission preview</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {PAGES.slice(0, 8).map(p => {
                      const perm = ROLE_PERMISSIONS[inviteRole][p.key];
                      const color = perm === "write" ? C.success : perm === "read" ? C.warning : C.textMuted;
                      return (
                        <div key={p.key} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          <span style={{ color: C.textSecondary }}>{p.label}</span>
                          <span className="ml-auto uppercase font-semibold" style={{ color }}>{perm[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setInviteOpen(false)} className="flex-1 h-10 rounded-[10px] text-xs font-semibold" style={{ background: "rgba(255,255,255,0.04)", color: C.textPrimary, border: `1px solid ${C.border}` }}>Cancel</button>
                  <button disabled={!invitePhone.trim() || inviteSending} onClick={sendInvite} className="flex-1 h-10 rounded-[10px] text-xs font-semibold text-white disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)` }}>
                    {inviteSending ? "Sending…" : "Send Invite"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {removeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={() => setRemoveOpen(null)}>
            <div className="w-full max-w-sm rounded-[20px] overflow-hidden" style={{ background: C.cardSolid, border: `1px solid ${C.danger}55` }} onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: `${C.danger}15`, border: `1px solid ${C.danger}33` }}>
                    <Trash2 className="w-4 h-4" style={{ color: C.danger }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Remove admin role?</h3>
                    <p className="text-xs mt-1.5" style={{ color: C.textSecondary }}>{removeOpen.full_name} will lose <span className="font-semibold" style={{ color: ROLE_META[removeOpen.role].color }}>{ROLE_META[removeOpen.role].label}</span> access immediately.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setRemoveOpen(null)} className="flex-1 h-10 rounded-[10px] text-xs font-semibold" style={{ background: "rgba(255,255,255,0.04)", color: C.textPrimary, border: `1px solid ${C.border}` }}>Cancel</button>
                  <button onClick={() => removeAdmin(removeOpen)} className="flex-1 h-10 rounded-[10px] text-xs font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, ${C.danger}, #dc2626)` }}>Remove</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRoles;
