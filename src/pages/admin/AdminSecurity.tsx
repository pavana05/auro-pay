import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import {
  ShieldAlert, RefreshCw, Search, Globe, Clock, User as UserIcon,
  AlertTriangle, Filter,
} from "lucide-react";
import { toast } from "sonner";

interface ProbeEntry {
  id: string;
  admin_user_id: string; // offending user id
  ip_address: string | null;
  details: { path?: string; user_agent?: string } | null;
  created_at: string;
}

interface ProfileLite { id: string; full_name: string | null; phone: string | null }

const G = {
  bg: "#0a0c0f",
  card: "rgba(13,14,18,0.7)",
  border: "rgba(200,149,46,0.10)",
  primary: "#c8952e",
  secondary: "#d4a84b",
  danger: "#ef4444",
  warning: "#f59e0b",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.3)",
};

const since = (iso: string) => {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const trimUA = (ua: string | undefined) => {
  if (!ua) return "—";
  // Surface the most recognizable token (Browser/OS) without flooding the row.
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|OPR|Brave)\/[\d.]+/);
  const os = ua.match(/\(([^)]+)\)/);
  return [m?.[0], os?.[1]].filter(Boolean).join(" · ") || ua.slice(0, 80);
};

const AdminSecurity = () => {
  const [probes, setProbes] = useState<ProbeEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [windowMins, setWindowMins] = useState<60 | 360 | 1440 | 10080>(1440);

  const fetchAll = async () => {
    setLoading(true);
    const since = new Date(Date.now() - windowMins * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, admin_user_id, ip_address, details, created_at")
      .eq("action", "admin_unauthorized_probe")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast.error("Could not load probe log", { description: error.message });
      setLoading(false);
      return;
    }
    const rows = (data || []) as ProbeEntry[];
    setProbes(rows);

    const userIds = Array.from(new Set(rows.map((r) => r.admin_user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);
      const pMap: Record<string, ProfileLite> = {};
      (profs || []).forEach((p) => { pMap[p.id] = p as ProfileLite; });
      setProfiles(pMap);

      // Best-effort email lookup via the secured edge function used elsewhere
      // (admin-edge-logs etc.). If it isn't available we silently fall back
      // to phone/name for identification — the UI tolerates missing emails.
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token) {
          const r = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-edge-logs`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
              },
              body: JSON.stringify({ action: "lookup_emails", user_ids: userIds }),
            },
          );
          if (r.ok) {
            const json = await r.json().catch(() => ({}));
            if (json?.emails && typeof json.emails === "object") setEmails(json.emails);
          }
        }
      } catch { /* non-fatal */ }
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [windowMins]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return probes;
    return probes.filter((p) => {
      const prof = profiles[p.admin_user_id];
      return (
        p.admin_user_id.toLowerCase().includes(q) ||
        (p.ip_address || "").toLowerCase().includes(q) ||
        (p.details?.path || "").toLowerCase().includes(q) ||
        (p.details?.user_agent || "").toLowerCase().includes(q) ||
        (emails[p.admin_user_id] || "").toLowerCase().includes(q) ||
        (prof?.full_name || "").toLowerCase().includes(q) ||
        (prof?.phone || "").toLowerCase().includes(q)
      );
    });
  }, [probes, profiles, emails, search]);

  // Group by user → count + most-recent timestamp, used to surface "active probing"
  const groupedByUser = useMemo(() => {
    const m = new Map<string, { count: number; last: string; ips: Set<string>; paths: Set<string> }>();
    for (const p of probes) {
      const cur = m.get(p.admin_user_id) || { count: 0, last: p.created_at, ips: new Set(), paths: new Set() };
      cur.count += 1;
      if (p.created_at > cur.last) cur.last = p.created_at;
      if (p.ip_address) cur.ips.add(p.ip_address);
      if (p.details?.path) cur.paths.add(p.details.path);
      m.set(p.admin_user_id, cur);
    }
    return Array.from(m.entries())
      .map(([user_id, v]) => ({ user_id, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [probes]);

  const activeProbers = useMemo(() => {
    // Same threshold as the alerting rule: 3+ probes in any 10-min window.
    const now = Date.now();
    const tenMin = 10 * 60 * 1000;
    return groupedByUser.filter((g) => {
      const recent = probes.filter(
        (p) => p.admin_user_id === g.user_id && now - new Date(p.created_at).getTime() <= tenMin,
      );
      return recent.length >= 3;
    });
  }, [groupedByUser, probes]);

  const totalUnique = groupedByUser.length;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6" style={{ color: G.primary }} />
              Admin Security
            </h1>
            <p className="text-sm mt-1" style={{ color: G.textSecondary }}>
              Unauthorized attempts to access <span className="font-mono">/admin/*</span> by signed-in non-admin users.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={windowMins}
              onChange={(e) => setWindowMins(Number(e.target.value) as any)}
              className="h-10 rounded-xl px-3 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${G.border}` }}
            >
              <option value={60}>Last 1 hour</option>
              <option value={360}>Last 6 hours</option>
              <option value={1440}>Last 24 hours</option>
              <option value={10080}>Last 7 days</option>
            </select>
            <button
              onClick={fetchAll}
              className="h-10 px-3 rounded-xl text-sm text-white flex items-center gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${G.border}` }}
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl p-4" style={{ background: G.card, border: `1px solid ${G.border}` }}>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: G.textMuted }}>Probes</p>
            <p className="text-3xl font-bold text-white mt-1">{probes.length}</p>
            <p className="text-xs mt-1" style={{ color: G.textSecondary }}>in selected window</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: G.card, border: `1px solid ${G.border}` }}>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: G.textMuted }}>Unique users</p>
            <p className="text-3xl font-bold text-white mt-1">{totalUnique}</p>
            <p className="text-xs mt-1" style={{ color: G.textSecondary }}>distinct accounts</p>
          </div>
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: activeProbers.length ? `${G.danger}10` : G.card,
              border: `1px solid ${activeProbers.length ? `${G.danger}40` : G.border}`,
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: activeProbers.length ? G.danger : G.textMuted }}>
              Active probing (≥3 in 10 min)
            </p>
            <p className="text-3xl font-bold mt-1" style={{ color: activeProbers.length ? G.danger : "#fff" }}>
              {activeProbers.length}
            </p>
            <p className="text-xs mt-1" style={{ color: G.textSecondary }}>
              {activeProbers.length ? "Investigate now" : "All clear"}
            </p>
            {activeProbers.length > 0 && (
              <AlertTriangle className="absolute right-3 top-3 w-5 h-5" style={{ color: G.danger }} />
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: G.textMuted }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, email, IP, path, or user-agent…"
            className="w-full h-11 rounded-xl pl-10 pr-3 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${G.border}` }}
          />
        </div>

        {/* Active probers callout */}
        {activeProbers.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: `${G.danger}08`, border: `1px solid ${G.danger}30` }}>
            <p className="text-sm font-semibold flex items-center gap-2" style={{ color: G.danger }}>
              <AlertTriangle className="w-4 h-4" /> Currently probing the admin panel
            </p>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {activeProbers.map((g) => {
                const prof = profiles[g.user_id];
                return (
                  <div
                    key={g.user_id}
                    className="rounded-xl p-3 text-xs flex items-start justify-between gap-3"
                    style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${G.border}` }}
                  >
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {prof?.full_name || emails[g.user_id] || g.user_id.slice(0, 8) + "…"}
                      </p>
                      <p className="font-mono mt-0.5 truncate" style={{ color: G.textMuted }}>
                        {emails[g.user_id] || prof?.phone || g.user_id}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold" style={{ color: G.danger }}>{g.count}</p>
                      <p style={{ color: G.textMuted }}>{since(g.last)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: G.card, border: `1px solid ${G.border}` }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${G.border}` }}>
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: G.primary }} /> Probe log
            </p>
            <span className="text-xs" style={{ color: G.textMuted }}>{filtered.length} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: G.textMuted, borderBottom: `1px solid ${G.border}` }}>
                  <th className="px-4 py-2 text-[11px] uppercase tracking-wider">When</th>
                  <th className="px-4 py-2 text-[11px] uppercase tracking-wider">User</th>
                  <th className="px-4 py-2 text-[11px] uppercase tracking-wider">IP</th>
                  <th className="px-4 py-2 text-[11px] uppercase tracking-wider">Path</th>
                  <th className="px-4 py-2 text-[11px] uppercase tracking-wider">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${G.border}` }}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center" style={{ color: G.textSecondary }}>
                      <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No probe attempts in this window. 🎉
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const prof = profiles[p.admin_user_id];
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${G.border}` }}>
                        <td className="px-4 py-3 align-top whitespace-nowrap" style={{ color: G.textSecondary }}>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> {since(p.created_at)}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: G.textMuted }}>
                            {new Date(p.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-white text-sm flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3" style={{ color: G.primary }} />
                            {prof?.full_name || "Unknown user"}
                          </div>
                          <div className="text-[11px] font-mono mt-0.5" style={{ color: G.textMuted }}>
                            {emails[p.admin_user_id] || prof?.phone || p.admin_user_id.slice(0, 8) + "…"}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-xs" style={{ color: G.textSecondary }}>
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3 h-3" /> {p.ip_address || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-xs text-white max-w-[220px] truncate" title={p.details?.path || ""}>
                          {p.details?.path || "—"}
                        </td>
                        <td className="px-4 py-3 align-top text-xs max-w-[280px] truncate" style={{ color: G.textSecondary }} title={p.details?.user_agent || ""}>
                          {trimUA(p.details?.user_agent)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11px] text-center" style={{ color: G.textMuted }}>
          Alerts fire automatically when the same user records 3+ probes in any 10-minute window.
          Notifications are delivered to all admins in the bell menu.
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminSecurity;
