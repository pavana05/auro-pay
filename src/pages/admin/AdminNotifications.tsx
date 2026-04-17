import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  Send, Bell, Clock, Users, User, Zap, Eye, Search, Filter, Calendar,
  ShieldCheck, Wallet as WalletIcon, Sparkles, X, Smartphone, ChevronDown,
} from "lucide-react";
import { ADMIN_NOTIFICATION_TYPES } from "@/lib/admin-notifications";

type AudienceMode = "all" | "role" | "kyc" | "balance" | "active" | "specific";

const NOTIFICATION_TEMPLATES = [
  { id: "welcome", icon: "👋", name: "Welcome", title: "Welcome to PayVibe!", body: "We're excited to have you. Tap to explore your wallet, rewards, and savings goals." },
  { id: "kyc-reminder", icon: "🛡️", name: "KYC reminder", title: "Complete your KYC", body: "Verify your identity in 2 minutes to unlock full payment access and higher limits." },
  { id: "low-balance", icon: "💰", name: "Low balance", title: "Wallet running low", body: "Your balance is below ₹100. Add money now to keep things rolling." },
  { id: "promo", icon: "🎁", name: "New reward", title: "🎁 New reward unlocked!", body: "Check the rewards tab — a fresh deal just dropped." },
  { id: "maintenance", icon: "🛠️", name: "Maintenance", title: "Scheduled maintenance", body: "PayVibe will be briefly unavailable tonight 12-1 AM IST for upgrades. Thanks for your patience." },
  { id: "security", icon: "🔒", name: "Security alert", title: "Important security update", body: "Please review your recent activity and ensure your security PIN is up to date." },
];

const AdminNotifications = () => {
  // Compose
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Audience
  const [mode, setMode] = useState<AudienceMode>("all");
  const [roleFilter, setRoleFilter] = useState<"teen" | "parent" | "all">("all");
  const [kycFilter, setKycFilter] = useState<"verified" | "pending" | "rejected">("verified");
  const [balanceMin, setBalanceMin] = useState<number | "">("");
  const [balanceMax, setBalanceMax] = useState<number | "">("");
  const [activeDays, setActiveDays] = useState<number>(7);
  const [specificQuery, setSpecificQuery] = useState("");
  const [specificResults, setSpecificResults] = useState<any[]>([]);
  const [specificSelected, setSpecificSelected] = useState<any | null>(null);

  // Estimated count
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  // Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");

  // Sending
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Profiles cache for sender names
  const [profilesById, setProfilesById] = useState<Record<string, any>>({});

  /* ───────── Load history + profiles ───────── */
  const loadHistory = async () => {
    setHistoryLoading(true);
    // Only show admin-relevant notifications in the history feed — exclude
    // routine user-only types like `transfer`, `payment`, `reward`, etc.
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .in("type", ADMIN_NOTIFICATION_TYPES as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(100);
    setHistory(data || []);
    setHistoryLoading(false);
  };
  useEffect(() => { loadHistory(); }, []);

  /* ───────── Estimate audience count (live) ───────── */
  const estimateRecipients = async (): Promise<string[]> => {
    if (mode === "specific") {
      return specificSelected ? [specificSelected.id] : [];
    }
    if (mode === "balance") {
      let q = supabase.from("wallets").select("user_id");
      if (balanceMin !== "") q = q.gte("balance", Number(balanceMin) * 100);
      if (balanceMax !== "") q = q.lte("balance", Number(balanceMax) * 100);
      const { data } = await q;
      return (data || []).map((w: any) => w.user_id);
    }
    if (mode === "active") {
      const since = new Date(); since.setDate(since.getDate() - activeDays);
      const { data } = await supabase.from("notifications").select("user_id").gte("created_at", since.toISOString());
      return Array.from(new Set((data || []).map((n: any) => n.user_id)));
    }
    let q = supabase.from("profiles").select("id");
    if (mode === "role" && roleFilter !== "all") q = q.eq("role", roleFilter);
    if (mode === "kyc") q = q.eq("kyc_status", kycFilter);
    const { data } = await q;
    return (data || []).map((p: any) => p.id);
  };

  useEffect(() => {
    let cancelled = false;
    setEstimating(true);
    const t = setTimeout(async () => {
      const ids = await estimateRecipients();
      if (!cancelled) { setEstimatedCount(ids.length); setEstimating(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, roleFilter, kycFilter, balanceMin, balanceMax, activeDays, specificSelected]);

  /* ───────── Specific user search ───────── */
  useEffect(() => {
    if (mode !== "specific" || !specificQuery.trim()) { setSpecificResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, phone, role")
        .or(`phone.ilike.%${specificQuery}%,full_name.ilike.%${specificQuery}%`).limit(8);
      setSpecificResults(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [specificQuery, mode]);

  /* ───────── Send ───────── */
  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Title and body required"); return; }
    setSending(true);
    try {
      const userIds = await estimateRecipients();
      if (userIds.length === 0) { toast.error("No recipients match your filters"); setSending(false); return; }
      const notifications = userIds.map((uid) => ({ user_id: uid, title: title.trim(), body: body.trim(), type: "system" }));
      // Chunk inserts to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        const { error } = await supabase.from("notifications").insert(notifications.slice(i, i + chunkSize));
        if (error) throw error;
      }
      toast.success(`Sent to ${userIds.length} ${userIds.length === 1 ? "user" : "users"}`);
      setTitle(""); setBody("");
      loadHistory();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSending(false); }
  };

  /* ───────── UI ───────── */
  const audienceOptions: { v: AudienceMode; label: string; icon: any }[] = [
    { v: "all", label: "All", icon: Users },
    { v: "role", label: "By role", icon: User },
    { v: "kyc", label: "By KYC", icon: ShieldCheck },
    { v: "balance", label: "By balance", icon: WalletIcon },
    { v: "active", label: "By activity", icon: Clock },
    { v: "specific", label: "Specific user", icon: Zap },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <h1 className="text-2xl font-bold tracking-tight">Notifications Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Mass communication with audience targeting & live preview</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Left + Center: compose + audience + preview */}
          <div className="xl:col-span-2 space-y-4">
            {/* Templates */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.05s both" }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quick templates</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {NOTIFICATION_TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => { setTitle(t.title); setBody(t.body); toast.success(`Loaded: ${t.name}`); }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-[11px] hover:bg-white/[0.06] hover:border-primary/20 transition-all">
                    <span className="mr-1">{t.icon}</span>{t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Compose */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.1s both" }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Send className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Compose</h3>
                  <p className="text-[10px] text-muted-foreground">{title.length}/100 title · {body.length}/250 body</p>
                </div>
              </div>

              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Title</label>
              <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="A clear, attention-grabbing title"
                className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all duration-300 mb-3" />

              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Body</label>
              <textarea value={body} maxLength={250} onChange={(e) => setBody(e.target.value)} placeholder="What do you want to tell your users?"
                className="w-full h-24 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all duration-300" />
            </div>

            {/* Audience builder */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.15s both" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold">Audience</h3>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  estimating ? "bg-white/[0.03] border-white/[0.06]" : "bg-primary/[0.06] border-primary/20"
                }`}>
                  {estimating ? (
                    <div className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  ) : (
                    <Users className="w-3 h-3 text-primary" />
                  )}
                  <span className="text-xs font-mono font-semibold">
                    {estimating ? "…" : estimatedCount?.toLocaleString() ?? "0"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">recipients</span>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 mb-4">
                {audienceOptions.map((opt) => (
                  <button key={opt.v} onClick={() => setMode(opt.v)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      mode === opt.v
                        ? "border-primary/30 bg-primary/[0.06] shadow-[0_0_16px_hsl(42_78%_55%/0.08)]"
                        : "border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08]"
                    }`}>
                    <opt.icon className={`w-3.5 h-3.5 mb-1.5 ${mode === opt.v ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-[10px] font-medium">{opt.label}</p>
                  </button>
                ))}
              </div>

              {/* Mode-specific filters */}
              {mode === "role" && (
                <div className="flex gap-2">
                  {["all", "teen", "parent"].map((r) => (
                    <button key={r} onClick={() => setRoleFilter(r as any)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${roleFilter === r ? "bg-primary/15 text-primary border border-primary/25" : "bg-white/[0.03] border border-white/[0.04] text-muted-foreground"}`}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              {mode === "kyc" && (
                <div className="flex gap-2">
                  {["verified", "pending", "rejected"].map((k) => (
                    <button key={k} onClick={() => setKycFilter(k as any)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${kycFilter === k ? "bg-primary/15 text-primary border border-primary/25" : "bg-white/[0.03] border border-white/[0.04] text-muted-foreground"}`}>
                      {k.charAt(0).toUpperCase() + k.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              {mode === "balance" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Min ₹</label>
                    <input type="number" value={balanceMin} onChange={(e) => setBalanceMin(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0"
                      className="w-full h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-xs focus:outline-none focus:border-primary/40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Max ₹</label>
                    <input type="number" value={balanceMax} onChange={(e) => setBalanceMax(e.target.value === "" ? "" : Number(e.target.value))} placeholder="∞"
                      className="w-full h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-xs focus:outline-none focus:border-primary/40" />
                  </div>
                </div>
              )}
              {mode === "active" && (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Active in last (days)</label>
                  <div className="flex gap-2">
                    {[1, 7, 30, 90].map((d) => (
                      <button key={d} onClick={() => setActiveDays(d)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${activeDays === d ? "bg-primary/15 text-primary border border-primary/25" : "bg-white/[0.03] border border-white/[0.04] text-muted-foreground"}`}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {mode === "specific" && (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input value={specificQuery} onChange={(e) => { setSpecificQuery(e.target.value); setSpecificSelected(null); }} placeholder="Search by name or phone…"
                      className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] pl-9 pr-3 text-xs focus:outline-none focus:border-primary/40" />
                  </div>
                  {specificSelected ? (
                    <div className="mt-2 p-2.5 rounded-lg bg-primary/[0.05] border border-primary/20 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold">{specificSelected.full_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{specificSelected.phone} · {specificSelected.role}</p>
                      </div>
                      <button onClick={() => { setSpecificSelected(null); setSpecificQuery(""); }} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : specificResults.length > 0 && (
                    <div className="mt-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] divide-y divide-white/[0.04]">
                      {specificResults.map((r) => (
                        <button key={r.id} onClick={() => { setSpecificSelected(r); setSpecificResults([]); }}
                          className="w-full p-2.5 text-left hover:bg-white/[0.03]">
                          <p className="text-xs font-medium">{r.full_name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{r.phone} · {r.role}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Schedule + Send */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-3 flex-wrap" style={{ animation: "slide-up-spring 0.5s 0.2s both" }}>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} className="accent-primary" />
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Schedule for later
              </label>
              {scheduleEnabled && (
                <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)}
                  className="h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 text-xs focus:outline-none focus:border-primary/40" />
              )}
              {scheduleEnabled && <p className="text-[10px] text-muted-foreground">Scheduled sends require a cron worker — currently sends immediately.</p>}
              <button onClick={send} disabled={sending || !title.trim() || !body.trim() || estimatedCount === 0}
                className="ml-auto h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:shadow-[0_0_30px_hsl(42_78%_55%/0.2)] transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed">
                <Send className="w-4 h-4" /> {sending ? "Sending…" : `Send to ${estimatedCount?.toLocaleString() ?? 0}`}
              </button>
            </div>
          </div>

          {/* Right: Phone preview + History */}
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.25s both" }}>
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Live preview</h3>
              </div>
              <PhonePreview title={title} body={body} />
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s 0.3s both" }}>
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-4 h-4 text-accent" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold">History</h3>
                  <p className="text-[10px] text-muted-foreground">{history.length} sent</p>
                </div>
              </div>
              <div className="space-y-2 max-h-[480px] overflow-y-auto -mr-2 pr-2">
                {historyLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-lg overflow-hidden relative">
                      <div className="absolute inset-0 bg-white/[0.02]" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" style={{ animation: "admin-shimmer 2s infinite" }} />
                    </div>
                  ))
                ) : history.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">No notifications yet</p>
                ) : (
                  history.map((n: any, i: number) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all"
                      style={{ animation: `slide-up-spring 0.4s ${Math.min(i * 0.02, 0.2)}s both` }}>
                      <p className="text-xs font-medium line-clamp-1">{n.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{n.body}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] text-muted-foreground/70">
                          {n.created_at ? new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                        </span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${n.is_read ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {n.is_read ? "Read" : "Unread"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

/* ───────── Phone preview ───────── */
const PhonePreview = ({ title, body }: { title: string; body: string }) => (
  <div className="mx-auto" style={{ maxWidth: 240 }}>
    <div className="rounded-[2rem] bg-gradient-to-b from-[#1a1d22] to-[#0d0f12] border border-white/[0.08] p-3 shadow-2xl relative">
      {/* notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-black/60" />
      <div className="pt-5 pb-3 px-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[9px] font-medium text-white/60">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-sm bg-white/40" />
            <div className="w-3 h-1.5 rounded-sm bg-white/60" />
            <div className="w-4 h-2 rounded-sm border border-white/40" />
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.06] p-2.5"
          style={{ animation: "slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/30 border border-primary/40 flex items-center justify-center flex-shrink-0">
              <Bell className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] font-semibold text-white">PayVibe</p>
                <p className="text-[8px] text-white/40">now</p>
              </div>
              <p className="text-[10px] font-semibold text-white line-clamp-1">{title || "Notification title"}</p>
              <p className="text-[9px] text-white/70 line-clamp-3 leading-snug">{body || "Your message will appear here exactly as the user sees it."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p className="text-[10px] text-muted-foreground text-center mt-3">As it appears on a user's lock screen</p>
  </div>
);

export default AdminNotifications;
