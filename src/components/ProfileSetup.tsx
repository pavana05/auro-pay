import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Users, ArrowRight, ArrowLeft, CalendarIcon, Sparkles, Check, Loader2, Phone, SkipForward } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface Props {
  userId: string;
  phone: string;
  onComplete: () => void;
}

const nameSchema = z.string().trim().min(2, "Name is too short").max(60, "Name is too long");
const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone");

type Direction = 1 | -1;

const AVATAR_OPTIONS = ["🦄", "🐯", "🦊", "🐼", "🐧", "🦁", "🐨", "🐸", "🦉", "🐙", "🦋", "🐳", "🦖", "🐲", "🦅"];

/**
 * Step indices (shared)
 *  0  Name
 *  1  Role
 *  2  Teen → DOB        |  Parent → Teen lookup
 *  3  Avatar (optional but always shown)
 *  4  Congrats
 */
const STEP_NAME = 0;
const STEP_ROLE = 1;
const STEP_BRANCH = 2;
const STEP_AVATAR = 3;
const STEP_CONGRATS = 4;
const TOTAL_STEPS = 4; // congrats not counted in stepper

const ProfileSetup = ({ userId, phone, onComplete }: Props) => {
  const storageKey = `auropay_setup_progress_${userId}`;

  const [step, setStep] = useState(STEP_NAME);
  const [dir, setDir] = useState<Direction>(1);
  const [fullName, setFullName] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [avatar, setAvatar] = useState<string>(AVATAR_OPTIONS[0]);
  const [role, setRole] = useState<"teen" | "parent" | "">("");
  const [pulseRole, setPulseRole] = useState<"teen" | "parent" | "">("");
  const [dob, setDob] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [teenPhone, setTeenPhone] = useState("");
  const [teenLookup, setTeenLookup] = useState<{ status: "idle" | "searching" | "found" | "missing" | "error"; profile?: { id: string; full_name: string | null; avatar_url: string | null } | null }>({ status: "idle" });
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* ---------- Hydrate from localStorage ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.step === "number" && s.step >= 0 && s.step <= STEP_AVATAR) setStep(s.step);
        if (typeof s.fullName === "string") setFullName(s.fullName);
        if (typeof s.avatar === "string") setAvatar(s.avatar);
        if (s.role === "teen" || s.role === "parent") setRole(s.role);
        if (typeof s.dob === "string") {
          const d = new Date(s.dob);
          if (!isNaN(d.getTime())) setDob(d);
        }
        if (typeof s.teenPhone === "string") setTeenPhone(s.teenPhone);
      }
    } catch {}
    setHydrated(true);
  }, [storageKey]);

  /* ---------- Persist on every change (after hydration) ---------- */
  useEffect(() => {
    if (!hydrated) return;
    if (step === STEP_CONGRATS) return; // don't persist final state
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          step,
          fullName,
          avatar,
          role,
          dob: dob ? dob.toISOString() : null,
          teenPhone,
        })
      );
    } catch {}
  }, [hydrated, step, fullName, avatar, role, dob, teenPhone, storageKey]);

  const displayStep = Math.min(step + 1, TOTAL_STEPS);

  const goNext = () => { setDir(1); setStep((s) => s + 1); };
  const goBack = () => { setDir(-1); setStep((s) => Math.max(0, s - 1)); };

  /* ---------- Step handlers ---------- */
  const handleStep0 = () => {
    const r = nameSchema.safeParse(fullName);
    if (!r.success) { toast.error(r.error.errors[0].message); return; }
    goNext();
  };

  const handleRolePick = (r: "teen" | "parent") => {
    setRole(r);
    setPulseRole(r);
    setTimeout(() => setPulseRole(""), 800);
  };

  const handleStep1 = () => {
    if (!role) { toast.error("Pick your role"); return; }
    goNext();
  };

  const handleStep2Teen = () => {
    if (!dob) { toast.error("Select your date of birth"); return; }
    const age = differenceInYears(new Date(), dob);
    if (age < 10 || age > 25) { toast.error("Teen accounts are for ages 10–25"); return; }
    goNext();
  };

  /* ---------- Teen phone lookup (parent path) ---------- */
  const lookupTeen = async (raw: string) => {
    const cleaned = raw.replace(/\D/g, "").slice(-10);
    setTeenPhone(cleaned);
    if (cleaned.length !== 10) {
      setTeenLookup({ status: "idle" });
      return;
    }
    const v = phoneSchema.safeParse(cleaned);
    if (!v.success) { setTeenLookup({ status: "idle" }); return; }

    setTeenLookup({ status: "searching" });
    try {
      // Use the SECURITY DEFINER RPC: returns only id, full_name, avatar_url
      // for a matching teen — no other profile fields are exposed.
      const { data, error } = await (supabase.rpc as any)("lookup_teen_by_phone", { _phone: cleaned });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setTeenLookup({ status: "missing" }); return; }
      setTeenLookup({ status: "found", profile: { id: row.id, full_name: row.full_name, avatar_url: row.avatar_url } });
    } catch (e: any) {
      setTeenLookup({ status: "error" });
    }
  };

  const handleStep2Parent = () => {
    // Optional: allow parents to skip linking now and do it later
    goNext();
  };

  /* ---------- Final submit (called from avatar step) ---------- */
  const submitProfile = async () => {
    setLoading(true);
    try {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        role,
        kyc_status: "pending",
        avatar_url: avatar,
      });
      if (profileError) throw profileError;

      const { error: walletError } = await supabase.from("wallets").insert({ user_id: userId });
      if (walletError) throw walletError;

      // Parent → link to teen if found
      if (role === "parent" && teenLookup.status === "found" && teenLookup.profile?.id) {
        const { error: linkError } = await supabase.from("parent_teen_links").insert({
          parent_id: userId,
          teen_id: teenLookup.profile.id,
          is_active: true,
        });
        if (linkError) {
          // Non-fatal — they can link later from Linked Parents/Teens screen
          console.warn("Teen link failed:", linkError.message);
          toast.warning("Profile created but couldn't link teen — try again from Linked Teens.");
        } else {
          toast.success(`Linked with ${teenLookup.profile.full_name || "teen"}`);
        }
      }

      // Clear in-progress state
      try { localStorage.removeItem(storageKey); } catch {}

      // Move to congrats
      setDir(1);
      setStep(STEP_CONGRATS);
      setTimeout(() => onComplete(), 2800);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  const isCongrats = step === STEP_CONGRATS;
  const showStepper = !isCongrats;

  return (
    <div
      className="fixed inset-0 flex flex-col font-sora overflow-hidden"
      style={{ background: "hsl(220 15% 5%)" }}
    >
      {/* Ambient gold radials */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[460px] h-[460px] rounded-full blur-[120px] opacity-25"
          style={{ top: "-15%", left: "-10%", background: "radial-gradient(circle, hsl(42 78% 55% / 0.5), transparent 70%)" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-20"
          style={{ bottom: "-15%", right: "-10%", background: "radial-gradient(circle, hsl(38 80% 45% / 0.5), transparent 70%)" }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        {step > 0 && !isCongrats ? (
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-[12px] text-white/50 hover:text-white/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : <div />}

        {showStepper && (
          <span className="text-[10px] font-bold tracking-[0.2em] text-white/40">
            STEP {displayStep} OF {TOTAL_STEPS}
          </span>
        )}
      </div>

      {/* Stepper progress */}
      {showStepper && (
        <div className="relative z-10 px-6 mt-4 flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const active = i <= step;
            const current = i === step;
            return (
              <div key={i} className="flex-1 h-[3px] rounded-full bg-white/[0.08] overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: active ? "100%" : "0%",
                    background: "linear-gradient(90deg, hsl(42 95% 70%), hsl(42 78% 55%), hsl(38 80% 50%))",
                    boxShadow: current ? "0 0 10px hsl(42 78% 55% / 0.7)" : "none",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Sliding step container */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <StepWrapper key={step} direction={dir}>
          {step === STEP_NAME && (
            <NameStep
              value={fullName}
              focused={nameFocused}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              onChange={setFullName}
              onNext={handleStep0}
            />
          )}
          {step === STEP_ROLE && (
            <RoleStep
              role={role}
              pulseRole={pulseRole}
              onPick={handleRolePick}
              onNext={handleStep1}
            />
          )}
          {step === STEP_BRANCH && role === "teen" && (
            <DobStep
              dob={dob}
              setDob={setDob}
              calendarOpen={calendarOpen}
              setCalendarOpen={setCalendarOpen}
              onNext={handleStep2Teen}
            />
          )}
          {step === STEP_BRANCH && role === "parent" && (
            <TeenLookupStep
              teenPhone={teenPhone}
              lookup={teenLookup}
              onChange={lookupTeen}
              onNext={handleStep2Parent}
            />
          )}
          {step === STEP_AVATAR && (
            <AvatarStep
              avatar={avatar}
              onChange={setAvatar}
              onSubmit={submitProfile}
              loading={loading}
            />
          )}
          {isCongrats && <CongratsStep name={fullName.trim().split(" ")[0] || "friend"} />}
        </StepWrapper>
      </div>
    </div>
  );
};

/* ============= STEP WRAPPER (slide in/out) ============= */

const StepWrapper = ({ children, direction }: { children: React.ReactNode; direction: Direction }) => {
  return (
    <div
      className="absolute inset-0 px-6 pt-8 pb-6 flex flex-col"
      style={{
        animation: `step-slide-in-${direction === 1 ? "right" : "left"} 0.45s cubic-bezier(0.22, 1, 0.36, 1) both`,
      }}
    >
      {children}
      <style>{`
        @keyframes step-slide-in-right {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes step-slide-in-left {
          from { transform: translateX(-40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/* ============= Shared CTA button ============= */
const PrimaryButton = ({ onClick, disabled, loading, children }: { onClick: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="group relative w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] active:scale-[0.97] transition overflow-hidden disabled:opacity-50"
    style={{
      background: "linear-gradient(135deg, hsl(42 95% 70%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
      color: "hsl(220 15% 5%)",
      boxShadow: "0 14px 40px hsl(42 78% 55% / 0.4), inset 0 1px 0 hsl(45 100% 85% / 0.5)",
    }}
  >
    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
    {loading ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : <span className="relative z-10 inline-flex items-center gap-2">{children}</span>}
  </button>
);

/* ============= STEP 1: NAME ============= */

const NameStep = ({
  value, focused, onFocus, onBlur, onChange, onNext,
}: {
  value: string; focused: boolean;
  onFocus: () => void; onBlur: () => void;
  onChange: (v: string) => void; onNext: () => void;
}) => {
  const lifted = focused || value.length > 0;
  return (
    <div className="flex flex-col">
      <h2 className="text-[26px] font-black text-white mb-1">What should we call you?</h2>
      <p className="text-[13px] text-white/50 mb-8">Let's personalize your AuroPay</p>

      {/* Floating label input */}
      <div className="relative pt-5 mb-2">
        <label
          className="absolute left-0 pointer-events-none transition-all duration-300 ease-out font-sora"
          style={{
            top: lifted ? 0 : 28,
            fontSize: lifted ? 11 : 16,
            letterSpacing: lifted ? "0.18em" : "0",
            textTransform: lifted ? "uppercase" : "none",
            fontWeight: lifted ? 700 : 400,
            color: lifted ? "hsl(42 90% 70%)" : "hsl(0 0% 100% / 0.4)",
          }}
        >
          {lifted ? "Full Name" : "Enter your full name"}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(e) => e.key === "Enter" && onNext()}
          autoFocus
          maxLength={60}
          className="w-full bg-transparent outline-none text-[18px] font-medium text-white pb-2 font-sora"
        />
        <div className="relative h-[2px] w-full bg-white/[0.08] rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{
              width: focused || value ? "100%" : "0%",
              background: "linear-gradient(90deg, hsl(42 95% 70%), hsl(42 78% 55%), hsl(38 80% 50%))",
              boxShadow: focused ? "0 0 10px hsl(42 78% 55% / 0.7)" : "none",
            }}
          />
        </div>
      </div>

      <div className="flex-1" />
      <PrimaryButton onClick={onNext}>Continue<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></PrimaryButton>
    </div>
  );
};

/* ============= STEP 2: ROLE ============= */

const RoleStep = ({
  role, pulseRole, onPick, onNext,
}: {
  role: string; pulseRole: string;
  onPick: (r: "teen" | "parent") => void;
  onNext: () => void;
}) => {
  const cards = [
    { value: "teen" as const, label: "I'm a Teen", icon: User, desc: "Spend, save & earn rewards", emoji: "🎓" },
    { value: "parent" as const, label: "I'm a Parent", icon: Users, desc: "Monitor & set spending limits", emoji: "👨‍👩‍👧" },
  ];

  return (
    <div className="flex flex-col">
      <h2 className="text-[26px] font-black text-white mb-1">Who are you joining as?</h2>
      <p className="text-[13px] text-white/50 mb-8">Pick the role that fits you best</p>

      <div className="grid grid-cols-1 gap-4 mb-8">
        {cards.map((c) => {
          const selected = role === c.value;
          const pulsing = pulseRole === c.value;
          const Icon = c.icon;
          return (
            <button
              key={c.value}
              onClick={() => onPick(c.value)}
              className="relative text-left rounded-[20px] p-5 transition-all duration-300 ease-out"
              style={{
                background: selected
                  ? "linear-gradient(135deg, hsl(42 78% 55% / 0.12), hsl(42 78% 55% / 0.04))"
                  : "hsl(220 15% 8% / 0.6)",
                border: `1.5px solid ${selected ? "hsl(42 78% 55% / 0.7)" : "hsl(0 0% 100% / 0.08)"}`,
                boxShadow: selected
                  ? "0 16px 40px hsl(42 78% 55% / 0.18), inset 0 1px 0 hsl(42 78% 55% / 0.15)"
                  : "0 4px 16px hsl(0 0% 0% / 0.3)",
                animation: pulsing ? "role-pulse-glow 0.8s ease-out" : undefined,
              }}
              onMouseMove={(e) => {
                if (selected) return;
                const r = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - r.left) / r.width - 0.5) * 8;
                const y = ((e.clientY - r.top) / r.height - 0.5) * -8;
                e.currentTarget.style.transform = `perspective(800px) rotateX(${y}deg) rotateY(${x}deg) scale(1.02)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)";
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{
                    background: selected
                      ? "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))"
                      : "hsl(0 0% 100% / 0.05)",
                    boxShadow: selected ? "0 8px 24px hsl(42 78% 55% / 0.5)" : "none",
                  }}
                >
                  {selected ? <Icon className="w-7 h-7" style={{ color: "hsl(220 15% 5%)" }} /> : <span>{c.emoji}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[16px] text-white">{c.label}</p>
                  <p className="text-[12px] text-white/50 mt-0.5">{c.desc}</p>
                </div>
                {selected && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
                      boxShadow: "0 4px 12px hsl(42 78% 55% / 0.5)",
                    }}
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} style={{ color: "hsl(220 15% 5%)" }} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />
      <PrimaryButton onClick={onNext} disabled={!role}>Continue<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></PrimaryButton>

      <style>{`
        @keyframes role-pulse-glow {
          0%   { box-shadow: 0 0 0 0 hsl(42 78% 55% / 0.7), 0 16px 40px hsl(42 78% 55% / 0.18); }
          70%  { box-shadow: 0 0 0 16px hsl(42 78% 55% / 0), 0 16px 40px hsl(42 78% 55% / 0.18); }
          100% { box-shadow: 0 0 0 0 hsl(42 78% 55% / 0), 0 16px 40px hsl(42 78% 55% / 0.18); }
        }
      `}</style>
    </div>
  );
};

/* ============= STEP 3 (teen): DOB ============= */

const DobStep = ({
  dob, setDob, calendarOpen, setCalendarOpen, onNext,
}: {
  dob: Date | undefined; setDob: (d: Date | undefined) => void;
  calendarOpen: boolean; setCalendarOpen: (o: boolean) => void;
  onNext: () => void;
}) => {
  const age = useMemo(() => (dob ? differenceInYears(new Date(), dob) : null), [dob]);
  return (
    <div className="flex flex-col">
      <h2 className="text-[26px] font-black text-white mb-1">When's your birthday?</h2>
      <p className="text-[13px] text-white/50 mb-8">We need this for KYC verification</p>

      <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3 block">DATE OF BIRTH</label>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-full h-14 rounded-2xl px-4 flex items-center gap-3 font-sora text-[15px] transition-all",
              "bg-white/[0.04] border outline-none",
              dob ? "text-white" : "text-white/40"
            )}
            style={{
              borderColor: dob ? "hsl(42 78% 55% / 0.5)" : "hsl(0 0% 100% / 0.1)",
              boxShadow: dob ? "0 0 16px hsl(42 78% 55% / 0.2)" : "none",
            }}
          >
            <CalendarIcon className="w-4 h-4" style={{ color: dob ? "hsl(42 90% 70%)" : "hsl(0 0% 100% / 0.4)" }} />
            <span className="flex-1 text-left">{dob ? format(dob, "PPP") : "Pick your date of birth"}</span>
            {age !== null && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "hsl(42 78% 55% / 0.15)", color: "hsl(42 90% 75%)" }}>
                {age} yrs
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border"
          align="center"
          style={{ background: "hsl(220 15% 8% / 0.96)", backdropFilter: "blur(20px)", borderColor: "hsl(42 78% 55% / 0.25)", boxShadow: "0 20px 60px hsl(0 0% 0% / 0.6)" }}
        >
          <Calendar
            mode="single"
            selected={dob}
            onSelect={(d) => { setDob(d); setCalendarOpen(false); }}
            disabled={(date) => date > new Date() || date < new Date("1990-01-01")}
            captionLayout="dropdown-buttons"
            fromYear={1995}
            toYear={new Date().getFullYear()}
            defaultMonth={dob ?? new Date(2008, 0, 1)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <div className="flex-1" />
      <PrimaryButton onClick={onNext}>Continue<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></PrimaryButton>
    </div>
  );
};

/* ============= STEP 3 (parent): Teen Phone Lookup ============= */

const TeenLookupStep = ({
  teenPhone, lookup, onChange, onNext,
}: {
  teenPhone: string;
  lookup: { status: "idle" | "searching" | "found" | "missing" | "error"; profile?: { id: string; full_name: string | null; avatar_url: string | null } | null };
  onChange: (v: string) => void;
  onNext: () => void;
}) => {
  const ready = teenPhone.length === 10;
  return (
    <div className="flex flex-col">
      <h2 className="text-[26px] font-black text-white mb-1">Link your teen</h2>
      <p className="text-[13px] text-white/50 mb-8">Enter their AuroPay phone number to connect now (optional)</p>

      <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3 block">TEEN'S PHONE</label>
      <div
        className="w-full h-14 rounded-2xl px-4 flex items-center gap-3 transition-all"
        style={{
          background: "hsl(0 0% 100% / 0.04)",
          border: `1.5px solid ${ready ? "hsl(42 78% 55% / 0.5)" : "hsl(0 0% 100% / 0.1)"}`,
          boxShadow: ready ? "0 0 16px hsl(42 78% 55% / 0.2)" : "none",
        }}
      >
        <Phone className="w-4 h-4" style={{ color: ready ? "hsl(42 90% 70%)" : "hsl(0 0% 100% / 0.4)" }} />
        <span className="text-[15px] text-white/50">+91</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={teenPhone}
          onChange={(e) => onChange(e.target.value)}
          placeholder="98765 43210"
          maxLength={10}
          className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-white/30 font-medium tracking-wider"
          autoFocus
        />
        {lookup.status === "searching" && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(42 90% 70%)" }} />}
        {lookup.status === "found" && <Check className="w-4 h-4" strokeWidth={3} style={{ color: "hsl(140 60% 60%)" }} />}
      </div>

      {/* Result card */}
      <div className="mt-4 min-h-[80px]">
        {lookup.status === "found" && lookup.profile && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, hsl(42 78% 55% / 0.1), hsl(42 78% 55% / 0.03))",
              border: "1.5px solid hsl(42 78% 55% / 0.4)",
              animation: "lookup-pop 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-[24px] shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
                boxShadow: "0 8px 20px hsl(42 78% 55% / 0.4)",
              }}
            >
              {lookup.profile.avatar_url || "👤"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "hsl(140 60% 65%)" }}>Teen found</p>
              <p className="font-bold text-[15px] text-white truncate">{lookup.profile.full_name || "Unnamed teen"}</p>
            </div>
          </div>
        )}
        {lookup.status === "missing" && (
          <div className="rounded-2xl p-4 text-[12px]" style={{ background: "hsl(0 0% 100% / 0.04)", border: "1.5px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 100% / 0.55)" }}>
            No teen account found with this number. They'll need to sign up first — you can link them later from <span className="text-white font-bold">Linked Teens</span>.
          </div>
        )}
        {lookup.status === "error" && (
          <div className="rounded-2xl p-4 text-[12px]" style={{ background: "hsl(0 70% 50% / 0.08)", border: "1.5px solid hsl(0 70% 50% / 0.3)", color: "hsl(0 80% 75%)" }}>
            Couldn't search right now. You can skip and link later.
          </div>
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={onNext}
        className="w-full h-11 rounded-full flex items-center justify-center gap-2 text-[12px] font-bold text-white/60 hover:text-white/90 transition-colors mb-3"
      >
        <SkipForward className="w-3.5 h-3.5" />
        Skip for now
      </button>
      <PrimaryButton onClick={onNext}>Continue<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></PrimaryButton>

      <style>{`
        @keyframes lookup-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

/* ============= STEP 4: AVATAR (optional) ============= */

const AvatarStep = ({
  avatar, onChange, onSubmit, loading,
}: {
  avatar: string;
  onChange: (a: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) => {
  return (
    <div className="flex flex-col">
      <h2 className="text-[26px] font-black text-white mb-1">Pick your avatar</h2>
      <p className="text-[13px] text-white/50 mb-8">Or skip — you can always change it later</p>

      {/* Big preview */}
      <div className="flex justify-center mb-7">
        <div
          className="relative w-28 h-28 rounded-full flex items-center justify-center text-[58px]"
          style={{
            background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%), hsl(38 80% 45%))",
            boxShadow: "0 18px 50px hsl(42 78% 55% / 0.5), inset 0 2px 0 hsl(45 100% 85% / 0.5)",
            animation: "avatar-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
          key={avatar}
        >
          <span style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>{avatar}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-3 mb-2">
        {AVATAR_OPTIONS.map((a) => {
          const selected = avatar === a;
          return (
            <button
              key={a}
              onClick={() => onChange(a)}
              type="button"
              className="relative aspect-square rounded-2xl flex items-center justify-center text-[28px] transition-all duration-300 active:scale-90"
              style={{
                background: selected
                  ? "linear-gradient(135deg, hsl(42 95% 70% / 0.25), hsl(42 78% 55% / 0.1))"
                  : "hsl(0 0% 100% / 0.04)",
                border: `1.5px solid ${selected ? "hsl(42 78% 55%)" : "hsl(0 0% 100% / 0.08)"}`,
                boxShadow: selected ? "0 8px 24px hsl(42 78% 55% / 0.3)" : "none",
                transform: selected ? "scale(1.05)" : "scale(1)",
              }}
              aria-label={`Avatar ${a}`}
            >
              <span style={{ filter: selected ? "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" : "none" }}>{a}</span>
              {selected && (
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(220 15% 5%)", border: "1.5px solid hsl(42 78% 55%)" }}
                >
                  <Check className="w-3 h-3" strokeWidth={3} style={{ color: "hsl(42 90% 70%)" }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />
      <PrimaryButton onClick={onSubmit} loading={loading}>Finish setup<Sparkles className="w-4 h-4" /></PrimaryButton>

      <style>{`
        @keyframes avatar-pop {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/* ============= CONGRATS ============= */

const CongratsStep = ({ name }: { name: string }) => {
  const confetti = useMemo(() => Array.from({ length: 36 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.8 + Math.random() * 1.4,
    size: 4 + Math.random() * 6,
    rotate: Math.random() * 360,
    color: [
      "hsl(42 95% 70%)", "hsl(42 78% 55%)", "hsl(38 80% 45%)",
      "hsl(45 100% 85%)", "hsl(50 90% 60%)", "hsl(35 85% 50%)",
    ][i % 6],
    shape: i % 3,
  })), []);

  return (
    <div className="relative flex flex-col items-center justify-center text-center pt-8">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${c.left}%`, top: -20, width: c.size,
              height: c.size * (c.shape === 1 ? 0.4 : 1),
              background: c.color,
              borderRadius: c.shape === 2 ? "50%" : "2px",
              transform: `rotate(${c.rotate}deg)`,
              animation: `confetti-fall ${c.duration}s ease-in ${c.delay}s forwards`,
              boxShadow: `0 0 6px ${c.color}`,
            }}
          />
        ))}
      </div>

      <div
        className="relative w-28 h-28 rounded-full flex items-center justify-center mb-8"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%), hsl(38 80% 45%))",
          boxShadow: "0 20px 60px hsl(42 78% 55% / 0.6), inset 0 2px 0 hsl(45 100% 85% / 0.6)",
          animation: "congrats-bounce-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        <div className="absolute inset-0 rounded-full" style={{ animation: "congrats-pulse-ring 2s ease-out infinite", border: "2px solid hsl(42 78% 55% / 0.6)" }} />
        <div className="absolute inset-0 rounded-full" style={{ animation: "congrats-pulse-ring 2s ease-out 0.5s infinite", border: "2px solid hsl(42 78% 55% / 0.4)" }} />
        <Sparkles className="w-12 h-12 relative z-10" style={{ color: "hsl(220 15% 5%)" }} />
      </div>

      <h2
        className="text-[28px] font-black leading-[1.1] mb-3 px-4"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 78%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 4px 16px hsl(42 78% 55% / 0.4))",
          animation: "congrats-text-in 0.7s 0.3s ease-out both",
        }}
      >
        Welcome to AuroPay,<br />{name}!
      </h2>
      <p
        className="text-[14px] text-white/55 max-w-[280px] leading-relaxed"
        style={{ animation: "congrats-text-in 0.7s 0.6s ease-out both" }}
      >
        Your premium wallet is ready. Let's get you started.
      </p>

      <div
        className="mt-8 flex items-center gap-2 text-[11px] text-white/40 font-medium"
        style={{ animation: "congrats-text-in 0.7s 0.9s ease-out both" }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Taking you in…
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes congrats-bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes congrats-pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes congrats-text-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ProfileSetup;
