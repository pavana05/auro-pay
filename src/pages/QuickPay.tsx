import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Star, Send, X, Search, Loader2, CheckCircle2, Delete, ChevronLeft, RefreshCw, Clock, CalendarDays, Sparkles, Zap, UserPlus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Favorite {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_upi_id: string | null;
  avatar_emoji: string;
  last_paid_at: string | null;
}

const emojiOptions = ["👤", "🧑", "👩", "👨", "🦸", "🧑‍💻", "👸", "🤴", "🧑‍🎓", "🦊", "🐱", "🐶"];

interface RecurringPayment {
  id: string;
  favorite_id: string;
  amount: number;
  frequency: string;
  next_run_at: string;
  is_active: boolean;
  note: string | null;
}

const QuickPay = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [phone, setPhone] = useState("");
  const [emoji, setEmoji] = useState("👤");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [balance, setBalance] = useState(0);
  const [payTarget, setPayTarget] = useState<Favorite | null>(null);
  const [payAmount, setPayAmount] = useState("0");
  const [payNote, setPayNote] = useState("");
  const [sending, setSending] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringFav, setRecurringFav] = useState<Favorite | null>(null);
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringFreq, setRecurringFreq] = useState<"weekly" | "monthly">("monthly");
  const [recurringNote, setRecurringNote] = useState("");
  const [savingRecurring, setSavingRecurring] = useState(false);

  const navigate = useNavigate();

  const fetchFavs = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [favsRes, walletRes] = await Promise.all([
      supabase.from("quick_pay_favorites").select("*").eq("user_id", user.id).order("last_paid_at", { ascending: false, nullsFirst: false }),
      supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    ]);
    setFavorites((favsRes.data || []) as Favorite[]);
    setBalance(walletRes.data?.balance || 0);
    const { data: recData } = await supabase.from("recurring_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (recData) setRecurringPayments(recData as RecurringPayment[]);
    setLoading(false);
  };

  useEffect(() => { fetchFavs(); }, []);

  const addFavorite = async () => {
    if (!name) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("quick_pay_favorites").insert({ user_id: user.id, contact_name: name, contact_upi_id: upiId || null, contact_phone: phone || null, avatar_emoji: emoji });
    if (error) { toast.error("Failed to add contact"); } else { toast.success("Contact added!"); haptic.success(); setName(""); setUpiId(""); setPhone(""); setEmoji("👤"); setShowAdd(false); fetchFavs(); }
    setSaving(false);
  };

  const deleteFav = async (id: string) => {
    haptic.medium();
    const { error } = await supabase.from("quick_pay_favorites").delete().eq("id", id);
    if (!error) { toast.success("Removed"); setFavorites(prev => prev.filter(f => f.id !== id)); }
  };

  const openPay = (fav: Favorite) => { haptic.medium(); setPayTarget(fav); setPayAmount("0"); setPayNote(""); setPaySuccess(false); };

  const handleNumpad = (key: string) => {
    haptic.light();
    if (key === "backspace") {
      setPayAmount(prev => { const stripped = prev.replace(".", ""); const newVal = stripped.slice(0, -1) || "0"; return parseInt(newVal).toString(); });
    } else {
      setPayAmount(prev => { if (prev === "0") return key; if (prev.length >= 7) return prev; return prev + key; });
    }
  };

  const getFormattedAmount = () => { const num = parseInt(payAmount) || 0; return `₹${num.toLocaleString("en-IN")}.00`; };

  const sendMoney = async () => {
    if (!payTarget) return;
    const amountRupees = parseInt(payAmount) || 0;
    if (amountRupees <= 0) { toast.error("Enter a valid amount"); return; }
    const amountPaise = amountRupees * 100;
    if (amountPaise > balance) { toast.error("Insufficient balance"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("p2p-transfer", { body: { favorite_id: payTarget.id, amount: amountPaise, note: payNote || undefined } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setSending(false); return; }
      haptic.success(); setPaySuccess(true); setBalance(prev => prev - amountPaise); toast.success(data?.message || "Money sent!");
      setTimeout(() => { setPayTarget(null); setPaySuccess(false); fetchFavs(); }, 2000);
    } catch (err: any) { toast.error(err?.message || "Transfer failed"); }
    setSending(false);
  };

  const createRecurring = async () => {
    if (!recurringFav || !recurringAmount) return;
    setSavingRecurring(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingRecurring(false); return; }
    const amountPaise = parseInt(recurringAmount) * 100;
    const nextRun = new Date();
    if (recurringFreq === "weekly") { nextRun.setDate(nextRun.getDate() + 7); } else { nextRun.setMonth(nextRun.getMonth() + 1); }
    const { error } = await supabase.from("recurring_payments").insert({ user_id: user.id, favorite_id: recurringFav.id, amount: amountPaise, frequency: recurringFreq, next_run_at: nextRun.toISOString(), note: recurringNote || null });
    if (error) { toast.error("Failed to set up recurring payment"); } else { toast.success("Recurring payment scheduled!"); haptic.success(); setShowRecurring(false); setRecurringFav(null); setRecurringAmount(""); setRecurringNote(""); fetchFavs(); }
    setSavingRecurring(false);
  };

  const toggleRecurring = async (id: string, isActive: boolean) => {
    haptic.medium();
    const { error } = await supabase.from("recurring_payments").update({ is_active: !isActive }).eq("id", id);
    if (!error) { setRecurringPayments(prev => prev.map(r => r.id === id ? { ...r, is_active: !isActive } : r)); toast.success(!isActive ? "Activated" : "Paused"); }
  };

  const deleteRecurring = async (id: string) => {
    haptic.medium();
    const { error } = await supabase.from("recurring_payments").delete().eq("id", id);
    if (!error) { setRecurringPayments(prev => prev.filter(r => r.id !== id)); toast.success("Recurring payment removed"); }
  };

  const filtered = favorites.filter(f => !search || f.contact_name.toLowerCase().includes(search.toLowerCase()) || f.contact_upi_id?.toLowerCase().includes(search.toLowerCase()));
  const formatBal = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  // Full-screen Send Money view
  if (payTarget) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(42 78% 55% / 0.06) 0%, hsl(220 20% 4%) 30%)" }}>
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.04), transparent 70%)" }} />

        {/* Header */}
        <div className="px-5 pt-6 pb-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => !sending && setPayTarget(null)} className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-all backdrop-blur-xl">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-[18px] font-bold">Send Money</h1>
              <p className="text-[10px] text-muted-foreground">Balance: {formatBal(balance)}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/15">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary">Instant</span>
            </div>
          </div>
        </div>

        {paySuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="relative w-24 h-24 mb-5">
              <div className="absolute inset-[-8px] rounded-full border border-success/10" style={{ animation: "scanner-ring 2s ease-in-out infinite" }} />
              <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-14 h-14 text-success" />
              </div>
            </div>
            <p className="text-2xl font-bold">Payment Sent!</p>
            <p className="text-sm text-muted-foreground mt-2">{getFormattedAmount()} sent to {payTarget.contact_name}</p>
          </div>
        ) : (
          <>
            {/* Beneficiaries horizontal scroll */}
            <div className="px-5 mb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both" }}>
              <p className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-widest uppercase">Recent</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {favorites.slice(0, 5).map((fav, i) => (
                  <button key={fav.id} onClick={() => { haptic.light(); setPayTarget(fav); setPayAmount("0"); }}
                    className={`flex flex-col items-center gap-1.5 shrink-0 transition-all duration-200 ${payTarget.id === fav.id ? "opacity-100 scale-100" : "opacity-40 scale-95"}`}
                    style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.04}s both` }}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-300 ${
                      payTarget.id === fav.id ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(42_78%_55%/0.3)]" : "border-white/[0.06] bg-white/[0.03]"
                    }`}>{fav.avatar_emoji}</div>
                    <p className="text-[10px] font-medium w-14 truncate text-center">{fav.contact_name.split(" ")[0]}</p>
                  </button>
                ))}
                <button onClick={() => { setPayTarget(null); setShowAdd(true); }} className="flex flex-col items-center gap-1.5 shrink-0 opacity-40">
                  <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/[0.1] flex items-center justify-center bg-white/[0.02]">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground">Add</p>
                </button>
              </div>
            </div>

            {/* Amount Display */}
            <div className="px-5 mb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both" }}>
              <div className="rounded-3xl p-6 border border-white/[0.06] relative overflow-hidden" style={{ background: "linear-gradient(145deg, hsl(220 15% 10% / 0.9), hsl(220 18% 6%))" }}>
                <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.3), transparent)" }} />
                <p className="text-[10px] text-muted-foreground mb-2 tracking-wider uppercase font-medium">Enter amount</p>
                <div className="flex items-center justify-center">
                  <span className="text-4xl font-light tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>{getFormattedAmount()}</span>
                  <span className="w-0.5 h-10 bg-primary/60 ml-1 animate-pulse rounded-full" />
                </div>
              </div>
            </div>

            {/* Note input */}
            <div className="px-5 mb-3" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both" }}>
              <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Add a note..."
                className="w-full h-11 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 text-[13px] text-muted-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 outline-none transition-all backdrop-blur" />
            </div>

            {/* Numpad */}
            <div className="flex-1" />
            <div className="px-8 pb-3" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both" }}>
              <div className="grid grid-cols-3 gap-2.5">
                {["1","2","3","4","5","6","7","8","9","","0","backspace"].map((key, i) => {
                  if (key === "") return <div key={i} />;
                  return (
                    <button key={key} onClick={() => handleNumpad(key)}
                      className="h-[56px] rounded-2xl flex items-center justify-center text-xl font-medium transition-all duration-150 active:scale-90 active:bg-primary/10 bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.05]">
                      {key === "backspace" ? <Delete className="w-5 h-5 text-muted-foreground" /> : key}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Send Button */}
            <div className="px-5 pb-8" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both" }}>
              <button onClick={sendMoney} disabled={sending || parseInt(payAmount) <= 0}
                className="w-full h-14 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-40 gradient-primary text-primary-foreground shadow-[0_4px_20px_hsl(42_78%_55%/0.25)] shimmer-border relative overflow-hidden">
                {sending ? (<><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>) : (<><Send className="w-5 h-5" /> Send Money</>)}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay pb-28 relative overflow-hidden">
      {/* Ambient glows - red and blue accents */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsl(210 80% 55% / 0.04), transparent 70%)" }} />
      <div className="absolute bottom-1/3 left-0 w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsl(0 70% 55% / 0.03), transparent 70%)" }} />

      {/* Header */}
      <div className="px-5 pt-6 pb-4 relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic.light(); navigate(-1); }} className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[20px] font-bold tracking-tight">Quick Pay</h1>
            <p className="text-[10px] text-muted-foreground">{favorites.length} contacts · {formatBal(balance)}</p>
          </div>
          <button onClick={() => { haptic.light(); setShowAdd(true); }}
            className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center active:scale-90 transition-all shadow-[0_4px_16px_hsl(42_78%_55%/0.3)]">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-5 relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both" }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
            className="w-full h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] pl-11 pr-4 text-sm focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.1)] outline-none transition-all" />
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" style={{ animation: "fade-in 0.2s ease-out" }} />
          <div className="relative w-full max-w-lg rounded-t-3xl border-t border-white/[0.08] p-6" style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/[0.1] rounded-full mx-auto mb-5" />
            <h2 className="text-[16px] font-bold mb-1 flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Add Contact</h2>
            <p className="text-[11px] text-muted-foreground mb-4">Save for quick one-tap payments</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Avatar</label>
                <div className="flex gap-2 flex-wrap">
                  {emojiOptions.map(e => (
                    <button key={e} onClick={() => setEmoji(e)}
                      className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all active:scale-90 ${
                        emoji === e ? "border-primary bg-primary/10 shadow-[0_0_12px_hsl(42_78%_55%/0.2)]" : "border-white/[0.06] bg-white/[0.03]"
                      }`}>{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Contact name" className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm focus:border-primary/30 outline-none transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">UPI ID</label>
                <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@upi" className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm focus:border-primary/30 outline-none transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm focus:border-primary/30 outline-none transition-all" />
              </div>
              <button onClick={addFavorite} disabled={saving || !name}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_4px_16px_hsl(42_78%_55%/0.3)] flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorites Grid */}
      <div className="px-5 relative z-10">
        {loading ? (
          <div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-32 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
              <Star className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No favorites yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">Add contacts for quick one-tap payments</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((fav, i) => (
              <div key={fav.id}
                className="relative rounded-2xl p-4 border border-white/[0.06] flex flex-col items-center text-center transition-all active:scale-[0.96] group hover:border-primary/15"
                style={{ background: "linear-gradient(145deg, hsl(220 15% 9%), hsl(220 18% 6%))", animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.08 + i * 0.03}s both` }}>
                <button onClick={() => deleteFav(fav.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center transition-opacity">
                  <X className="w-3 h-3 text-destructive" />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-primary/8 border border-primary/10 flex items-center justify-center text-2xl mb-2 shadow-[0_2px_8px_hsl(42_78%_55%/0.1)]">
                  {fav.avatar_emoji}
                </div>
                <p className="text-[11px] font-semibold truncate w-full">{fav.contact_name}</p>
                <p className="text-[9px] text-muted-foreground truncate w-full">{fav.contact_upi_id || fav.contact_phone || "—"}</p>
                {fav.last_paid_at && (
                  <p className="text-[8px] text-muted-foreground/60 mt-0.5">
                    Last: {new Date(fav.last_paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                )}
                <div className="mt-2 flex gap-1.5 w-full">
                  <button onClick={() => openPay(fav)} className="flex-1 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all border border-primary/10">
                    <Send className="w-3 h-3" /> Pay
                  </button>
                  <button onClick={() => { haptic.light(); setRecurringFav(fav); setShowRecurring(true); }} className="py-1.5 px-2 rounded-xl bg-white/[0.03] text-muted-foreground text-[10px] flex items-center justify-center active:scale-95 transition-all border border-white/[0.06]">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recurring Payments */}
      {recurringPayments.length > 0 && (
        <div className="px-5 mt-6 mb-5 relative z-10">
          <h3 className="text-[12px] font-bold mb-3 flex items-center gap-2 tracking-wider uppercase text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5 text-primary" /> Recurring Payments
          </h3>
          <div className="space-y-2.5">
            {recurringPayments.map(rp => {
              const fav = favorites.find(f => f.id === rp.favorite_id);
              return (
                <div key={rp.id} className="rounded-2xl p-4 border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center text-lg shrink-0">{fav?.avatar_emoji || "👤"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate">{fav?.contact_name || "Contact"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground capitalize flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {rp.frequency}</span>
                      <span className="text-[10px] text-muted-foreground">Next: {new Date(rp.next_run_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <p className="text-[12px] font-bold tabular-nums">₹{(rp.amount / 100).toLocaleString("en-IN")}</p>
                    <button onClick={() => toggleRecurring(rp.id, rp.is_active)}
                      className={`w-9 h-5 rounded-full flex items-center transition-all duration-300 ${rp.is_active ? "bg-success justify-end" : "bg-white/[0.08] justify-start"}`}>
                      <div className="w-4 h-4 rounded-full bg-foreground mx-0.5 transition-all" />
                    </button>
                    <button onClick={() => deleteRecurring(rp.id)} className="w-6 h-6 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-90 transition-all">
                      <X className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recurring Payment Modal */}
      {showRecurring && recurringFav && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowRecurring(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" style={{ animation: "fade-in 0.2s ease-out" }} />
          <div className="relative w-full max-w-lg rounded-t-3xl border-t border-white/[0.08] p-6" style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/[0.1] rounded-full mx-auto mb-5" />
            <h2 className="text-[16px] font-bold mb-1 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" /> Recurring Payment</h2>
            <p className="text-[11px] text-muted-foreground mb-5">Auto-pay to {recurringFav.contact_name}</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-xl">{recurringFav.avatar_emoji}</div>
                <div>
                  <p className="text-[12px] font-semibold">{recurringFav.contact_name}</p>
                  <p className="text-[10px] text-muted-foreground">{recurringFav.contact_upi_id || recurringFav.contact_phone || "—"}</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Amount (₹) *</label>
                <input value={recurringAmount} onChange={e => setRecurringAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Enter amount"
                  className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm focus:border-primary/30 outline-none transition-all tabular-nums" inputMode="numeric" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Frequency</label>
                <div className="flex gap-2">
                  {(["weekly", "monthly"] as const).map(freq => (
                    <button key={freq} onClick={() => setRecurringFreq(freq)}
                      className={`flex-1 py-3 rounded-xl text-[12px] font-semibold capitalize flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                        recurringFreq === freq ? "border-primary bg-primary/10 text-primary" : "border-white/[0.06] bg-white/[0.03] text-muted-foreground"
                      }`}>
                      {freq === "weekly" ? <Clock className="w-3.5 h-3.5" /> : <CalendarDays className="w-3.5 h-3.5" />} {freq}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Note (optional)</label>
                <input value={recurringNote} onChange={e => setRecurringNote(e.target.value)} placeholder="e.g. Pocket money, Rent"
                  className="w-full h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-sm focus:border-primary/30 outline-none transition-all" />
              </div>
              <button onClick={createRecurring} disabled={savingRecurring || !recurringAmount}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_4px_16px_hsl(42_78%_55%/0.3)] flex items-center justify-center gap-2">
                {savingRecurring ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</> : <><RefreshCw className="w-4 h-4" /> Schedule Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default QuickPay;
