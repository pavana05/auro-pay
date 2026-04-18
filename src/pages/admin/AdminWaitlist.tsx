import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  Sparkles, Users, UserCheck, MapPin, TrendingUp, Calendar,
  Search, Download, X, Radio, Trophy, Clock, RefreshCw, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

const G = {
  bg: "#0a0c0f",
  card: "#0d0e12",
  primary: "#c8952e",
  secondary: "#d4a84b",
  border: "rgba(200,149,46,0.12)",
  accent10: "rgba(200,149,46,0.1)",
  accent04: "rgba(200,149,46,0.04)",
  text: "#f5f1e8",
  muted: "#8a8478",
  success: "#22c55e",
  teal: "#14b8a6",
  pink: "#ec4899",
  blue: "#3b82f6",
  amber: "#f59e0b",
  danger: "#ef4444",
};

interface WaitlistRow {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  city: string | null;
  role: string | null;
  source: string;
  referral_code: string | null;
  referred_by: string | null;
  is_contacted: boolean;
  admin_notes: string | null;
  created_at: string;
  ip_country: string | null;
}

const PER_PAGE = 25;

const relTime = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const initials = (name: string) =>
  (name || "?").split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const avatarColor = (seed: string) => {
  const colors = [G.primary, G.teal, G.pink, G.blue, G.amber, G.success];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
};

function StatCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <div
      className="rounded-2xl p-5 transition-all hover:translate-y-[-2px]"
      style={{ background: G.card, border: `1px solid ${G.border}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: G.muted }}>
          {label}
        </span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}1a`, color }}
        >
          <Icon size={16} />
        </div>
      </div>
      <div className="font-mono text-3xl font-bold" style={{ color: G.text }}>{value}</div>
      {sub && <div className="mt-1 text-xs" style={{ color: G.muted }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, height = 260 }: any) {
  return (
    <div className="rounded-2xl p-5" style={{ background: G.card, border: `1px solid ${G.border}` }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: G.text }}>{title}</h3>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    teen: { bg: `${G.primary}22`, color: G.primary, label: "Teen" },
    parent: { bg: `${G.teal}22`, color: G.teal, label: "Parent" },
    both: { bg: `${G.pink}22`, color: G.pink, label: "Both" },
  };
  const c = map[role || ""] || { bg: "#33333322", color: G.muted, label: role || "—" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

async function fetchWaitlist(): Promise<WaitlistRow[]> {
  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data as WaitlistRow[]) || [];
}

export default function AdminWaitlist() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "city">("newest");
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState<WaitlistRow | null>(null);
  const [liveItems, setLiveItems] = useState<WaitlistRow[]>([]);

  const { data: rows = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["admin-waitlist"],
    queryFn: fetchWaitlist,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-waitlist-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waitlist" }, (payload) => {
        const r = payload.new as WaitlistRow;
        qc.setQueryData<WaitlistRow[]>(["admin-waitlist"], (prev = []) =>
          [r, ...prev.filter((x) => x.id !== r.id)]
        );
        setLiveItems((prev) => [r, ...prev.filter((x) => x.id !== r.id)].slice(0, 5));
        setTimeout(() => setLiveItems((prev) => prev.filter((x) => x.id !== r.id)), 10000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "waitlist" }, (payload) => {
        const r = payload.new as WaitlistRow;
        qc.setQueryData<WaitlistRow[]>(["admin-waitlist"], (prev = []) =>
          prev.map((x) => (x.id === r.id ? r : x))
        );
        setDetailRow((prev) => (prev?.id === r.id ? r : prev));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "waitlist" }, (payload) => {
        const id = (payload.old as { id: string }).id;
        qc.setQueryData<WaitlistRow[]>(["admin-waitlist"], (prev = []) => prev.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const week = new Date(today); week.setDate(week.getDate() - 7);
    const todayCount = rows.filter((r) => new Date(r.created_at) >= today).length;
    const weekCount = rows.filter((r) => new Date(r.created_at) >= week).length;
    const teens = rows.filter((r) => r.role === "teen").length;
    const parents = rows.filter((r) => r.role === "parent").length;
    return { total: rows.length, today: todayCount, week: weekCount, teens, parents };
  }, [rows]);

  // Daily trend (last 14 days)
  const dailyTrend = useMemo(() => {
    const days: { date: string; count: number; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = rows.filter((r) => {
        const c = new Date(r.created_at);
        return c >= d && c < next;
      }).length;
      days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        count,
      });
    }
    return days;
  }, [rows]);

  // Hourly distribution today
  const hourlyDist = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, count: 0 }));
    rows.forEach((r) => {
      const c = new Date(r.created_at);
      if (c >= today) buckets[c.getHours()].count += 1;
    });
    return buckets;
  }, [rows]);

  // Role pie
  const rolePie = useMemo(() => {
    const teen = rows.filter((r) => r.role === "teen").length;
    const parent = rows.filter((r) => r.role === "parent").length;
    const both = rows.filter((r) => r.role === "both").length;
    const unknown = rows.filter((r) => !r.role).length;
    return [
      { name: "Teen", value: teen, color: G.primary },
      { name: "Parent", value: parent, color: G.teal },
      { name: "Both", value: both, color: G.pink },
      { name: "Unknown", value: unknown, color: G.muted },
    ].filter((x) => x.value > 0);
  }, [rows]);

  // Top cities
  const topCities = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const c = r.city || "Unknown";
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rows]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.city) set.add(r.city); });
    return Array.from(set).sort();
  }, [rows]);

  // Filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (cityFilter !== "all" && r.city !== cityFilter) return false;
      if (q) {
        const hay = `${r.full_name} ${r.phone} ${r.email} ${r.city || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "newest") return +new Date(b.created_at) - +new Date(a.created_at);
      if (sortBy === "oldest") return +new Date(a.created_at) - +new Date(b.created_at);
      return (a.city || "").localeCompare(b.city || "");
    });
    return list;
  }, [rows, search, roleFilter, cityFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => { setPage(1); }, [search, roleFilter, cityFilter, sortBy]);

  // Top referrers
  const referrers = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      if (r.referred_by) counts.set(r.referred_by, (counts.get(r.referred_by) || 0) + 1);
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return Array.from(counts.entries())
      .map(([id, count]) => {
        const ref = byId.get(id);
        return {
          id, count,
          name: ref?.full_name || "Unknown",
          phone: ref?.phone || "—",
          earned: count * 100,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rows]);

  const insights = useMemo(() => {
    // Peak hour today
    let peakIdx = 0; let peakVal = 0;
    hourlyDist.forEach((b, i) => { if (b.count > peakVal) { peakVal = b.count; peakIdx = i; } });
    const peakHour = peakVal > 0 ? `${peakIdx}:00` : "—";

    const topCity = topCities[0]?.city || "—";

    const teens = stats.teens || 0;
    const parents = stats.parents || 0;
    const ratio = teens + parents > 0 ? `${teens} : ${parents}` : "—";

    const last7 = dailyTrend.slice(-7).reduce((s, d) => s + d.count, 0);
    const avg = (last7 / 7).toFixed(1);

    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const monthSoFar = rows.filter((r) => {
      const c = new Date(r.created_at);
      return c.getFullYear() === today.getFullYear() && c.getMonth() === today.getMonth();
    }).length;
    const projected = dayOfMonth > 0 ? Math.round((monthSoFar / dayOfMonth) * daysInMonth) : 0;

    return { peakHour, topCity, ratio, avgPerDay: avg, projected };
  }, [hourlyDist, topCities, stats, dailyTrend, rows]);

  const exportCsv = () => {
    if (!rows.length) {
      toast.error("Nothing to export");
      return;
    }
    const headers = ["Name", "Phone", "Email", "City", "Role", "Source", "Referral", "Contacted", "Created"];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      lines.push([
        r.full_name, r.phone, r.email, r.city || "", r.role || "",
        r.source, r.referral_code || "", r.is_contacted ? "yes" : "no",
        r.created_at,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  };

  const toggleContacted = async (row: WaitlistRow) => {
    const next = !row.is_contacted;
    const { error } = await supabase
      .from("waitlist")
      .update({ is_contacted: next })
      .eq("id", row.id);
    if (error) {
      toast.error("Update failed", { description: error.message });
      return;
    }
    qc.setQueryData<WaitlistRow[]>(["admin-waitlist"], (prev = []) =>
      prev.map((x) => (x.id === row.id ? { ...x, is_contacted: next } : x))
    );
    setDetailRow((prev) => (prev?.id === row.id ? { ...prev, is_contacted: next } : prev));
    toast.success(next ? "Marked as contacted" : "Marked as not contacted");
  };

  const errorMsg = error instanceof Error ? error.message : null;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6" style={{ background: G.bg, minHeight: "100vh" }}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: G.text }}>
              <Sparkles size={24} style={{ color: G.primary }} />
              Waitlist Analytics
              {isFetching && !isLoading && (
                <span className="inline-flex items-center gap-1.5 text-xs font-normal px-2 py-1 rounded-full"
                  style={{ background: G.accent10, color: G.muted }}>
                  <RefreshCw size={11} className="animate-spin" /> Refreshing
                </span>
              )}
            </h1>
            <p className="text-sm mt-1" style={{ color: G.muted }}>
              {isLoading
                ? "Loading waitlist data…"
                : errorMsg
                  ? "Failed to load waitlist"
                  : `${stats.total} signups · ${stats.today} today · ${stats.week} this week`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: G.accent10, color: G.text, border: `1px solid ${G.border}` }}
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${G.primary}, ${G.secondary})`, color: "#0a0c0f" }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-start justify-between gap-3 flex-wrap"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: G.text }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={18} style={{ color: G.danger }} className="mt-0.5" />
              <div>
                <div className="font-semibold">Couldn't load waitlist data</div>
                <div className="text-sm" style={{ color: G.muted }}>{errorMsg}</div>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: G.primary, color: "#0a0c0f" }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total signups" value={stats.total} sub="All time" color={G.primary} icon={Users} />
          <StatCard label="Today" value={stats.today} sub="Last 24h" color={G.success} icon={TrendingUp} />
          <StatCard label="This week" value={stats.week} sub="Last 7 days" color={G.teal} icon={Calendar} />
          <StatCard label="Teens / Parents" value={`${stats.teens} / ${stats.parents}`} sub="Role split" color={G.pink} icon={UserCheck} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Daily signups (last 14 days)">
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={G.primary} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={G.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
              <XAxis dataKey="label" stroke={G.muted} fontSize={11} />
              <YAxis stroke={G.muted} fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }}
                labelStyle={{ color: G.muted }}
              />
              <Area type="monotone" dataKey="count" stroke={G.primary} fill="url(#grad1)" strokeWidth={2} />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Role distribution">
            {rolePie.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: G.muted }}>
                No data yet
              </div>
            ) : (
              <PieChart>
                <Pie data={rolePie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4}>
                  {rolePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }}
                />
              </PieChart>
            )}
          </ChartCard>

          <ChartCard title="Hourly signups today">
            <BarChart data={hourlyDist}>
              <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
              <XAxis dataKey="hour" stroke={G.muted} fontSize={10} interval={2} />
              <YAxis stroke={G.muted} fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }}
              />
              <Bar dataKey="count" fill={G.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>

          <ChartCard title="Top cities">
            {topCities.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: G.muted }}>
                No city data yet
              </div>
            ) : (
              <BarChart data={topCities} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
                <XAxis type="number" stroke={G.muted} fontSize={11} allowDecimals={false} />
                <YAxis dataKey="city" type="category" stroke={G.muted} fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }}
                />
                <Bar dataKey="count" fill={G.amber} radius={[0, 4, 4, 0]} />
              </BarChart>
            )}
          </ChartCard>
        </div>

        {/* Live feed */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: G.card, border: `1px solid ${G.border}` }}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: G.text }}>
            <Radio size={14} className="animate-pulse" style={{ color: G.success }} /> Live signups
          </h3>
          {liveItems.length === 0 ? (
            <div className="text-sm py-4 text-center" style={{ color: G.muted }}>Waiting for new signups…</div>
          ) : (
            <div className="space-y-2">
              {liveItems.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: G.accent04, border: `1px solid ${G.border}` }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: avatarColor(r.id) }}>
                    {initials(r.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: G.text }}>{r.full_name}</div>
                    <div className="text-xs" style={{ color: G.muted }}>{r.city || "Unknown city"}</div>
                  </div>
                  <RoleBadge role={r.role} />
                  <span className="text-xs whitespace-nowrap" style={{ color: G.muted }}>Just now</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Peak hour today" value={insights.peakHour} color={G.primary} icon={Clock} />
          <StatCard label="Top city" value={insights.topCity} color={G.amber} icon={MapPin} />
          <StatCard label="Teen / Parent" value={insights.ratio} color={G.teal} icon={UserCheck} />
          <StatCard label="Avg / day (7d)" value={insights.avgPerDay} color={G.blue} icon={TrendingUp} />
          <StatCard label="Projected this month" value={insights.projected} color={G.pink} icon={Calendar} />
        </div>

        {/* Top referrers */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: G.card, border: `1px solid ${G.border}` }}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: G.text }}>
            <Trophy size={14} style={{ color: G.primary }} /> Top Referrers
          </h3>
          {referrers.length === 0 ? (
            <div className="text-sm py-4 text-center" style={{ color: G.muted }}>
              No referrals yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: G.muted, borderBottom: `1px solid ${G.border}` }}>
                    <th className="text-left py-2 px-3 text-xs uppercase tracking-wider">Referrer</th>
                    <th className="text-left py-2 px-3 text-xs uppercase tracking-wider">Phone</th>
                    <th className="text-right py-2 px-3 text-xs uppercase tracking-wider">Referrals</th>
                    <th className="text-right py-2 px-3 text-xs uppercase tracking-wider">Potential ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {referrers.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${G.border}` }}>
                      <td className="py-3 px-3 flex items-center gap-2" style={{ color: G.text }}>
                        {i === 0 && <Trophy size={14} style={{ color: G.primary }} />}
                        {r.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs" style={{ color: G.muted }}>{r.phone}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold" style={{ color: G.primary }}>{r.count}</td>
                      <td className="py-3 px-3 text-right font-mono" style={{ color: G.text }}>₹{r.earned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3"
          style={{ background: G.card, border: `1px solid ${G.border}` }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: G.muted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email, city…"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: G.bg, border: `1px solid ${G.border}`, color: G.text }}
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: G.bg, border: `1px solid ${G.border}`, color: G.text }}>
            <option value="all">All roles</option>
            <option value="teen">Teen</option>
            <option value="parent">Parent</option>
            <option value="both">Both</option>
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none max-w-[180px]"
            style={{ background: G.bg, border: `1px solid ${G.border}`, color: G.text }}>
            <option value="all">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: G.bg, border: `1px solid ${G.border}`, color: G.text }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="city">City A–Z</option>
          </select>
          <span className="text-xs ml-auto" style={{ color: G.muted }}>
            {filtered.length} matching · page {page} of {totalPages}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: G.card, border: `1px solid ${G.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: G.muted, background: G.accent04 }}>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider">Phone</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider">City</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider">Signed up</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={8} className="py-12 text-center" style={{ color: G.muted }}>
                    Loading waitlist entries…
                  </td></tr>
                )}
                {!isLoading && pageRows.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center" style={{ color: G.muted }}>
                    {rows.length === 0 ? "No signups yet." : "No entries match your filters."}
                  </td></tr>
                )}
                {!isLoading && pageRows.map((r, i) => (
                  <tr key={r.id}
                    onClick={() => setDetailRow(r)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                    style={{ borderTop: `1px solid ${G.border}` }}>
                    <td className="py-3 px-4 font-mono text-xs" style={{ color: G.muted }}>
                      {(page - 1) * PER_PAGE + i + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: avatarColor(r.id) }}>
                          {initials(r.full_name)}
                        </div>
                        <span style={{ color: G.text }}>{r.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs" style={{ color: G.muted }}>{r.phone}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: G.muted }}>{r.email}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: G.text }}>{r.city || "—"}</td>
                    <td className="py-3 px-4"><RoleBadge role={r.role} /></td>
                    <td className="py-3 px-4 text-xs" style={{ color: G.muted }}>{relTime(r.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      {r.is_contacted ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold"
                          style={{ background: `${G.success}22`, color: G.success }}>
                          Contacted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold"
                          style={{ background: `${G.amber}22`, color: G.amber }}>
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4" style={{ borderTop: `1px solid ${G.border}` }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                style={{ background: G.accent10, color: G.text }}
              >Previous</button>
              <span className="text-xs" style={{ color: G.muted }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                style={{ background: G.accent10, color: G.text }}
              >Next</button>
            </div>
          )}
        </div>

        {/* Detail drawer */}
        {detailRow && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end bg-black/60"
            onClick={() => setDetailRow(null)}>
            <div className="w-full md:max-w-md md:h-full overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
              style={{ background: G.card, borderLeft: `1px solid ${G.border}` }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold" style={{ color: G.text }}>Signup details</h3>
                <button onClick={() => setDetailRow(null)} style={{ color: G.muted }}>
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
                  style={{ background: avatarColor(detailRow.id) }}>
                  {initials(detailRow.full_name)}
                </div>
                <div>
                  <div className="text-base font-bold" style={{ color: G.text }}>{detailRow.full_name}</div>
                  <RoleBadge role={detailRow.role} />
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ["Email", detailRow.email],
                  ["Phone", detailRow.phone],
                  ["City", detailRow.city || "—"],
                  ["Source", detailRow.source],
                  ["Referral code", detailRow.referral_code || "—"],
                  ["Country", detailRow.ip_country || "—"],
                  ["Joined", new Date(detailRow.created_at).toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${G.border}` }}>
                    <span style={{ color: G.muted }}>{k}</span>
                    <span style={{ color: G.text }} className="font-mono text-xs text-right break-all max-w-[60%]">{v}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => toggleContacted(detailRow)}
                className="w-full mt-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  background: detailRow.is_contacted ? G.accent10 : `linear-gradient(135deg, ${G.primary}, ${G.secondary})`,
                  color: detailRow.is_contacted ? G.text : "#0a0c0f",
                  border: `1px solid ${G.border}`,
                }}
              >
                {detailRow.is_contacted ? "Mark as not contacted" : "Mark as contacted"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
