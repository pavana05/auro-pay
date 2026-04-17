import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { MapPin, TrendingUp, TrendingDown, Building2, Globe2, Sparkles, Loader2 } from "lucide-react";
import { INDIA_STATES, type IndiaState } from "@/lib/india-states";
import { toast } from "sonner";

/* ──────────────────────────────────────────────────────────────
 * Geographic intelligence — India map.
 * Uses the real `state_code` column on profiles (backfilled from
 * Indian telecom-circle phone-prefix mapping). Falls back to a
 * deterministic hash only when both column and phone are missing,
 * so the map stays populated for legacy rows.
 * ────────────────────────────────────────────────────────────── */

interface StateNode {
  code: string;
  name: string;
  cx: number; // SVG centroid
  cy: number;
  d: string;  // SVG path
  tier: 1 | 2 | 3;
}

// Real India state geometry (28 states + 7 UTs) on a 1000×1100 viewBox
const STATES: StateNode[] = INDIA_STATES.map((s: IndiaState) => ({
  code: s.code,
  name: s.name,
  cx: s.cx,
  cy: s.cy,
  d: s.d,
  tier: s.tier,
}));

const TIER_CITIES: Record<1 | 2 | 3, string[]> = {
  1: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad"],
  2: ["Jaipur", "Lucknow", "Surat", "Nagpur", "Indore", "Bhopal", "Patna", "Vadodara", "Coimbatore", "Kochi"],
  3: ["Mysuru", "Guwahati", "Shimla", "Dehradun", "Ranchi", "Raipur", "Bhubaneswar", "Thiruvananthapuram", "Vijayawada", "Madurai"],
};

const ALL_CITIES = [...TIER_CITIES[1], ...TIER_CITIES[2], ...TIER_CITIES[3]];

interface UserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  state_code?: string | null;
  city?: string | null;
  state_source?: string | null;
}

// Client-side mirror of the SQL infer_state_from_phone function (subset of common prefixes).
// Used only as a fallback when the DB column is null AND row hasn't hit the trigger yet.
const PHONE_PREFIX_STATE: Record<string, string> = {
  "9820": "MH", "9821": "MH", "9833": "MH", "9892": "MH", "9930": "MH", "9967": "MH", "9987": "MH",
  "9810": "DL", "9811": "DL", "9818": "DL", "9871": "DL", "9899": "DL", "9911": "DL", "9971": "DL", "9999": "DL",
  "9880": "KA", "9886": "KA", "9900": "KA", "9901": "KA", "9945": "KA", "9448": "KA", "9844": "KA",
  "9840": "TN", "9841": "TN", "9884": "TN", "9952": "TN", "9962": "TN", "9444": "TN", "9445": "TN",
  "9849": "TS", "9959": "TS", "9700": "TS", "9701": "TS", "9866": "TS",
  "9848": "AP", "9963": "AP", "9985": "AP",
  "9830": "WB", "9831": "WB", "9836": "WB", "9874": "WB", "9883": "WB", "9933": "WB",
  "9824": "GJ", "9825": "GJ", "9879": "GJ", "9909": "GJ", "9979": "GJ",
  "9815": "PB", "9876": "PB", "9888": "PB", "9417": "PB",
  "9812": "HR", "9813": "HR", "9416": "HR",
  "9828": "RJ", "9829": "RJ", "9001": "RJ", "9314": "RJ",
  "9415": "UP", "9450": "UP", "9839": "UP", "9889": "UP", "9919": "UP",
  "9304": "BR", "9534": "BR", "9852": "BR",
  "9407": "MP", "9425": "MP", "9893": "MP", "9926": "MP",
  "9400": "KL", "9447": "KL", "9495": "KL", "9846": "KL", "9961": "KL",
  "9437": "OD", "9583": "OD", "9777": "OD",
  "9854": "AS", "9864": "AS", "9706": "AS",
  "9418": "HP", "9816": "HP", "9882": "HP",
  "9411": "UK", "9719": "UK",
  "9419": "JK", "9596": "JK", "9858": "JK",
  "9822": "GA", "9823": "GA",
};

const inferStateFromPhone = (phone: string | null): string | null => {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 || !"6789".includes(d[0])) return null;
  return PHONE_PREFIX_STATE[d.slice(0, 4)] ?? null;
};

interface Tx {
  amount: number;
  status: string | null;
  created_at: string | null;
  wallet_id: string;
}

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const STATE_BY_CODE = new Map(STATES.map((s) => [s.code, s]));

const inferState = (u: UserRow): StateNode => {
  // 1. Real column (backfilled from telecom-circle mapping)
  if (u.state_code) {
    const node = STATE_BY_CODE.get(u.state_code);
    if (node) return node;
  }
  // 2. Client-side phone-prefix fallback (covers rows the trigger hasn't processed)
  const fromPhone = inferStateFromPhone(u.phone);
  if (fromPhone) {
    const node = STATE_BY_CODE.get(fromPhone);
    if (node) return node;
  }
  // 3. Deterministic last-resort (so the map isn't empty for legacy/test rows)
  const seed = u.phone || u.id;
  return STATES[hash(seed) % STATES.length];
};
const inferCity = (u: UserRow, st: StateNode): string => {
  if (u.city) return u.city;
  const seed = (u.phone || u.id) + "city";
  const pool = TIER_CITIES[st.tier];
  return pool[hash(seed) % pool.length];
};

const fmtINR = (paise: number) => {
  if (paise >= 10000000) return `₹${(paise / 10000000).toFixed(2)}Cr`;
  if (paise >= 100000) return `₹${(paise / 100000).toFixed(2)}L`;
  if (paise >= 1000) return `₹${(paise / 1000).toFixed(1)}K`;
  return `₹${(paise / 100).toFixed(0)}`;
};

type DateRange = "7d" | "30d" | "90d" | "all";
const RANGES: { v: DateRange; label: string; days: number | null }[] = [
  { v: "7d", label: "7D", days: 7 },
  { v: "30d", label: "30D", days: 30 },
  { v: "90d", label: "90D", days: 90 },
  { v: "all", label: "All", days: null },
];

const AdminGeographic = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [txns, setTxns] = useState<Tx[]>([]);
  const [walletToUser, setWalletToUser] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>("30d");
  const [hoverState, setHoverState] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: us }, { data: tx }, { data: ws }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, role, created_at, state_code, city, state_source"),
      supabase.from("transactions").select("amount, status, created_at, wallet_id").eq("status", "success").limit(5000),
      supabase.from("wallets").select("id, user_id"),
    ]);
    const map: Record<string, string> = {};
    (ws || []).forEach((w: any) => (map[w.id] = w.user_id));
    setWalletToUser(map);
    setUsers((us || []) as UserRow[]);
    setTxns((tx || []) as Tx[]);
    setLoading(false);
  };

  const handleResolveUnknowns = async () => {
    if (resolving) return;
    setResolving(true);
    const t = toast.loading("Re-running phone-based inference on unknown profiles…");
    const { data, error } = await supabase.rpc("resolve_unknown_states" as any);
    toast.dismiss(t);
    if (error) {
      toast.error(error.message || "Failed to resolve");
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      const scanned = row?.scanned ?? 0;
      const resolved = row?.resolved ?? 0;
      if (resolved > 0) toast.success(`Resolved ${resolved} of ${scanned} unknown profiles`);
      else toast.message(`Scanned ${scanned} unknown profiles — none could be inferred from phone`);
      await loadAll();
    }
    setResolving(false);
  };


  useEffect(() => {
    loadAll();
  }, []);


  const cutoffMs = useMemo(() => {
    const r = RANGES.find((x) => x.v === range);
    return r?.days ? Date.now() - r.days * 86400000 : 0;
  }, [range]);

  const prevCutoffMs = useMemo(() => {
    const r = RANGES.find((x) => x.v === range);
    if (!r?.days) return 0;
    return cutoffMs - r.days * 86400000;
  }, [cutoffMs, range]);

  // Per-user enrichment
  const enriched = useMemo(() => {
    return users.map((u) => {
      const st = inferState(u);
      return { user: u, state: st, city: inferCity(u, st) };
    });
  }, [users]);

  // State stats
  const stateStats = useMemo(() => {
    type Row = { node: StateNode; users: number; teens: number; parents: number; volume: number; volumePrev: number; manual: number; inferred: number; unknown: number };
    const map = new Map<string, Row>();
    STATES.forEach((s) =>
      map.set(s.code, { node: s, users: 0, teens: 0, parents: 0, volume: 0, volumePrev: 0, manual: 0, inferred: 0, unknown: 0 })
    );

    // Map each user → which state they were placed in, AND track the source the placement came from.
    // Only users whose state_code on the profile matches the placed state count toward 'manual/inferred',
    // since rows resolved by client-side fallback or hash are effectively 'unknown' for trust purposes.
    const userToState = new Map<string, StateNode>();
    for (const e of enriched) {
      userToState.set(e.user.id, e.state);
      const m = map.get(e.state.code)!;
      m.users++;
      if (e.user.role === "teen") m.teens++;
      else if (e.user.role === "parent") m.parents++;

      const placedFromColumn = e.user.state_code === e.state.code;
      const src = (e.user.state_source || "unknown").toLowerCase();
      if (placedFromColumn && src === "manual") m.manual++;
      else if (placedFromColumn && src === "inferred") m.inferred++;
      else m.unknown++;
    }

    for (const t of txns) {
      const uid = walletToUser[t.wallet_id];
      if (!uid) continue;
      const st = userToState.get(uid);
      if (!st) continue;
      const m = map.get(st.code)!;
      const ts = t.created_at ? new Date(t.created_at).getTime() : 0;
      if (range === "all" || ts >= cutoffMs) m.volume += t.amount;
      else if (ts >= prevCutoffMs && ts < cutoffMs) m.volumePrev += t.amount;
    }
    return Array.from(map.values()).sort((a, b) => b.users - a.users);
  }, [enriched, txns, walletToUser, range, cutoffMs, prevCutoffMs]);

  const maxStateUsers = Math.max(...stateStats.map((s) => s.users), 1);

  // City breakdown
  const cityStats = useMemo(() => {
    const map = new Map<string, { city: string; users: number; tier: 1 | 2 | 3 }>();
    ALL_CITIES.forEach((c) => {
      const tier = (TIER_CITIES[1].includes(c) ? 1 : TIER_CITIES[2].includes(c) ? 2 : 3) as 1 | 2 | 3;
      map.set(c, { city: c, users: 0, tier });
    });
    for (const e of enriched) {
      const m = map.get(e.city);
      if (m) m.users++;
    }
    return Array.from(map.values()).sort((a, b) => b.users - a.users).slice(0, 20);
  }, [enriched]);

  // Tier breakdown
  const tierStats = useMemo(() => {
    const counts: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
    for (const e of enriched) counts[e.state.tier]++;
    return counts;
  }, [enriched]);

  const tierTotal = tierStats[1] + tierStats[2] + tierStats[3] || 1;

  // Source/coverage stats — how trustworthy is the map?
  const sourceStats = useMemo(() => {
    const counts = { manual: 0, inferred: 0, unknown: 0 };
    for (const u of users) {
      const src = (u.state_source || "unknown").toLowerCase();
      if (src === "manual") counts.manual++;
      else if (src === "inferred") counts.inferred++;
      else counts.unknown++;
    }
    const total = users.length || 1;
    return {
      ...counts,
      total: users.length,
      manualPct: Math.round((counts.manual / total) * 100),
      inferredPct: Math.round((counts.inferred / total) * 100),
      unknownPct: Math.round((counts.unknown / total) * 100),
    };
  }, [users]);

  // Color intensity: gold scale
  const colorFor = (count: number) => {
    if (count === 0) return "rgba(200,149,46,0.05)";
    const intensity = Math.min(count / maxStateUsers, 1);
    // Light gold → deep gold
    const a = 0.15 + intensity * 0.75;
    return `rgba(200,149,46,${a.toFixed(2)})`;
  };

  const totalUsers = users.length;
  const totalVolume = stateStats.reduce((s, x) => s + x.volume, 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Geographic Analytics</h1>
            <p className="text-xs text-muted-foreground mt-1">{totalUsers.toLocaleString()} users across {STATES.length} states · {fmtINR(totalVolume)} volume</p>
          </div>
          <div className="flex gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
            {RANGES.map((r) => (
              <button key={r.v} onClick={() => setRange(r.v)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${range === r.v ? "bg-primary/15 text-primary shadow-[0_0_12px_hsl(42_78%_55%/0.1)]" : "text-muted-foreground hover:text-foreground"}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Coverage chips — show how trustworthy the map is */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 -mt-2" style={{ animation: "slide-up-spring 0.5s 0.05s both" }}>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">Coverage</span>
          <CoverageChip
            label="Manual"
            count={sourceStats.manual}
            pct={sourceStats.manualPct}
            color="#22c55e"
            hint="User picked their city directly during signup or via admin override — high confidence."
          />
          <CoverageChip
            label="Inferred"
            count={sourceStats.inferred}
            pct={sourceStats.inferredPct}
            color="#c8952e"
            hint="State guessed from the user's phone-number telecom circle. Usually correct but not authoritative."
          />
          <CoverageChip
            label="Unknown"
            count={sourceStats.unknown}
            pct={sourceStats.unknownPct}
            color="#ef4444"
            hint="No state info — map falls back to a deterministic hash so the dot still shows. Don't trust these for decisions."
          />
          {sourceStats.unknownPct >= 25 && (
            <span className="ml-1 text-[10px] px-2 py-1 rounded-md font-mono"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              ⚠ Low confidence — {sourceStats.unknownPct}% of users have no resolved state
            </span>
          )}
          <button
            onClick={handleResolveUnknowns}
            disabled={resolving || sourceStats.unknown === 0}
            title={sourceStats.unknown === 0 ? "No unknown profiles to resolve" : "Re-run phone-based inference on every profile with state_source='unknown'"}
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "rgba(200,149,46,0.12)",
              color: "#e8c060",
              border: "1px solid rgba(200,149,46,0.35)",
              boxShadow: resolving ? "none" : "0 0 12px rgba(200,149,46,0.15)",
            }}
          >
            {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {resolving ? "Resolving…" : "Resolve unknowns"}
          </button>
        </div>

        {/* Map + State table */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Map */}
          <div className="lg:col-span-3 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] relative overflow-hidden" style={{ animation: "slide-up-spring 0.5s 0.1s both" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-primary" /> India User Density
                </h3>
                <p className="text-[10px] text-muted-foreground">Color intensity = user concentration</p>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground">Low</span>
                <div className="flex">
                  {[0.15, 0.3, 0.5, 0.7, 0.9].map((a) => (
                    <div key={a} className="w-5 h-3" style={{ background: `rgba(200,149,46,${a})` }} />
                  ))}
                </div>
                <span className="text-muted-foreground">High</span>
              </div>
            </div>

            <div className="relative">
              <svg viewBox="0 0 1000 1100" className="w-full h-auto">
                <defs>
                  <radialGradient id="stateHover">
                    <stop offset="0%" stopColor="#e8c060" stopOpacity={1} />
                    <stop offset="100%" stopColor="#c8952e" stopOpacity={0.7} />
                  </radialGradient>
                </defs>

                {/* Render each state as real geographic path */}
                {stateStats.map((s, i) => {
                  const isHover = hoverState === s.node.code;
                  const smallUT = ["DL", "CH", "DN", "DD", "PY", "LD", "AN", "GA", "SK"].includes(s.node.code);
                  return (
                    <g key={s.node.code}
                      onMouseEnter={() => setHoverState(s.node.code)}
                      onMouseLeave={() => setHoverState(null)}
                      style={{ cursor: "pointer", animation: `fade-in 0.5s ${0.02 * i}s both` }}
                    >
                      <path
                        d={s.node.d}
                        fill={isHover ? "url(#stateHover)" : colorFor(s.users)}
                        stroke={isHover ? "#e8c060" : "rgba(200,149,46,0.35)"}
                        strokeWidth={isHover ? 1.6 : 0.6}
                        strokeLinejoin="round"
                        style={{
                          filter: isHover ? "drop-shadow(0 0 12px rgba(232,192,96,0.6))" : "none",
                          transition: "filter 0.2s, fill 0.2s, stroke 0.2s, stroke-width 0.2s",
                        }}
                      />
                      {!smallUT && (
                        <text
                          x={s.node.cx}
                          y={s.node.cy + 3}
                          textAnchor="middle"
                          fontSize={10}
                          fontFamily="Sora"
                          fill={s.users > maxStateUsers * 0.5 ? "#0a0c0f" : "rgba(255,255,255,0.55)"}
                          style={{ pointerEvents: "none", fontWeight: 600 }}
                        >
                          {s.node.code}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip */}
              {hoverState && (() => {
                const s = stateStats.find((x) => x.node.code === hoverState);
                if (!s) return null;
                return (
                  <div className="absolute top-3 right-3 px-4 py-3 rounded-xl pointer-events-none"
                    style={{
                      background: "rgba(18,20,24,0.96)",
                      border: "1px solid rgba(200,149,46,0.25)",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                      animation: "fade-in 0.15s ease-out",
                    }}>
                    <p className="text-xs font-semibold">{s.node.name}</p>
                    <div className="text-[10px] text-muted-foreground mt-1.5 space-y-0.5">
                      <div className="flex justify-between gap-6"><span>Users</span><span className="font-mono text-white">{s.users.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-6"><span>Volume</span><span className="font-mono text-white">{fmtINR(s.volume)}</span></div>
                      <div className="flex justify-between gap-6"><span>Tier</span><span className="font-mono text-white">{s.node.tier}</span></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* State table */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.2s both" }}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> State Breakdown</h3>
            <div className="overflow-y-auto max-h-[520px] -mx-2">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card/95 backdrop-blur z-10">
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">State</th>
                    <th className="text-right py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Users</th>
                    <th className="text-right py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">T/P</th>
                    <th className="text-right py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Volume</th>
                    <th className="text-right py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {stateStats.filter((s) => s.users > 0).map((s, i) => {
                    const growth = s.volumePrev > 0 ? (s.volume - s.volumePrev) / s.volumePrev : s.volume > 0 ? 1 : 0;
                    const isHover = hoverState === s.node.code;
                    return (
                      <tr key={s.node.code}
                        onMouseEnter={() => setHoverState(s.node.code)}
                        onMouseLeave={() => setHoverState(null)}
                        className={`border-b border-white/[0.03] transition-colors cursor-pointer ${isHover ? "bg-primary/[0.06]" : "hover:bg-white/[0.02]"}`}>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colorFor(s.users) }} />
                            <span className="font-medium truncate">{s.node.name}</span>
                            <TrustBadge manual={s.manual} inferred={s.inferred} unknown={s.unknown} />
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">{s.users}</td>
                        <td className="py-2.5 px-2 text-right text-muted-foreground text-[10px]">{s.teens}/{s.parents}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-[10px]">{fmtINR(s.volume)}</td>
                        <td className="py-2.5 px-2 text-right">
                          {range === "all" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold ${growth > 0 ? "text-success" : growth < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              {growth > 0 ? <TrendingUp className="w-3 h-3" /> : growth < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                              {growth === 0 ? "0%" : `${(growth * 100).toFixed(0)}%`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {stateStats.every((s) => s.users === 0) && (
                    <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No users yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cities + Tier breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top 20 cities */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.3s both" }}>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Top 20 Cities by Users</h3>
            <CityBars data={cityStats} />
          </div>

          {/* Tier doughnut */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.35s both" }}>
            <h3 className="text-sm font-semibold mb-1">Market Tier Coverage</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Competitive moat vs Tier-1-only fintechs</p>
            <TierDoughnut tier1={tierStats[1]} tier2={tierStats[2]} tier3={tierStats[3]} />
            <div className="mt-4 space-y-2">
              {[
                { tier: 1 as const, color: "#c8952e", label: "Tier 1 Metro" },
                { tier: 2 as const, color: "#9b6dff", label: "Tier 2 Cities" },
                { tier: 3 as const, color: "#2dd4bf", label: "Tier 3 / Rural" },
              ].map(({ tier, color, label }) => (
                <div key={tier} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                    <span>{label}</span>
                  </div>
                  <span className="font-mono">
                    <span className="font-semibold">{tierStats[tier]}</span>
                    <span className="text-muted-foreground ml-1.5">{((tierStats[tier] / tierTotal) * 100).toFixed(0)}%</span>
                  </span>
                </div>
              ))}
            </div>
            {tierStats[3] / tierTotal > 0.15 && (
              <div className="mt-4 p-3 rounded-xl bg-success/[0.08] border border-success/20">
                <p className="text-[10px] font-semibold text-success">🏆 Strong Tier 2/3 penetration — a moat against metro-only competitors.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

/* ───────── Per-state trust badge ───────── */
const TrustBadge = ({ manual, inferred, unknown }: { manual: number; inferred: number; unknown: number }) => {
  const total = manual + inferred + unknown;
  if (total === 0) return null;
  const manualPct = Math.round((manual / total) * 100);
  const inferredPct = Math.round((inferred / total) * 100);
  // Highest-priority signal: if mostly manual → green; mostly inferred → gold; mostly unknown → red.
  const dominant: "manual" | "inferred" | "unknown" =
    manual >= inferred && manual >= unknown ? "manual"
      : inferred >= unknown ? "inferred"
      : "unknown";
  const palette = {
    manual: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)", color: "#22c55e", glyph: "✓" },
    inferred: { bg: "rgba(200,149,46,0.12)", border: "rgba(200,149,46,0.35)", color: "#e8c060", glyph: "≈" },
    unknown: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", color: "#ef4444", glyph: "?" },
  }[dominant];
  const hint =
    `${manual} manual · ${inferred} inferred · ${unknown} unknown\n` +
    `${manualPct}% confirmed by users, ${inferredPct}% guessed from phone`;
  return (
    <span
      title={hint}
      className="ml-1 inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0"
      style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}
    >
      <span aria-hidden>{palette.glyph}</span>
      {dominant === "manual" ? `${manualPct}% set` : dominant === "inferred" ? `${inferredPct}% guess` : `${Math.round((unknown / total) * 100)}% ?`}
    </span>
  );
};

/* ───────── Coverage chip ───────── */
const CoverageChip = ({ label, count, pct, color, hint }: { label: string; count: number; pct: number; color: string; hint: string }) => (
  <div
    title={hint}
    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border"
    style={{ background: `${color}10`, borderColor: `${color}30` }}
  >
    <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
    <span className="text-[10px] font-mono text-white/80">{count.toLocaleString()}</span>
    <span className="text-[9px] font-mono text-white/40">{pct}%</span>
  </div>
);

/* ───────── City horizontal bars ───────── */
const CityBars = ({ data }: { data: { city: string; users: number; tier: 1 | 2 | 3 }[] }) => {
  const max = Math.max(...data.map((d) => d.users), 1);
  const tierColor = { 1: "#c8952e", 2: "#9b6dff", 3: "#2dd4bf" } as const;
  return (
    <div className="space-y-2">
      {data.filter((d) => d.users > 0).map((d, i) => {
        const w = (d.users / max) * 100;
        return (
          <div key={d.city} className="flex items-center gap-3 group">
            <div className="w-24 text-xs text-muted-foreground truncate flex items-center gap-1.5">
              <span className="text-[9px] font-mono px-1 rounded bg-white/[0.04]">T{d.tier}</span>
              {d.city}
            </div>
            <div className="flex-1 h-5 rounded-md bg-white/[0.03] overflow-hidden relative">
              <div className="h-full rounded-md transition-all"
                style={{
                  width: `${w}%`,
                  background: `linear-gradient(90deg, ${tierColor[d.tier]}, ${tierColor[d.tier]}80)`,
                  boxShadow: `0 0 8px ${tierColor[d.tier]}40`,
                  animation: `hbar-grow 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 0.04}s both`,
                  transformOrigin: "left",
                }} />
            </div>
            <span className="w-12 text-right font-mono text-xs">{d.users}</span>
          </div>
        );
      })}
      {data.every((d) => d.users === 0) && (
        <p className="text-center text-xs text-muted-foreground py-8">No city data</p>
      )}
      <style>{`@keyframes hbar-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </div>
  );
};

/* ───────── Tier doughnut (custom SVG) ───────── */
const TierDoughnut = ({ tier1, tier2, tier3 }: { tier1: number; tier2: number; tier3: number }) => {
  const total = tier1 + tier2 + tier3 || 1;
  const r = 64;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const segs = [
    { v: tier1, color: "#c8952e" },
    { v: tier2, color: "#9b6dff" },
    { v: tier3, color: "#2dd4bf" },
  ];
  return (
    <div className="relative inline-flex items-center justify-center w-full" style={{ height: 180 }}>
      <svg width={180} height={180} viewBox="0 0 180 180" className="-rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14" />
        {segs.map((s, i) => {
          const len = (s.v / total) * C;
          const seg = (
            <circle key={i} cx="90" cy="90" r={r} fill="none"
              stroke={s.color} strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              style={{ filter: `drop-shadow(0 0 6px ${s.color}60)`, transition: "stroke-dasharray 0.6s ease" }} />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold font-mono">{total === 1 && tier1 + tier2 + tier3 === 0 ? 0 : total}</p>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">users</p>
      </div>
    </div>
  );
};

export default AdminGeographic;
