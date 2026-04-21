import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Smartphone, Apple } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";

type EventRow = {
  event_type: string;
  created_at: string;
  platform: string | null;
};

type WaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  user_agent: string | null;
  created_at: string;
};

type DayBucket = {
  day: string;
  gate_impression: number;
  deep_link_attempt: number;
  play_store_click: number;
};

const COLORS = {
  gate_impression: "hsl(var(--muted-foreground))",
  deep_link_attempt: "hsl(45 70% 55%)",
  play_store_click: "hsl(var(--primary))",
};

function dayKey(iso: string) {
  return iso.slice(0, 10); // YYYY-MM-DD (UTC)
}

function csvEscape(v: string | null | undefined) {
  const s = (v ?? "").toString();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AdminConversion() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [evRes, wlRes] = await Promise.all([
        supabase
          .from("gate_analytics_events")
          .select("event_type, created_at, platform")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(10000),
        supabase
          .from("ios_waitlist")
          .select("id, email, name, user_agent, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);
      if (cancelled) return;
      if (evRes.error) toast.error(evRes.error.message);
      if (wlRes.error) toast.error(wlRes.error.message);
      setEvents((evRes.data as EventRow[]) ?? []);
      setWaitlist((wlRes.data as WaitlistRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { chartData, totals } = useMemo(() => {
    const buckets = new Map<string, DayBucket>();
    // Seed last 30 days so the chart isn't gappy.
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const k = d.toISOString().slice(0, 10);
      buckets.set(k, { day: k, gate_impression: 0, deep_link_attempt: 0, play_store_click: 0 });
    }
    const t = { gate_impression: 0, deep_link_attempt: 0, play_store_click: 0 };
    for (const e of events) {
      const k = dayKey(e.created_at);
      const b = buckets.get(k);
      if (!b) continue;
      if (e.event_type === "gate_impression" || e.event_type === "deep_link_attempt" || e.event_type === "play_store_click") {
        b[e.event_type] += 1;
        t[e.event_type] += 1;
      }
    }
    return { chartData: Array.from(buckets.values()), totals: t };
  }, [events]);

  const conversionRate =
    totals.gate_impression > 0
      ? ((totals.play_store_click / totals.gate_impression) * 100).toFixed(1)
      : "0.0";

  const handleExport = () => {
    if (waitlist.length === 0) {
      toast.info("No waitlist entries to export.");
      return;
    }
    const header = ["email", "name", "user_agent", "created_at"];
    const rows = waitlist.map((r) =>
      [r.email, r.name, r.user_agent, r.created_at].map(csvEscape).join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ios-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Web → App Conversion
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Last 30 days of gate impressions, deep-link attempts, and Play Store clicks.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard label="Gate impressions" value={totals.gate_impression} />
        <StatCard label="Deep-link attempts" value={totals.deep_link_attempt} />
        <StatCard label="Play Store clicks" value={totals.play_store_click} />
        <StatCard label="Conversion rate" value={`${conversionRate}%`} accent />
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Funnel by day
        </h2>
        <div className="h-[320px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="gate_impression" stroke={COLORS.gate_impression} strokeWidth={2} dot={false} name="Impressions" />
                <Line type="monotone" dataKey="deep_link_attempt" stroke={COLORS.deep_link_attempt} strokeWidth={2} dot={false} name="Deep-link attempts" />
                <Line type="monotone" dataKey="play_store_click" stroke={COLORS.play_store_click} strokeWidth={2} dot={false} name="Play Store clicks" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Apple className="h-4 w-4 text-primary" />
            iOS waitlist
            <span className="text-xs font-normal text-muted-foreground">
              ({waitlist.length})
            </span>
          </h2>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={waitlist.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : waitlist.length === 0 ? (
                <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No signups yet.</td></tr>
              ) : (
                waitlist.map((w) => (
                  <tr key={w.id} className="border-b border-border/40">
                    <td className="py-2 pr-3 text-foreground">{w.email}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{w.name ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {new Date(w.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
    </Card>
  );
}
