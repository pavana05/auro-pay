import { useState, forwardRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Copy, MessageCircle, Twitter, Mail, Sparkles, Share2, UserPlus } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { captureReferralCode } from "@/landing/referral";
import { joinWaitlist } from "@/landing/joinWaitlist";

type Role = "teen" | "parent" | "both";

const SUPABASE_FUNCTIONS_URL = "https://mkduupshubnzjwefptcw.functions.supabase.co";
const SITE_URL = "https://auro-pay.lovable.app";
const JOIN_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    Promise.resolve(promise)
      .then((value) => { window.clearTimeout(timeoutId); resolve(value); })
      .catch((err) => { window.clearTimeout(timeoutId); reject(err); });
  });
}

export default function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("teen");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const shareUrl = refCode ? `${SITE_URL}/?ref=${refCode}` : SITE_URL;
  const ogImageUrl = refCode ? `${SUPABASE_FUNCTIONS_URL}/og-referral?ref=${refCode}` : "";
  const shareText = refCode
    ? `I just joined the AuroPay waitlist — India's first scan-and-pay app for teens 💛 Use my link and we both get ₹100: ${shareUrl}`
    : `Join the AuroPay waitlist — India's first scan-and-pay app for teens 💛 ${shareUrl}`;

  const reset = () => {
    setPhone(""); setEmail(""); setName(""); setRole("teen");
    setDone(false); setError(null); setRefCode(null); setCopied(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Invite link copied", { description: "Share it with friends to earn ₹100 each." });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Couldn't copy. Long-press the link to copy manually.");
    }
  };

  const shareWhatsApp = () => {
    if (ogImageUrl) fetch(ogImageUrl, { mode: "no-cors" }).catch(() => {});
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
  };

  const shareTwitter = () => {
    if (ogImageUrl) fetch(ogImageUrl, { mode: "no-cors" }).catch(() => {});
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
  };

  const shareEmail = () => {
    const subject = encodeURIComponent("Join me on the AuroPay waitlist");
    const body = encodeURIComponent(`${shareText}\n\n— Sent from AuroPay`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank", "noopener");
  };

  const nativeShare = async () => {
    if (!navigator.share) { copyLink(); return; }
    try {
      await navigator.share({ title: "AuroPay", text: shareText, url: shareUrl });
    } catch { /* user cancelled */ }
  };

  const handleClose = () => { reset(); onClose(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) { setError("Enter a valid 10-digit phone number."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError("Enter a valid email."); return; }
    if (name.trim().length < 2) { setError("Enter your full name."); return; }

    setLoading(true);

    try {
      const referralCode = captureReferralCode();
      const { referralCode: insertedReferralCode } = await withTimeout(
        joinWaitlist({
          fullName: name.trim(),
          phone: cleanPhone,
          email: email.trim().toLowerCase(),
          role,
          source: "landing_modal",
          referralCode,
        }),
        JOIN_TIMEOUT_MS,
        "Waitlist submission timed out"
      );

      if (insertedReferralCode) {
        setRefCode(insertedReferralCode);
        fetch(`${SUPABASE_FUNCTIONS_URL}/og-referral?ref=${insertedReferralCode}`, { mode: "no-cors" })
          .catch(() => {});
      } else if (referralCode) {
        fetch(`${SUPABASE_FUNCTIONS_URL}/og-referral?ref=${referralCode}`, { mode: "no-cors" })
          .catch(() => {});
      }

      // Auto-clear inputs on success
      setPhone(""); setEmail(""); setName(""); setRole("teen");

      toast.success("You're on the list!", {
        description: "We'll notify you the moment AuroPay launches.",
      });

      setDone(true);
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors: ["#c8952e", "#e0b048", "#fff7e3"] });
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "Waitlist submission timed out"
          ? "This is taking too long. Please try again in a moment."
          : err instanceof Error
            ? err.message
            : "Couldn't join right now. Please try again.";
      setError(msg);
      toast.error("Couldn't join", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ background: "rgba(3,3,5,0.78)", backdropFilter: "blur(10px)" }}
        >
          {/* Animated gold aurora behind the card */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full blur-3xl opacity-40"
              style={{ background: "radial-gradient(closest-side, rgba(200,149,46,0.55), transparent 70%)" }}
            />
          </motion.div>

          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative w-full max-w-[400px] rounded-[36px] p-[1px] overflow-hidden"
            style={{
              background:
                "conic-gradient(from 140deg at 50% 50%, rgba(200,149,46,0.55), rgba(255,255,255,0.05) 30%, rgba(200,149,46,0.35) 60%, rgba(255,255,255,0.05) 90%, rgba(200,149,46,0.55))",
              boxShadow: "0 60px 140px rgba(0,0,0,0.85), 0 0 60px rgba(200,149,46,0.18)",
            }}
          >
            <div
              className="relative rounded-[35px] p-7 sm:p-8"
              style={{
                background:
                  "linear-gradient(180deg, rgba(18,15,22,0.96), rgba(10,12,15,0.98))",
                backdropFilter: "blur(40px) saturate(200%)",
              }}
            >
              {/* shine highlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[35px] opacity-60"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 18%)",
                }}
              />

              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition text-white/60 z-10"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {!done ? (
                <form onSubmit={submit} className="relative pt-1 space-y-4">
                  <div className="text-center mb-1">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 240, damping: 18, delay: 0.05 }}
                      className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 relative"
                      style={{
                        background: "linear-gradient(135deg,#e0b048,#8a6520)",
                        boxShadow: "0 10px 28px rgba(200,149,46,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
                      }}
                    >
                      <Sparkles size={22} className="text-black" strokeWidth={2.5} />
                    </motion.div>
                    <h2 className="text-[22px] sm:text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                      Join the Waitlist
                    </h2>
                    <p className="text-[13px] text-white/55 mt-1">Founding members unlock perks no one else gets.</p>
                  </div>

                  {/* Quick perks chips */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pb-1">
                    {["🎁 ₹100 bonus", "⚡ Priority access", "🏆 Founder badge"].map((p, i) => (
                      <motion.span
                        key={p}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="text-[10.5px] px-2.5 py-1 rounded-full border text-white/75"
                        style={{ background: "rgba(200,149,46,0.08)", borderColor: "rgba(200,149,46,0.22)" }}
                      >
                        {p}
                      </motion.span>
                    ))}
                  </div>

                  <Field label="Full name" value={name} onChange={setName} placeholder="Aarav Sharma" autoComplete="name" />
                  <Field label="Phone" value={phone} onChange={setPhone} placeholder="9876543210" prefix="+91" inputMode="numeric" autoComplete="tel" />
                  <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" autoComplete="email" />

                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2 font-semibold">I am a</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["teen", "parent", "both"] as Role[]).map((r) => (
                        <button
                          type="button" key={r}
                          onClick={() => setRole(r)}
                          className="relative py-2.5 rounded-xl text-sm font-medium transition border overflow-hidden"
                          style={role === r
                            ? { background: "linear-gradient(135deg,#e0b048,#c8952e)", color: "#0a0a0a", borderColor: "transparent", boxShadow: "0 6px 18px rgba(200,149,46,0.35)" }
                            : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.78)", borderColor: "rgba(255,255,255,0.08)" }}
                        >
                          {r[0].toUpperCase() + r.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -4 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2"
                      >{error}</motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit" disabled={loading}
                    className="relative w-full h-12 rounded-xl font-semibold text-[15px] transition disabled:opacity-90 flex items-center justify-center gap-2 overflow-hidden group"
                    style={{
                      background: "linear-gradient(135deg,#c8952e,#e0b048)",
                      color: "#0a0a0a",
                      boxShadow: "0 10px 28px rgba(200,149,46,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
                    }}
                  >
                    {/* shimmer on hover */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms]"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                      }}
                    />
                    {loading ? <PremiumLoader /> : <>Reserve my spot →</>}
                  </button>

                  <p className="text-[11px] text-center text-white/40">🔒 We never share your data. Ever.</p>
                </form>
              ) : (
                <SuccessView
                  refCode={refCode}
                  shareUrl={shareUrl}
                  copied={copied}
                  copyLink={copyLink}
                  shareWhatsApp={shareWhatsApp}
                  shareTwitter={shareTwitter}
                  shareEmail={shareEmail}
                  nativeShare={nativeShare}
                  onClose={handleClose}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Success view ---------------- */

function SuccessView({
  refCode, shareUrl, copied, copyLink, shareWhatsApp, shareTwitter, shareEmail, nativeShare, onClose,
}: {
  refCode: string | null;
  shareUrl: string;
  copied: boolean;
  copyLink: () => void;
  shareWhatsApp: () => void;
  shareTwitter: () => void;
  shareEmail: () => void;
  nativeShare: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative pt-2 text-center space-y-4"
    >
      {/* Halo + check */}
      <div className="relative w-24 h-24 mx-auto">
        <motion.div
          aria-hidden
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.15, 1], opacity: [0, 0.6, 0.35] }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(200,149,46,0.55), transparent 70%)" }}
        />
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg,#e0b048,#c8952e)",
            boxShadow: "0 16px 40px rgba(200,149,46,0.55), inset 0 2px 0 rgba(255,255,255,0.45)",
          }}
        >
          <Check size={42} strokeWidth={3} className="text-black" />
        </motion.div>
      </div>

      <div>
        <h2 className="text-[22px] sm:text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
          You're on the list!
        </h2>
        <p className="text-[13px] text-white/60 mt-1.5">
          {refCode
            ? <>Invite friends — you both get <span className="text-amber-200 font-semibold">₹100</span> when they join.</>
            : "We'll notify you the moment AuroPay launches in your city."}
        </p>
      </div>

      {refCode ? (
        <>
          {/* Invite card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-3 flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, rgba(200,149,46,0.10), rgba(200,149,46,0.04))",
              border: "1px solid rgba(200,149,46,0.30)",
            }}
          >
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#e0b048,#c8952e)" }}
            >
              <UserPlus size={16} className="text-black" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 font-semibold">Your invite link</div>
              <div className="text-[12.5px] text-white/90 truncate font-mono">{shareUrl.replace(/^https?:\/\//, "")}</div>
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-[11px] font-semibold transition"
              style={{
                background: copied ? "rgba(34,197,94,0.18)" : "rgba(200,149,46,0.18)",
                color: copied ? "#86efac" : "#e9c168",
              }}
            >
              {copied ? <><Check size={12} strokeWidth={3} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </motion.div>

          {/* Share buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="grid grid-cols-3 gap-2"
          >
            <ShareBtn onClick={shareWhatsApp} label="WhatsApp" tint="#25d366" icon={<MessageCircle size={15} fill="#fff" strokeWidth={0} />} />
            <ShareBtn onClick={shareTwitter} label="Twitter" tint="#1d1d1f" icon={<Twitter size={14} fill="#fff" strokeWidth={0} />} />
            <ShareBtn onClick={shareEmail} label="Email" tint="#3b3b40" icon={<Mail size={14} className="text-white" />} />
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            onClick={typeof navigator !== "undefined" && "share" in navigator ? nativeShare : copyLink}
            className="relative w-full h-12 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 overflow-hidden group"
            style={{
              background: "linear-gradient(135deg,#c8952e,#e0b048)",
              color: "#0a0a0a",
              boxShadow: "0 10px 28px rgba(200,149,46,0.42), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms]"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }}
            />
            <Share2 size={15} strokeWidth={2.5} /> Invite a friend
          </motion.button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-white/45 hover:text-white/75 transition"
          >
            Maybe later
          </button>
        </>
      ) : (
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-medium text-sm border transition hover:bg-white/5"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}
        >
          Done
        </button>
      )}
    </motion.div>
  );
}

function ShareBtn({ onClick, label, tint, icon }: { onClick: () => void; label: string; tint: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-11 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition hover:scale-[1.03] active:scale-[0.97]"
      style={{
        background: `linear-gradient(135deg, ${tint}, rgba(0,0,0,0.4))`,
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: `0 6px 18px ${tint}40`,
      }}
    >
      {icon} {label}
    </button>
  );
}

/* ---------------- Premium loader ---------------- */

function PremiumLoader() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative inline-block w-[18px] h-[18px]">
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            border: "2px solid rgba(0,0,0,0.25)",
            borderTopColor: "rgba(0,0,0,0.85)",
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }}
        />
      </span>
      <span className="relative">
        Securing your spot
        <motion.span
          className="inline-block w-[2ch] text-left"
          aria-hidden
        >
          <DotPulse />
        </motion.span>
      </span>
    </span>
  );
}

function DotPulse() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }}
        >
          .
        </motion.span>
      ))}
    </>
  );
}

/* ---------------- Field ---------------- */

const Field = forwardRef<HTMLInputElement, {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; inputMode?: "text" | "numeric" | "email"; prefix?: string;
  autoComplete?: string;
}>(function Field(
  { label, value, onChange, placeholder, type = "text", inputMode, prefix, autoComplete },
  ref
) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1.5 font-semibold">{label}</div>
      <div
        className="flex items-center rounded-xl border h-12 px-4 transition focus-within:border-[#c8952e]/70 focus-within:shadow-[0_0_0_3px_rgba(200,149,46,0.15)]"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        {prefix && <span className="text-white/55 text-sm mr-2 font-medium">{prefix}</span>}
        <input
          ref={ref}
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} type={type} inputMode={inputMode} autoComplete={autoComplete}
          className="flex-1 bg-transparent outline-none text-white text-[15px] placeholder:text-white/30"
          style={{ fontFamily: "Sora, sans-serif" }}
        />
      </div>
    </label>
  );
});
