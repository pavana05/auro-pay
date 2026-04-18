import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Copy, MessageCircle, Twitter } from "lucide-react";
import confetti from "canvas-confetti";
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
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timeoutId);
        reject(err);
      });
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
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Couldn't copy. Long-press the link to copy manually.");
    }
  };

  const shareWhatsApp = () => {
    // Pre-warm the OG cache so the first WhatsApp preview is instant
    if (ogImageUrl) fetch(ogImageUrl, { mode: "no-cors" }).catch(() => {});
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
  };

  const shareTwitter = () => {
    if (ogImageUrl) fetch(ogImageUrl, { mode: "no-cors" }).catch(() => {});
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener"
    );
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

      setDone(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#c8952e", "#e0b048", "#fff7e3"] });
    } catch (err) {
      setError(
        err instanceof Error && err.message === "Waitlist submission timed out"
          ? "This is taking too long. Please try again in a moment."
          : "Couldn't join right now. Please try again."
      );
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
          style={{ background: "rgba(3,3,5,0.8)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-[390px] rounded-[44px] p-8 border"
            style={{
              background: "rgba(14,12,18,0.85)",
              backdropFilter: "blur(40px) saturate(200%)",
              borderColor: "rgba(200,149,46,0.25)",
              boxShadow: "0 60px 120px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-black/80" />
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 transition text-white/60"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {!done ? (
              <form onSubmit={submit} className="pt-6 space-y-4">
                <div className="text-center mb-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
                    style={{ background: "linear-gradient(135deg,#c8952e,#8a6520)", boxShadow: "0 8px 24px rgba(200,149,46,0.4)" }}>
                    <span className="text-2xl">✨</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>Join the Waitlist</h2>
                  <p className="text-sm text-white/60 mt-1">Be first to experience AuroPay.</p>
                </div>

                <Field label="Full name" value={name} onChange={setName} placeholder="Aarav Sharma" />
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="9876543210" prefix="+91" inputMode="numeric" />
                <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />

                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2 font-semibold">I am a</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["teen", "parent", "both"] as Role[]).map((r) => (
                      <button
                        type="button" key={r}
                        onClick={() => setRole(r)}
                        className="py-3 rounded-xl text-sm font-medium transition border"
                        style={role === r
                          ? { background: "linear-gradient(135deg,#c8952e,#8a6520)", color: "#0a0a0a", borderColor: "transparent" }
                          : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.08)" }}
                      >
                        {r[0].toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  >{error}</motion.div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="w-full h-13 py-3.5 rounded-xl font-semibold text-base transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg,#c8952e,#e0b048)",
                    color: "#0a0a0a",
                    boxShadow: "0 8px 24px rgba(200,149,46,0.4)",
                  }}
                >
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Joining…</> : "Continue →"}
                </button>

                <p className="text-[11px] text-center text-white/40">🔒 We never share your data.</p>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="pt-8 text-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)", boxShadow: "0 12px 36px rgba(200,149,46,0.5)" }}
                >
                  <Check size={40} strokeWidth={3} className="text-black" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>You're on the list!</h2>

                {refCode ? (
                  <>
                    <p className="text-sm text-white/60">
                      Invite friends — you both get <span className="text-amber-200 font-semibold">₹100</span> when they join.
                    </p>

                    {/* Referral link card */}
                    <button
                      onClick={copyLink}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition hover:bg-white/[0.03] group"
                      style={{
                        borderColor: "rgba(200,149,46,0.28)",
                        background: "rgba(200,149,46,0.06)",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/45 font-semibold mb-0.5">Your link</div>
                        <div className="text-[13px] text-white/85 truncate font-mono">{shareUrl.replace(/^https?:\/\//, "")}</div>
                      </div>
                      <span
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-[11px] font-semibold"
                        style={{
                          background: copied ? "rgba(34,197,94,0.18)" : "rgba(200,149,46,0.16)",
                          color: copied ? "#86efac" : "#e0b048",
                        }}
                      >
                        {copied ? <><Check size={12} strokeWidth={3} /> Copied</> : <><Copy size={12} /> Copy</>}
                      </span>
                    </button>

                    {/* Share buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={shareWhatsApp}
                        className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition hover:scale-[1.02] active:scale-[0.97]"
                        style={{
                          background: "linear-gradient(135deg,#25d366,#128c7e)",
                          color: "#fff",
                          boxShadow: "0 6px 18px rgba(37,211,102,0.35)",
                        }}
                      >
                        <MessageCircle size={15} fill="#fff" strokeWidth={0} /> WhatsApp
                      </button>
                      <button
                        onClick={shareTwitter}
                        className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition hover:scale-[1.02] active:scale-[0.97]"
                        style={{
                          background: "linear-gradient(135deg,#1d1d1f,#000)",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        <Twitter size={14} fill="#fff" strokeWidth={0} /> Twitter / X
                      </button>
                    </div>

                    {typeof navigator !== "undefined" && "share" in navigator && (
                      <button
                        onClick={nativeShare}
                        className="w-full h-11 rounded-xl text-sm font-semibold transition"
                        style={{
                          background: "linear-gradient(135deg,#c8952e,#e0b048)",
                          color: "#0a0a0a",
                          boxShadow: "0 6px 18px rgba(200,149,46,0.4)",
                        }}
                      >
                        Share via…
                      </button>
                    )}

                    <button
                      onClick={handleClose}
                      className="w-full py-2.5 text-xs text-white/45 hover:text-white/70 transition"
                    >
                      Maybe later
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-white/60">We'll notify you the moment AuroPay launches in your city.</p>
                    <button
                      onClick={handleClose}
                      className="w-full py-3 rounded-xl font-medium text-sm border transition hover:bg-white/5"
                      style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}
                    >
                      Done
                    </button>
                  </>
                )}

                {error && (
                  <p className="text-[11px] text-amber-300/70">{error}</p>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Field = forwardRef<HTMLInputElement, {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; inputMode?: "text" | "numeric" | "email"; prefix?: string;
}>(function Field(
  { label, value, onChange, placeholder, type = "text", inputMode, prefix },
  ref
) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1.5 font-semibold">{label}</div>
      <div className="flex items-center rounded-xl border h-12 px-4 transition focus-within:border-[#c8952e]/60"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
        {prefix && <span className="text-white/50 text-sm mr-2">{prefix}</span>}
        <input
          ref={ref}
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} type={type} inputMode={inputMode}
          className="flex-1 bg-transparent outline-none text-white text-[15px] placeholder:text-white/30"
          style={{ fontFamily: "Sora, sans-serif" }}
        />
      </div>
    </label>
  );
});
