import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Star, Send, X, Search, Loader2, CheckCircle2, Delete, ChevronLeft, RefreshCw, Clock, CalendarDays, Sparkles, Zap, UserPlus, Shield, TrendingUp, Heart, Copy, Share2, FileText, ArrowRight, Receipt } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate, useLocation } from "react-router-dom";
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

// Floating particle component
const FloatingParticles = () => {
  const particles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      size: 2 + Math.random() * 3,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 5,
      opacity: 0.03 + Math.random() * 0.06,
    })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: `hsl(42 78% 55% / ${p.opacity})`,
            animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
            boxShadow: `0 0 ${p.size * 3}px hsl(42 78% 55% / ${p.opacity * 0.5})`,
          }}
        />
      ))}
    </div>
  );
};

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
  const [mounted, setMounted] = useState(false);
  const [numpadPressed, setNumpadPressed] = useState<string | null>(null);
  const [amountPulse, setAmountPulse] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [successAmount, setSuccessAmount] = useState("");
  const [successTimestamp, setSuccessTimestamp] = useState("");
  const [successTxnId, setSuccessTxnId] = useState("");
  const [contactHistory, setContactHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setMounted(true); }, []);

  // Auto-open payment for a contact passed via navigation state
  useEffect(() => {
    const state = location.state as { selectedContact?: Favorite } | null;
    if (state?.selectedContact && !payTarget) {
      const contact = state.selectedContact;
      // Find matching favorite or use the passed one directly
      setPayTarget({ ...contact, last_paid_at: contact.last_paid_at || null });
      setPayAmount("0");
      setPayNote("");
      setPaySuccess(false);
      // Clear the state so back navigation doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state, favorites]);

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

  const openPay = (fav: Favorite) => { haptic.medium(); setPayTarget(fav); setPayAmount("0"); setPayNote(""); setPaySuccess(false); setContactHistory([]); };

  const fetchContactHistory = async (favId: string) => {
    setLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: wallet } = await supabase.from("wallets").select("id").eq("user_id", user.id).single();
      if (!wallet) return;
      const { data: txns } = await supabase
        .from("transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(10);
      // Filter transactions that match this contact (by description containing contact name or favorite_id in description)
      setContactHistory(txns || []);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
    setLoadingHistory(false);
  };

  const shareReceipt = async () => {
    haptic.medium();
    if (!payTarget) return;
    const receiptText = [
      `💰 Payment Receipt — AuroPay`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Amount: ${successAmount}`,
      `To: ${payTarget.contact_name}`,
      payTarget.contact_upi_id ? `UPI: ${payTarget.contact_upi_id}` : "",
      `Date: ${successTimestamp}`,
      `Txn ID: ${successTxnId}`,
      `Status: ✅ Completed`,
      payNote ? `Note: ${payNote}` : "",
      `━━━━━━━━━━━━━━━━━━━━`,
      `Sent via AuroPay`,
    ].filter(Boolean).join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: "Payment Receipt", text: receiptText });
      } catch (e) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(receiptText);
      toast.success("Receipt copied to clipboard!");
    }
  };

  const handleNumpad = (key: string) => {
    haptic.light();
    setNumpadPressed(key);
    setTimeout(() => setNumpadPressed(null), 150);
    setAmountPulse(true);
    setTimeout(() => setAmountPulse(false), 200);
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
      haptic.success();
      setSuccessAmount(getFormattedAmount());
      setSuccessTimestamp(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
      setSuccessTxnId(data?.transaction_id || `TXN${Date.now().toString(36).toUpperCase()}`);
      setPaySuccess(true);
      setShowPaymentDetails(false);
      setBalance(prev => prev - amountPaise);
      fetchFavs();
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

  const copyUpiId = (upi: string) => {
    navigator.clipboard.writeText(upi);
    haptic.light();
    toast.success("UPI ID copied!");
  };

  // Full-screen Send Money view
  if (payTarget) {
    const amountNum = parseInt(payAmount) || 0;
    const balPercent = balance > 0 ? Math.min((amountNum * 100 / (balance / 100)) * 100, 100) : 0;
    const isOverBalance = amountNum * 100 > balance;

    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(220 22% 8%) 0%, hsl(225 28% 3%) 100%)" }}>
        <FloatingParticles />

        {/* Ambient glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.05), transparent 65%)" }} />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsl(42 78% 45% / 0.03), transparent 60%)" }} />

        {/* Header */}
        <div className="px-5 pt-6 pb-3" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => !sending && setPayTarget(null)} className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center active:scale-90 transition-all backdrop-blur-xl hover:bg-white/[0.08] hover:border-primary/20">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-[18px] font-bold tracking-[-0.3px]">Send Money</h1>
              <p className="text-[10px] text-white/30 flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Secured & Encrypted</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="text-[10px] font-semibold text-primary tabular-nums">{formatBal(balance)}</span>
            </div>
          </div>
        </div>

        {/* Premium Processing Animation */}
        {sending && !paySuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "linear-gradient(180deg, hsl(220 22% 6% / 0.95), hsl(225 28% 3% / 0.98))", animation: "fade-in 0.3s ease-out both" }}>
            <div className="flex flex-col items-center px-8">
              {/* Animated rings */}
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 rounded-full border border-primary/10" style={{ animation: "processing-ring-1 2s linear infinite" }} />
                <div className="absolute inset-2 rounded-full border border-primary/15" style={{ animation: "processing-ring-2 2.5s linear infinite reverse" }} />
                <div className="absolute inset-4 rounded-full border border-primary/20" style={{ animation: "processing-ring-1 1.5s linear infinite" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center" style={{ animation: "gentle-pulse 1.5s ease-in-out infinite", boxShadow: "0 0 40px hsl(42 78% 55% / 0.15)" }}>
                    <Send className="w-7 h-7 text-primary" style={{ animation: "processing-send 2s ease-in-out infinite" }} />
                  </div>
                </div>
              </div>
              {/* Animated dots */}
              <p className="text-[16px] font-bold mb-2">Processing Payment</p>
              <div className="flex items-center gap-1.5 mb-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: `processing-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <p className="text-[11px] text-white/30 flex items-center gap-1.5"><Shield className="w-3 h-3" /> Securely transferring {getFormattedAmount()}</p>
            </div>
          </div>
        )}

        {paySuccess ? (
          <div className="flex-1 flex flex-col relative overflow-y-auto">
            {/* Ambient glow orbs */}
            <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsl(152 60% 45% / 0.08), transparent 70%)", animation: "gentle-pulse 3s ease-in-out infinite" }} />
            <div className="absolute top-[20%] right-[-60px] w-[200px] h-[200px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsl(42 78% 55% / 0.05), transparent 70%)" }} />
            <div className="absolute bottom-[30%] left-[-40px] w-[150px] h-[150px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsl(210 80% 55% / 0.04), transparent 70%)" }} />

            {/* Success view */}
            <div className="flex flex-col items-center justify-center px-5 pt-10 pb-6 relative" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
              {/* Confetti particles — more + varied shapes */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="absolute" style={{
                    width: i % 3 === 0 ? 3 : 2 + Math.random() * 3,
                    height: i % 3 === 0 ? 8 : 2 + Math.random() * 3,
                    borderRadius: i % 3 === 0 ? "1px" : "50%",
                    left: `${3 + Math.random() * 94}%`,
                    top: `${5 + Math.random() * 45}%`,
                    background: ["hsl(42 78% 55%)", "hsl(152 60% 45%)", "hsl(210 80% 60%)", "hsl(330 70% 55%)", "hsl(280 60% 55%)", "hsl(45 90% 65%)"][i % 6],
                    animation: `confetti-fall ${1.5 + Math.random() * 2.5}s ease-out ${Math.random() * 1}s both`,
                    opacity: 0.6 + Math.random() * 0.3,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }} />
                ))}
              </div>

              {/* Premium check icon with layered rings */}
              <div className="relative w-28 h-28 mb-6">
                {/* Outer rotating ring */}
                <div className="absolute inset-[-24px] rounded-full" style={{
                  border: "1px solid transparent",
                  borderTopColor: "hsl(152 60% 45% / 0.15)",
                  borderRightColor: "hsl(152 60% 45% / 0.08)",
                  animation: "spin 8s linear infinite",
                }} />
                {/* LED dots ring */}
                <div className="absolute inset-[-18px]">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="absolute w-1 h-1 rounded-full" style={{
                      background: `hsl(152 60% 45% / ${0.15 + (i % 3) * 0.1})`,
                      left: "50%",
                      top: "50%",
                      transform: `rotate(${i * 30}deg) translateY(-${52}px)`,
                      animation: `gentle-pulse 2s ease-in-out ${i * 0.15}s infinite`,
                    }} />
                  ))}
                </div>
                {/* Pulsing glow ring */}
                <div className="absolute inset-[-10px] rounded-full border border-success/10" style={{ animation: "scanner-ring 2.5s ease-in-out infinite" }} />
                <div className="absolute inset-[-4px] rounded-full border border-success/5" style={{ animation: "scanner-ring 2.5s ease-in-out 0.5s infinite" }} />
                {/* Main circle */}
                <div className="w-28 h-28 rounded-full flex items-center justify-center relative" style={{
                  background: "radial-gradient(circle at 30% 30%, hsl(152 60% 45% / 0.18), hsl(152 60% 45% / 0.06))",
                  boxShadow: "0 0 60px hsl(152 60% 45% / 0.2), 0 0 120px hsl(152 60% 45% / 0.06), inset 0 1px 0 hsl(152 60% 90% / 0.08)",
                  animation: "success-glow 2.5s ease-in-out infinite",
                }}>
                  <div className="absolute inset-[1px] rounded-full" style={{ background: "linear-gradient(135deg, hsl(152 60% 90% / 0.04), transparent)" }} />
                  <CheckCircle2 className="w-14 h-14 text-success relative z-10" style={{ animation: "scale-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both", filter: "drop-shadow(0 0 12px hsl(152 60% 45% / 0.3))" }} />
                </div>
              </div>

              {/* Text with premium styling */}
              <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-success/70 mb-1" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s both" }}>
                Payment Successful
              </p>
              <p className="text-[36px] font-bold tabular-nums tracking-tight" style={{
                animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.18s both",
                background: "linear-gradient(135deg, hsl(42 78% 65%), hsl(42 78% 50%), hsl(42 78% 65%))",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 20px hsl(42 78% 55% / 0.15))",
              }}>{successAmount}</p>
              <div className="flex items-center gap-2 mt-2" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.24s both" }}>
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">{payTarget.avatar_emoji}</div>
                <p className="text-[12px] text-muted-foreground">sent to <span className="font-semibold text-foreground">{payTarget.contact_name}</span></p>
              </div>

              {/* Timestamp badge */}
              <div className="mt-3 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.28s both" }}>
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground tabular-nums">{successTimestamp}</span>
              </div>

              {/* Action buttons — premium glass style */}
              <div className="flex gap-2.5 mt-7 w-full px-2" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s both" }}>
                <button onClick={() => { haptic.medium(); setShowPaymentDetails(prev => { if (!prev) fetchContactHistory(payTarget.id); return !prev; }); }}
                  className="flex-1 h-[52px] rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[12px] font-semibold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all text-foreground hover:bg-white/[0.06] hover:border-white/[0.1] backdrop-blur-sm">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground">{showPaymentDetails ? "Hide" : "Details"}</span>
                </button>
                <button onClick={shareReceipt}
                  className="flex-1 h-[52px] rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[12px] font-semibold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all text-foreground hover:bg-white/[0.06] hover:border-white/[0.1] backdrop-blur-sm">
                  <Share2 className="w-4 h-4 text-accent" />
                  <span className="text-[10px] text-muted-foreground">Share</span>
                </button>
                <button onClick={() => { haptic.light(); setPaySuccess(false); setPayAmount("0"); setPayNote(""); }}
                  className="flex-1 h-[52px] rounded-2xl text-[12px] font-semibold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all relative overflow-hidden group" style={{
                    background: "linear-gradient(135deg, hsl(42 78% 45%), hsl(42 78% 38%))",
                    boxShadow: "0 4px 20px hsl(42 78% 55% / 0.25), inset 0 1px 0 hsl(42 78% 75% / 0.15)",
                  }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Send className="w-4 h-4 text-primary-foreground relative z-10" />
                  <span className="text-[10px] text-primary-foreground/80 relative z-10">Pay Again</span>
                </button>
              </div>

              <button onClick={() => { haptic.light(); setPayTarget(null); setPaySuccess(false); setPayAmount("0"); }}
                className="mt-4 text-[11px] text-white/25 hover:text-white/50 transition-colors flex items-center gap-1"
                style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both" }}>
                <ArrowLeft className="w-3 h-3" /> Back to Contacts
              </button>
            </div>

            {/* Payment Details Panel — Premium glassmorphism */}
            {showPaymentDetails && (
              <div className="px-5 pb-8" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
                <div className="rounded-[22px] border border-white/[0.06] overflow-hidden backdrop-blur-xl relative" style={{ background: "linear-gradient(145deg, hsl(220 18% 10% / 0.95), hsl(225 22% 5.5%))" }}>
                  {/* Inner glow overlay */}
                  <div className="absolute inset-0 rounded-[22px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top center, hsl(42 78% 55% / 0.03), transparent 60%)" }} />

                  {/* Top accent line */}
                  <div className="h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.4), hsl(152 60% 45% / 0.2), transparent)" }} />

                  {/* Recipient info */}
                  <div className="p-5 border-b border-white/[0.04] relative" style={{ animation: "fade-in 0.3s ease-out 0.1s both" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-13 h-13 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center text-2xl relative" style={{ boxShadow: "0 0 20px hsl(42 78% 55% / 0.08)" }}>
                        {payTarget.avatar_emoji}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-success/20 border border-success/30 flex items-center justify-center">
                          <CheckCircle2 className="w-2.5 h-2.5 text-success" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold">{payTarget.contact_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{payTarget.contact_upi_id || payTarget.contact_phone || "—"}</p>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-success/8 border border-success/15" style={{ boxShadow: "0 0 12px hsl(152 60% 45% / 0.06)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-[9px] font-semibold text-success/80 uppercase tracking-wider">Completed</span>
                      </div>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="p-5 space-y-0 relative">
                    {[
                      { label: "Amount", value: successAmount, highlight: true },
                      { label: "Date & Time", value: successTimestamp },
                      { label: "Transaction ID", value: successTxnId },
                      { label: "Payment Method", value: "Wallet Transfer" },
                      { label: "Status", value: "Completed", status: true },
                      ...(payNote ? [{ label: "Note", value: payNote }] : []),
                    ].map((item, i) => (
                      <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/[0.03] last:border-0" style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.05}s both` }}>
                        <span className="text-[11px] text-white/30 font-medium">{item.label}</span>
                        <span className={`text-[12px] font-semibold tabular-nums flex items-center gap-1.5 ${
                          (item as any).highlight ? "text-primary" : (item as any).status ? "text-success" : "text-foreground"
                        }`}>
                          {(item as any).status && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                          {item.value}
                          {item.label === "Transaction ID" && (
                            <button onClick={() => { navigator.clipboard.writeText(item.value); haptic.light(); toast.success("Copied!"); }} className="text-white/20 hover:text-primary transition-colors ml-1">
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.15), transparent)" }} />

                  {/* Transaction History with this contact */}
                  <div className="p-5">
                    <p className="text-[11px] text-white/30 uppercase tracking-[0.15em] font-semibold mb-3 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Recent Transactions
                    </p>
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-primary/40" />
                      </div>
                    ) : contactHistory.length === 0 ? (
                      <p className="text-[10px] text-white/15 text-center py-3">No previous transactions found</p>
                    ) : (
                      <div className="space-y-2">
                        {contactHistory.slice(0, 5).map((tx, i) => (
                          <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all duration-200"
                            style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.05 + i * 0.06}s both` }}>
                            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center text-sm">
                              {tx.type === "credit" ? "💰" : "💸"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium truncate">{tx.merchant_name || tx.description || "Transfer"}</p>
                              <p className="text-[9px] text-white/20">{new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                            </div>
                            <p className={`text-[11px] font-bold tabular-nums ${
                              tx.status === "success" ? "text-success" : tx.status === "pending" ? "text-warning" : tx.status === "failed" ? "text-destructive" : "text-muted-foreground"
                            }`}>
                              {tx.type === "credit" ? "+" : "-"}₹{(tx.amount / 100).toLocaleString("en-IN")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom shimmer */}
                  <div className="h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.15), transparent)" }} />
                </div>
              </div>
            )}
          </div>
        ) : !sending && (
          <>
            {/* Paying To */}
            <div className="px-5 mb-3" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.04s both" }}>
              <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center text-2xl shadow-[0_2px_12px_hsl(42_78%_55%/0.1)]">
                  {payTarget.avatar_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate">{payTarget.contact_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{payTarget.contact_upi_id || payTarget.contact_phone || "No UPI ID"}</p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/8 border border-success/10">
                  <Shield className="w-2.5 h-2.5 text-success/70" />
                  <span className="text-[9px] font-medium text-success/70">Verified</span>
                </div>
              </div>
            </div>



            {/* Amount Display */}
            <div className="px-5 mb-4" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s both" }}>
              <div className="rounded-[24px] p-7 border border-white/[0.06] relative overflow-hidden" style={{ background: "linear-gradient(145deg, hsl(220 15% 10% / 0.95), hsl(225 22% 5%))" }}>
                <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.3), transparent)" }} />
                <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, hsl(42 78% 55%), transparent)" }} />
                <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, hsl(210 80% 60%), transparent)" }} />
                <p className="text-[10px] text-white/25 mb-3 tracking-[0.2em] uppercase font-semibold text-center">Enter Amount</p>
                <div className="flex items-center justify-center">
                  <span className={`text-[44px] font-bold tracking-[-1px] transition-all duration-300 ${isOverBalance ? "text-destructive" : ""} ${amountPulse ? "scale-[1.03]" : "scale-100"}`} style={{ fontVariantNumeric: "tabular-nums", textShadow: isOverBalance ? "0 0 20px hsl(0 84% 60% / 0.2)" : "0 0 30px hsl(42 78% 55% / 0.08)" }}>
                    {getFormattedAmount()}
                  </span>
                  <span className="w-0.5 h-12 bg-primary/60 ml-1.5 animate-pulse rounded-full" />
                </div>
                {/* Quick amounts */}
                <div className="flex justify-center gap-2 mt-5">
                  {[100, 200, 500, 1000, 2000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => { haptic.light(); setPayAmount(amt.toString()); setAmountPulse(true); setTimeout(() => setAmountPulse(false), 200); }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 active:scale-90 border ${
                        parseInt(payAmount) === amt 
                          ? "bg-primary/15 text-primary border-primary/25 shadow-[0_0_12px_hsl(42_78%_55%/0.15)]" 
                          : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                      }`}
                    >
                      ₹{amt >= 1000 ? `${amt/1000}K` : amt}
                    </button>
                  ))}
                </div>
                {/* Amount insight */}
                {amountNum > 0 && !isOverBalance && (
                  <div className="mt-4 flex items-center justify-center gap-1.5" style={{ animation: "fade-in 0.3s ease-out" }}>
                    <TrendingUp className="w-3 h-3 text-primary/40" />
                    <p className="text-[9px] text-white/20">
                      {balPercent < 10 ? "Small transfer" : balPercent < 30 ? "Moderate amount" : balPercent < 60 ? "Significant transfer" : "Large transaction"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Note input */}
            <div className="px-5 mb-3" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.16s both" }}>
              <div className="relative">
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15" />
                <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Add a note..." maxLength={100}
                  className="w-full h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] pl-10 pr-14 text-[13px] text-foreground placeholder:text-white/15 focus:border-primary/30 focus:shadow-[0_0_0_4px_hsl(42_78%_55%/0.05)] outline-none transition-all backdrop-blur" />
                {payNote && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-white/15">{payNote.length}/100</span>
                )}
              </div>
            </div>

            {/* Numpad */}
            <div className="flex-1" />
            <div className="px-6 pb-3" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both" }}>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","","0","backspace"].map((key, i) => {
                  if (key === "") return <div key={i} />;
                  return (
                    <button key={key} onClick={() => handleNumpad(key)}
                      className={`h-[54px] rounded-2xl flex items-center justify-center text-xl font-semibold transition-all duration-150 active:scale-[0.88] border ${
                        numpadPressed === key
                          ? "bg-primary/15 border-primary/20 scale-[0.92] shadow-[0_0_16px_hsl(42_78%_55%/0.15)]"
                          : "bg-white/[0.025] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08]"
                      }`}>
                      {key === "backspace" ? <Delete className="w-5 h-5 text-white/30" /> : key}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Send Button */}
            <div className="px-5 pb-8" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both" }}>
              <button onClick={sendMoney} disabled={sending || amountNum <= 0 || isOverBalance}
                className="w-full h-[56px] rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all disabled:opacity-40 gradient-primary text-primary-foreground relative overflow-hidden group"
                style={{ boxShadow: amountNum > 0 && !isOverBalance ? "0 6px 30px hsl(42 78% 55% / 0.3), 0 2px 8px hsl(42 78% 55% / 0.15)" : "none" }}>
                <div className="absolute inset-0 shimmer-border rounded-2xl" />
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.05] transition-colors duration-300 rounded-2xl" />
                {sending ? (<><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>) : (<><Send className="w-5 h-5 transition-transform group-hover:translate-x-0.5" /> Send {amountNum > 0 ? getFormattedAmount() : "Money"}</>)}
              </button>
              {amountNum > 0 && !isOverBalance && (
                <p className="text-center text-[9px] text-white/15 mt-2 flex items-center justify-center gap-1" style={{ animation: "fade-in 0.3s ease-out" }}>
                  <Shield className="w-2.5 h-2.5" /> End-to-end encrypted transfer
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      <FloatingParticles />

      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full opacity-[0.035] blur-[100px]" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute bottom-[30%] -left-20 w-[200px] h-[200px] rounded-full opacity-[0.02] blur-[70px]" style={{ background: "hsl(210 80% 55%)" }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pt-4 pb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { haptic.light(); navigate(-1); }}
                className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]"
                style={{ background: "hsl(220 15% 8%)" }}>
                <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
              </button>
              <div>
                <h1 className="text-[19px] font-bold tracking-[-0.5px]">Quick Pay</h1>
                <p className="text-[10px] text-white/30 font-medium">{favorites.length} contacts · {formatBal(balance)}</p>
              </div>
            </div>
            <button onClick={() => { haptic.light(); setShowAdd(true); }}
              className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                boxShadow: "0 4px 16px hsl(var(--primary) / 0.25)",
              }}>
              <Plus className="w-[18px] h-[18px]" style={{ color: "hsl(220 20% 6%)" }} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mb-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.04s both" }}>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary/60 transition-colors" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
              className="w-full h-[44px] rounded-[14px] pl-11 pr-4 text-[13px] outline-none transition-all"
              style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-5 mb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.06s both" }}>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { icon: Send, label: "Request", accent: "210 80% 55%" },
              { icon: RefreshCw, label: "Recurring", accent: "var(--primary)", onClick: () => recurringPayments.length > 0 ? document.getElementById('recurring-section')?.scrollIntoView({ behavior: 'smooth' }) : toast("No recurring payments yet") },
              { icon: TrendingUp, label: "History", accent: "152 60% 45%", onClick: () => navigate('/activity') },
            ].map((action, i) => (
              <button key={action.label} onClick={() => { haptic.light(); action.onClick?.(); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] shrink-0 active:scale-95 transition-all border border-white/[0.04] relative overflow-hidden"
                style={{
                  background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                  animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.08 + i * 0.03}s both`,
                }}>
                <div className="absolute top-0 left-2 right-2 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, hsl(${action.accent} / 0.12), transparent)` }} />
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `hsl(${action.accent} / 0.1)` }}>
                  <action.icon className="w-3.5 h-3.5" style={{ color: `hsl(${action.accent})` }} />
                </div>
                <span className="text-[11px] font-medium text-white/40">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Add Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setShowAdd(false)}>
            <div className="w-full max-w-lg rounded-t-[28px] p-6 border-t border-white/[0.06]"
              style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                    <UserPlus className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold">Add Contact</h2>
                    <p className="text-[10px] text-white/25">Save for quick payments</p>
                  </div>
                </div>
                <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white/30" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-2">Avatar</p>
                  <div className="flex gap-2 flex-wrap">
                    {emojiOptions.map(e => (
                      <button key={e} onClick={() => setEmoji(e)}
                        className="w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all active:scale-90"
                        style={{
                          background: emoji === e ? "hsl(var(--primary) / 0.12)" : "hsl(220 15% 10%)",
                          border: `1px solid ${emoji === e ? "hsl(var(--primary) / 0.3)" : "hsl(220 15% 13%)"}`,
                          boxShadow: emoji === e ? "0 2px 8px hsl(var(--primary) / 0.1)" : "none",
                        }}>{e}</button>
                    ))}
                  </div>
                </div>
                {[
                  { label: "Name *", val: name, set: setName, placeholder: "Contact name" },
                  { label: "UPI ID", val: upiId, set: setUpiId, placeholder: "name@upi" },
                  { label: "Phone", val: phone, set: setPhone, placeholder: "+91 XXXXX XXXXX" },
                ].map(field => (
                  <div key={field.label}>
                    <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">{field.label}</p>
                    <input value={field.val} onChange={e => field.set(e.target.value)} placeholder={field.placeholder}
                      className="w-full h-[48px] rounded-[14px] px-4 text-[13px] outline-none transition-all"
                      style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />
                  </div>
                ))}
                <button onClick={addFavorite} disabled={saving || !name}
                  className="w-full h-[52px] rounded-2xl font-semibold text-[14px] active:scale-[0.97] transition-all disabled:opacity-40 relative overflow-hidden flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                    color: "hsl(220 20% 6%)",
                    boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                  }}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Add Contact"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Favorites Grid */}
        <div className="px-5">
          <div className="flex items-center justify-between mb-3" style={{ animation: "slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both" }}>
            <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase flex items-center gap-1.5">
              <Star className="w-3 h-3" style={{ color: "hsl(var(--primary) / 0.4)" }} /> Favorites
            </p>
            <p className="text-[10px] text-white/15">{filtered.length} contacts</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-2.5">{[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-[140px] rounded-[18px] overflow-hidden relative">
                <div className="absolute inset-0" style={{ background: "hsl(220 15% 8%)" }} />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(220 15% 12%) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-shimmer 1.8s ease-in-out infinite",
                }} />
              </div>
            ))}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
              <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mx-auto mb-4 border border-white/[0.04]"
                style={{ background: "linear-gradient(135deg, hsl(220 15% 9%), hsl(220 18% 6%))" }}>
                <Star className="w-8 h-8 text-white/8" />
              </div>
              <p className="text-[14px] font-semibold text-white/20 mb-1">No favorites yet</p>
              <p className="text-[11px] text-white/10">Add contacts for quick payments</p>
              <button onClick={() => setShowAdd(true)} className="mt-5 px-5 py-2.5 rounded-[14px] text-[12px] font-semibold active:scale-95 transition-all flex items-center gap-1.5 mx-auto"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                  color: "hsl(220 20% 6%)",
                  boxShadow: "0 4px 16px hsl(var(--primary) / 0.25)",
                }}>
                <Plus className="w-3.5 h-3.5" /> Add First Contact
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {filtered.map((fav, i) => (
                <div key={fav.id}
                  className="relative rounded-[18px] p-3.5 border border-white/[0.04] flex flex-col items-center text-center transition-all active:scale-[0.96] group overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                    animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.12 + i * 0.03}s both`,
                  }}>
                  {/* Accent line */}
                  <div className="absolute top-0 left-3 right-3 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), transparent)" }} />
                  <button onClick={() => deleteFav(fav.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                    style={{ background: "hsl(0 72% 51% / 0.15)" }}>
                    <X className="w-3 h-3" style={{ color: "hsl(0 72% 55%)" }} />
                  </button>

                  <div className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center text-xl mb-2 group-hover:scale-105 transition-transform"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))",
                      boxShadow: "0 2px 8px hsl(var(--primary) / 0.08)",
                    }}>
                    {fav.avatar_emoji}
                  </div>
                  <p className="text-[11px] font-semibold truncate w-full">{fav.contact_name}</p>
                  <div className="flex items-center gap-1 w-full justify-center">
                    <p className="text-[9px] text-white/20 truncate">{fav.contact_upi_id || fav.contact_phone || "—"}</p>
                    {fav.contact_upi_id && (
                      <button onClick={(e) => { e.stopPropagation(); copyUpiId(fav.contact_upi_id!); }} className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity">
                        <Copy className="w-2.5 h-2.5 text-white/30" />
                      </button>
                    )}
                  </div>
                  {fav.last_paid_at && (
                    <p className="text-[8px] text-white/15 mt-0.5 flex items-center gap-0.5">
                      <Clock className="w-2 h-2" /> {new Date(fav.last_paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  )}
                  <div className="mt-2 flex gap-1.5 w-full">
                    <button onClick={() => openPay(fav)} className="flex-1 py-1.5 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.06))",
                        color: "hsl(var(--primary))",
                        border: "1px solid hsl(var(--primary) / 0.15)",
                      }}>
                      <Send className="w-3 h-3" /> Pay
                    </button>
                    <button onClick={() => { haptic.light(); setRecurringFav(fav); setShowRecurring(true); }}
                      className="py-1.5 px-2 rounded-xl text-[10px] flex items-center justify-center active:scale-95 transition-all border border-white/[0.04]"
                      style={{ background: "hsl(220 15% 10%)" }}>
                      <RefreshCw className="w-3 h-3 text-white/25" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recurring Payments */}
        {recurringPayments.length > 0 && (
          <div id="recurring-section" className="px-5 mt-6 mb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" style={{ color: "hsl(var(--primary) / 0.4)" }} /> Recurring
              </p>
              <p className="text-[10px] text-white/15">{recurringPayments.length} active</p>
            </div>
            <div className="space-y-2.5">
              {recurringPayments.map((rp, i) => {
                const fav = favorites.find(f => f.id === rp.favorite_id);
                return (
                  <div key={rp.id} className="rounded-[18px] p-4 border border-white/[0.04] flex items-center gap-3 relative overflow-hidden group"
                    style={{
                      background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                      animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.22 + i * 0.04}s both`,
                    }}>
                    <div className="absolute top-0 left-4 right-4 h-[1px]"
                      style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)" }} />
                    <div className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center text-lg shrink-0"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))" }}>
                      {fav?.avatar_emoji || "👤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate">{fav?.contact_name || "Contact"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/25 capitalize flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {rp.frequency}</span>
                        <span className="text-[10px] text-white/20">Next: {new Date(rp.next_run_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className="text-[12px] font-bold tabular-nums" style={{
                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}>₹{(rp.amount / 100).toLocaleString("en-IN")}</p>
                      <button onClick={() => toggleRecurring(rp.id, rp.is_active)}
                        className="w-9 h-5 rounded-full flex items-center transition-all duration-300"
                        style={{
                          background: rp.is_active ? "hsl(152 60% 45%)" : "hsl(220 15% 15%)",
                          justifyContent: rp.is_active ? "flex-end" : "flex-start",
                        }}>
                        <div className="w-4 h-4 rounded-full mx-0.5 transition-all" style={{ background: "white" }} />
                      </button>
                      <button onClick={() => deleteRecurring(rp.id)} className="w-6 h-6 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                        style={{ background: "hsl(0 72% 51% / 0.1)" }}>
                        <X className="w-3 h-3" style={{ color: "hsl(0 72% 55%)" }} />
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
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setShowRecurring(false)}>
            <div className="w-full max-w-lg rounded-t-[28px] p-6 border-t border-white/[0.06]"
              style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                    <RefreshCw className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold">Recurring Payment</h2>
                    <p className="text-[10px] text-white/25">Auto-pay to {recurringFav.contact_name}</p>
                  </div>
                </div>
                <button onClick={() => setShowRecurring(false)} className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white/30" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-[14px] border border-white/[0.04]"
                  style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-xl"
                    style={{ background: "hsl(var(--primary) / 0.1)" }}>{recurringFav.avatar_emoji}</div>
                  <div>
                    <p className="text-[12px] font-semibold">{recurringFav.contact_name}</p>
                    <p className="text-[10px] text-white/20">{recurringFav.contact_upi_id || recurringFav.contact_phone || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">Amount (₹) *</p>
                  <input value={recurringAmount} onChange={e => setRecurringAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Enter amount"
                    className="w-full h-[48px] rounded-[14px] px-4 text-[13px] outline-none transition-all tabular-nums"
                    style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} inputMode="numeric" />
                </div>
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">Frequency</p>
                  <div className="flex gap-2">
                    {(["weekly", "monthly"] as const).map(freq => {
                      const active = recurringFreq === freq;
                      const accent = "var(--primary)";
                      return (
                        <button key={freq} onClick={() => setRecurringFreq(freq)}
                          className="flex-1 py-3 rounded-[14px] text-[12px] font-semibold capitalize flex items-center justify-center gap-2 transition-all active:scale-95"
                          style={{
                            background: active ? `hsl(${accent} / 0.08)` : "hsl(220 15% 8%)",
                            border: `1px solid ${active ? `hsl(${accent} / 0.25)` : "hsl(220 15% 12%)"}`,
                            color: active ? `hsl(${accent})` : "hsl(220 10% 40%)",
                          }}>
                          {freq === "weekly" ? <Clock className="w-3.5 h-3.5" /> : <CalendarDays className="w-3.5 h-3.5" />} {freq}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">Note (optional)</p>
                  <input value={recurringNote} onChange={e => setRecurringNote(e.target.value)} placeholder="e.g. Pocket money, Rent"
                    className="w-full h-[48px] rounded-[14px] px-4 text-[13px] outline-none transition-all"
                    style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />
                </div>
                <button onClick={createRecurring} disabled={savingRecurring || !recurringAmount}
                  className="w-full h-[52px] rounded-2xl font-semibold text-[14px] active:scale-[0.97] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                    color: "hsl(220 20% 6%)",
                    boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                  }}>
                  {savingRecurring ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</> : <><RefreshCw className="w-4 h-4" /> Schedule Payment</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      <style>{`
        @keyframes slide-up-spring {
          0% { opacity: 0; transform: translateY(20px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default QuickPay;
