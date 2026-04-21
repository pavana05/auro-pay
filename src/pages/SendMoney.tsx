import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import { ArrowLeft, AtSign, Phone, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import RippleButton from "@/components/zen/RippleButton";
import BottomNav from "@/components/BottomNav";
import UPIVerificationInput, { VerifiedRecipient } from "@/components/UPIVerificationInput";

type Tab = "upi" | "phone" | "contact";

interface Favorite {
  id: string;
  contact_name: string;
  avatar_emoji: string | null;
  contact_upi_id: string | null;
  contact_phone: string | null;
  last_paid_at: string | null;
}

const SendMoney = () => {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [tab, setTab] = useState<Tab>("upi");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [selectedFav, setSelectedFav] = useState<string | null>(null);
  const [verified, setVerified] = useState<VerifiedRecipient | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data, error } = await supabase
        .from("quick_pay_favorites")
        .select("id,contact_name,avatar_emoji,contact_upi_id,contact_phone,last_paid_at")
        .eq("user_id", u.user.id)
        .order("last_paid_at", { ascending: false, nullsFirst: false })
        .limit(12);
      if (error) toast.error("Couldn't load contacts", { description: error.message });
      else setFavorites(data ?? []);
    })();
  }, []);

  const valid = useMemo(() => {
    const amt = Number(amount);
    if (!amt || amt < 1) return false;
    if (tab === "contact") return !!selectedFav;
    return !!verified?.verified;
  }, [amount, tab, selectedFav, verified]);

  const onProceed = () => {
    if (!valid) {
      if (!verified && tab !== "contact") toast.error("Verify recipient first");
      else if (!amount) toast.error("Enter an amount");
      return;
    }
    haptic.medium();

    let upi_id: string | undefined;
    let payee_name: string | undefined;

    if (tab === "contact" && selectedFav) {
      const f = favorites.find((x) => x.id === selectedFav);
      if (!f) return;
      upi_id = f.contact_upi_id ?? (f.contact_phone ? `${f.contact_phone}@upi` : undefined);
      payee_name = f.contact_name;
    } else if (verified) {
      upi_id = verified.upi_id;
      payee_name = verified.name ?? undefined;
    }

    if (!upi_id) {
      toast.error("Missing recipient");
      return;
    }

    // Pass via location.state — PaymentConfirm reads upi_id/payee_name/amount/note.
    navigate("/pay", {
      state: {
        upi_id,
        payee_name,
        amount: Number(amount),
        note: note || undefined,
      },
    });
  };

  const pickFav = (f: Favorite) => {
    haptic.selection();
    setSelectedFav(f.id);
    setVerified(null);
    if (f.contact_upi_id) {
      setTab("upi");
      setRecipient(f.contact_upi_id);
    } else if (f.contact_phone) {
      setTab("phone");
      setRecipient(f.contact_phone);
    }
  };

  const switchTab = (t: Tab) => {
    haptic.selection();
    setTab(t);
    setRecipient("");
    setSelectedFav(null);
    setVerified(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-28">
      <header className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button
          onClick={() => back()}
          className="w-10 h-10 rounded-full zen-action-neutral flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-[22px] font-sora font-semibold text-foreground">Send Money</h1>
      </header>

      {/* Tabs */}
      <div className="px-5">
        <div className="flex p-1 zen-card-raised rounded-full">
          {[
            { id: "upi" as const, label: "UPI ID", icon: AtSign },
            { id: "phone" as const, label: "Phone", icon: Phone },
            { id: "contact" as const, label: "Contact", icon: Users },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className="relative flex-1 h-10 flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                {active && (
                  <motion.span
                    layoutId="zen-send-tab"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "linear-gradient(135deg, hsl(42 78% 55%), hsl(36 80% 42%))" }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span
                  className={`relative z-10 flex items-center gap-1.5 ${
                    active ? "text-primary-foreground" : "text-foreground/60"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent contacts */}
      {favorites.length > 0 && (
        <section className="mt-6">
          <div className="px-5 mb-3 flex items-center justify-between">
            <h2 className="text-sm font-sora font-semibold text-foreground">Send Again</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-1">
            {favorites.map((f, i) => {
              const active = selectedFav === f.id;
              const initials = f.contact_name.slice(0, 2).toUpperCase();
              return (
                <motion.button
                  key={f.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => pickFav(f)}
                  className="flex flex-col items-center gap-1.5 min-w-[64px]"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-base font-semibold text-primary-foreground transition-all ${
                      active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={{ background: "linear-gradient(135deg, hsl(42 78% 55%), hsl(36 80% 42%))" }}
                  >
                    {f.avatar_emoji && f.avatar_emoji.length <= 2 ? f.avatar_emoji : initials}
                  </div>
                  <span className="text-[11px] text-foreground/70 text-center max-w-[64px] truncate">
                    {f.contact_name.split(" ")[0]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* Recipient input + auto-verify */}
      <section className="px-5 mt-6">
        <label className="text-[11px] uppercase tracking-[0.06em] text-foreground/45 font-semibold">
          {tab === "upi" ? "UPI ID" : tab === "phone" ? "Phone Number" : "Pick a contact above"}
        </label>
        {tab !== "contact" ? (
          <div className="mt-2">
            <UPIVerificationInput
              value={recipient}
              onChange={setRecipient}
              onVerified={setVerified}
              mode={tab}
            />
          </div>
        ) : (
          selectedFav && (
            <div className="mt-3 zen-card flex items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-full zen-action-primary flex items-center justify-center text-primary-foreground font-semibold">
                {(favorites.find((f) => f.id === selectedFav)?.contact_name[0] || "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground font-medium truncate">
                  {favorites.find((f) => f.id === selectedFav)?.contact_name}
                </div>
                <div className="text-[11px] text-foreground/50 font-mono-num truncate">
                  {favorites.find((f) => f.id === selectedFav)?.contact_upi_id ||
                    favorites.find((f) => f.id === selectedFav)?.contact_phone}
                </div>
              </div>
            </div>
          )
        )}
      </section>

      {/* Amount */}
      <section className="px-5 mt-6">
        <label className="text-[11px] uppercase tracking-[0.06em] text-foreground/45 font-semibold">
          Amount
        </label>
        <div className="mt-2 flex items-baseline gap-2 border-b-2 border-foreground/15 focus-within:border-primary/60 pb-2 transition-colors">
          <span className="text-2xl text-primary font-mono-num">₹</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").slice(0, 7))}
            placeholder="0"
            inputMode="decimal"
            className="flex-1 bg-transparent outline-none text-[40px] zen-amount-hero text-foreground placeholder:text-foreground/20 min-w-0"
          />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {[100, 200, 500, 1000, 2000].map((v) => (
            <button
              key={v}
              onClick={() => {
                haptic.selection();
                setAmount(String(v));
              }}
              className="px-3 h-8 rounded-full zen-action-soft text-xs text-primary font-semibold whitespace-nowrap"
            >
              ₹{v}
            </button>
          ))}
        </div>
      </section>

      {/* Note */}
      <section className="px-5 mt-6">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 50))}
          placeholder="Add a note (optional)"
          className="w-full bg-foreground/[0.04] border border-foreground/8 rounded-[14px] px-4 h-11 text-sm text-foreground placeholder:text-foreground/35 outline-none focus:border-primary/40"
        />
      </section>

      {/* Proceed */}
      <div className="px-5 mt-8">
        <RippleButton onClick={onProceed} disabled={!valid} className="w-full h-14 text-base">
          <Sparkles className="w-4 h-4" />
          {amount ? `Pay ₹${Number(amount).toLocaleString("en-IN")}` : "Enter amount"}
        </RippleButton>
        <p className="text-center text-[11px] text-foreground/40 mt-3">
          Free · Secured by UPI · Instant
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default SendMoney;
