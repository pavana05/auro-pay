import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Lock, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

const CITIES = ["Bengaluru","Mumbai","Delhi","Hyderabad","Chennai","Kolkata","Pune","Mysuru","Hubli","Davangere","Ahmedabad","Jaipur","Lucknow","Kochi","Coimbatore","Nagpur","Surat","Indore","Patna","Bhubaneswar"];

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

  useEffect(() => {
    supabase.rpc("get_waitlist_count").then(({ data }) => {
      if (typeof data === "number") setCount(data + 12000);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (cleanPhone.length !== 10) return setError("Enter a valid 10-digit phone.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError("Enter a valid email.");

    setLoading(true);
    const { error: insErr } = await supabase.from("waitlist").insert({
      full_name: name.trim(),
      phone: "+91" + cleanPhone,
      email: email.trim().toLowerCase(),
      city: city || null,
      role,
      source: "landing_form",
    });
    setLoading(false);
    if (insErr) {
      setError(insErr.code === "23505" || insErr.message.includes("waitlist_email_lower_idx")
        ? "You're already on the list!" : "Couldn't join right now. Please try again.");
      return;
    }
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

        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="rounded-[28px] p-8 sm:p-10"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(32px)",
            border: "1px solid rgba(200,149,46,0.25)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.4)",
          }}
        >
          {done ? (
            <div className="py-6 text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)" }}>
                <Check size={32} strokeWidth={3} className="text-black" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white">🎉 You're on the list!</h3>
              <p className="text-white/60">We'll notify you the moment AuroPay launches in your city.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
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

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-14 rounded-xl font-semibold text-base transition disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg,#c8952e,#e0b048)",
                  color: "#0a0a0a",
                  boxShadow: "0 8px 32px rgba(200,149,46,0.4)",
                }}>
                {loading ? <><Loader2 size={18} className="animate-spin" /> Joining…</> : "Join the Waitlist →"}
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
