import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, Sparkles, Download, Copy, MessageCircle, Twitter, Mail, Share2 } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { joinWaitlist } from "@/landing/joinWaitlist";
import { captureReferralCode } from "@/landing/referral";
import { useWaitlistPosition } from "@/landing/useWaitlistPosition";
import { generateFoundingBadge, downloadDataUrl } from "@/landing/foundingBadge";

const CITIES = ["Bengaluru","Mumbai","Delhi","Hyderabad","Chennai","Kolkata","Pune","Mysuru","Hubli","Davangere","Ahmedabad","Jaipur","Lucknow","Kochi","Coimbatore","Nagpur","Surat","Indore","Patna","Bhubaneswar"];
const SITE_URL = "https://auro-pay.lovable.app";
const JOIN_TIMEOUT_MS = 30_000;

type Role = "teen" | "parent" | "both";

export default function Waitlist() {
  const [count, setCount] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<Role>("teen");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState("");
  const [copied, setCopied] = useState(false);
  const { position, fetchPosition } = useWaitlistPosition();

  useEffect(() => {
    supabase.rpc("get_waitlist_count").then(({ data }) => {
      if (typeof data === "number") setCount(data + 12000);
    });
  }, []);

  const shareUrl = refCode ? `${SITE_URL}/?ref=${refCode}` : SITE_URL;
  const shareText = refCode
    ? `I just joined the AuroPay waitlist — India's first scan-and-pay app for teens 💛 Use my link and we both get ₹100: ${shareUrl}`
    : `Join the AuroPay waitlist — India's first scan-and-pay app for teens 💛 ${shareUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Invite link copied", { description: "Share it to earn ₹100 each." });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Couldn't copy", { description: "Long-press the link to copy manually." });
    }
  };
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
  const shareTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
  const shareEmail = () => {
    const subject = encodeURIComponent("Join me on the AuroPay waitlist");
    const body = encodeURIComponent(`${shareText}\n\n— Sent from AuroPay`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank", "noopener");
  };
  const nativeShare = async () => {
    if (!navigator.share) { copyLink(); return; }
    try { await navigator.share({ title: "AuroPay", text: shareText, url: shareUrl }); } catch { /* cancelled */ }
  };
  const downloadBadge = () => {
    try {
      const dataUrl = generateFoundingBadge({
        name: submittedName || "Founding Member",
        referralCode: refCode,
        position,
      });
      if (!dataUrl) throw new Error("Couldn't generate badge");
      const safeCode = (refCode || "AUROPAY").replace(/[^A-Z0-9-]/gi, "");
      downloadDataUrl(dataUrl, `auropay-founding-member-${safeCode}.png`);
      toast.success("Badge saved", { description: "Post it on your story and tag @auropay 💛" });
    } catch {
      toast.error("Couldn't save badge", { description: "Try again or screenshot the card." });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (cleanPhone.length !== 10) return setError("Enter a valid 10-digit phone.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError("Enter a valid email.");

    setLoading(true);
    try {
      const referralCode = captureReferralCode();
      const result = await Promise.race([
        joinWaitlist({
          fullName: name.trim(),
          phone: cleanPhone,
          email: email.trim().toLowerCase(),
          city: city || null,
          role,
          source: "landing_form",
          referralCode,
        }),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Waitlist submission timed out")), JOIN_TIMEOUT_MS)),
      ]);
      setRefCode(result?.referralCode ?? null);
      setSubmittedName(name.trim());
      // Auto-clear inputs
      setName(""); setPhone(""); setEmail(""); setCity(""); setRole("teen");
      toast.success("You're on the list!", { description: "We'll notify you the moment AuroPay launches." });
      fetchPosition(); // fire-and-forget
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error && err.message === "Waitlist submission timed out"
          ? "This is taking too long. Please try again in a moment."
          : err instanceof Error
            ? err.message
            : "Couldn't join right now. Please try again."
      );
      return;
    }
    setLoading(false);
    setDone(true);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#c8952e","#e0b048","#fff7e3"] });
  };

  return (
    <section id="waitlist" className="relative py-32 px-6 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}>
            Be first. Get exclusive benefits.
          </h2>
          <p className="text-white/60">Founding members unlock perks no one else gets.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-8 text-sm text-white/80">
          {[
            ["🎁", "₹100 bonus on first transaction"],
            ["⚡", "Priority access before public launch"],
            ["🏆", "Founding Member badge — forever"],
            ["✨", "Direct line to the founding team"],
          ].map(([e, t], i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,149,46,0.15)" }}>
              <span className="text-xl">{e}</span>{t}
            </motion.div>
          ))}
        </div>

        {/* Premium conic gold edge — matches modal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative rounded-[32px] p-[1px] overflow-hidden"
          style={{
            background:
              "conic-gradient(from 140deg at 50% 50%, rgba(200,149,46,0.55), rgba(255,255,255,0.05) 30%, rgba(200,149,46,0.35) 60%, rgba(255,255,255,0.05) 90%, rgba(200,149,46,0.55))",
            boxShadow: "0 40px 100px rgba(0,0,0,0.55), 0 0 60px rgba(200,149,46,0.12)",
          }}
        >
          <div
            className="relative rounded-[31px] p-7 sm:p-10"
            style={{
              background: "linear-gradient(180deg, rgba(18,15,22,0.96), rgba(10,12,15,0.98))",
              backdropFilter: "blur(40px) saturate(200%)",
            }}
          >
            {/* Top shine */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[31px] opacity-60"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 18%)" }}
            />

          {done ? (
            <SuccessInline
              name={submittedName}
              refCode={refCode}
              shareUrl={shareUrl}
              copied={copied}
              position={position}
              onCopy={copyLink}
              onWhatsApp={shareWhatsApp}
              onTwitter={shareTwitter}
              onEmail={shareEmail}
              onNativeShare={nativeShare}
              onDownloadBadge={downloadBadge}
            />
          ) : (
            <form onSubmit={submit} className="relative space-y-4">
              <Input label="Full name" value={name} onChange={setName} placeholder="Aarav Sharma" />
              <Input label="Phone" value={phone} onChange={setPhone} placeholder="9876543210" prefix="+91" inputMode="numeric" />
              <Input label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />

              <label className="block">
                <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2 font-semibold">City</div>
                <select value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full h-13 px-4 rounded-xl text-white text-[15px] outline-none border focus:border-[#c8952e]/60 transition"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", fontFamily: "Sora, sans-serif" }}>
                  <option value="" className="bg-[#0a0c0f]">Select city</option>
                  {CITIES.map(c => <option key={c} value={c} className="bg-[#0a0c0f]">{c}</option>)}
                </select>
              </label>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2 font-semibold">I am a</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["teen","parent","both"] as Role[]).map(r => (
                    <button type="button" key={r} onClick={() => setRole(r)}
                      className="py-3 rounded-xl text-sm font-medium transition border"
                      style={role === r
                        ? { background: "linear-gradient(135deg,#c8952e,#e0b048)", color: "#0a0a0a", borderColor: "transparent" }
                        : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.08)" }}>
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

              <button type="submit" disabled={loading}
                className="relative w-full h-14 rounded-xl font-semibold text-base transition disabled:opacity-90 flex items-center justify-center gap-2 overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg,#c8952e,#e0b048)",
                  color: "#0a0a0a",
                  boxShadow: "0 10px 28px rgba(200,149,46,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
                }}>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms]"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }}
                />
                {loading ? <PremiumLoader /> : <>Join the Waitlist →</>}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/40">
                <Lock size={11} /> We never share your data. Ever.
              </div>
              {count !== null && (
                <div className="text-center text-xs text-white/50">
                  Join <span className="text-white font-semibold tabular-nums">{count.toLocaleString()}</span> others already on the waitlist
                </div>
              )}
            </form>
          )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Input({
  label, value, onChange, placeholder, type = "text", inputMode, prefix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; inputMode?: "text" | "numeric" | "email"; prefix?: string;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2 font-semibold">{label}</div>
      <div className="flex items-center rounded-xl border h-13 px-4 transition focus-within:border-[#c8952e]/60"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
        {prefix && <span className="text-white/50 text-sm mr-2">{prefix}</span>}
        <input
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} type={type} inputMode={inputMode}
          className="flex-1 bg-transparent outline-none text-white text-[15px] placeholder:text-white/30 py-3.5"
          style={{ fontFamily: "Sora, sans-serif" }}
        />
      </div>
    </label>
  );
}
