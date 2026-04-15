import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Star, Send, X, Search, Loader2, CheckCircle2 } from "lucide-react";
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
const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

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

  // Transfer state
  const [payTarget, setPayTarget] = useState<Favorite | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [sending, setSending] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

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
    setLoading(false);
  };

  useEffect(() => { fetchFavs(); }, []);

  const addFavorite = async () => {
    if (!name) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("quick_pay_favorites").insert({
      user_id: user.id,
      contact_name: name,
      contact_upi_id: upiId || null,
      contact_phone: phone || null,
      avatar_emoji: emoji,
    });

    if (error) {
      toast.error("Failed to add contact");
    } else {
      toast.success("Contact added!");
      haptic.success();
      setName(""); setUpiId(""); setPhone(""); setEmoji("👤"); setShowAdd(false);
      fetchFavs();
    }
    setSaving(false);
  };

  const deleteFav = async (id: string) => {
    haptic.medium();
    const { error } = await supabase.from("quick_pay_favorites").delete().eq("id", id);
    if (!error) {
      toast.success("Removed");
      setFavorites(prev => prev.filter(f => f.id !== id));
    }
  };

  const openPay = (fav: Favorite) => {
    haptic.medium();
    setPayTarget(fav);
    setPayAmount("");
    setPayNote("");
    setPaySuccess(false);
  };

  const sendMoney = async () => {
    if (!payTarget || !payAmount) return;
    const amountPaise = Math.round(parseFloat(payAmount) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amountPaise > balance) {
      toast.error("Insufficient balance");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("p2p-transfer", {
        body: { favorite_id: payTarget.id, amount: amountPaise, note: payNote || undefined },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setSending(false);
        return;
      }

      haptic.success();
      setPaySuccess(true);
      setBalance(prev => prev - amountPaise);
      toast.success(data?.message || "Money sent!");

      // Auto-close after 2s
      setTimeout(() => {
        setPayTarget(null);
        setPaySuccess(false);
        fetchFavs();
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message || "Transfer failed");
    }
    setSending(false);
  };

  const filtered = favorites.filter(f =>
    !search || f.contact_name.toLowerCase().includes(search.toLowerCase()) || f.contact_upi_id?.toLowerCase().includes(search.toLowerCase())
  );

  const formatBal = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-background noise-overlay pb-28">
      <div className="px-5 pt-6 pb-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic.light(); navigate(-1); }} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold">Quick Pay</h1>
            <p className="text-[10px] text-muted-foreground">{favorites.length} saved contacts · Balance: {formatBal(balance)}</p>
          </div>
          <button onClick={() => { haptic.light(); setShowAdd(true); }} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center active:scale-90 transition-all shadow-[0_4px_12px_hsl(42_78%_55%/0.3)]">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-5 animate-slide-up-delay-1">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
            className="w-full h-12 rounded-2xl bg-card border border-border pl-11 pr-4 text-sm focus:border-primary/40 outline-none transition-all" />
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg rounded-t-3xl border-t border-border p-6 animate-slide-up" style={{ background: "linear-gradient(180deg, hsl(220 15% 12%), hsl(220 18% 7%))" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted/30 rounded-full mx-auto mb-5" />
            <h2 className="text-[16px] font-bold mb-4">Add Contact</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-2 block">Avatar</label>
                <div className="flex gap-2 flex-wrap">
                  {emojiOptions.map(e => (
                    <button key={e} onClick={() => setEmoji(e)}
                      className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all active:scale-90 ${
                        emoji === e ? "border-primary bg-primary/10" : "border-border bg-card"
                      }`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Contact name" className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary/40 outline-none transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">UPI ID</label>
                <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@upi" className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary/40 outline-none transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary/40 outline-none transition-all" />
              </div>
              <button onClick={addFavorite} disabled={saving || !name}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_4px_16px_hsl(42_78%_55%/0.3)]">
                {saving ? "Saving..." : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm animate-fade-in" onClick={() => !sending && setPayTarget(null)}>
          <div className="w-full max-w-lg rounded-t-3xl border-t border-border p-6 animate-slide-up" style={{ background: "linear-gradient(180deg, hsl(220 15% 12%), hsl(220 18% 7%))" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted/30 rounded-full mx-auto mb-5" />

            {paySuccess ? (
              <div className="flex flex-col items-center py-8 animate-scale-in">
                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </div>
                <p className="text-lg font-bold">Payment Sent!</p>
                <p className="text-sm text-muted-foreground mt-1">₹{payAmount} sent to {payTarget.contact_name}</p>
              </div>
            ) : (
              <>
                {/* Recipient info */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
                    {payTarget.avatar_emoji}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold">{payTarget.contact_name}</p>
                    <p className="text-[11px] text-muted-foreground">{payTarget.contact_upi_id || payTarget.contact_phone || "—"}</p>
                  </div>
                </div>

                {/* Amount input */}
                <div className="mb-4">
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-primary">₹</span>
                    <input
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="0"
                      type="text"
                      inputMode="decimal"
                      className="w-full h-14 rounded-xl bg-card border border-border pl-10 pr-4 text-2xl font-bold focus:border-primary/40 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Available: {formatBal(balance)}</p>
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {quickAmounts.map(amt => (
                    <button key={amt} onClick={() => setPayAmount(amt.toString())}
                      className={`px-3.5 py-2 rounded-xl text-[11px] font-semibold border transition-all active:scale-95 ${
                        payAmount === amt.toString() ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                      }`}>
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {/* Note */}
                <div className="mb-5">
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Note (optional)</label>
                  <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="What's it for?"
                    className="w-full h-11 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary/40 outline-none transition-all" />
                </div>

                {/* Send button */}
                <button onClick={sendMoney} disabled={sending || !payAmount || parseFloat(payAmount) <= 0}
                  className="w-full h-13 py-3.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_4px_16px_hsl(42_78%_55%/0.3)] flex items-center justify-center gap-2">
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send ₹{payAmount || "0"}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Favorites Grid */}
      <div className="px-5">
        {loading ? (
          <div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
              <Star className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No favorites yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">Add contacts for quick one-tap payments</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map(fav => (
              <div key={fav.id} className="relative rounded-2xl p-4 border border-border flex flex-col items-center text-center transition-all active:scale-[0.96] group" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
                <button onClick={() => deleteFav(fav.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center transition-opacity">
                  <X className="w-3 h-3 text-destructive" />
                </button>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl mb-2">
                  {fav.avatar_emoji}
                </div>
                <p className="text-[11px] font-semibold truncate w-full">{fav.contact_name}</p>
                <p className="text-[9px] text-muted-foreground truncate w-full">{fav.contact_upi_id || fav.contact_phone || "—"}</p>
                {fav.last_paid_at && (
                  <p className="text-[8px] text-muted-foreground mt-0.5">
                    Last: {new Date(fav.last_paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                )}
                <button onClick={() => openPay(fav)} className="mt-2 w-full py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all">
                  <Send className="w-3 h-3" /> Pay
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default QuickPay;
