import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { useCountUp } from "@/hooks/useCountUp";
import { useContextPanel } from "@/components/admin/AdminContextPanel";
import { Activity, TrendingUp, AlertTriangle, Pause, Play, Trophy, Zap, ArrowDownLeft, ArrowUpRight, XCircle, Clock } from "lucide-react";

const C = {
  primary: "#c8952e", secondary: "#d4a84b", glow: "#e8c060",
  success: "#22c55e", danger: "#ef4444", warning: "#f59e0b",
  info: "#3b82f6", cyan: "#06b6d4",
};

const fmtPaise = (p: number) =>
  p >= 10000000 ? `₹${(p / 10000000).toFixed(2)}Cr` :
  p >= 100000 ? `₹${(p / 100000).toFixed(2)}L` :
  p >= 1000 ? `₹${(p / 100).toLocaleString("en-IN")}` :
  `₹${(p / 100).toFixed(2)}`;

const Counter = ({ value }: { value: number }) => {
  const v = useCountUp(value, 800, true);
  return <span>{v.toLocaleString("en-IN")}</span>;
};

const AdminActivityLog = () => {
  const ctxPanel = useContextPanel();
  const [allTxns, setAllTxns] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused); pausedRef.current = paused;
  const queuedRef = useRef<any[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const fetchAll = useCallback(async () => {
    const [txnsRes, usersRes, walletsRes] = await Promise.all([
      supabase.from("transactions").select("*").gte("created_at", today.toISOString()).order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("id, full_name, avatar_url"),
      supabase.from("wallets").select("id, user_id"),
    ]);
    setAllTxns(txnsRes.data || []);
    setFeed((txnsRes.data || []).slice(0, 80));
    setUsers(usersRes.data || []);
    setWallets(walletsRes.data || []);
    setLoading(false);
  }, [today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Velocity ticker */
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  /* Realtime */
  useEffect(() => {
    const ch = supabase
      .channel("admin-activity-mon")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, (payload) => {
        const row: any = payload.new;
        setAllTxns((p) => [row, ...p].slice(0, 500));
        if (pausedRef.current) { queuedRef.current = [row, ...queuedRef.current]; return; }
        setFeed((p) => [row, ...p].slice(0, 80));
        setFlashIds((s) => { const n = new Set(s); n.add(row.id); return n; });
        setTimeout(() => setFlashIds((s) => { const n = new Set(s); n.delete(row.id); return n; }), 1400);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!paused && queuedRef.current.length > 0) {
      const drained = queuedRef.current; queuedRef.current = [];
      setFeed((prev) => [...drained, ...prev].slice(0, 80));
      const ids = new Set(drained.map((d) => d.id));
      setFlashIds((s) => { const n = new Set(s); ids.forEach((i) => n.add(i)); return n; });
      setTimeout(() => setFlashIds((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; }), 1400);
    }
  }, [paused]);

  /* Stats */
  const todaySuccess = allTxns.filter((t) => t.status === "success");
  const totalCount = allTxns.length;
  const totalVolume = todaySuccess.reduce((s, t) => s + (t.amount || 0), 0);

  /* Velocity: txns / minute over last 60 min */
  const velocity = useMemo(() => {
    void tick;
    const now = Date.now();
    const buckets: { minute: number; count: number; ts: number }[] = [];
    for (let i = 59; i >= 0; i--) {
      const start = now - (i + 1) * 60_000;
      const end = now - i * 60_000;
      const count = allTxns.filter((t) => {
        const ts = t.created_at ? new Date(t.created_at).getTime() : 0;
        return ts >= start && ts < end;
      }).length;
      buckets.push({ minute: 59 - i, count, ts: end });
    }
    return buckets;
  }, [allTxns, tick]);

  const lastMinCount = velocity[velocity.length - 1]?.count || 0;
  const avgVelocity = velocity.reduce((s, b) => s + b.count, 0) / Math.max(velocity.length, 1);
  const spike = avgVelocity > 1 && lastMinCount >= avgVelocity * 3;

  const maxBucket = Math.max(...velocity.map((v) => v.count), 1);

  /* Top merchants */
  const topMerchants = useMemo(() => {
    const map: Record<string, { count: number; volume: number }> = {};
    todaySuccess.forEach((t) => {
      const k = t.merchant_name || "Direct";
      map[k] = map[k] || { count: 0, volume: 0 };
      map[k].count++;
      map[k].volume += t.amount || 0;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
  }, [todaySuccess]);

  const openTxn = (tx: any) => {
    const w = wallets.find((w) => w.id === tx.wallet_id);
    const u = w ? users.find((u) => u.id === w.user_id) : null;
    ctxPanel.show({
      title: tx.merchant_name || tx.type,
      subtitle: tx.id,
      body: (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-[10px] uppercase tracking-wider text-white/40">Amount</p>
            <p className="text-3xl font-bold font-mono text-white mt-1">{fmtPaise(tx.amount || 0)}</p>
            <p className="text-[11px] text-white/40 font-sora mt-1">{tx.created_at ? new Date(tx.created_at).toLocaleString("en-IN") : "—"}</p>
          </div>
          <Row k="User" v={u?.full_name || "Unknown"} />
          <Row k="Status" v={tx.status} />
          <Row k="Type" v={tx.type} />
          <Row k="Category" v={tx.category || "—"} />
          <Row k="UPI" v={tx.merchant_upi_id || "—"} mono />
          <Row k="Wallet" v={tx.wallet_id} mono />
        </div>
      ),
    });
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-5 min-h-full relative">
        <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.04] blur-[150px]" style={{ background: `radial-gradient(circle, ${C.primary}, transparent)` }} />

        {/* Hero counters */}
        <div
          className="relative rounded-[24px] overflow-hidden border p-6 lg:p-8"
          style={{
            background: `linear-gradient(135deg, rgba(200,149,46,0.12) 0%, rgba(13,14,18,0.85) 50%, rgba(239,68,68,0.06) 100%)`,
            backdropFilter: "blur(28px)",
            borderColor: "rgba(200,149,46,0.18)",
            animation: "kpi-in 0.5s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,46,0.5), transparent)" }} />
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase" style={{ background: "rgba(239,68,68,0.15)", color: C.danger, border: `1px solid rgba(239,68,68,0.3)` }}>
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: C.danger, boxShadow: `0 0 6px ${C.danger}` }}>
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ background: C.danger, opacity: 0.6 }} />
                </span>
                LIVE
              </span>
              <span className="text-[10px] text-white/40 font-sora">Today · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <button
              onClick={() => setPaused((p) => !p)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] text-[11px] font-medium font-sora"
              style={{
                background: paused ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                color: paused ? C.warning : "rgba(255,255,255,0.6)",
                border: `1px solid ${paused ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {paused ? <><Play className="w-3 h-3" /> Resume{queuedRef.current.length > 0 ? ` (+${queuedRef.current.length})` : ""}</> : <><Pause className="w-3 h-3" /> Pause feed</>}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-sora">Transactions today</p>
              <p className="text-[56px] sm:text-[72px] font-bold leading-none tracking-tight text-white" style={{ fontFamily: "'JetBrains Mono', monospace", textShadow: `0 0 40px ${C.primary}30` }}>
                <Counter value={totalCount} />
              </p>
              <p className="text-[11px] text-white/40 font-sora mt-1">{todaySuccess.length} successful · {allTxns.filter((t) => t.status === "failed").length} failed</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-sora">Volume processed</p>
              <p className="text-[56px] sm:text-[72px] font-bold leading-none tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace", color: C.primary, textShadow: `0 0 40px ${C.primary}40` }}>
                {fmtPaise(totalVolume)}
              </p>
              <p className="text-[11px] text-white/40 font-sora mt-1">avg {fmtPaise(todaySuccess.length > 0 ? Math.round(totalVolume / todaySuccess.length) : 0)} per txn</p>
            </div>
          </div>
        </div>

        {/* Spike alert */}
        {spike && (
          <div
            className="rounded-2xl p-4 border flex items-center gap-3"
            style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)", animation: "kpi-in 0.4s ease-out both" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
              <AlertTriangle className="w-5 h-5" style={{ color: C.warning }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white font-sora">Traffic spike detected</p>
              <p className="text-[11px] text-white/60 font-sora">
                Last minute: <span className="font-mono font-semibold text-white">{lastMinCount}</span> txns ·
                Average: <span className="font-mono">{avgVelocity.toFixed(1)}/min</span> ·
                Spike factor <span className="font-mono font-semibold" style={{ color: C.warning }}>{(lastMinCount / Math.max(avgVelocity, 0.1)).toFixed(1)}×</span>
              </p>
            </div>
          </div>
        )}

        {/* Main grid: feed (60%) + side panel (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          {/* Feed */}
          <div
            className="rounded-[18px] border overflow-hidden"
            style={{ background: "rgba(13,14,18,0.7)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="px-5 h-12 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <h3 className="text-[12px] font-semibold text-white font-sora flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" style={{ color: C.primary }} />
                Live Feed · {feed.length}
              </h3>
              {!paused && (
                <span className="text-[9px] font-bold tracking-wider font-mono flex items-center gap-1" style={{ color: C.success }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.success, boxShadow: `0 0 6px ${C.success}` }} /> LIVE
                </span>
              )}
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="py-16 text-center"><div className="w-8 h-8 mx-auto rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>
              ) : feed.length === 0 ? (
                <div className="py-16 text-center text-[11px] text-white/30 font-sora">Waiting for transactions today…</div>
              ) : feed.map((t) => {
                const w = wallets.find((w) => w.id === t.wallet_id);
                const u = w ? users.find((u) => u.id === w.user_id) : null;
                const flash = flashIds.has(t.id);
                const accent = t.status === "failed" ? C.warning : t.type === "credit" ? C.success : C.danger;
                const Icon = t.status === "failed" ? XCircle : t.type === "credit" ? ArrowDownLeft : ArrowUpRight;
                const time = t.created_at ? new Date(t.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—";
                return (
                  <button
                    key={t.id}
                    onClick={() => openTxn(t)}
                    className="relative w-full flex items-center gap-3 px-5 py-3 text-left border-b hover:bg-white/[0.02] transition-colors"
                    style={{
                      borderColor: "rgba(255,255,255,0.025)",
                      animation: flash ? "feed-row-in 0.5s cubic-bezier(0.22,1,0.36,1) both" : undefined,
                    }}
                  >
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: accent, boxShadow: flash ? `0 0 12px ${accent}` : `0 0 6px ${accent}40` }} />
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}>
                      <Icon className="w-4 h-4" style={{ color: accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-medium text-white truncate font-sora">{u?.full_name || "Unknown"}</p>
                        <p className="text-[13px] font-bold font-mono shrink-0" style={{ color: t.type === "credit" ? C.success : "#fff" }}>
                          {t.type === "credit" ? "+" : "-"}{fmtPaise(t.amount || 0)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[10px] text-white/40 truncate font-sora">{t.merchant_name || t.category || "—"}</p>
                        <p className="text-[10px] text-white/40 font-mono shrink-0">{time}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full font-sora shrink-0" style={{ background: `${accent}12`, color: accent }}>
                      {t.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side panel */}
          <div className="space-y-4">
            {/* Velocity */}
            <div className="rounded-[18px] border p-4" style={{ background: "rgba(13,14,18,0.7)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold text-white font-sora flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" style={{ color: C.primary }} />
                  Velocity
                </h3>
                <span className="text-[9px] font-mono text-white/40">60min</span>
              </div>
              <div className="mb-2">
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-sora">Last minute</p>
                <p className="text-2xl font-bold font-mono text-white"><Counter value={lastMinCount} /> <span className="text-[10px] font-normal text-white/40">/min</span></p>
              </div>
              <div className="flex items-end gap-px h-[80px] mt-3">
                {velocity.map((b, i) => {
                  const h = (b.count / maxBucket) * 100;
                  const isLast = i === velocity.length - 1;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm relative group"
                      style={{
                        height: `${Math.max(h, 2)}%`,
                        background: isLast
                          ? `linear-gradient(180deg, ${C.glow}, ${C.primary})`
                          : `linear-gradient(180deg, ${C.primary}80, ${C.primary}30)`,
                        boxShadow: isLast ? `0 0 6px ${C.primary}` : "none",
                        transition: "height 0.4s cubic-bezier(0.22,1,0.36,1)",
                      }}
                      title={`${b.count} txns`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[9px] text-white/30 font-mono mt-1">
                <span>−60m</span><span>now</span>
              </div>
            </div>

            {/* Top merchants */}
            <div className="rounded-[18px] border p-4" style={{ background: "rgba(13,14,18,0.7)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold text-white font-sora flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" style={{ color: C.primary }} />
                  Top Merchants
                </h3>
                <span className="text-[9px] font-mono text-white/40">today</span>
              </div>
              {topMerchants.length === 0 ? (
                <p className="text-[10px] text-white/30 text-center py-6 font-sora">No merchant data yet</p>
              ) : (
                <div className="space-y-2">
                  {topMerchants.map((m, i) => (
                    <div key={m.name} className="flex items-center gap-2.5 p-2 rounded-[10px]" style={{ background: i === 0 ? "rgba(200,149,46,0.06)" : "rgba(255,255,255,0.02)" }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: i === 0 ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : "rgba(255,255,255,0.06)", color: i === 0 ? "#fff" : "rgba(255,255,255,0.6)" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-white truncate font-sora">{m.name}</p>
                        <p className="text-[9px] font-mono text-white/40">{m.count} txns · {fmtPaise(m.volume)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anomaly card (always shown, OK or alerting) */}
            <div className="rounded-[18px] border p-4" style={{ background: spike ? "rgba(245,158,11,0.06)" : "rgba(13,14,18,0.7)", backdropFilter: "blur(20px)", borderColor: spike ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-semibold text-white font-sora flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: spike ? C.warning : C.success }} />
                  Anomaly Watch
                </h3>
                <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full font-mono" style={{ background: spike ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.12)", color: spike ? C.warning : C.success }}>
                  {spike ? "ALERT" : "OK"}
                </span>
              </div>
              <p className="text-[10px] text-white/50 font-sora leading-relaxed">
                Baseline: <span className="font-mono text-white/70">{avgVelocity.toFixed(1)}/min</span><br />
                Current: <span className="font-mono text-white/70">{lastMinCount}/min</span><br />
                Threshold: <span className="font-mono text-white/70">3× baseline</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes kpi-in { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes feed-row-in { 0% { opacity: 0; transform: translateY(-12px); background: rgba(200,149,46,0.08); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>
    </AdminLayout>
  );
};

const Row = ({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-[10px] uppercase tracking-wider text-white/40 font-sora shrink-0 pt-0.5">{k}</span>
    <span className={`text-[12px] text-white text-right ${mono ? "font-mono break-all" : "font-sora"}`}>{v}</span>
  </div>
);

export default AdminActivityLog;
