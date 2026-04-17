// Screen 8 — Send Money. Three stages:
//  1) Picker: recents row + alphabetised contact list with sticky letter headers + A-Z index rail
//     + live search + add-new contact.
//  2) Amount: beautiful split keypad with category selector + note + balance check.
//  3) Confirm sheet → success overlay with reorder-to-front animation.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Search, Plus, X, Send, Check, Shield, UserPlus, Loader2, Pencil, Delete,
  Coffee, Bus, ShoppingBag, Film, Gift, MoreHorizontal, Receipt, Sparkles, HandCoins,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import KycGate from "@/components/KycGate";
import BottomNav from "@/components/BottomNav";

interface Favorite {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_upi_id: string | null;
  avatar_emoji: string | null;
  last_paid_at: string | null;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

const CATEGORIES = [
  { key: "food",      label: "Food",      icon: Coffee },
  { key: "transport", label: "Transport", icon: Bus },
  { key: "shopping",  label: "Shopping",  icon: ShoppingBag },
  { key: "fun",       label: "Fun",       icon: Film },
  { key: "gift",      label: "Gift",      icon: Gift },
  { key: "other",     label: "Other",     icon: MoreHorizontal },
] as const;

// Stable per-name gradient — same name always gets the same colors.
const gradientFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  // Gold-family palettes only — keeps avatars on-theme (no purple/blue/green).
  const palettes: Array<[string, string]> = [
    ["42 78% 55%", "38 88% 65%"],   // gold
    ["32 82% 52%", "26 90% 62%"],   // amber
    ["48 70% 50%", "44 80% 60%"],   // honey
    ["20 70% 50%", "14 78% 60%"],   // copper
    ["38 60% 45%", "34 70% 55%"],   // bronze
    ["50 75% 55%", "46 85% 65%"],   // light gold
  ];
  return palettes[h % palettes.length];
};

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("") || "?";

const firstLetterOf = (name: string) => {
  const ch = name.trim()[0]?.toUpperCase();
  return ch && /[A-Z]/.test(ch) ? ch : "#";
};

const relativeDate = (iso: string | null) => {
  if (!iso) return "Tap to send";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

interface AvatarProps { name: string; size?: number; emoji?: string | null; }
const Avatar = ({ name, size = 56, emoji }: AvatarProps) => {
  const [a, b] = gradientFor(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold tracking-tight relative shrink-0"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, hsl(${a}), hsl(${b}))`,
        boxShadow: `0 8px 24px hsl(${a} / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.15)`,
        fontSize: size * 0.36,
        color: "hsl(220 25% 8%)",
      }}
    >
      {emoji && emoji !== "👤" ? <span style={{ fontSize: size * 0.5 }}>{emoji}</span> : initialsOf(name)}
    </div>
  );
};

const SendMoney = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const incomingContact = (location.state as any)?.selectedContact as Favorite | undefined;
  const incomingMode = (location.state as any)?.mode as "send" | "request" | undefined;

  // Top-level mode: Send Money or Request Money
  const [mode, setMode] = useState<"send" | "request">(incomingMode || "send");

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [search, setSearch] = useState("");

  // recipient + amount stage
  const [recipient, setRecipient] = useState<Favorite | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [justSentId, setJustSentId] = useState<string | null>(null);

  // new contact modal
  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUpi, setNewUpi] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [favsRes, walletRes] = await Promise.all([
      supabase.from("quick_pay_favorites").select("*").eq("user_id", user.id)
        .order("contact_name", { ascending: true }),
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    ]);
    setFavorites((favsRes.data || []) as Favorite[]);
    setBalance(walletRes.data?.balance || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // If we landed here with a pre-selected contact, jump straight to the amount stage.
  useEffect(() => {
    if (!incomingContact || recipient) return;
    pickRecipient(incomingContact);
    // clear so a back-out doesn't re-trigger
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingContact]);

  // Recents = top 5 by last_paid_at desc.
  const recents = useMemo(() => {
    return [...favorites]
      .filter(f => !!f.last_paid_at)
      .sort((a, b) => new Date(b.last_paid_at!).getTime() - new Date(a.last_paid_at!).getTime())
      .slice(0, 8);
  }, [favorites]);

  // Search filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter(f =>
      f.contact_name.toLowerCase().includes(q) ||
      f.contact_upi_id?.toLowerCase().includes(q) ||
      f.contact_phone?.toLowerCase().includes(q)
    );
  }, [favorites, search]);

  // Group alphabetised contacts.
  const grouped = useMemo(() => {
    const map: Record<string, Favorite[]> = {};
    for (const f of filtered) {
      const k = firstLetterOf(f.contact_name);
      (map[k] ||= []).push(f);
    }
    return map;
  }, [filtered]);

  const activeLetters = useMemo(
    () => ALPHABET.filter(l => grouped[l]?.length),
    [grouped]
  );

  const amt = parseInt(amount || "0", 10) || 0;
  const amtPaise = amt * 100;
  // Only validate balance for sending; requesting money has no balance constraint.
  const overBalance = mode === "send" && amtPaise > balance;
  const canSend = amt > 0 && !overBalance;

  const pickRecipient = (f: Favorite) => {
    haptic.medium();
    setRecipient(f);
    setAmount("");
    setNote("");
    setCategory("other");
    setSearch("");
    setSuccess(false);
  };

  const onLetterTap = (letter: string) => {
    haptic.light();
    const el = sectionRefs.current[letter];
    if (el && listRef.current) {
      listRef.current.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
    }
  };

  // ---- KEYPAD ----
  const onKey = (k: string) => {
    haptic.light();
    if (k === "del") { setAmount(p => p.slice(0, -1)); return; }
    if (k === "00") { setAmount(p => (p === "" ? "" : (p + "00").slice(0, 7))); return; }
    setAmount(p => (p + k).replace(/^0+(?=\d)/, "").slice(0, 7));
  };

  // ---- ADD CONTACT ----
  const addContact = async () => {
    if (!newName.trim()) { toast.error("Enter a name"); return; }
    setSavingContact(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingContact(false); return; }
    const { data, error } = await supabase.from("quick_pay_favorites").insert({
      user_id: user.id,
      contact_name: newName.trim(),
      contact_upi_id: newUpi.trim() || null,
      contact_phone: newPhone.trim() || null,
      avatar_emoji: "👤",
    }).select().single();
    setSavingContact(false);
    if (error || !data) { toast.error("Could not add contact"); return; }
    haptic.success();
    setShowAddContact(false);
    setNewName(""); setNewUpi(""); setNewPhone("");
    setFavorites(prev => [...prev, data as Favorite].sort(
      (a, b) => a.contact_name.localeCompare(b.contact_name)
    ));
    pickRecipient(data as Favorite);
  };

  // ---- SUBMIT ----
  // SEND mode: hand off to the cinematic /pay flow.
  // REQUEST mode: insert a payment_requests row → recipient sees a pending pill on home.
  const submit = async () => {
    if (!recipient || !canSend) return;
    haptic.medium();

    if (mode === "send") {
      // Mark the favorite as just-paid for the recents jump animation on return.
      setJustSentId(recipient.id);
      setTimeout(() => setJustSentId(null), 1800);
      navigate("/pay", {
        state: {
          upi_id: recipient.contact_upi_id || recipient.contact_phone || `${recipient.contact_name.toLowerCase().replace(/\s+/g, "")}@auropay`,
          payee_name: recipient.contact_name,
          amount: amt,
          amount_locked: false,
          note: note || undefined,
          category,
        },
      });
      return;
    }

    // REQUEST mode — find the recipient's auropay user_id by phone or upi.
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); toast.error("Sign in required"); return; }

    let recipientUserId: string | null = null;
    // Try phone first (uses RLS-safe RPC), then UPI fallback.
    if (recipient.contact_phone) {
      const { data: byPhone } = await supabase.rpc("lookup_teen_by_phone", { _phone: recipient.contact_phone });
      if (byPhone && byPhone.length > 0) recipientUserId = byPhone[0].id;
    }
    if (!recipientUserId && recipient.contact_upi_id) {
      const { data: byUpi } = await supabase
        .from("profiles")
        .select("id")
        .eq("upi_id", recipient.contact_upi_id)
        .maybeSingle();
      if (byUpi) recipientUserId = byUpi.id;
    }

    if (!recipientUserId) {
      setSending(false);
      toast.error(`${recipient.contact_name} isn't on Auropay yet`, {
        description: "We can only request money from Auropay users.",
      });
      return;
    }

    if (recipientUserId === user.id) {
      setSending(false);
      toast.error("You can't request money from yourself");
      return;
    }

    const { error } = await supabase.from("payment_requests").insert({
      requester_id: user.id,
      recipient_id: recipientUserId,
      amount: amtPaise,
      note: note.trim() || null,
      category,
    });
    setSending(false);
    if (error) {
      toast.error(error.message || "Could not send request");
      return;
    }
    haptic.success();
    setSuccess(true);
  };

  const closeRecipient = () => {
    setRecipient(null);
    setAmount(""); setNote(""); setCategory("other");
    setSuccess(false); setConfirming(false);
  };

  // ──────────────────── RENDER ────────────────────
  return (
    <div className="min-h-[100dvh] bg-background pb-28 relative overflow-hidden font-sora">
      {/* ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: "hsl(var(--primary))" }}
        />
      </div>

      {/* HEADER */}
      <div className="relative z-10 px-5 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]"
            style={{ background: "hsl(220 15% 8%)" }}
          >
            <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[19px] font-bold tracking-[-0.5px]">
              {mode === "send" ? "Send Money" : "Request Money"}
            </h1>
            <p className="text-[10px] text-white/30 font-medium flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> End-to-end secured
            </p>
          </div>
          <div
            className="px-3 h-[34px] rounded-full flex items-center border border-white/[0.06]"
            style={{ background: "hsl(220 15% 8%)" }}
          >
            <span className="text-[11px] text-white/40 mr-1">Bal</span>
            <span className="text-[12px] font-mono font-semibold" style={{ color: "hsl(var(--primary))" }}>
              ₹{(balance / 100).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* MODE TABS — Send / Request */}
        <div
          className="mt-4 p-1 rounded-[14px] flex gap-1 border border-white/[0.05]"
          style={{ background: "hsl(220 15% 7%)" }}
          role="tablist"
          aria-label="Quick pay mode"
        >
          {([
            { key: "send", label: "Send Money", Icon: Send },
            { key: "request", label: "Request Money", Icon: HandCoins },
          ] as const).map(t => {
            const active = mode === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (mode === t.key) return;
                  haptic.selection();
                  setMode(t.key);
                  // reset amount stage when switching modes
                  setRecipient(null);
                  setAmount(""); setNote(""); setCategory("other");
                  setSuccess(false); setConfirming(false);
                }}
                className="flex-1 h-[40px] rounded-[11px] flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-all active:scale-[0.98]"
                style={{
                  background: active
                    ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))"
                    : "transparent",
                  color: active ? "hsl(220 20% 6%)" : "hsl(0 0% 100% / 0.55)",
                  boxShadow: active ? "0 4px 14px hsl(var(--primary) / 0.25)" : "none",
                }}
              >
                <t.Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative z-10 px-5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or UPI ID"
            className="w-full h-[46px] pl-11 pr-4 rounded-[14px] text-[13px] outline-none border border-white/[0.06] focus:border-primary/40 transition-colors placeholder:text-white/25"
            style={{ background: "hsl(220 15% 7%)" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.05] active:scale-90"
            >
              <X className="w-3.5 h-3.5 text-white/50" />
            </button>
          )}
        </div>
      </div>

      {/* RECENTS ROW (hidden when searching) */}
      {!search && recents.length > 0 && (
        <div className="relative z-10 mt-5">
          <div className="flex items-center justify-between px-5 mb-3">
            <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase">Recents</p>
            <span className="text-[10px] text-white/25 font-medium">{recents.length}</span>
          </div>
          <div className="overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
            <div className="flex gap-4 w-max">
              {recents.map(f => {
                const justSent = justSentId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => pickRecipient(f)}
                    className="flex flex-col items-center gap-2 w-[68px] active:scale-90 transition-transform"
                    style={{ animation: justSent ? "qp-jump 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined }}
                  >
                    <div className="relative">
                      <Avatar name={f.contact_name} size={56} emoji={f.avatar_emoji} />
                      {justSent && (
                        <div
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center"
                          style={{ animation: "qp-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
                        >
                          <Check className="w-3 h-3 text-background" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-white/80 truncate w-full text-center">
                      {f.contact_name.split(" ")[0]}
                    </p>
                    <p className="text-[9px] text-white/30 -mt-1.5">{relativeDate(f.last_paid_at)}</p>
                  </button>
                );
              })}
              {/* New contact tile */}
              <button
                onClick={() => { haptic.light(); setShowAddContact(true); }}
                className="flex flex-col items-center gap-2 w-[68px] active:scale-90 transition-transform"
              >
                <div
                  className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: "hsl(var(--primary) / 0.4)", background: "hsl(var(--primary) / 0.04)" }}
                >
                  <Plus className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--primary))" }}>New</p>
                <p className="text-[9px] text-white/30 -mt-1.5">Contact</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALPHABETISED CONTACT LIST + LETTER INDEX */}
      <div className="relative z-10 mt-5 mx-5 rounded-[18px] border border-white/[0.05] overflow-hidden"
        style={{ background: "hsl(220 15% 7% / 0.6)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
          <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase">All Contacts</p>
          <span className="text-[10px] text-white/25 font-medium">{filtered.length}</span>
        </div>

        <div className="relative">
          {/* SCROLL CONTAINER */}
          <div ref={listRef} className="max-h-[340px] overflow-y-auto pr-7 scrollbar-hide">
            {loading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-white/[0.04] animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-1/2 h-2.5 bg-white/[0.04] rounded animate-pulse" />
                      <div className="w-1/3 h-2 bg-white/[0.04] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeLetters.length === 0 ? (
              <button
                onClick={() => { setNewName(search); setShowAddContact(true); }}
                className="w-full p-6 flex items-center gap-3 text-left active:scale-[0.98] transition"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                  <UserPlus className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--primary))" }}>
                    {search ? `Add "${search}"` : "Add your first contact"}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {search ? "No matches — tap to create a new contact" : "Save someone you pay often"}
                  </p>
                </div>
              </button>
            ) : (
              activeLetters.map(letter => (
                <div
                  key={letter}
                  ref={el => (sectionRefs.current[letter] = el)}
                >
                  {/* Sticky letter header */}
                  <div
                    className="sticky top-0 z-10 px-4 py-1.5 backdrop-blur-md flex items-center gap-2"
                    style={{ background: "hsl(220 15% 7% / 0.92)" }}
                  >
                    <span
                      className="text-[10px] font-bold tracking-widest"
                      style={{ color: "hsl(var(--primary))" }}
                    >
                      {letter}
                    </span>
                    <div className="flex-1 h-[1px] bg-white/[0.05]" />
                  </div>
                  {grouped[letter].map((f, i) => (
                    <button
                      key={f.id}
                      onClick={() => pickRecipient(f)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left active:bg-white/[0.04] hover:bg-white/[0.02] transition"
                      style={{ animation: `qp-row-in 0.25s ease-out ${i * 0.02}s both` }}
                    >
                      <Avatar name={f.contact_name} size={42} emoji={f.avatar_emoji} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/85 truncate">{f.contact_name}</p>
                        <p className="text-[10px] text-white/40 truncate font-mono">
                          {f.contact_upi_id || f.contact_phone || "No UPI ID"}
                        </p>
                      </div>
                      {f.last_paid_at && (
                        <span className="text-[9px] text-white/30">{relativeDate(f.last_paid_at)}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* A-Z INDEX RAIL */}
          {!loading && activeLetters.length > 0 && (
            <div className="absolute right-1 top-2 bottom-2 flex flex-col items-center justify-center gap-[1px] pointer-events-auto">
              {ALPHABET.map(l => {
                const enabled = activeLetters.includes(l);
                return (
                  <button
                    key={l}
                    disabled={!enabled}
                    onClick={() => onLetterTap(l)}
                    className="h-[14px] w-5 flex items-center justify-center text-[8.5px] font-bold tracking-wider transition active:scale-110"
                    style={{
                      color: enabled ? "hsl(var(--primary))" : "hsl(220 10% 25%)",
                      opacity: enabled ? 1 : 0.4,
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />

      {/* ─────────── AMOUNT STAGE (full screen) ─────────── */}
      {recipient && !success && (
        <div className="fixed inset-0 z-40 bg-background flex flex-col font-sora" style={{ animation: "qp-fade 0.2s ease-out" }}>
          {/* Top bar */}
          <div className="px-5 pt-4 pb-3 flex items-center gap-3">
            <button
              onClick={closeRecipient}
              className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 border border-white/[0.04]"
              style={{ background: "hsl(220 15% 8%)" }}
            >
              <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-white/30 tracking-widest uppercase">
                {mode === "send" ? "Sending to" : "Requesting from"}
              </p>
              <p className="text-[14px] font-bold truncate">{recipient.contact_name}</p>
            </div>
            <button className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center bg-white/[0.04] active:scale-90">
              <Pencil className="w-4 h-4 text-white/40" />
            </button>
          </div>

          {/* Recipient hero */}
          <div className="flex flex-col items-center pt-2 pb-4"
            style={{ animation: "qp-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <Avatar name={recipient.contact_name} size={72} emoji={recipient.avatar_emoji} />
            <p className="text-[11px] text-white/40 font-mono mt-2 truncate max-w-[80%] text-center">
              {recipient.contact_upi_id || recipient.contact_phone || "No UPI ID"}
            </p>
          </div>

          {/* Amount display */}
          <div className="px-6 pt-3 pb-4 text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-[28px] font-mono font-semibold" style={{ color: "hsl(var(--primary))" }}>₹</span>
              <span
                className="text-[58px] font-mono font-bold tracking-[-1px] leading-none"
                style={{
                  color: overBalance
                    ? "hsl(0 70% 60%)"
                    : amount
                    ? "hsl(var(--primary))"
                    : "hsl(220 10% 25%)",
                }}
              >
                {amount || "0"}
              </span>
            </div>
            <p
              className="text-[11px] font-medium mt-2"
              style={{ color: overBalance ? "hsl(0 70% 60%)" : "hsl(220 10% 40%)" }}
            >
              {overBalance
                ? `Insufficient · ₹${(balance / 100).toLocaleString("en-IN")} available`
                : `Available · ₹${(balance / 100).toLocaleString("en-IN")}`}
            </p>
          </div>

          {/* Quick chips */}
          <div className="px-5 pb-3 flex gap-2 justify-center">
            {[100, 250, 500, 1000].map(v => (
              <button
                key={v}
                onClick={() => { haptic.light(); setAmount(String(v)); }}
                className="px-3 h-[30px] rounded-full text-[11px] font-semibold border border-white/[0.06] active:scale-95 transition"
                style={{ background: "hsl(220 15% 8%)", color: "hsl(var(--primary))" }}
              >
                ₹{v}
              </button>
            ))}
          </div>

          {/* Category selector */}
          <div className="px-5 pb-3">
            <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
              <div className="flex gap-2 w-max">
                {CATEGORIES.map(c => {
                  const Icon = c.icon;
                  const active = category === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => { haptic.light(); setCategory(c.key); }}
                      className="px-3 h-[34px] rounded-full flex items-center gap-1.5 text-[11px] font-semibold border transition active:scale-95"
                      style={{
                        background: active ? "hsl(var(--primary) / 0.12)" : "hsl(220 15% 8%)",
                        borderColor: active ? "hsl(var(--primary) / 0.45)" : "hsl(0 0% 100% / 0.06)",
                        color: active ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.55)",
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Note input */}
          <div className="px-5 pb-3">
            <div
              className="flex items-center gap-2 rounded-[14px] border border-white/[0.06] px-3 h-[44px]"
              style={{ background: "hsl(220 15% 7%)" }}
            >
              <Receipt className="w-3.5 h-3.5 text-white/30" />
              <input
                value={note}
                onChange={e => setNote(e.target.value.slice(0, 80))}
                placeholder="What's this for? (optional)"
                className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-white/25"
              />
              {note && (
                <span className="text-[9px] text-white/25 font-mono shrink-0">{note.length}/80</span>
              )}
            </div>
          </div>

          {/* SPLIT KEYPAD */}
          <div className="flex-1 flex items-end px-3 pb-2">
            <div className="w-full grid grid-cols-3 gap-2">
              {["1","2","3","4","5","6","7","8","9","00","0","del"].map(k => (
                <button
                  key={k}
                  onClick={() => onKey(k)}
                  className="h-[54px] rounded-[16px] active:scale-[0.94] transition flex items-center justify-center text-[20px] font-semibold"
                  style={{
                    background: k === "del" ? "hsl(220 15% 6%)" : "hsl(220 15% 8%)",
                    border: "1px solid hsl(0 0% 100% / 0.04)",
                    color: k === "del" ? "hsl(0 70% 60%)" : "hsl(0 0% 100% / 0.85)",
                  }}
                >
                  {k === "del" ? <Delete className="w-5 h-5" /> : k}
                </button>
              ))}
            </div>
          </div>

          {/* CTA — hands off to /pay (cinematic flow) */}
          <div className="px-5 pb-6 pt-2">
            <button
              onClick={submit}
              disabled={!canSend || sending}
              className="w-full h-[54px] rounded-2xl font-semibold text-[14px] tracking-wide active:scale-[0.97] transition-all disabled:scale-100 relative overflow-hidden"
              style={{
                background: !canSend
                  ? "hsl(220 15% 12%)"
                  : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                color: !canSend ? "hsl(220 10% 35%)" : "hsl(220 20% 6%)",
                boxShadow: canSend ? "0 4px 24px hsl(var(--primary) / 0.3)" : "none",
                opacity: !canSend ? 0.55 : 1,
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === "send" ? <Send className="w-4 h-4" /> : <HandCoins className="w-4 h-4" />)}
                {amt > 0
                  ? (mode === "send"
                      ? `Continue · ₹${amt.toLocaleString("en-IN")}`
                      : `Request ₹${amt.toLocaleString("en-IN")}`)
                  : "Enter an amount"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────── CONFIRMATION SHEET ─────────── */}
      {confirming && recipient && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "qp-fade 0.2s ease-out" }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !sending && setConfirming(false)} />
          <div
            className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8"
            style={{
              background: "linear-gradient(180deg, hsl(220 20% 8%), hsl(220 22% 5%))",
              animation: "qp-sheet-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />

            <div className="flex flex-col items-center mb-6">
              <Avatar name={recipient.contact_name} size={68} emoji={recipient.avatar_emoji} />
              <p className="text-[16px] font-bold mt-3">{recipient.contact_name}</p>
              <p className="text-[11px] text-white/40 font-mono">{recipient.contact_upi_id || recipient.contact_phone}</p>
            </div>

            <div
              className="rounded-[16px] p-4 space-y-2.5"
              style={{ background: "hsl(220 15% 5%)", border: "1px solid hsl(220 15% 10%)" }}
            >
              <div className="flex justify-between">
                <span className="text-[12px] text-white/50">Amount</span>
                <span className="text-[14px] font-mono font-semibold">₹{amt.toLocaleString("en-IN")}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-white/50">Category</span>
                <span className="text-[12px] font-semibold capitalize">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-white/50">Fee</span>
                <span className="text-[12px] font-mono font-semibold" style={{ color: "hsl(152 60% 55%)" }}>FREE</span>
              </div>
              {note && (
                <div className="flex justify-between gap-3 pt-2 border-t border-white/[0.05]">
                  <span className="text-[12px] text-white/50 shrink-0">Note</span>
                  <span className="text-[12px] text-white/80 text-right break-words">"{note}"</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.05]">
                <span className="text-[12px] font-semibold">Total</span>
                <span className="text-[18px] font-mono font-bold" style={{ color: "hsl(var(--primary))" }}>
                  ₹{amt.toLocaleString("en-IN")}.00
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => !sending && setConfirming(false)}
                disabled={sending}
                className="flex-1 h-[52px] rounded-2xl font-semibold text-[13px] active:scale-[0.97] border border-white/[0.06] text-white/70 disabled:opacity-40"
                style={{ background: "hsl(220 15% 8%)" }}
              >
                Edit
              </button>
              <button
                onClick={submit}
                disabled={sending}
                className="flex-[2] h-[52px] rounded-2xl font-semibold text-[13px] active:scale-[0.97] transition relative overflow-hidden disabled:opacity-90"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                  color: "hsl(220 20% 6%)",
                  boxShadow: "0 4px 24px hsl(var(--primary) / 0.3)",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {sending ? "Sending..." : "Confirm & Pay"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── SUCCESS OVERLAY ─────────── */}
      {success && recipient && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
          style={{ background: "hsl(220 22% 4% / 0.97)", backdropFilter: "blur(12px)", animation: "qp-fade 0.3s ease-out" }}
        >
          {/* confetti */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 26 }).map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  width: 3, height: 8, borderRadius: 1,
                  left: `${5 + Math.random() * 90}%`,
                  top: "30%",
                  background: ["hsl(42 78% 55%)", "hsl(152 60% 50%)", "hsl(210 80% 60%)", "hsl(330 70% 55%)"][i % 4],
                  animation: `qp-confetti ${1.4 + Math.random() * 1.5}s ease-out ${Math.random() * 0.5}s both`,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>

          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{
              background: "linear-gradient(135deg, hsl(152 60% 50%), hsl(152 60% 40%))",
              boxShadow: "0 0 60px hsl(152 60% 45% / 0.4)",
              animation: "qp-success 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            <Check className="w-12 h-12" style={{ color: "hsl(220 20% 6%)" }} strokeWidth={3} />
          </div>

          <p className="text-[15px] text-white/60 mb-1" style={{ animation: "qp-fade 0.4s ease-out 0.2s both" }}>
            {mode === "send" ? `Sent to ${recipient.contact_name}` : `Requested from ${recipient.contact_name}`}
          </p>
          <p
            className="text-[42px] font-mono font-bold mb-2"
            style={{
              color: "hsl(152 60% 70%)",
              animation: "qp-success 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both",
            }}
          >
            ₹{amt.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-white/30 font-mono mb-2" style={{ animation: "qp-fade 0.4s ease-out 0.3s both" }}>
            {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <div className="flex items-center gap-1.5 mb-10" style={{ animation: "qp-fade 0.4s ease-out 0.35s both" }}>
            <Sparkles className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "hsl(var(--primary))" }}>
              {category}
            </span>
          </div>

          <button
            onClick={closeRecipient}
            className="w-full max-w-xs h-[52px] rounded-2xl font-semibold text-[14px] active:scale-[0.97] transition"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              color: "hsl(220 20% 6%)",
              boxShadow: "0 4px 24px hsl(var(--primary) / 0.3)",
              animation: "qp-fade 0.4s ease-out 0.4s both",
            }}
          >
            Done
          </button>
        </div>
      )}

      {/* ─────────── ADD CONTACT MODAL ─────────── */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "qp-fade 0.2s ease-out" }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !savingContact && setShowAddContact(false)} />
          <div
            className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8"
            style={{ background: "hsl(220 20% 8%)", animation: "qp-sheet-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
          >
            <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />
            <h3 className="text-[16px] font-bold mb-1">New Contact</h3>
            <p className="text-[11px] text-white/40 mb-5">Save someone you pay often</p>

            <div className="space-y-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name *"
                className="w-full h-[48px] px-4 rounded-[14px] text-[13px] outline-none border border-white/[0.06] focus:border-primary/40 placeholder:text-white/25"
                style={{ background: "hsl(220 15% 6%)" }} autoFocus />
              <input value={newUpi} onChange={e => setNewUpi(e.target.value)} placeholder="UPI ID (e.g. name@bank)"
                className="w-full h-[48px] px-4 rounded-[14px] text-[13px] outline-none border border-white/[0.06] focus:border-primary/40 placeholder:text-white/25 font-mono"
                style={{ background: "hsl(220 15% 6%)" }} />
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone (optional)"
                className="w-full h-[48px] px-4 rounded-[14px] text-[13px] outline-none border border-white/[0.06] focus:border-primary/40 placeholder:text-white/25 font-mono"
                style={{ background: "hsl(220 15% 6%)" }} />
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddContact(false)} disabled={savingContact}
                className="flex-1 h-[52px] rounded-2xl font-semibold text-[13px] active:scale-[0.97] border border-white/[0.06] text-white/70"
                style={{ background: "hsl(220 15% 5%)" }}>
                Cancel
              </button>
              <button onClick={addContact} disabled={savingContact || !newName.trim()}
                className="flex-[2] h-[52px] rounded-2xl font-semibold text-[13px] active:scale-[0.97] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                  color: "hsl(220 20% 6%)",
                }}>
                {savingContact ? "Saving..." : "Save & Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes qp-row-in { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes qp-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes qp-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes qp-sheet-up { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }
        @keyframes qp-jump {
          0% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-12px) scale(1.08); }
          55% { transform: translateY(-4px) scale(1.02); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes qp-success { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes qp-confetti { 0% { transform: translateY(-20px) rotate(0); opacity: 1; } 100% { transform: translateY(80vh) rotate(720deg); opacity: 0; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const SendMoneyGated = () => (
  <KycGate feature="Send Money">
    <SendMoney />
  </KycGate>
);

export default SendMoneyGated;
