// Screen 10 — Send Money. Recents strip → search with live results → recipient card slides
// down → amount + note → confirmation bottom sheet → success with reorder-to-first animation.
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Plus, X, Send, Check, Shield, UserPlus, Loader2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

// Stable per-name gradient — same name always gets the same colors.
const gradientFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const palettes = [
    ["42 78% 55%", "38 88% 65%"],
    ["152 60% 45%", "165 65% 55%"],
    ["210 80% 55%", "225 75% 65%"],
    ["280 60% 55%", "300 65% 65%"],
    ["340 70% 55%", "10 75% 65%"],
    ["190 70% 50%", "205 75% 60%"],
  ];
  return palettes[h % palettes.length];
};

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("") || "?";

const relativeDate = (iso: string | null) => {
  if (!iso) return "Tap to send";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

interface AvatarProps { name: string; size?: number; emoji?: string | null; }
const Avatar = ({ name, size = 64, emoji }: AvatarProps) => {
  const [a, b] = gradientFor(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold tracking-tight relative shrink-0"
      style={{
        width: size,
        height: size,
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
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [search, setSearch] = useState("");

  // recipient flow state
  const [recipient, setRecipient] = useState<Favorite | null>(null);
  const [amount, setAmount] = useState("");
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

  const amountInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [favsRes, walletRes] = await Promise.all([
      supabase.from("quick_pay_favorites").select("*").eq("user_id", user.id)
        .order("last_paid_at", { ascending: false, nullsFirst: false }),
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    ]);
    setFavorites((favsRes.data || []) as Favorite[]);
    setBalance(walletRes.data?.balance || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return favorites.filter(f =>
      f.contact_name.toLowerCase().includes(q) ||
      f.contact_upi_id?.toLowerCase().includes(q) ||
      f.contact_phone?.toLowerCase().includes(q)
    );
  }, [favorites, search]);

  const recents = useMemo(() => favorites.slice(0, 12), [favorites]);

  const amt = parseInt(amount || "0", 10) || 0;
  const amtPaise = amt * 100;
  const overBalance = amtPaise > balance;
  const canSend = amt > 0 && !overBalance;

  const pickRecipient = (f: Favorite) => {
    haptic.medium();
    setRecipient(f);
    setAmount("");
    setNote("");
    setSearch("");
    setSuccess(false);
    setTimeout(() => amountInputRef.current?.focus(), 350);
  };

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
    setFavorites(prev => [data as Favorite, ...prev]);
    pickRecipient(data as Favorite);
  };

  const submit = async () => {
    if (!recipient || !canSend) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("p2p-transfer", {
        body: { favorite_id: recipient.id, amount: amtPaise, note: note || undefined },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setSending(false); return; }
      haptic.success();
      // Reorder: bump recipient to front + mark for jump animation
      setFavorites(prev => {
        const updated = { ...recipient, last_paid_at: new Date().toISOString() };
        const others = prev.filter(f => f.id !== recipient.id);
        return [updated, ...others];
      });
      setBalance(b => b - amtPaise);
      setJustSentId(recipient.id);
      setSuccess(true);
      setConfirming(false);
      setTimeout(() => setJustSentId(null), 1800);
    } catch (err: any) {
      toast.error(err?.message || "Transfer failed");
    }
    setSending(false);
  };

  const closeRecipient = () => {
    setRecipient(null);
    setAmount(""); setNote("");
    setSuccess(false); setConfirming(false);
  };

  // ──────────────────── RENDER ────────────────────
  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      {/* ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[120px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]"
            style={{ background: "hsl(220 15% 8%)" }}>
            <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[19px] font-bold tracking-[-0.5px]">Send Money</h1>
            <p className="text-[10px] text-white/30 font-medium flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> End-to-end secured
            </p>
          </div>
          <div className="px-3 h-[34px] rounded-full flex items-center border border-white/[0.06]"
            style={{ background: "hsl(220 15% 8%)" }}>
            <span className="text-[11px] text-white/40 mr-1">Bal</span>
            <span className="text-[12px] font-mono font-semibold" style={{ color: "hsl(var(--primary))" }}>
              ₹{(balance / 100).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* RECENT BENEFICIARIES */}
      <div className="relative z-10">
        <div className="flex items-center justify-between px-5 mb-3">
          <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase">Recent</p>
          {favorites.length > 0 && (
            <span className="text-[10px] text-white/25 font-medium">{favorites.length} contacts</span>
          )}
        </div>

        <div className="overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
          <div className="flex gap-4 w-max">
            {loading ? (
              [0, 1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 w-[72px]">
                  <div className="w-16 h-16 rounded-full bg-white/[0.04] animate-pulse" />
                  <div className="w-12 h-2 bg-white/[0.04] rounded animate-pulse" />
                </div>
              ))
            ) : (
              <>
                {recents.map(f => {
                  const justSent = justSentId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => pickRecipient(f)}
                      className="flex flex-col items-center gap-2 w-[72px] active:scale-90 transition-transform"
                      style={{
                        animation: justSent ? "contact-jump 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined,
                      }}
                    >
                      <div className="relative">
                        <Avatar name={f.contact_name} size={64} emoji={f.avatar_emoji} />
                        {justSent && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center"
                            style={{ animation: "pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
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

                {/* New Contact card */}
                <button
                  onClick={() => { haptic.light(); setShowAddContact(true); }}
                  className="flex flex-col items-center gap-2 w-[72px] active:scale-90 transition-transform"
                >
                  <div
                    className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center"
                    style={{ borderColor: "hsl(var(--primary) / 0.4)", background: "hsl(var(--primary) / 0.04)" }}
                  >
                    <Plus className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--primary))" }}>New</p>
                  <p className="text-[9px] text-white/30 -mt-1.5">Contact</p>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative z-10 px-5 mt-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or UPI ID"
            className="w-full h-[48px] pl-11 pr-4 rounded-[14px] text-[13px] outline-none border border-white/[0.06] focus:border-primary/40 transition-colors placeholder:text-white/25"
            style={{ background: "hsl(220 15% 7%)" }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.05] active:scale-90">
              <X className="w-3.5 h-3.5 text-white/50" />
            </button>
          )}
        </div>

        {/* Live results */}
        {search.trim() && (
          <div className="mt-3 space-y-2">
            {filtered.length === 0 ? (
              <button onClick={() => { setNewName(search); setShowAddContact(true); }}
                className="w-full p-4 rounded-[14px] border border-dashed border-primary/30 flex items-center gap-3 text-left active:scale-[0.98] transition"
                style={{ background: "hsl(var(--primary) / 0.04)", animation: "result-slide-in 0.3s ease-out both" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                  <UserPlus className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--primary))" }}>Add "{search}"</p>
                  <p className="text-[10px] text-white/40">No matches — tap to create a new contact</p>
                </div>
              </button>
            ) : (
              filtered.map((f, i) => (
                <button key={f.id} onClick={() => pickRecipient(f)}
                  className="w-full p-3 rounded-[14px] border border-white/[0.05] flex items-center gap-3 text-left active:scale-[0.98] hover:border-primary/20 transition"
                  style={{
                    background: "hsl(220 15% 7%)",
                    animation: `result-slide-in 0.3s ease-out ${i * 0.04}s both`,
                  }}>
                  <Avatar name={f.contact_name} size={42} emoji={f.avatar_emoji} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white/85 truncate">{f.contact_name}</p>
                    <p className="text-[10px] text-white/40 truncate font-mono">
                      {f.contact_upi_id || f.contact_phone || "No UPI ID"}
                    </p>
                  </div>
                  <span className="px-3 h-[30px] rounded-full text-[11px] font-semibold flex items-center gap-1"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                      color: "hsl(220 20% 6%)",
                    }}>
                    Send <Send className="w-3 h-3" />
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Empty hint */}
      {!loading && favorites.length === 0 && !search && (
        <div className="relative z-10 mx-5 mt-8 p-6 rounded-[18px] border border-white/[0.05] text-center"
          style={{ background: "hsl(220 15% 7%)" }}>
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <Send className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <p className="text-[14px] font-semibold mb-1">No contacts yet</p>
          <p className="text-[11px] text-white/40">Add your first contact to send money instantly</p>
        </div>
      )}

      <BottomNav />

      {/* ─────────── RECIPIENT SHEET (slides down from top) ─────────── */}
      {recipient && (
        <div className="fixed inset-0 z-40 bg-background flex flex-col" style={{ animation: "fade-in 0.2s ease-out" }}>
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center gap-3">
            <button onClick={closeRecipient}
              className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 border border-white/[0.04]"
              style={{ background: "hsl(220 15% 8%)" }}>
              <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
            </button>
            <div className="flex-1">
              <h2 className="text-[16px] font-bold">Send to</h2>
              <p className="text-[10px] text-white/30">Step 2 of 2</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-32">
            {/* Recipient card — slides DOWN */}
            <div className="rounded-[20px] p-5 border border-white/[0.06] flex items-center gap-4 mb-6"
              style={{
                background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 22% 5.5%))",
                animation: "recipient-slide-down 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                boxShadow: "0 8px 32px hsl(0 0% 0% / 0.3)",
              }}>
              <Avatar name={recipient.contact_name} size={56} emoji={recipient.avatar_emoji} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white/90 truncate">{recipient.contact_name}</p>
                <p className="text-[11px] text-white/40 font-mono truncate">
                  {recipient.contact_upi_id || recipient.contact_phone || "No UPI ID"}
                </p>
              </div>
              <button onClick={closeRecipient}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] active:scale-90">
                <Pencil className="w-4 h-4 text-white/50" />
              </button>
            </div>

            {/* Amount */}
            <div className="rounded-[22px] p-6 mb-4 border border-white/[0.05] relative overflow-hidden"
              style={{
                background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                animation: "fade-in 0.5s ease-out 0.15s both",
              }}
              onClick={() => amountInputRef.current?.focus()}>
              <div className="absolute top-0 left-6 right-6 h-[1px]"
                style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), transparent)" }} />
              <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase mb-3 text-center">Amount</p>
              <div className="flex items-baseline gap-1 justify-center py-1">
                <span className="text-[28px] font-mono font-semibold" style={{ color: "hsl(var(--primary))" }}>₹</span>
                <span className="text-[48px] font-mono font-semibold tracking-[-1px]"
                  style={{
                    background: overBalance
                      ? "linear-gradient(135deg, hsl(0 70% 60%), hsl(0 70% 50%))"
                      : amount
                      ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))"
                      : "linear-gradient(135deg, hsl(220 10% 25%), hsl(220 10% 18%))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                  {amount || "0"}
                </span>
              </div>
              <input
                ref={amountInputRef}
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
                className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                inputMode="numeric"
                autoFocus
              />
              <p className="text-center mt-3 text-[11px] font-medium"
                style={{ color: overBalance ? "hsl(0 70% 60%)" : "hsl(220 10% 40%)" }}>
                {overBalance
                  ? `Insufficient balance · ₹${(balance / 100).toLocaleString("en-IN")} available`
                  : `Available · ₹${(balance / 100).toLocaleString("en-IN")}`}
              </p>
            </div>

            {/* Note */}
            <div style={{ animation: "fade-in 0.5s ease-out 0.25s both" }}>
              <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-2 px-1">Note (optional)</p>
              <input
                value={note}
                onChange={e => setNote(e.target.value.slice(0, 80))}
                placeholder="What's this for?"
                className="w-full h-[48px] px-4 rounded-[14px] text-[13px] outline-none border border-white/[0.06] focus:border-primary/40 transition placeholder:text-white/25"
                style={{ background: "hsl(220 15% 7%)" }}
              />
              <p className="text-right text-[9px] text-white/25 mt-1 mr-1 font-mono">{note.length}/80</p>
            </div>
          </div>

          {/* CTA */}
          <div className="fixed bottom-0 left-0 right-0 px-5 pt-3 pb-6 border-t border-white/[0.04]"
            style={{ background: "linear-gradient(180deg, hsl(220 22% 6% / 0.6), hsl(220 22% 5%))", backdropFilter: "blur(20px)" }}>
            <button
              onClick={() => { if (canSend) { haptic.medium(); setConfirming(true); } }}
              disabled={!canSend}
              className="w-full h-[54px] rounded-2xl font-semibold text-[14px] tracking-wide active:scale-[0.97] transition-all disabled:scale-100 relative overflow-hidden"
              style={{
                background: !canSend ? "hsl(220 15% 12%)" : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                color: !canSend ? "hsl(220 10% 35%)" : "hsl(220 20% 6%)",
                boxShadow: canSend ? "0 4px 24px hsl(var(--primary) / 0.3)" : "none",
                opacity: !canSend ? 0.55 : 1,
              }}>
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                {amt > 0 ? `Send ₹${amt.toLocaleString("en-IN")} to ${recipient.contact_name.split(" ")[0]}` : "Enter an amount"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────── CONFIRMATION BOTTOM SHEET ─────────── */}
      {confirming && recipient && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "fade-in 0.2s ease-out" }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !sending && setConfirming(false)} />
          <div className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8"
            style={{
              background: "linear-gradient(180deg, hsl(220 20% 8%), hsl(220 22% 5%))",
              animation: "sheet-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}>
            <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />

            <div className="flex flex-col items-center mb-6">
              <Avatar name={recipient.contact_name} size={72} emoji={recipient.avatar_emoji} />
              <p className="text-[16px] font-bold mt-3">{recipient.contact_name}</p>
              <p className="text-[11px] text-white/40 font-mono">{recipient.contact_upi_id || recipient.contact_phone}</p>
            </div>

            <div className="rounded-[16px] p-4 mb-2 space-y-2.5"
              style={{ background: "hsl(220 15% 5%)", border: "1px solid hsl(220 15% 10%)" }}>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-white/50">Amount</span>
                <span className="text-[14px] font-mono font-semibold">₹{amt.toLocaleString("en-IN")}.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-white/50">Fee</span>
                <span className="text-[12px] font-mono font-semibold" style={{ color: "hsl(152 60% 55%)" }}>FREE</span>
              </div>
              {note && (
                <div className="flex justify-between items-start gap-3 pt-2 border-t border-white/[0.05]">
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
              <button onClick={() => !sending && setConfirming(false)}
                disabled={sending}
                className="flex-1 h-[52px] rounded-2xl font-semibold text-[13px] active:scale-[0.97] transition border border-white/[0.06] text-white/70 disabled:opacity-40"
                style={{ background: "hsl(220 15% 8%)" }}>
                Edit
              </button>
              <button onClick={submit} disabled={sending}
                className="flex-[2] h-[52px] rounded-2xl font-semibold text-[13px] tracking-wide active:scale-[0.97] transition relative overflow-hidden disabled:opacity-90"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                  color: "hsl(220 20% 6%)",
                  boxShadow: "0 4px 24px hsl(var(--primary) / 0.3)",
                }}>
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
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
          style={{ background: "hsl(220 22% 4% / 0.97)", backdropFilter: "blur(12px)", animation: "fade-in 0.3s ease-out" }}>
          {/* confetti */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="absolute"
                style={{
                  width: 3, height: 8, borderRadius: 1,
                  left: `${5 + Math.random() * 90}%`,
                  top: "30%",
                  background: ["hsl(42 78% 55%)", "hsl(152 60% 50%)", "hsl(210 80% 60%)", "hsl(330 70% 55%)"][i % 4],
                  animation: `confetti-fall ${1.4 + Math.random() * 1.5}s ease-out ${Math.random() * 0.5}s both`,
                  opacity: 0.7,
                }} />
            ))}
          </div>

          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{
              background: "linear-gradient(135deg, hsl(152 60% 50%), hsl(152 60% 40%))",
              boxShadow: "0 0 60px hsl(152 60% 45% / 0.4)",
              animation: "success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}>
            <Check className="w-12 h-12" style={{ color: "hsl(220 20% 6%)" }} strokeWidth={3} />
          </div>

          <p className="text-[15px] text-white/60 mb-1" style={{ animation: "fade-in 0.4s ease-out 0.2s both" }}>
            Sent to {recipient.contact_name}
          </p>
          <p className="text-[42px] font-mono font-bold mb-2"
            style={{
              background: "linear-gradient(135deg, hsl(152 60% 60%), hsl(152 60% 75%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both",
            }}>
            ₹{amt.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-white/30 font-mono mb-10" style={{ animation: "fade-in 0.4s ease-out 0.3s both" }}>
            {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>

          <button onClick={closeRecipient}
            className="w-full max-w-xs h-[52px] rounded-2xl font-semibold text-[14px] active:scale-[0.97] transition"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              color: "hsl(220 20% 6%)",
              boxShadow: "0 4px 24px hsl(var(--primary) / 0.3)",
              animation: "fade-in 0.4s ease-out 0.4s both",
            }}>
            Done
          </button>
        </div>
      )}

      {/* ─────────── ADD CONTACT MODAL ─────────── */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "fade-in 0.2s ease-out" }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !savingContact && setShowAddContact(false)} />
          <div className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8"
            style={{ background: "hsl(220 20% 8%)", animation: "sheet-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
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
        @keyframes result-slide-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes recipient-slide-down {
          0% { opacity: 0; transform: translateY(-30px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sheet-up {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes contact-jump {
          0% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-12px) scale(1.08); }
          55% { transform: translateY(-4px) scale(1.02); }
          80% { transform: translateY(-1px) scale(1.01); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes pop-in {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        @keyframes success-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0); opacity: 1; }
          100% { transform: translateY(80vh) rotate(720deg); opacity: 0; }
        }
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
