// Screen 12 — My Card. Premium gold/black virtual card with 3D flip, gyroscope tilt,
// PIN-gated CVV reveal, freeze toggle, spending limit editor, controls, recent transactions.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Snowflake, Gauge, Info, Eye, EyeOff, X, Check,
  Globe, Wifi, Banknote, ShoppingBag, Delete, Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import BottomNav from "@/components/BottomNav";

interface Wallet {
  id: string;
  balance: number | null;
  is_frozen: boolean | null;
  daily_limit: number | null;
  card_online_enabled: boolean;
  card_international_enabled: boolean;
  card_contactless_enabled: boolean;
  card_atm_enabled: boolean;
}

interface Txn {
  id: string;
  type: string;
  amount: number;
  status: string | null;
  category: string | null;
  description: string | null;
  merchant_name: string | null;
  created_at: string;
}

const formatINR = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CardScreen = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Txn[]>([]);

  // Card visual state
  const [flipped, setFlipped] = useState(false);
  const [cvvRevealed, setCvvRevealed] = useState(false);
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Modals
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);
  const [showLimitEditor, setShowLimitEditor] = useState(false);
  const [limitDraft, setLimitDraft] = useState<string>("");
  const [pinModal, setPinModal] = useState<null | "cvv" | "details" | "freeze">(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // ─── Stable card metadata derived from user id ───
  const cardMeta = useMemo(() => {
    if (!userId) return { last4: "0000", full: "0000 0000 0000 0000", cvv: "000", expiry: "00/00" };
    let h = 0;
    for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
    const last4 = String(4000 + (h % 6000)).padStart(4, "0");
    const second = String((h >>> 4) % 10000).padStart(4, "0");
    const third = String((h >>> 8) % 10000).padStart(4, "0");
    const cvv = String((h >>> 12) % 1000).padStart(3, "0");
    const month = String(((h >>> 16) % 12) + 1).padStart(2, "0");
    const yearNum = 27 + ((h >>> 20) % 5);
    return {
      last4,
      full: `5234 ${second} ${third} ${last4}`,
      cvv,
      expiry: `${month}/${yearNum}`,
    };
  }, [userId]);

  // ─── Fetch wallet + transactions ───
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const [walletRes, profRes] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);
    if (walletRes.data) {
      setWallet(walletRes.data as Wallet);
      setLimitDraft(String(((walletRes.data.daily_limit ?? 50000) / 100)));
      const { data: tx } = await supabase
        .from("transactions").select("*")
        .eq("wallet_id", walletRes.data.id)
        .order("created_at", { ascending: false }).limit(10);
      setTransactions((tx || []) as Txn[]);
    }
    if (profRes.data) setProfile(profRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Gyroscope tilt ───
  useEffect(() => {
    if (typeof window === "undefined" || !window.DeviceOrientationEvent) return;
    let mounted = true;
    const handler = (e: DeviceOrientationEvent) => {
      if (!mounted) return;
      const x = Math.max(-12, Math.min(12, (e.beta ?? 0) / 6));
      const y = Math.max(-12, Math.min(12, (e.gamma ?? 0) / 4));
      setTilt({ x: -x, y });
    };
    window.addEventListener("deviceorientation", handler);
    return () => { mounted = false; window.removeEventListener("deviceorientation", handler); };
  }, []);

  // ─── Mouse tilt fallback for desktop ───
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: -dy * 6, y: dx * 6 });
  };
  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  // ─── Actions ───
  const performToggleFreeze = async () => {
    if (!wallet) return;
    const newFrozen = !wallet.is_frozen;
    const { error } = await supabase.from("wallets").update({ is_frozen: newFrozen }).eq("id", wallet.id);
    if (error) { toast.error(error.message); return; }
    setWallet({ ...wallet, is_frozen: newFrozen });
    haptic.success();
    toast.success(newFrozen ? "Card frozen" : "Card unfrozen");
  };

  // Confirm-sheet "Freeze Now" → require PIN before mutating.
  const handleConfirmFreezeRequestPin = () => {
    setShowFreezeConfirm(false);
    openPinModal("freeze");
  };

  const saveLimit = async () => {
    if (!wallet) return;
    const rupees = parseInt(limitDraft || "0", 10);
    if (isNaN(rupees) || rupees < 100) { toast.error("Limit must be at least ₹100"); return; }
    if (rupees > 200000) { toast.error("Maximum daily limit is ₹2,00,000"); return; }
    const paise = rupees * 100;
    const { error } = await supabase.from("wallets").update({ daily_limit: paise }).eq("id", wallet.id);
    if (error) { toast.error(error.message); return; }
    setWallet({ ...wallet, daily_limit: paise });
    haptic.success();
    toast.success("Daily limit updated");
    setShowLimitEditor(false);
  };

  type ControlKey = "card_online_enabled" | "card_international_enabled" | "card_contactless_enabled" | "card_atm_enabled";
  const toggleControl = async (key: ControlKey) => {
    if (!wallet) return;
    const newVal = !wallet[key];
    const update: Partial<Record<ControlKey, boolean>> = { [key]: newVal };
    const { error } = await supabase.from("wallets").update(update).eq("id", wallet.id);
    if (error) { toast.error(error.message); return; }
    setWallet({ ...wallet, [key]: newVal });
    haptic.light();
  };

  // ─── PIN gate ───
  const openPinModal = (purpose: "cvv" | "details" | "freeze") => {
    setPinInput(""); setPinError(""); setPinModal(purpose);
  };

  const verifyPin = async () => {
    if (pinInput.length !== 4) { setPinError("Enter 4 digits"); return; }
    setVerifying(true); setPinError("");
    try {
      const { data, error } = await supabase.functions.invoke("payment-pin", {
        body: { action: "verify", pin: pinInput },
      });
      if (error) throw error;
      if (!data?.valid) {
        setPinError(data?.reason === "not_set" ? "Set a PIN first in Security" : "Incorrect PIN");
        haptic.error();
        setPinInput("");
        return;
      }
      haptic.success();
      const purpose = pinModal;
      if (purpose === "cvv") setCvvRevealed(true);
      if (purpose === "details") setShowFullNumber(true);
      setPinModal(null);
      if (purpose === "freeze") {
        await performToggleFreeze();
      }
      // auto-hide reveals after 15s
      setTimeout(() => {
        if (purpose === "cvv") setCvvRevealed(false);
        if (purpose === "details") setShowFullNumber(false);
      }, 15000);
    } catch (e: any) {
      setPinError(e?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const pressPinKey = (k: string) => {
    setPinError("");
    if (k === "del") setPinInput(s => s.slice(0, -1));
    else if (pinInput.length < 4) setPinInput(s => s + k);
  };

  const isFrozen = !!wallet?.is_frozen;
  const cardholderName = (profile?.full_name || "CARD HOLDER").toUpperCase();

  // ─── Render ───
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pt-5 pb-2 flex items-center gap-3">
          <button onClick={() => { haptic.light(); navigate(-1); }}
            className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.05]"
            style={{ background: "hsl(220 15% 8%)" }}>
            <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[19px] font-bold tracking-[-0.5px]">My Card</h1>
            <p className="text-[10px] text-white/30 font-medium">Virtual Prepaid Card</p>
          </div>
        </div>

        {/* ─── CARD VISUAL (centerpiece) ─── */}
        <div className="px-5 mt-6" style={{ perspective: "1200px" }}>
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => { if (!isFrozen) { haptic.light(); setFlipped(f => !f); } }}
            className="relative w-full cursor-pointer"
            style={{
              aspectRatio: "1.586",
              transformStyle: "preserve-3d",
              transition: "transform 0.6s cubic-bezier(0.34, 1.4, 0.64, 1)",
              transform: `rotateX(${tilt.x}deg) rotateY(${flipped ? 180 + tilt.y : tilt.y}deg)`,
            }}
          >
            {/* ───── CARD FRONT ───── */}
            <div
              className="absolute inset-0 rounded-[20px] overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                background: "linear-gradient(135deg, hsl(220 25% 8%), hsl(40 25% 12%) 60%, hsl(220 30% 5%))",
                boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {/* Shimmer */}
              <div className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  background: "linear-gradient(115deg, transparent 30%, hsl(var(--primary) / 0.18) 50%, transparent 70%)",
                  animation: "card-shimmer 5s ease-in-out infinite",
                }} />
              {/* Gold sheen */}
              <div className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full opacity-30 blur-[60px]"
                style={{ background: "hsl(var(--primary))" }} />

              <div className="relative z-10 h-full p-5 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-bold tracking-[-0.4px]" style={{ color: "hsl(var(--primary))" }}>
                      AuroPay
                    </p>
                    <p className="text-[8px] text-white/50 tracking-[2px] uppercase mt-0.5">Premium</p>
                  </div>
                  {/* Mastercard logo */}
                  <div className="relative w-[44px] h-[28px]">
                    <div className="absolute right-[18px] top-0 w-[28px] h-[28px] rounded-full"
                      style={{ background: "hsl(0 75% 55%)" }} />
                    <div className="absolute right-0 top-0 w-[28px] h-[28px] rounded-full mix-blend-screen"
                      style={{ background: "hsl(35 95% 55%)" }} />
                  </div>
                </div>

                {/* EMV Chip */}
                <div className="absolute top-[40%] left-5 -translate-y-1/2">
                  <div className="w-[42px] h-[32px] rounded-[6px] relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, hsl(40 75% 65%), hsl(40 60% 40%) 50%, hsl(40 80% 70%))",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.3)",
                    }}>
                    <div className="absolute inset-1 rounded-[3px] grid grid-cols-3 gap-[1px]"
                      style={{ background: "hsl(40 60% 40%)" }}>
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} style={{ background: "hsl(40 70% 55%)" }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card number */}
                <div className="mt-1">
                  <p className="font-mono text-[16px] tracking-[2px] text-white/95 font-medium">
                    {showFullNumber ? cardMeta.full : `•••• •••• •••• ${cardMeta.last4}`}
                  </p>
                </div>

                {/* Bottom row */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[8px] text-white/40 tracking-[1.5px] uppercase mb-0.5">Card holder</p>
                    <p className="text-[11px] font-semibold text-white/90 tracking-wider truncate max-w-[170px]">
                      {cardholderName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-white/40 tracking-[1.5px] uppercase mb-0.5">Valid thru</p>
                    <p className="font-mono text-[11px] font-semibold text-white/90 tracking-wider">{cardMeta.expiry}</p>
                  </div>
                </div>
              </div>

              {/* Frozen overlay */}
              {isFrozen && (
                <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-[3px] z-20"
                  style={{ background: "hsl(210 50% 30% / 0.55)" }}>
                  <Snowflake className="w-12 h-12 text-white/90 mb-2" strokeWidth={1.5} />
                  <p className="text-[13px] font-bold text-white tracking-wider">CARD FROZEN</p>
                  <p className="text-[10px] text-white/70 mt-0.5">Payments are blocked</p>
                </div>
              )}
            </div>

            {/* ───── CARD BACK ───── */}
            <div
              className="absolute inset-0 rounded-[20px] overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "linear-gradient(135deg, hsl(220 22% 7%), hsl(220 18% 4%))",
                boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              {/* Diagonal repeating watermark */}
              <div className="absolute inset-0 opacity-[0.04] flex items-center justify-center"
                style={{
                  background: `repeating-linear-gradient(-45deg, transparent 0 60px, hsl(var(--primary) / 0.4) 60px 62px)`,
                }} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[42px] font-black opacity-[0.04] tracking-widest" style={{ color: "hsl(var(--primary))" }}>
                  AURO
                </p>
              </div>

              {/* Magnetic stripe */}
              <div className="absolute top-5 inset-x-0 h-[42px]" style={{ background: "hsl(0 0% 4%)" }} />

              <div className="relative z-10 h-full pt-[68px] px-5 pb-5 flex flex-col justify-between">
                {/* CVV strip */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[34px] rounded-[6px] flex items-center justify-end px-3 relative overflow-hidden"
                    style={{ background: "hsl(0 0% 95%)" }}>
                    <div className="absolute inset-y-0 left-0 w-[70%]"
                      style={{
                        background: "repeating-linear-gradient(45deg, hsl(0 0% 95%) 0 4px, hsl(0 0% 88%) 4px 8px)",
                      }} />
                    <p className="font-mono text-[14px] font-bold tracking-[3px] text-black z-10">
                      {cvvRevealed ? cardMeta.cvv : "•••"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cvvRevealed) { setCvvRevealed(false); haptic.light(); }
                      else openPinModal("cvv");
                    }}
                    className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center active:scale-90 transition"
                    style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.25)" }}
                  >
                    {cvvRevealed
                      ? <EyeOff className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                      : <Eye className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />}
                  </button>
                </div>

                {/* Footer info */}
                <div className="text-right">
                  <p className="text-[9px] text-white/35 tracking-wider uppercase mb-1">Issued by</p>
                  <p className="text-[11px] font-bold tracking-wider" style={{ color: "hsl(var(--primary))" }}>AuroPay India</p>
                  <p className="text-[8px] text-white/30 mt-1">For support, call 1800-AURO-PAY</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tap hint */}
          <p className="text-center text-[10px] text-white/25 mt-3 font-medium">
            {isFrozen ? "Unfreeze the card to use it" : `Tap card to ${flipped ? "view front" : "view back"}`}
          </p>
        </div>

        {/* ─── ACTION GRID 2x2 ─── */}
        <div className="px-5 mt-5 grid grid-cols-2 gap-2.5">
          <ActionTile
            icon={<Plus className="w-5 h-5" />}
            label="Add Funds"
            sub="Top up wallet"
            color="hsl(152 60% 55%)"
            onClick={() => { haptic.light(); navigate("/add-money"); }}
          />
          <ActionTile
            icon={<Snowflake className="w-5 h-5" />}
            label={isFrozen ? "Unfreeze" : "Freeze Card"}
            sub={isFrozen ? "Re-enable card" : "Block payments"}
            color="hsl(205 80% 60%)"
            active={isFrozen}
            onClick={() => { haptic.light(); setShowFreezeConfirm(true); }}
          />
          <ActionTile
            icon={<Gauge className="w-5 h-5" />}
            label="Set Limit"
            sub={`Daily ${formatINR(wallet?.daily_limit ?? 50000)}`}
            color="hsl(40 90% 60%)"
            onClick={() => { haptic.light(); setShowLimitEditor(true); }}
          />
          <ActionTile
            icon={<Info className="w-5 h-5" />}
            label="Card Details"
            sub={showFullNumber ? "Visible 15s" : "PIN required"}
            color="hsl(var(--primary))"
            onClick={() => { haptic.light(); openPinModal("details"); }}
          />
        </div>

        {/* ─── RECENT TRANSACTIONS ─── */}
        <div className="px-5 mt-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold tracking-[-0.3px] text-white/90">Recent activity</h2>
            <button onClick={() => navigate("/activity")}
              className="text-[11px] font-semibold" style={{ color: "hsl(var(--primary))" }}>
              View all →
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-[16px] border border-white/[0.05] p-6 text-center"
              style={{ background: "hsl(220 15% 7%)" }}>
              <ShoppingBag className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-[12px] text-white/40">No transactions yet</p>
            </div>
          ) : (
            <div className="rounded-[16px] overflow-hidden border border-white/[0.05]"
              style={{ background: "hsl(220 15% 7%)" }}>
              {transactions.map((tx, i) => (
                <div key={tx.id}
                  className="flex items-center gap-3 p-3"
                  style={{ borderTop: i > 0 ? "1px solid hsl(0 0% 100% / 0.04)" : "none" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] shrink-0"
                    style={{ background: "hsl(220 15% 10%)" }}>
                    {tx.type === "credit" ? "💰" : "💸"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate text-white/90">
                      {tx.merchant_name || tx.description || "Transaction"}
                    </p>
                    <p className="text-[10px] text-white/40 capitalize">
                      {tx.category || "other"} · {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <p className="text-[12px] font-mono font-bold"
                    style={{ color: tx.type === "credit" ? "hsl(152 60% 60%)" : "hsl(0 70% 65%)" }}>
                    {tx.type === "credit" ? "+" : "−"}{formatINR(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── CARD CONTROLS ─── */}
        <div className="px-5 mt-7">
          <h2 className="text-[13px] font-bold tracking-[-0.3px] text-white/90 mb-3">Card controls</h2>
          <div className="rounded-[16px] overflow-hidden border border-white/[0.05] divide-y divide-white/[0.04]"
            style={{ background: "hsl(220 15% 7%)" }}>
            <ToggleRow
              icon={<Globe className="w-4 h-4" />}
              label="Online Payments"
              desc="Use card for online purchases"
              enabled={!!wallet?.card_online_enabled}
              onToggle={() => toggleControl("card_online_enabled")}
            />
            <ToggleRow
              icon={<Globe className="w-4 h-4" />}
              label="International Payments"
              desc="Allow foreign currency transactions"
              enabled={!!wallet?.card_international_enabled}
              onToggle={() => toggleControl("card_international_enabled")}
            />
            <ToggleRow
              icon={<Wifi className="w-4 h-4" />}
              label="Contactless Payments"
              desc="Tap to pay at terminals"
              enabled={!!wallet?.card_contactless_enabled}
              onToggle={() => toggleControl("card_contactless_enabled")}
            />
            <ToggleRow
              icon={<Banknote className="w-4 h-4" />}
              label="ATM Withdrawals"
              desc="Withdraw cash at ATMs"
              enabled={!!wallet?.card_atm_enabled}
              onToggle={() => toggleControl("card_atm_enabled")}
            />
          </div>
        </div>
      </div>

      <BottomNav />

      {/* ─── FREEZE CONFIRM MODAL ─── */}
      {showFreezeConfirm && (
        <Sheet onClose={() => setShowFreezeConfirm(false)}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "hsl(205 80% 60% / 0.12)" }}>
            <Snowflake className="w-7 h-7" style={{ color: "hsl(205 80% 60%)" }} />
          </div>
          <h3 className="text-[17px] font-bold text-center mb-1">
            {isFrozen ? "Unfreeze card?" : "Freeze card?"}
          </h3>
          <p className="text-[12px] text-white/50 text-center mb-5 max-w-[280px] mx-auto">
            {isFrozen
              ? "Your card will be active again and can be used for payments."
              : "All payments will be blocked instantly. You can unfreeze anytime."}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowFreezeConfirm(false)}
              className="flex-1 h-[48px] rounded-2xl font-semibold text-[13px] border border-white/[0.06] text-white/70"
              style={{ background: "hsl(220 15% 8%)" }}>
              Cancel
            </button>
            <button onClick={handleConfirmFreezeRequestPin}
              className="flex-1 h-[48px] rounded-2xl font-semibold text-[13px]"
              style={{
                background: isFrozen ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" : "hsl(205 80% 55%)",
                color: isFrozen ? "hsl(220 20% 6%)" : "white",
              }}>
              {isFrozen ? "Unfreeze" : "Freeze Now"}
            </button>
          </div>
        </Sheet>
      )}

      {/* ─── LIMIT EDITOR ─── */}
      {showLimitEditor && (
        <Sheet onClose={() => setShowLimitEditor(false)}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "hsl(40 90% 60% / 0.12)" }}>
            <Gauge className="w-7 h-7" style={{ color: "hsl(40 90% 60%)" }} />
          </div>
          <h3 className="text-[17px] font-bold text-center mb-1">Daily spending limit</h3>
          <p className="text-[12px] text-white/50 text-center mb-5">Maximum amount your card can spend per day</p>

          <div className="rounded-[16px] p-4 mb-3 text-center border border-white/[0.06]"
            style={{ background: "hsl(220 15% 6%)" }}>
            <p className="text-[10px] text-white/40 tracking-widest uppercase mb-1">Set limit</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[24px] font-bold" style={{ color: "hsl(var(--primary))" }}>₹</span>
              <input
                type="number"
                value={limitDraft}
                onChange={e => setLimitDraft(e.target.value.replace(/[^\d]/g, ""))}
                className="bg-transparent outline-none text-[32px] font-mono font-bold text-white text-center w-[180px]"
                placeholder="0"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1">Min ₹100 · Max ₹2,00,000</p>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
            {[500, 1000, 2000, 5000, 10000].map(v => (
              <button key={v} onClick={() => setLimitDraft(String(v))}
                className="px-3 h-[32px] rounded-full text-[11px] font-semibold border whitespace-nowrap active:scale-95 transition"
                style={{
                  background: limitDraft === String(v) ? "hsl(var(--primary) / 0.15)" : "hsl(220 15% 8%)",
                  borderColor: limitDraft === String(v) ? "hsl(var(--primary) / 0.4)" : "hsl(0 0% 100% / 0.06)",
                  color: limitDraft === String(v) ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.6)",
                }}>
                ₹{v.toLocaleString("en-IN")}
              </button>
            ))}
          </div>

          <button onClick={saveLimit}
            className="w-full h-[50px] rounded-2xl font-semibold text-[13px]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              color: "hsl(220 20% 6%)",
              boxShadow: "0 4px 24px hsl(var(--primary) / 0.25)",
            }}>
            Save Limit
          </button>
        </Sheet>
      )}

      {/* ─── PIN MODAL ─── */}
      {pinModal && (
        <Sheet onClose={() => setPinModal(null)}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "hsl(var(--primary) / 0.12)" }}>
            <Lock className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h3 className="text-[17px] font-bold text-center mb-1">Enter PIN</h3>
          <p className="text-[12px] text-white/50 text-center mb-5">
            {pinModal === "cvv"
              ? "Confirm to reveal CVV"
              : pinModal === "details"
              ? "Confirm to view full card number"
              : `Confirm to ${isFrozen ? "unfreeze" : "freeze"} your card`}
          </p>

          {/* PIN dots */}
          <div className="flex justify-center gap-3 mb-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-3 h-3 rounded-full transition-all"
                style={{
                  background: i < pinInput.length ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.1)",
                  transform: i < pinInput.length ? "scale(1.15)" : "scale(1)",
                  boxShadow: i < pinInput.length ? "0 0 12px hsl(var(--primary) / 0.5)" : "none",
                }} />
            ))}
          </div>
          {pinError && <p className="text-center text-[11px] mb-2" style={{ color: "hsl(0 75% 65%)" }}>{pinError}</p>}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
            {["1","2","3","4","5","6","7","8","9","","0","del"].map((k, i) => {
              if (k === "") return <div key={i} />;
              if (k === "del") return (
                <button key={i} onClick={() => pressPinKey("del")}
                  className="h-[52px] rounded-[14px] flex items-center justify-center active:scale-90 transition"
                  style={{ background: "hsl(220 15% 7%)" }}>
                  <Delete className="w-4 h-4 text-white/60" />
                </button>
              );
              return (
                <button key={i} onClick={() => pressPinKey(k)}
                  className="h-[52px] rounded-[14px] text-[18px] font-mono font-semibold text-white/85 active:scale-90 transition"
                  style={{ background: "hsl(220 15% 7%)" }}>
                  {k}
                </button>
              );
            })}
          </div>

          <button onClick={verifyPin} disabled={pinInput.length !== 4 || verifying}
            className="w-full h-[48px] rounded-2xl font-semibold text-[13px] mt-4 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              color: "hsl(220 20% 6%)",
            }}>
            {verifying ? "Verifying..." : "Confirm"}
          </button>
        </Sheet>
      )}

      <style>{`
        @keyframes card-shimmer {
          0%, 100% { transform: translateX(-30%) translateY(-30%); }
          50% { transform: translateX(30%) translateY(30%); }
        }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes sheet-up { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

// ─── Sub-components ───
const ActionTile = ({ icon, label, sub, color, active, onClick }: {
  icon: React.ReactNode; label: string; sub: string; color: string; active?: boolean; onClick: () => void;
}) => (
  <button onClick={onClick}
    className="rounded-[16px] p-3.5 text-left active:scale-[0.97] transition border"
    style={{
      background: active ? `${color.replace(")", " / 0.1)").replace("hsl(", "hsl(")}` : "hsl(220 15% 7%)",
      borderColor: active ? color.replace(")", " / 0.3)") : "hsl(0 0% 100% / 0.05)",
    }}>
    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-2"
      style={{ background: `${color.replace(")", " / 0.12)")}`, color }}>
      {icon}
    </div>
    <p className="text-[12px] font-semibold text-white/90 leading-tight">{label}</p>
    <p className="text-[10px] text-white/40 mt-0.5 truncate">{sub}</p>
  </button>
);

const ToggleRow = ({ icon, label, desc, enabled, onToggle }: {
  icon: React.ReactNode; label: string; desc: string; enabled: boolean; onToggle: () => void;
}) => (
  <button onClick={onToggle}
    className="w-full flex items-center gap-3 p-3.5 text-left active:bg-white/[0.02] transition">
    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
      style={{
        background: enabled ? "hsl(var(--primary) / 0.12)" : "hsl(220 15% 10%)",
        color: enabled ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.4)",
      }}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[12px] font-semibold text-white/90">{label}</p>
      <p className="text-[10px] text-white/40 truncate">{desc}</p>
    </div>
    <div className="w-[42px] h-[24px] rounded-full relative transition-all shrink-0"
      style={{
        background: enabled ? "hsl(var(--primary))" : "hsl(220 15% 14%)",
        boxShadow: enabled ? "0 0 12px hsl(var(--primary) / 0.4)" : "none",
      }}>
      <div className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white transition-all"
        style={{
          left: enabled ? "20px" : "2px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}>
        {enabled && <Check className="w-3 h-3 text-primary absolute inset-0 m-auto" strokeWidth={3} />}
      </div>
    </div>
  </button>
);

const Sheet = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "fade-in 0.2s ease-out" }}>
    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
    <div className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8"
      style={{
        background: "linear-gradient(180deg, hsl(220 20% 9%), hsl(220 22% 5%))",
        animation: "sheet-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}>
      <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />
      {children}
    </div>
  </div>
);

export default CardScreen;
