import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  Calendar, Clock, CheckCircle2, AlertTriangle, RefreshCw, Search,
  ArrowRight, TrendingUp, Wallet, Zap, Users,
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

interface Schedule {
  id: string;
  parent_id: string;
  teen_id: string;
  pocket_money_amount: number;
  pocket_money_frequency: string;
  pocket_money_day: number | null;
  is_active: boolean;
  parent_name: string;
  teen_name: string;
  parent_balance: number;
  next_run: Date;
  has_funds: boolean;
}

const FREQ_LABEL: Record<string, string> = { daily: "Every day", weekly: "Every week", monthly: "Every month" };
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const computeNextRun = (freq: string, day: number | null): Date => {
  const now = new Date();
  const next = new Date(now);
  if (freq === "daily") {
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
  } else if (freq === "weekly") {
    const target = day ?? 1;
    const delta = (target - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + delta);
    next.setHours(9, 0, 0, 0);
  } else {
    const target = day ?? 1;
    next.setMonth(now.getMonth() + (now.getDate() >= target ? 1 : 0));
    next.setDate(target);
    next.setHours(9, 0, 0, 0);
  }
  return next;
};

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const AdminPocketMoney = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [lastRun, setLastRun] = useState<{ at: Date; sent: number; failed: number } | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data: links } = await supabase
      .from("parent_teen_links")
      .select("*")
      .eq("is_active", true)
      .gt("pocket_money_amount", 0);

    if (!links || links.length === 0) { setSchedules([]); setLoading(false); return; }

    const parentIds = [...new Set(links.map((l: any) => l.parent_id))];
    const teenIds = [...new Set(links.map((l: any) => l.teen_id))];

    const [{ data: profiles }, { data: wallets }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", [...parentIds, ...teenIds]),
      supabase.from("wallets").select("user_id, balance").in("user_id", parentIds),
    ]);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
    const balanceMap: Record<string, number> = {};
    (wallets || []).forEach((w: any) => { balanceMap[w.user_id] = w.balance || 0; });

    const result: Schedule[] = (links as any[]).map((l: any) => {
      const amt = l.pocket_money_amount || 0;
      const bal = balanceMap[l.parent_id] || 0;
      return {
        id: l.id,
        parent_id: l.parent_id,
        teen_id: l.teen_id,
        pocket_money_amount: amt,
        pocket_money_frequency: l.pocket_money_frequency || "monthly",
        pocket_money_day: l.pocket_money_day,
        is_active: l.is_active,
        parent_name: profileMap[l.parent_id]?.full_name || "Parent",
        teen_name: profileMap[l.teen_id]?.full_name || "Teen",
        parent_balance: bal,
        next_run: computeNextRun(l.pocket_money_frequency || "monthly", l.pocket_money_day),
        has_funds: bal >= amt,
      };
    });
    setSchedules(result);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return schedules;
    const s = search.toLowerCase();
    return schedules.filter(sc => sc.parent_name.toLowerCase().includes(s) || sc.teen_name.toLowerCase().includes(s));
  }, [schedules, search]);

  const failedSchedules = useMemo(() => filtered.filter(s => !s.has_funds), [filtered]);
  const activeSchedules = useMemo(() => filtered.filter(s => s.has_funds), [filtered]);
  const totalMonthly = useMemo(() => {
    return filtered.reduce((sum, s) => {
      const mult = s.pocket_money_frequency === "daily" ? 30 : s.pocket_money_frequency === "weekly" ? 4 : 1;
      return sum + s.pocket_money_amount * mult;
    }, 0);
  }, [filtered]);

  const runNow = async () => {
    setTriggering(true);
    try {
      const { error } = await supabase.functions.invoke("pocket-money-scheduler");
      if (error) throw error;
      const sent = activeSchedules.length;
      const failed = failedSchedules.length;
      setLastRun({ at: new Date(), sent, failed });
      toast.success(`Scheduler ran: ${sent} sent, ${failed} failed`);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Scheduler failed");
    } finally {
      setTriggering(false);
    }
  };

  const retryOne = async (sc: Schedule) => {
    setRetrying(sc.id);
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", sc.parent_id).maybeSingle();
    if (!wallet || (wallet.balance || 0) < sc.pocket_money_amount) {
      toast.error(`${sc.parent_name} still has insufficient balance`);
      setRetrying(null);
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("pocket-money-scheduler");
      if (error) throw error;
      toast.success(`Retry triggered for ${sc.teen_name}`);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Retry failed");
    } finally {
      setRetrying(null);
    }
  };

  const fmtRel = (d: Date) => {
    const diff = (d.getTime() - Date.now()) / 1000;
    if (diff < 0) return "Overdue";
    if (diff < 3600) return `In ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `In ${Math.floor(diff / 3600)}h`;
    return `In ${Math.floor(diff / 86400)}d`;
  };

  const initials = (n: string) => n.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "rgba(200,149,46,0.04)", filter: "blur(120px)" }} />

        <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary }}>Pocket Money Schedules</h1>
            <p className="text-xs mt-1.5" style={{ color: C.textSecondary }}>Automation control · {schedules.length} active schedules</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="p-2 rounded-[10px]" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textSecondary }}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={runNow} disabled={triggering} className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)`, boxShadow: `0 4px 14px ${C.primary}33` }}>
              <Zap className={`w-3.5 h-3.5 ${triggering ? "animate-pulse" : ""}`} /> {triggering ? "Running…" : "Run Scheduler Now"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
          {[
            { label: "Active", value: activeSchedules.length, icon: CheckCircle2, color: C.success },
            { label: "Failed (low balance)", value: failedSchedules.length, icon: AlertTriangle, color: C.danger },
            { label: "Total per month", value: fmtINR(totalMonthly), icon: TrendingUp, color: C.primary },
            { label: "Recipients", value: new Set(filtered.map(s => s.teen_id)).size, icon: Users, color: C.secondary },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-[14px] p-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: C.textMuted }}>{s.label}</span>
                </div>
                <p className="text-xl font-bold tabular-nums" style={{ color: C.textPrimary }}>{s.value}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-[16px] p-5 relative z-10" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}33` }}>
                <Clock className="w-4 h-4" style={{ color: C.primary }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>Cron Job Status</p>
                <p className="text-[11px]" style={{ color: C.textMuted }}>pocket-money-scheduler · runs daily at 09:00 IST</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div>
                <p className="uppercase tracking-wider" style={{ color: C.textMuted }}>Last run</p>
                <p className="font-semibold mt-0.5" style={{ color: C.textPrimary }}>{lastRun ? lastRun.at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Not run yet"}</p>
              </div>
              <div className="w-px h-8" style={{ background: C.border }} />
              <div>
                <p className="uppercase tracking-wider" style={{ color: C.textMuted }}>Next run</p>
                <p className="font-semibold mt-0.5" style={{ color: C.textPrimary }}>Tomorrow 09:00</p>
              </div>
              {lastRun && (
                <>
                  <div className="w-px h-8" style={{ background: C.border }} />
                  <div>
                    <p className="uppercase tracking-wider" style={{ color: C.textMuted }}>Last results</p>
                    <p className="font-semibold mt-0.5">
                      <span style={{ color: C.success }}>{lastRun.sent} sent</span>
                      <span style={{ color: C.textMuted }}> · </span>
                      <span style={{ color: C.danger }}>{lastRun.failed} failed</span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: C.textMuted }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by parent or teen name…"
            className="w-full h-9 pl-9 pr-3 rounded-[10px] text-xs focus:outline-none"
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.textPrimary }} />
        </div>

        {failedSchedules.length > 0 && (
          <section className="relative z-10 rounded-[16px] overflow-hidden" style={{ background: `linear-gradient(180deg, rgba(239,68,68,0.04), ${C.cardBg})`, border: `1px solid ${C.danger}33` }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${C.danger}22` }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: C.danger }} />
                <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Failed schedules</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${C.danger}20`, color: C.danger }}>{failedSchedules.length}</span>
              </div>
              <span className="text-[10px]" style={{ color: C.textMuted }}>Insufficient balance to charge parent</span>
            </div>
            <div className="divide-y" style={{ borderColor: `${C.danger}10` }}>
              {failedSchedules.map(sc => (
                <div key={sc.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${C.danger}, #dc2626)` }}>{initials(sc.parent_name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{sc.parent_name} → {sc.teen_name}</p>
                    <p className="text-[11px]" style={{ color: C.textMuted }}>
                      Needs {fmtINR(sc.pocket_money_amount)} · has only {fmtINR(sc.parent_balance)}
                    </p>
                  </div>
                  <button onClick={() => retryOne(sc)} disabled={retrying === sc.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold disabled:opacity-50"
                    style={{ background: `${C.danger}15`, color: C.danger, border: `1px solid ${C.danger}44` }}>
                    <RefreshCw className={`w-3 h-3 ${retrying === sc.id ? "animate-spin" : ""}`} /> Retry
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 relative z-10">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 rounded-[16px] animate-pulse" style={{ background: "rgba(255,255,255,0.02)" }} />)}
          </div>
        ) : activeSchedules.length === 0 && failedSchedules.length === 0 ? (
          <div className="rounded-[18px] p-16 text-center relative z-10" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
            <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: C.textMuted }} />
            <p className="text-sm" style={{ color: C.textSecondary }}>No active pocket money schedules</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 relative z-10">
            {activeSchedules.map(sc => {
              const dayLabel = sc.pocket_money_frequency === "weekly"
                ? DAY_NAMES[sc.pocket_money_day ?? 1]
                : sc.pocket_money_frequency === "monthly"
                  ? `${sc.pocket_money_day ?? 1}${["st","nd","rd"][((sc.pocket_money_day ?? 1) - 1) % 10] || "th"}`
                  : "Daily";
              return (
                <div key={sc.id} className="rounded-[16px] p-5 transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                  style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{initials(sc.parent_name)}</div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: C.textMuted }}>Parent</p>
                        <p className="text-xs font-semibold truncate" style={{ color: C.textPrimary }}>{sc.parent_name}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0" style={{ color: C.textMuted }} />
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${C.success}, #16a34a)` }}>{initials(sc.teen_name)}</div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: C.textMuted }}>Teen</p>
                        <p className="text-xs font-semibold truncate" style={{ color: C.textPrimary }}>{sc.teen_name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[12px] p-3 mb-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textMuted }}>Amount</span>
                      <span className="text-lg font-bold tabular-nums" style={{ color: C.primary }}>{fmtINR(sc.pocket_money_amount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-[10px]" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                      <Calendar className="w-3.5 h-3.5" style={{ color: C.secondary }} />
                      <div>
                        <p className="text-[10px]" style={{ color: C.textMuted }}>{FREQ_LABEL[sc.pocket_money_frequency]}</p>
                        <p className="text-xs font-semibold" style={{ color: C.textPrimary }}>{dayLabel}</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-[10px]" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                      <Clock className="w-3.5 h-3.5" style={{ color: C.secondary }} />
                      <div>
                        <p className="text-[10px]" style={{ color: C.textMuted }}>Next run</p>
                        <p className="text-xs font-semibold" style={{ color: C.textPrimary }}>{fmtRel(sc.next_run)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full"
                      style={{ background: `${C.success}15`, color: C.success, border: `1px solid ${C.success}33` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.success, boxShadow: `0 0 6px ${C.success}` }} />
                      Active
                    </span>
                    <span className="text-[10px] flex items-center gap-1" style={{ color: C.textMuted }}>
                      <Wallet className="w-2.5 h-2.5" /> Parent balance: {fmtINR(sc.parent_balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPocketMoney;
