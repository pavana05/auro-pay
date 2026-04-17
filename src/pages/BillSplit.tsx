// Screen 20 — Bill Split: create with participants, equal/custom shares,
// pay via wallet, reminders for unpaid, auto-settle.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft, Plus, Users, Check, Clock, X, Bell, Trash2,
  ChevronRight, Wallet, Sparkles, UserPlus,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface BillSplit {
  id: string;
  title: string;
  total_amount: number;
  category: string | null;
  status: string;
  created_at: string;
  created_by: string;
}

interface Member {
  id: string;
  split_id: string;
  user_id: string;
  share_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  // augmented client-side
  display_name?: string;
  avatar_emoji?: string;
}

interface Favorite {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_upi_id: string | null;
  avatar_emoji: string | null;
  user_id: string;
}

type Participant = {
  key: string;
  user_id: string | null; // null => manual / no app account yet
  name: string;
  emoji: string;
  share: number; // paise
  source: "self" | "favorite" | "manual";
};

const fmt = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const BillSplitPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [splits, setSplits] = useState<BillSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [activeSplitId, setActiveSplitId] = useState<string | null>(null);

  // URL-param prefill: /bill-split?title=&amount=&category=
  const qpTitle = searchParams.get("title") || "";
  const qpAmount = searchParams.get("amount") || "";
  const qpCategory = searchParams.get("category") || "";
  const [prefill, setPrefill] = useState<{ title: string; amount: string; category: string } | null>(null);

  useEffect(() => {
    if (qpTitle || qpAmount || qpCategory) {
      setPrefill({ title: qpTitle, amount: qpAmount, category: qpCategory });
      setView("create");
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setMe({ id: user.id, name: profile?.full_name ?? "You" });
    })();
  }, []);

  const fetchSplits = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bill_splits").select("*").order("created_at", { ascending: false });
    setSplits((data ?? []) as BillSplit[]);
    setLoading(false);
  };

  useEffect(() => { if (view === "list") fetchSplits(); }, [view]);

  return (
    <div className="min-h-[100dvh] bg-background pb-28 relative overflow-hidden text-foreground">
      <style>{`
        @keyframes bs-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .bs-in { animation: bs-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full opacity-[0.035] blur-[100px]" style={{ background: "hsl(var(--primary))" }} />
      </div>

      {view === "list" && (
        <ListView
          splits={splits} loading={loading}
          onCreate={() => { haptic.light(); setView("create"); }}
          onOpen={(id) => { haptic.light(); setActiveSplitId(id); setView("detail"); }}
          onBack={() => navigate(-1)}
        />
      )}
      {view === "create" && me && (
        <CreateView
          me={me}
          prefill={prefill}
          onCancel={() => { setPrefill(null); setView("list"); }}
          onCreated={(id) => { setPrefill(null); setActiveSplitId(id); setView("detail"); }}
        />
      )}
      {view === "detail" && activeSplitId && me && (
        <DetailView
          splitId={activeSplitId} me={me}
          onBack={() => { setActiveSplitId(null); setView("list"); }}
        />
      )}

      <BottomNav />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// LIST VIEW
// ─────────────────────────────────────────────────────────
const ListView = ({ splits, loading, onCreate, onOpen, onBack }: {
  splits: BillSplit[]; loading: boolean;
  onCreate: () => void; onOpen: (id: string) => void; onBack: () => void;
}) => (
  <div className="relative z-10 px-5">
    <div className="pt-4 pb-5 bs-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-10 h-10 rounded-[13px] flex items-center justify-center active:scale-90 transition border border-white/[0.04]"
            style={{ background: "hsl(220 15% 8%)" }}>
            <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
          </button>
          <div>
            <h1 className="text-[19px] font-bold tracking-[-0.5px]">Bill Split</h1>
            <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Split expenses with friends</p>
          </div>
        </div>
        <button onClick={onCreate}
          className="h-10 px-4 rounded-[13px] flex items-center gap-1.5 active:scale-95 transition font-semibold text-[12px]"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
            color: "hsl(220 20% 6%)",
            boxShadow: "0 4px 16px hsl(var(--primary) / 0.25)",
          }}>
          <Plus className="w-4 h-4" /> New Split
        </button>
      </div>
    </div>

    {loading ? (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[80px] rounded-[18px] overflow-hidden relative">
            <div className="absolute inset-0" style={{ background: "hsl(220 15% 8%)" }} />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(110deg, transparent 30%, hsl(220 15% 12%) 50%, transparent 70%)",
              backgroundSize: "200% 100%", animation: "shimmer 1.8s ease-in-out infinite",
            }} />
          </div>
        ))}
      </div>
    ) : splits.length === 0 ? (
      <div className="text-center py-20 bs-in">
        <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mx-auto mb-4 border border-white/[0.04]"
          style={{ background: "linear-gradient(135deg, hsl(220 15% 9%), hsl(220 18% 6%))" }}>
          <Users className="w-8 h-8 text-white/15" />
        </div>
        <p className="text-sm font-semibold text-white/40 mb-1">No bill splits yet</p>
        <p className="text-xs text-white/25">Tap New Split to get started</p>
      </div>
    ) : (
      <div className="space-y-2.5">
        {splits.map((s, idx) => {
          const settled = s.status === "settled";
          const accent = settled ? "152 60% 45%" : "var(--primary)";
          return (
            <button key={s.id} onClick={() => onOpen(s.id)}
              className="w-full text-left rounded-[18px] p-4 border border-white/[0.04] relative overflow-hidden active:scale-[0.98] transition bs-in"
              style={{
                background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                animationDelay: `${0.05 + idx * 0.04}s`,
              }}>
              <div className="absolute top-0 left-4 right-4 h-px"
                style={{ background: `linear-gradient(90deg, transparent, hsl(${accent} / 0.18), transparent)` }} />
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, hsl(${accent} / 0.12), hsl(${accent} / 0.04))` }}>
                  <Users className="w-5 h-5" style={{ color: `hsl(${accent})` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{s.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{
                        background: settled ? "hsl(152 60% 45% / 0.1)" : "hsl(38 92% 50% / 0.1)",
                        color: settled ? "hsl(152 60% 50%)" : "hsl(38 92% 55%)",
                      }}>
                      {settled ? <Check className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                      {s.status}
                    </span>
                    <span className="text-[9px] text-white/25">
                      {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-[14px] font-bold tracking-[-0.3px]"
                    style={{
                      background: `linear-gradient(135deg, hsl(${accent}), hsl(${accent} / 0.7))`,
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>{fmt(s.total_amount)}</p>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────
// CREATE VIEW
// ─────────────────────────────────────────────────────────
const CreateView = ({ me, onCancel, onCreated }: {
  me: { id: string; name: string };
  onCancel: () => void;
  onCreated: (splitId: string) => void;
}) => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([
    { key: "self", user_id: me.id, name: me.name + " (You)", emoji: "🫵", share: 0, source: "self" },
  ]);
  const [picker, setPicker] = useState(false);
  const [manualName, setManualName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quick_pay_favorites").select("*").order("last_paid_at", { ascending: false, nullsFirst: false });
      setFavorites((data ?? []) as Favorite[]);
    })();
  }, []);

  const totalPaise = Math.round((parseFloat(amount || "0") || 0) * 100);

  // Recompute equal shares whenever amount or participants change in equal mode
  useEffect(() => {
    if (mode !== "equal" || participants.length === 0) return;
    const each = Math.floor(totalPaise / participants.length);
    const remainder = totalPaise - each * participants.length;
    setParticipants(prev => prev.map((p, i) => ({ ...p, share: each + (i === 0 ? remainder : 0) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPaise, mode, participants.length]);

  const sumShares = participants.reduce((s, p) => s + p.share, 0);
  const customDiff = totalPaise - sumShares;

  const addFavorite = (f: Favorite) => {
    if (participants.some(p => p.key === `fav-${f.id}`)) {
      toast.error("Already added");
      return;
    }
    haptic.light();
    setParticipants(prev => [
      ...prev,
      {
        key: `fav-${f.id}`,
        user_id: null, // resolved below if phone matches a profile
        name: f.contact_name,
        emoji: f.avatar_emoji ?? "👤",
        share: 0,
        source: "favorite",
      },
    ]);
    setPicker(false);
  };

  const addManual = () => {
    const name = manualName.trim();
    if (!name) return;
    if (name.length > 50) { toast.error("Name too long"); return; }
    haptic.light();
    setParticipants(prev => [
      ...prev,
      { key: `manual-${Date.now()}`, user_id: null, name, emoji: "👤", share: 0, source: "manual" },
    ]);
    setManualName("");
    setPicker(false);
  };

  const removeParticipant = (key: string) => {
    if (key === "self") { toast.error("You can't remove yourself"); return; }
    haptic.light();
    setParticipants(prev => prev.filter(p => p.key !== key));
  };

  const updateShareRupees = (key: string, val: string) => {
    const paise = Math.round((parseFloat(val.replace(/[^0-9.]/g, "")) || 0) * 100);
    setParticipants(prev => prev.map(p => p.key === key ? { ...p, share: paise } : p));
  };

  // Resolve favorite participants to real user_ids by phone
  const resolveUserIds = async (list: Participant[]): Promise<Participant[]> => {
    const favEntries = list.filter(p => p.source === "favorite");
    if (favEntries.length === 0) return list;

    const favIds = favEntries.map(p => p.key.replace("fav-", ""));
    const { data: favs } = await supabase
      .from("quick_pay_favorites").select("id, contact_phone")
      .in("id", favIds);
    const phones = (favs ?? []).map(f => f.contact_phone).filter(Boolean) as string[];
    if (phones.length === 0) return list;

    const { data: profs } = await supabase
      .from("profiles").select("id, phone").in("phone", phones);
    const phoneToId = new Map((profs ?? []).map(p => [p.phone, p.id]));

    return list.map(p => {
      if (p.source !== "favorite") return p;
      const fav = (favs ?? []).find(f => f.id === p.key.replace("fav-", ""));
      const uid = fav?.contact_phone ? phoneToId.get(fav.contact_phone) : null;
      return uid ? { ...p, user_id: uid } : p;
    });
  };

  const create = async () => {
    if (!title.trim()) { toast.error("Add a title"); return; }
    if (title.length > 100) { toast.error("Title too long"); return; }
    if (totalPaise <= 0) { toast.error("Add a valid amount"); return; }
    if (totalPaise > 50_000_00) { toast.error("Max ₹50,000 per split"); return; }
    if (participants.length < 2) { toast.error("Add at least one participant"); return; }
    if (mode === "custom" && customDiff !== 0) {
      toast.error(`Shares must total ${fmt(totalPaise)} (off by ${fmt(Math.abs(customDiff))})`);
      return;
    }

    setCreating(true);
    try {
      const resolved = await resolveUserIds(participants);

      const { data: split, error } = await supabase
        .from("bill_splits")
        .insert({
          title: title.trim(),
          total_amount: totalPaise,
          created_by: me.id,
          status: "pending",
          category: "other",
        })
        .select().single();
      if (error || !split) throw error ?? new Error("Failed");

      const memberRows = resolved
        .filter(p => p.user_id) // only insert members with real user_ids
        .map(p => ({
          split_id: split.id,
          user_id: p.user_id!,
          share_amount: p.share,
          is_paid: p.user_id === me.id ? true : false, // creator considered paid
          paid_at: p.user_id === me.id ? new Date().toISOString() : null,
        }));

      // Always include self
      if (!memberRows.some(r => r.user_id === me.id)) {
        const selfShare = resolved.find(p => p.key === "self")?.share ?? 0;
        memberRows.push({
          split_id: split.id, user_id: me.id, share_amount: selfShare,
          is_paid: true, paid_at: new Date().toISOString(),
        });
      }

      const { error: mErr } = await supabase.from("bill_split_members").insert(memberRows);
      if (mErr) throw mErr;

      // Notify each participant (with a real user_id, except self)
      const notifs = memberRows
        .filter(r => r.user_id !== me.id)
        .map(r => ({
          user_id: r.user_id,
          title: "New split request 🧾",
          body: `${me.name} added you to "${title.trim()}" — your share is ₹${(r.share_amount / 100).toFixed(2)}`,
          type: "bill_split",
        }));
      if (notifs.length > 0) await supabase.from("notifications").insert(notifs);

      const skipped = resolved.filter(p => p.source !== "self" && !p.user_id).length;
      toast.success(skipped > 0
        ? `Split created · ${skipped} guest(s) added without app accounts`
        : "Split created!");
      haptic.success();
      onCreated(split.id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create split");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative z-10 px-5">
      <div className="pt-4 pb-5 bs-in flex items-center gap-3">
        <button onClick={onCancel}
          className="w-10 h-10 rounded-[13px] flex items-center justify-center active:scale-90 transition border border-white/[0.04]"
          style={{ background: "hsl(220 15% 8%)" }}>
          <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
        </button>
        <div>
          <h1 className="text-[19px] font-bold tracking-[-0.5px]">New Split</h1>
          <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Set up the bill</p>
        </div>
      </div>

      {/* Title + amount */}
      <section className="rounded-[18px] p-4 mb-4 border border-white/[0.04] bs-in"
        style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))", animationDelay: "0.05s" }}>
        <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase mb-1.5">Title</p>
        <input value={title} onChange={e => setTitle(e.target.value.slice(0, 100))}
          placeholder="e.g. Pizza night, Movie tickets"
          className="w-full h-12 rounded-[14px] px-4 text-sm outline-none mb-3"
          style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />

        <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase mb-1.5">Total Amount</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono text-sm">₹</span>
          <input value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))}
            placeholder="0.00" inputMode="decimal"
            className="w-full h-12 rounded-[14px] pl-8 pr-4 text-sm outline-none font-mono"
            style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />
        </div>
      </section>

      {/* Split mode */}
      <section className="bs-in mb-4" style={{ animationDelay: "0.1s" }}>
        <div className="flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.04] w-fit mx-auto">
          {([{ k: "equal", label: "Equal Split" }, { k: "custom", label: "Custom" }] as const).map(o => (
            <button key={o.k} onClick={() => { haptic.light(); setMode(o.k); }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                mode === o.k ? "bg-primary text-primary-foreground" : "text-white/60"
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {/* Participants */}
      <section className="rounded-[18px] p-4 mb-4 border border-white/[0.04] bs-in"
        style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))", animationDelay: "0.15s" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-white/60">
            Participants <span className="text-white/30">({participants.length})</span>
          </p>
          <button onClick={() => { haptic.light(); setPicker(true); }}
            className="h-8 px-3 rounded-full flex items-center gap-1 text-xs font-semibold active:scale-95 transition"
            style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}>
            <UserPlus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        <div className="space-y-2">
          {participants.map(p => (
            <div key={p.key} className="flex items-center gap-2.5 p-2.5 rounded-[12px]"
              style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 11%)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                style={{ background: "hsl(var(--primary) / 0.1)" }}>{p.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{p.name}</p>
                {p.source === "manual" && (
                  <p className="text-[9px] text-amber-400/80">Guest · won't get notification</p>
                )}
              </div>
              {mode === "equal" ? (
                <p className="font-mono text-[12px] font-semibold tabular-nums">{fmt(p.share)}</p>
              ) : (
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40 text-[11px] font-mono">₹</span>
                  <input
                    value={p.share === 0 ? "" : (p.share / 100).toString()}
                    onChange={(e) => updateShareRupees(p.key, e.target.value)}
                    inputMode="decimal" placeholder="0.00"
                    className="w-20 h-8 rounded-lg pl-5 pr-2 text-[12px] font-mono outline-none text-right"
                    style={{ background: "hsl(220 15% 5%)", border: "1px solid hsl(220 15% 12%)", color: "white" }}
                  />
                </div>
              )}
              {p.key !== "self" && (
                <button onClick={() => removeParticipant(p.key)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-rose-400 active:scale-90 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {mode === "custom" && totalPaise > 0 && (
          <div className={`mt-3 text-[11px] font-mono text-center ${customDiff === 0 ? "text-emerald-400" : "text-amber-400"}`}>
            {customDiff === 0
              ? `✓ Shares add up to ${fmt(totalPaise)}`
              : `${customDiff > 0 ? "Need" : "Over by"} ${fmt(Math.abs(customDiff))}`}
          </div>
        )}
      </section>

      <button onClick={create} disabled={creating}
        className="w-full h-[52px] rounded-2xl font-semibold text-[14px] active:scale-[0.97] transition disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
          color: "hsl(220 20% 6%)",
          boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
        }}>
        {creating ? "Creating…" : "Create Split"}
      </button>

      {/* Picker sheet */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
          onClick={() => setPicker(false)}>
          <div className="w-full max-w-lg rounded-t-[28px] p-6 border-t border-white/[0.06] max-h-[80dvh] overflow-y-auto"
            style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))",
              animation: "bs-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Add Participant</h2>
              <button onClick={() => setPicker(false)} className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>

            <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase mb-2">Add Guest</p>
            <div className="flex gap-2 mb-5">
              <input value={manualName} onChange={e => setManualName(e.target.value.slice(0, 50))}
                placeholder="Friend's name" maxLength={50}
                className="flex-1 h-11 rounded-[12px] px-4 text-sm outline-none"
                style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />
              <button onClick={addManual} disabled={!manualName.trim()}
                className="h-11 px-4 rounded-[12px] font-semibold text-xs active:scale-95 transition disabled:opacity-40"
                style={{ background: "hsl(var(--primary))", color: "hsl(220 20% 6%)" }}>
                Add
              </button>
            </div>

            <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase mb-2">From Favorites</p>
            {favorites.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">No favorites yet</p>
            ) : (
              <div className="space-y-1.5">
                {favorites.map(f => {
                  const added = participants.some(p => p.key === `fav-${f.id}`);
                  return (
                    <button key={f.id} onClick={() => addFavorite(f)} disabled={added}
                      className="w-full flex items-center gap-3 p-2.5 rounded-[12px] active:scale-[0.98] transition disabled:opacity-40 text-left"
                      style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 11%)" }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                        style={{ background: "hsl(var(--primary) / 0.1)" }}>{f.avatar_emoji ?? "👤"}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{f.contact_name}</p>
                        <p className="text-[10px] text-white/30 truncate">{f.contact_phone ?? f.contact_upi_id ?? "—"}</p>
                      </div>
                      {added ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4 text-white/40" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// DETAIL VIEW
// ─────────────────────────────────────────────────────────
const DetailView = ({ splitId, me, onBack }: {
  splitId: string; me: { id: string; name: string }; onBack: () => void;
}) => {
  const [split, setSplit] = useState<BillSplit | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [reminding, setReminding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: s } = await supabase
      .from("bill_splits").select("*").eq("id", splitId).maybeSingle();
    const { data: m } = await supabase
      .from("bill_split_members").select("*").eq("split_id", splitId);
    if (s) setSplit(s as BillSplit);

    // Fetch profile names (where allowed by RLS)
    const userIds = (m ?? []).map(x => x.user_id);
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as any[] };
    const nameMap = new Map((profs ?? []).map(p => [p.id, p.full_name]));

    setMembers(((m ?? []) as Member[]).map(mem => ({
      ...mem,
      display_name: mem.user_id === me.id ? "You" : (nameMap.get(mem.user_id) ?? "Friend"),
      avatar_emoji: mem.user_id === me.id ? "🫵" : "👤",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [splitId]);

  const myMember = useMemo(() => members.find(m => m.user_id === me.id), [members, me.id]);
  const isCreator = split?.created_by === me.id;
  const paidCount = members.filter(m => m.is_paid).length;
  const progress = members.length ? (paidCount / members.length) * 100 : 0;
  const settled = split?.status === "settled";

  const payShare = async () => {
    if (!myMember || myMember.is_paid) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("bill-split-pay", {
        body: { split_id: splitId },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      haptic.success();
      toast.success(data?.settled ? "Paid · split settled! 🎉" : "Share paid");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const remindAll = async () => {
    setReminding(true);
    try {
      const { data, error } = await supabase.functions.invoke("bill-split-remind", {
        body: { split_id: splitId },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      haptic.success();
      toast.success(`Reminded ${data?.reminded ?? 0} friend(s)`);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't send reminders");
    } finally {
      setReminding(false);
    }
  };

  return (
    <div className="relative z-10 px-5">
      <div className="pt-4 pb-5 bs-in flex items-center gap-3">
        <button onClick={onBack}
          className="w-10 h-10 rounded-[13px] flex items-center justify-center active:scale-90 transition border border-white/[0.04]"
          style={{ background: "hsl(220 15% 8%)" }}>
          <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[19px] font-bold tracking-[-0.5px] truncate">{split?.title ?? "Split"}</h1>
          <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
            {settled ? "Settled" : `${paidCount} of ${members.length} paid`}
          </p>
        </div>
      </div>

      {loading || !split ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-[16px] bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Hero amount + progress */}
          <section className="rounded-[20px] p-5 mb-4 border border-white/[0.04] bs-in"
            style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))", animationDelay: "0.05s" }}>
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Total</p>
            <p className="text-3xl font-bold tracking-tight font-mono mt-1">{fmt(split.total_amount)}</p>

            <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: "hsl(220 15% 12%)" }}>
              <div className="h-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: settled
                    ? "linear-gradient(90deg, hsl(152 60% 45%), hsl(152 60% 55%))"
                    : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-white/40 font-mono">
              <span>{paidCount} paid</span>
              <span>{members.length - paidCount} pending</span>
            </div>
          </section>

          {/* Pay your share */}
          {myMember && !myMember.is_paid && !settled && (
            <button onClick={payShare} disabled={paying}
              className="w-full h-[56px] rounded-2xl mb-4 flex items-center justify-center gap-2 font-semibold text-sm active:scale-[0.97] transition disabled:opacity-40 bs-in"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                color: "hsl(220 20% 6%)",
                boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                animationDelay: "0.1s",
              }}>
              <Wallet className="w-4 h-4" />
              {paying ? "Paying…" : `Pay your share · ${fmt(myMember.share_amount)}`}
            </button>
          )}

          {settled && (
            <div className="rounded-2xl mb-4 p-4 border border-emerald-500/20 flex items-center gap-3 bs-in"
              style={{ background: "linear-gradient(135deg, hsl(152 60% 45% / 0.10), hsl(152 60% 45% / 0.02))", animationDelay: "0.1s" }}>
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">All settled!</p>
                <p className="text-[11px] text-white/50">Everyone has paid their share.</p>
              </div>
            </div>
          )}

          {/* Members */}
          <section className="rounded-[18px] p-4 mb-4 border border-white/[0.04] bs-in"
            style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))", animationDelay: "0.15s" }}>
            <p className="text-[11px] font-semibold text-white/60 mb-3">Participants</p>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-[12px]"
                  style={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 11%)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                    style={{ background: "hsl(var(--primary) / 0.1)" }}>{m.avatar_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{m.display_name}</p>
                    <p className="font-mono text-[11px] text-white/40">{fmt(m.share_amount)}</p>
                  </div>
                  {m.is_paid ? (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
                      style={{ background: "hsl(152 60% 45% / 0.12)", color: "hsl(152 60% 55%)" }}>
                      <Check className="w-3 h-3" /> Paid
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
                      style={{ background: "hsl(38 92% 50% / 0.12)", color: "hsl(38 92% 60%)" }}>
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Remind */}
          {isCreator && !settled && members.some(m => !m.is_paid) && (
            <button onClick={remindAll} disabled={reminding}
              className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm active:scale-[0.97] transition disabled:opacity-40 bs-in"
              style={{
                background: "hsl(220 15% 8%)",
                border: "1px solid hsl(var(--primary) / 0.3)",
                color: "hsl(var(--primary))",
                animationDelay: "0.2s",
              }}>
              <Bell className="w-4 h-4" />
              {reminding ? "Sending…" : "Remind unpaid friends"}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default BillSplitPage;
