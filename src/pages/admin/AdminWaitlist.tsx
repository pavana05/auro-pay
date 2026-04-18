import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  Sparkles, Users, UserCheck, MapPin, TrendingUp, Calendar,
  Search, Download, MoreVertical, X, Radio, Trophy, Clock, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from "recharts";

const G = {
  bg: "#0a0c0f",
  card: "#0d0e12",
  primary: "#c8952e",
  secondary: "#d4a84b",
  glow: "#e8c060",
  border: "rgba(200,149,46,0.12)",
  accent10: "rgba(200,149,46,0.1)",
  accent04: "rgba(200,149,46,0.04)",
  accent15: "rgba(200,149,46,0.15)",
  text: "#f5f1e8",
  muted: "#8a8478",
  success: "#22c55e",
  teal: "#14b8a6",
  pink: "#ec4899",
  blue: "#3b82f6",
  amber: "#f59e0b",
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

const relTime = (iso: string) => {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const initials = (name: string) =>
  name.split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const avatarColor = (seed: string) => {
  const colors = [G.primary, G.teal, G.pink, G.blue, G.amber, G.success];
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
};

const StatCard = ({
  label, value, sub, color, icon: Icon,
}: { label: string; value: string | number; sub?: string; color: string; icon: any }) => (
  <div
    className="rounded-2xl p-5 transition-all hover:translate-y-[-2px]"
    style={{
      background: `linear-gradient(135deg, ${G.card}, ${G.card})`,
      border: `1px solid ${G.border}`,
      boxShadow: `0 0 0 1px ${G.accent04} inset`,
    }}
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
    <div className="font-mono text-3xl font-bold" style={{ color: G.text }}>
      {value}
    </div>
    {sub && (
      <div className="mt-1 text-xs" style={{ color: G.muted }}>
        {sub}
      </div>
    )}
  </div>
);

const ChartCard = ({ title, children, height = 260 }: { title: string; children: any; height?: number }) => (
  <div
    className="rounded-2xl p-5"
    style={{ background: G.card, border: `1px solid ${G.border}` }}
  >
    <h3 className="text-sm font-semibold mb-4" style={{ color: G.text }}>{title}</h3>
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  </div>
);

const RoleBadge = ({ role }: { role: string | null }) => {
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
};

export default function AdminWaitlist() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "city">("newest");
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState<WaitlistRow | null>(null);
  const [liveItems, setLiveItems] = useState<WaitlistRow[]>([]);
  const activeLoadId = useRef(0);
  const PER_PAGE = 25;

  const loadRows = useCallback(async (options?: { silent?: boolean; background?: boolean }) => {
    const { silent = false, background = false } = options ?? {};
    const loadId = ++activeLoadId.current;

    if (background) setRefreshing(true);
    else {
      setLoading(true);
      setLoadError(null);
    }

    try {
      const queryPromise = supabase
        .from("waitlist")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Waitlist request timed out. Please try again.")), 12000);
      });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      if (loadId !== activeLoadId.current) return;
      if (error) throw error;

      setRows((data as WaitlistRow[]) || []);
      setLoadError(null);
    } catch (error) {
      if (loadId !== activeLoadId.current) return;
      const message = error instanceof Error ? error.message : "Please try reloading the page.";
      console.error("[AdminWaitlist] Failed to load waitlist:", error);
      setLoadError(message);
      if (!silent) {
        toast.error("Failed to load waitlist", {
          description: message,
        });
      }
    } finally {
      if (loadId !== activeLoadId.current) return;
      if (background) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const guardedLoad = async (options?: { silent?: boolean; background?: boolean }) => {
      if (!mounted) return;
      await loadRows(options);
    };

    guardedLoad();

    const channel = supabase
      .channel("admin-waitlist")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waitlist" }, (payload) => {
        const r = payload.new as WaitlistRow;
        setRows((prev) => [r, ...prev.filter((x) => x.id !== r.id)]);
        setLiveItems((prev) => [r, ...prev.filter((x) => x.id !== r.id)].slice(0, 5));
        setTimeout(() => {
          setLiveItems((prev) => prev.filter((x) => x.id !== r.id));
        }, 10000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "waitlist" }, (payload) => {
        const r = payload.new as WaitlistRow;
        setRows((prev) => prev.map((x) => (x.id === r.id ? r : x)));
        setDetailRow((prev) => (prev?.id === r.id ? r : prev));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "waitlist" }, (payload) => {
        setRows((prev) => prev.filter((x) => x.id !== (payload.old as { id: string }).id));
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          guardedLoad({ silent: true, background: true });
        }
      });

    const intervalId = window.setInterval(() => {
      guardedLoad({ silent: true, background: true });
    }, 15000);

    const handleFocus = () => guardedLoad({ silent: true, background: true });
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        guardedLoad({ silent: true, background: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [loadRows]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const week = new Date(today); week.setDate(week.getDate() - 7);
    const prevWeek = new Date(today); prevWeek.setDate(prevWeek.getDate() - 14);

    const todayCount = rows.filter((r) => new Date(r.created_at) >= today).length;
    const yestCount = rows.filter((r) => {
      const d = new Date(r.created_at); return d >= yest && d < today;
    }).length;
    const teens = rows.filter((r) => r.role?.includes("teen")).length;
    const parents = rows.filter((r) => r.role?.includes("parent")).length;
    const cityCounts: Record<string, number> = {};
    rows.forEach((r) => { if (r.city) cityCounts[r.city] = (cityCounts[r.city] || 0) + 1; });
    const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
    const weekCount = rows.filter((r) => new Date(r.created_at) >= week).length;
    const prevWeekCount = rows.filter((r) => {
      const d = new Date(r.created_at); return d >= prevWeek && d < week;
    }).length;
    const weekDelta = prevWeekCount > 0
      ? Math.round(((weekCount - prevWeekCount) / prevWeekCount) * 100)
      : weekCount > 0 ? 100 : 0;

    return {
      total: rows.length,
      today: todayCount,
      todayDelta: todayCount - yestCount,
      teens, parents,
      topCity: topCity ? `${topCity[0]} · ${topCity[1]}` : "—",
      week: weekCount,
      weekDelta,
    };
  }, [rows]);

  // Chart data
  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    rows.forEach((r) => {
      const k = r.created_at.slice(0, 10);
      if (k in days) days[k]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [rows]);

  const roleData = useMemo(() => {
    const t = rows.filter((r) => r.role === "teen").length;
    const p = rows.filter((r) => r.role === "parent").length;
    const b = rows.filter((r) => r.role === "both").length;
    return [
      { name: "Teen", value: t, color: G.primary },
      { name: "Parent", value: p, color: G.teal },
      { name: "Both", value: b, color: G.pink },
    ];
  }, [rows]);

  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { if (r.city) counts[r.city] = (counts[r.city] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, count]) => ({ city, count }));
  }, [rows]);

  const hourlyData = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const buckets: number[] = Array.from({ length: 24 }, () => 0);
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      if (d >= today) buckets[d.getHours()]++;
    });
    return buckets.map((count, hour) => ({ hour: `${hour}:00`, count }));
  }, [rows]);

  const cumulativeData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    const map: Record<string, number> = {};
    sorted.forEach((r) => { const k = r.created_at.slice(0, 10); map[k] = (map[k] || 0) + 1; });
    let total = 0;
    return Object.entries(map).map(([date, c]) => { total += c; return { date: date.slice(5), total }; });
  }, [rows]);

  const roleOverTimeData = useMemo(() => {
    const days: Record<string, { teen: number; parent: number; both: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      days[d.toISOString().slice(0, 10)] = { teen: 0, parent: 0, both: 0 };
    }
    rows.forEach((r) => {
      const k = r.created_at.slice(0, 10);
      if (k in days && r.role) {
        if (r.role === "teen") days[k].teen++;
        else if (r.role === "parent") days[k].parent++;
        else if (r.role === "both") days[k].both++;
      }
    });
    return Object.entries(days).map(([date, v]) => ({ date: date.slice(5), ...v }));
  }, [rows]);

  // Filtering
  const cities = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.city) s.add(r.city); });
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let f = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter((r) =>
        r.full_name?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q));
    }
    if (roleFilter !== "all") f = f.filter((r) => r.role === roleFilter);
    if (cityFilter !== "all") f = f.filter((r) => r.city === cityFilter);
    if (sortBy === "newest") f = [...f].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sortBy === "oldest") f = [...f].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    else f = [...f].sort((a, b) => (a.city || "").localeCompare(b.city || ""));
    return f;
  }, [rows, search, roleFilter, cityFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => { setPage(1); }, [search, roleFilter, cityFilter, sortBy]);

  // Referrals
  const referrers = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { if (r.referred_by) counts[r.referred_by] = (counts[r.referred_by] || 0) + 1; });
    return Object.entries(counts)
      .map(([id, n]) => {
        const ref = rows.find((x) => x.id === id);
        return ref ? { id, name: ref.full_name, phone: ref.phone, count: n, earned: n * 50 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b!.count - a!.count))
      .slice(0, 10) as Array<{ id: string; name: string; phone: string; count: number; earned: number }>;
  }, [rows]);

  // Insights
  const insights = useMemo(() => {
    const peakHour = hourlyData.reduce((p, c) => (c.count > p.count ? c : p), hourlyData[0]);
    const teenParentRatio = stats.parents > 0 ? (stats.teens / stats.parents).toFixed(2) : "—";
    const last7 = rows.filter((r) => +new Date(r.created_at) >= Date.now() - 7 * 86400000).length;
    const avgPerDay = (last7 / 7).toFixed(1);
    const daysIntoMonth = new Date().getDate();
    const projected = Math.round((rows.filter((r) => new Date(r.created_at).getMonth() === new Date().getMonth()).length / daysIntoMonth) * 30);
    return {
      peakHour: peakHour?.count > 0 ? peakHour.hour : "—",
      topCity: stats.topCity,
      ratio: teenParentRatio,
      avgPerDay,
      projected,
    };
  }, [hourlyData, stats, rows]);

  // CSV export
  const exportCsv = () => {
    const header = ["ID", "Name", "Phone", "Email", "City", "Role", "Signup Date", "Source", "Referral Code", "Contacted"];
    const rowsCsv = filtered.map((r) => [
      r.id, r.full_name, r.phone, r.email, r.city || "", r.role || "",
      new Date(r.created_at).toISOString(), r.source, r.referral_code || "", r.is_contacted ? "Yes" : "No",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `auropay-waitlist-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} entries`);
  };

  const updateRow = async (id: string, patch: Partial<WaitlistRow>) => {
    const { error } = await supabase.from("waitlist").update(patch).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (detailRow?.id === id) setDetailRow({ ...detailRow, ...patch });
    toast.success("Saved");
  };

  const deleteRow = async (id: string) => {
    if (!confirm("Delete this waitlist entry permanently?")) return;
    const { error } = await supabase.from("waitlist").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (detailRow?.id === id) setDetailRow(null);
    toast.success("Deleted");
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1600px] mx-auto" style={{ color: G.text }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles size={28} style={{ color: G.primary }} />
              Waitlist Analytics
            </h1>
            <p className="text-sm mt-1" style={{ color: G.muted }}>
              {loading
                ? "Loading waitlist data…"
                : loadError
                  ? "Waitlist data failed to load"
                  : refreshing
                    ? `${stats.total.toLocaleString()} total signups · refreshing live data…`
                    : `${stats.total.toLocaleString()} total signups · live updates enabled`}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: G.accent10, color: G.primary, border: `1px solid ${G.border}` }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: G.success }} />
              {stats.total} live
            </span>
            <button
              onClick={() => loadRows()}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: G.accent10, color: G.text, border: `1px solid ${G.border}` }}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Retry
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: G.primary, color: "#0a0c0f" }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard label="Total Signups" value={stats.total.toLocaleString()} color={G.primary} icon={Users} />
          <StatCard
            label="Today"
            value={stats.today}
            sub={stats.todayDelta >= 0 ? `+${stats.todayDelta} vs yesterday` : `${stats.todayDelta} vs yesterday`}
            color={G.success}
            icon={Calendar}
          />
          <StatCard label="Teens" value={stats.teens} color={G.teal} icon={UserCheck} />
          <StatCard label="Parents" value={stats.parents} color={G.pink} icon={UserCheck} />
          <StatCard label="Top City" value={stats.topCity} color={G.amber} icon={MapPin} />
          <StatCard
            label="This Week"
            value={stats.week}
            sub={`${stats.weekDelta >= 0 ? "+" : ""}${stats.weekDelta}% vs prior 7d`}
            color={G.blue}
            icon={TrendingUp}
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <ChartCard title="Daily Signups · Last 30 Days">
              <BarChart data={dailyData}>
                <defs>
                  <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={G.glow} />
                    <stop offset="100%" stopColor={G.primary} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke={G.muted} fontSize={11} />
                <YAxis stroke={G.muted} fontSize={11} />
                <Tooltip
                  contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }}
                  cursor={{ fill: G.accent10 }}
                />
                <Bar dataKey="count" fill="url(#barGold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>
          </div>
          <ChartCard title="Teen vs Parent">
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {roleData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }} />
              <Legend wrapperStyle={{ color: G.muted, fontSize: 12 }} />
            </PieChart>
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Top 10 Cities">
            <BarChart data={cityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke={G.muted} fontSize={11} />
              <YAxis type="category" dataKey="city" stroke={G.muted} fontSize={11} width={90} />
              <Tooltip contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }} cursor={{ fill: G.accent10 }} />
              <Bar dataKey="count" fill={G.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Hourly Signups Today">
            <LineChart data={hourlyData}>
              <defs>
                <linearGradient id="lineGold" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={G.primary} />
                  <stop offset="100%" stopColor={G.glow} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" stroke={G.muted} fontSize={10} />
              <YAxis stroke={G.muted} fontSize={11} />
              <Tooltip contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }} />
              <Line type="monotone" dataKey="count" stroke="url(#lineGold)" strokeWidth={3} dot={{ fill: G.primary, r: 3 }} />
            </LineChart>
          </ChartCard>
        </div>

        {/* Charts row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Cumulative Growth">
            <AreaChart data={cumulativeData}>
              <defs>
                <linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={G.primary} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={G.primary} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke={G.muted} fontSize={11} />
              <YAxis stroke={G.muted} fontSize={11} />
              <Tooltip contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }} />
              <Area type="monotone" dataKey="total" stroke={G.primary} fill="url(#areaGold)" strokeWidth={2} />
            </AreaChart>
          </ChartCard>
          <ChartCard title="Role Distribution Over Time">
            <AreaChart data={roleOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke={G.muted} fontSize={11} />
              <YAxis stroke={G.muted} fontSize={11} />
              <Tooltip contentStyle={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text }} />
              <Legend wrapperStyle={{ color: G.muted, fontSize: 12 }} />
              <Area type="monotone" dataKey="teen" stackId="1" stroke={G.primary} fill={G.primary} fillOpacity={0.6} />
              <Area type="monotone" dataKey="parent" stackId="1" stroke={G.teal} fill={G.teal} fillOpacity={0.6} />
              <Area type="monotone" dataKey="both" stackId="1" stroke={G.pink} fill={G.pink} fillOpacity={0.6} />
            </AreaChart>
          </ChartCard>
        </div>

        {/* Live feed */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: G.card, border: `1px solid ${G.border}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Radio size={14} style={{ color: "#ef4444" }} className="animate-pulse" />
            <h3 className="text-sm font-semibold" style={{ color: G.text }}>LIVE · New signups</h3>
            <span className="text-xs ml-auto" style={{ color: G.muted }}>Realtime feed (last 10s)</span>
          </div>
          {liveItems.length === 0 ? (
            <div className="text-sm py-4 text-center" style={{ color: G.muted }}>
              Waiting for new signups…
            </div>
          ) : (
            <div className="space-y-2">
              {liveItems.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl animate-in slide-in-from-right-4"
                  style={{ background: G.accent04, border: `1px solid ${G.border}` }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: avatarColor(r.id) }}
                  >
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
          {[
            { label: "Peak hour today", value: insights.peakHour, icon: Clock, color: G.primary },
            { label: "Top city", value: insights.topCity, icon: MapPin, color: G.amber },
            { label: "Teen / Parent", value: insights.ratio, icon: UserCheck, color: G.teal },
            { label: "Avg / day (7d)", value: insights.avgPerDay, icon: TrendingUp, color: G.blue },
            { label: "Projected this month", value: insights.projected, icon: Calendar, color: G.pink },
          ].map((i, idx) => (
            <StatCard key={idx} label={i.label} value={i.value as any} color={i.color} icon={i.icon} />
          ))}
        </div>

        {/* Referrals */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: G.card, border: `1px solid ${G.border}` }}
        >
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: G.text }}>
            <Trophy size={14} style={{ color: G.primary }} /> Top Referrers
          </h3>
          {referrers.length === 0 ? (
            <div className="text-sm py-4 text-center" style={{ color: G.muted }}>
              No referrals yet — share links with <code className="font-mono">?ref=AURO-XXX-1234</code>
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
        <div
          className="rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3"
          style={{ background: G.card, border: `1px solid ${G.border}` }}
        >
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
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: G.bg, border: `1px solid ${G.border}`, color: G.text }}
          >
            <option value="all">All roles</option>
            <option value="teen">Teen</option>
            <option value="parent">Parent</option>
            <option value="both">Both</option>
          </select>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none max-w-[180px]"
            style={{ background: G.bg, border: `1px solid ${G.border}`, color: G.text }}
          >
            <option value="all">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: G.bg, border: `1px solid ${G.border}`, color: G.text }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="city">City A–Z</option>
          </select>
          <span className="text-xs ml-auto" style={{ color: G.muted }}>
            {filtered.length} matching · page {page} of {totalPages}
          </span>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden mb-4"
          style={{ background: G.card, border: `1px solid ${G.border}` }}
        >
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
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center" style={{ color: G.muted }}>
                      Loading waitlist entries…
                    </td>
                  </tr>
                )}
                {pageRows.length === 0 && !loading && (
                  <tr><td colSpan={8} className="py-12 text-center" style={{ color: G.muted }}>No entries match your filters.</td></tr>
                )}
                {pageRows.map((r, i) => (
                  <tr
                    key={r.id}
                    className="hover:bg-white/[0.02] cursor-pointer"
                    style={{ borderTop: `1px solid ${G.border}` }}
                    onClick={() => setDetailRow(r)}
                  >
                    <td className="py-3 px-4 font-mono text-xs" style={{ color: G.muted }}>
                      {(page - 1) * PER_PAGE + i + 1}
                    </td>
                    <td className="py-3 px-4 flex items-center gap-2" style={{ color: G.text }}>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: avatarColor(r.id) }}
                      >
                        {initials(r.full_name)}
                      </div>
                      <span className="font-medium">{r.full_name}</span>
                      {r.is_contacted && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${G.success}22`, color: G.success }}>
                          contacted
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs" style={{ color: G.muted }}>{r.phone}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: G.muted }}>{r.email}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: G.text }}>{r.city || "—"}</td>
                    <td className="py-3 px-4"><RoleBadge role={r.role} /></td>
                    <td className="py-3 px-4 text-xs" style={{ color: G.muted }}>{relTime(r.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.05]"
                      >
                        <MoreVertical size={14} style={{ color: G.muted }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: G.muted }}>
            Showing {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
              style={{ background: G.card, border: `1px solid ${G.border}`, color: G.text }}
            >
              Prev
            </button>
            <span className="px-3 py-1.5 text-sm" style={{ color: G.text }}>{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
              style={{ background: G.card, border: `1px solid ${G.border}`, color: G.text }}
            >
              Next
            </button>
          </div>
        </div>

        {/* Detail modal */}
        {detailRow && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setDetailRow(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              style={{ background: G.card, border: `1px solid ${G.border}` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: avatarColor(detailRow.id) }}
                  >
                    {initials(detailRow.full_name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: G.text }}>{detailRow.full_name}</h3>
                    <p className="text-xs" style={{ color: G.muted }}>{relTime(detailRow.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => setDetailRow(null)} className="p-1 rounded-lg hover:bg-white/[0.05]">
                  <X size={18} style={{ color: G.muted }} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {[
                  ["Phone", detailRow.phone],
                  ["Email", detailRow.email],
                  ["City", detailRow.city || "—"],
                  ["Role", detailRow.role || "—"],
                  ["Source", detailRow.source],
                  ["Referral code", detailRow.referral_code || "—"],
                  ["Referred by", detailRow.referred_by || "—"],
                  ["Country", detailRow.ip_country || "—"],
                  ["Joined", new Date(detailRow.created_at).toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-start gap-3">
                    <span className="text-xs uppercase tracking-wider" style={{ color: G.muted }}>{k}</span>
                    <span className="font-mono text-xs text-right break-all" style={{ color: G.text }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-5 border-t" style={{ borderColor: G.border }}>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={detailRow.is_contacted}
                    onChange={(e) => updateRow(detailRow.id, { is_contacted: e.target.checked })}
                    className="w-4 h-4 accent-current"
                    style={{ accentColor: G.primary }}
                  />
                  <span className="text-sm" style={{ color: G.text }}>Mark as contacted</span>
                </label>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: G.muted }}>Admin notes</label>
                <textarea
                  defaultValue={detailRow.admin_notes || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (detailRow.admin_notes || "")) {
                      updateRow(detailRow.id, { admin_notes: e.target.value });
                    }
                  }}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: G.bg, border: `1px solid ${G.border}`, color: G.text }}
                  placeholder="Internal notes (auto-saves on blur)…"
                />
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => deleteRow(detailRow.id)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  Delete entry
                </button>
                <button
                  onClick={() => setDetailRow(null)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: G.primary, color: "#0a0c0f" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
