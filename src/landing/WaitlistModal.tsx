import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Copy, MessageCircle, Twitter, Mail, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { captureReferralCode } from "@/landing/referral";
import { joinWaitlist } from "@/landing/joinWaitlist";
import { useWaitlistPosition } from "@/landing/useWaitlistPosition";

type Role = "teen" | "parent" | "both";

const SITE_URL = "https://auro-pay.lovable.app";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WaitlistModal({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("teen");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { position, fetchPosition } = useWaitlistPosition();

  // Reset state whenever modal closes
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setName("");
      setPhone("");
      setEmail("");
      setRole("teen");
      setSubmitting(false);
      setSuccess(false);
      setReferralCode(null);
      setCopied(false);
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const shareUrl = referralCode ? `${SITE_URL}/?ref=${referralCode}` : SITE_URL;
  const shareText = referralCode
    ? `I just joined the AuroPay waitlist — India's first scan-and-pay app for teens 💛 Use my link: ${shareUrl}`
    : `Check out AuroPay — India's first scan-and-pay app for teens 💛 ${shareUrl}`;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, "");

    if (trimmedName.length < 2) {
      toast.error("Please enter your full name");
      return;
    }
    if (cleanPhone.length !== 10) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      const result = await joinWaitlist({
        fullName: trimmedName,
        phone: cleanPhone,
        email: trimmedEmail,
        role,
        source: "landing_modal",
        referralCode: captureReferralCode(),
      });

      setReferralCode(result.referralCode);
      setSuccess(true);
      toast.success("You're on the list! 🎉");
      fetchPosition();

      // Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.4 },
          colors: ["#c8952e", "#e0b758", "#f5d98a", "#ffffff"],
        });
      } catch { /* ignore */ }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't join right now. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, name, phone, email, role]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy.");
    }
  };

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  const shareTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  const shareEmail = () => window.open(`mailto:?subject=${encodeURIComponent("Join me on AuroPay")}&body=${encodeURIComponent(shareText)}`);

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "AuroPay", text: shareText, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl"
            style={{
              background: "linear-gradient(180deg, #14110a 0%, #0a0908 100%)",
              boxShadow: "0 20px 80px rgba(200,149,46,0.25), 0 0 0 1px rgba(200,149,46,0.15)",
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>

            <div className="p-6 sm:p-8">
              {!success ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
                      style={{ background: "linear-gradient(135deg, #c8952e, #e0b758)" }}>
                      <Sparkles className="w-6 h-6 text-black" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "Sora, sans-serif" }}>
                      Join the Waitlist
                    </h2>
                    <p className="text-sm text-white/60">
                      Early access + ₹100 sign-up bonus
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={submitting}
                        placeholder="Aarav Sharma"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#c8952e]/60 focus:bg-white/[0.07] transition-all"
                        autoComplete="name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Mobile Number</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-xl bg-white/[0.03] border border-r-0 border-white/10 text-white/60 text-sm">+91</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          disabled={submitting}
                          placeholder="9876543210"
                          maxLength={10}
                          className="flex-1 px-4 py-3 rounded-r-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#c8952e]/60 focus:bg-white/[0.07] transition-all"
                          autoComplete="tel-national"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#c8952e]/60 focus:bg-white/[0.07] transition-all"
                        autoComplete="email"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">I am a…</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["teen", "parent", "both"] as Role[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            disabled={submitting}
                            onClick={() => setRole(r)}
                            className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-all border ${
                              role === r
                                ? "bg-[#c8952e] text-black border-[#c8952e]"
                                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-xl font-semibold text-black flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:brightness-110"
                      style={{
                        background: "linear-gradient(135deg, #e0b758, #c8952e)",
                        boxShadow: "0 8px 24px rgba(200,149,46,0.35)",
                      }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Securing your spot…
                        </>
                      ) : (
                        <>Join Waitlist <Sparkles className="w-4 h-4" /></>
                      )}
                    </button>

                    <p className="text-[11px] text-center text-white/40 leading-relaxed">
                      By joining, you agree to receive launch updates. We'll never spam you.
                    </p>
                  </form>
                </>
              ) : (
                /* Success view */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                    style={{ background: "linear-gradient(135deg, #c8952e, #e0b758)" }}
                  >
                    <Check className="w-8 h-8 text-black" strokeWidth={3} />
                  </motion.div>

                  <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Sora, sans-serif" }}>
                    You're in! 🎉
                  </h2>
                  <p className="text-sm text-white/60 mb-4">
                    We'll email you the moment AuroPay opens to your phone.
                  </p>

                  <AnimatePresence>
                    {position !== null && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 240, damping: 18 }}
                        className="mx-auto mb-5 inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] font-semibold tabular-nums"
                        style={{
                          background: "linear-gradient(135deg, rgba(224,183,88,0.18), rgba(200,149,46,0.10))",
                          border: "1px solid rgba(224,183,88,0.35)",
                          color: "#ffe9a8",
                          boxShadow: "0 6px 18px rgba(200,149,46,0.18)",
                        }}
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        #{position.toLocaleString("en-IN")} in line
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {referralCode && (
                    <>
                      <div className="rounded-xl border border-[#c8952e]/30 bg-[#c8952e]/[0.06] p-4 mb-4 text-left">
                        <p className="text-xs uppercase tracking-wider text-[#e0b758] mb-2">
                          Your referral link
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs sm:text-sm text-white/90 truncate font-mono">
                            {shareUrl}
                          </code>
                          <button
                            onClick={copyLink}
                            className="shrink-0 w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors"
                            aria-label="Copy link"
                          >
                            {copied ? <Check className="w-4 h-4 text-[#c8952e]" /> : <Copy className="w-4 h-4 text-white/70" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-white/50 mt-2">
                          You and your friend both get ₹100 when they join.
                        </p>
                      </div>

                      <button
                        onClick={nativeShare}
                        className="w-full py-3 rounded-xl font-semibold text-black mb-3 hover:brightness-110 transition-all"
                        style={{
                          background: "linear-gradient(135deg, #e0b758, #c8952e)",
                          boxShadow: "0 8px 24px rgba(200,149,46,0.35)",
                        }}
                      >
                        Invite a Friend
                      </button>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <button onClick={shareWhatsApp} className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 text-xs text-white/80 transition-colors">
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                        </button>
                        <button onClick={shareTwitter} className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 text-xs text-white/80 transition-colors">
                          <Twitter className="w-4 h-4" /> Twitter
                        </button>
                        <button onClick={shareEmail} className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 text-xs text-white/80 transition-colors">
                          <Mail className="w-4 h-4" /> Email
                        </button>
                      </div>
                    </>
                  )}

                  <button
                    onClick={onClose}
                    className="text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
