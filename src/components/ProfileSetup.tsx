import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Users, ArrowRight, ArrowLeft, CalendarIcon, Sparkles, Check, Loader2 } from "lucide-react";
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

type Direction = 1 | -1;

const AVATAR_OPTIONS = ["🦄", "🐯", "🦊", "🐼", "🐧", "🦁", "🐨", "🐸", "🦉", "🐙"];

const ProfileSetup = ({ userId, phone, onComplete }: Props) => {
  const [step, setStep] = useState(0); // 0=name+avatar, 1=role, 2=dob (teen only), 3=done
  const [dir, setDir] = useState<Direction>(1);
  const [fullName, setFullName] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [avatar, setAvatar] = useState<string>(AVATAR_OPTIONS[0]);
  const [role, setRole] = useState<"teen" | "parent" | "">("");
  const [pulseRole, setPulseRole] = useState<"teen" | "parent" | "">("");
  const [dob, setDob] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalSteps = role === "parent" ? 2 : 3; // parents skip DOB
  const displayStep = Math.min(step + 1, totalSteps);

  const goNext = () => { setDir(1); setStep((s) => s + 1); };
  const goBack = () => { setDir(-1); setStep((s) => Math.max(0, s - 1)); };

  const validateStep0 = () => {
    const r = nameSchema.safeParse(fullName);
    if (!r.success) { toast.error(r.error.errors[0].message); return false; }
    return true;
  };

  const handleStep0 = () => { if (validateStep0()) goNext(); };

  const handleRolePick = (r: "teen" | "parent") => {
    setRole(r);
    setPulseRole(r);
    setTimeout(() => setPulseRole(""), 800);
  };

  const handleStep1 = () => {
    if (!role) { toast.error("Pick your role"); return; }
    if (role === "parent") {
      // Skip DOB → submit straight to congrats
      submitProfile();
    } else {
      goNext();
    }
  };

  const handleStep2 = () => {
    if (!dob) { toast.error("Select your date of birth"); return; }
    const age = differenceInYears(new Date(), dob);
    if (age < 10 || age > 25) { toast.error("Teen accounts are for ages 10–25"); return; }
    submitProfile();
  };

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

      // Move to congrats — fire confetti
      setDir(1);
      setStep(role === "parent" ? 2 : 3);
      // Auto-complete after celebration
      setTimeout(() => onComplete(), 2800);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  const isCongrats = (role === "parent" && step === 2) || (role === "teen" && step === 3);
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
            STEP {displayStep} OF {totalSteps}
          </span>
        )}
      </div>

      {/* Stepper progress */}
      {showStepper && (
        <div className="relative z-10 px-6 mt-4 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => {
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
          {step === 0 && (
            <NameStep
              value={fullName}
              focused={nameFocused}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              onChange={setFullName}
              onNext={handleStep0}
            />
          )}
          {step === 1 && (
            <RoleStep
              role={role}
              pulseRole={pulseRole}
              onPick={handleRolePick}
              onNext={handleStep1}
              loading={loading && role === "parent"}
            />
          )}
          {step === 2 && role === "teen" && (
            <DobStep
              dob={dob}
              setDob={setDob}
              calendarOpen={calendarOpen}
              setCalendarOpen={setCalendarOpen}
              onNext={handleStep2}
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
      <p className="text-[13px] text-white/50 mb-10">Let's personalize your AuroPay experience</p>

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
        {/* Underline */}
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

      <button
        onClick={onNext}
        className="group relative w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] active:scale-[0.97] transition overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 70%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
          color: "hsl(220 15% 5%)",
          boxShadow: "0 14px 40px hsl(42 78% 55% / 0.4), inset 0 1px 0 hsl(45 100% 85% / 0.5)",
        }}
      >
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        <span className="relative z-10">Continue</span>
        <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );
};

/* ============= STEP 2: ROLE ============= */

const RoleStep = ({
  role, pulseRole, onPick, onNext, loading,
}: {
  role: string; pulseRole: string;
  onPick: (r: "teen" | "parent") => void;
  onNext: () => void;
  loading: boolean;
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
                transform: selected
                  ? "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)"
                  : "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)",
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
                  {selected ? (
                    <Icon className="w-7 h-7" style={{ color: "hsl(220 15% 5%)" }} />
                  ) : (
                    <span>{c.emoji}</span>
                  )}
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

      <button
        onClick={onNext}
        disabled={!role || loading}
        className="group relative w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] active:scale-[0.97] transition overflow-hidden disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 70%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
          color: "hsl(220 15% 5%)",
          boxShadow: "0 14px 40px hsl(42 78% 55% / 0.4), inset 0 1px 0 hsl(45 100% 85% / 0.5)",
        }}
      >
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin relative z-10" />
        ) : (
          <>
            <span className="relative z-10">{role === "parent" ? "Finish setup" : "Continue"}</span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      <style>{`
        @keyframes role-pulse-glow {
          0% {
            box-shadow: 0 0 0 0 hsl(42 78% 55% / 0.7), 0 16px 40px hsl(42 78% 55% / 0.18);
          }
          70% {
            box-shadow: 0 0 0 16px hsl(42 78% 55% / 0), 0 16px 40px hsl(42 78% 55% / 0.18);
          }
          100% {
            box-shadow: 0 0 0 0 hsl(42 78% 55% / 0), 0 16px 40px hsl(42 78% 55% / 0.18);
          }
        }
      `}</style>
    </div>
  );
};

/* ============= STEP 3: DOB (teen) ============= */

const DobStep = ({
  dob, setDob, calendarOpen, setCalendarOpen, onNext, loading,
}: {
  dob: Date | undefined; setDob: (d: Date | undefined) => void;
  calendarOpen: boolean; setCalendarOpen: (o: boolean) => void;
  onNext: () => void; loading: boolean;
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
            <span className="flex-1 text-left">
              {dob ? format(dob, "PPP") : "Pick your date of birth"}
            </span>
            {age !== null && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{
                background: "hsl(42 78% 55% / 0.15)",
                color: "hsl(42 90% 75%)",
              }}>
                {age} yrs
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border"
          align="center"
          style={{
            background: "hsl(220 15% 8% / 0.96)",
            backdropFilter: "blur(20px)",
            borderColor: "hsl(42 78% 55% / 0.25)",
            boxShadow: "0 20px 60px hsl(0 0% 0% / 0.6)",
          }}
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

      <button
        onClick={onNext}
        disabled={loading}
        className="group relative w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] active:scale-[0.97] transition overflow-hidden disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 70%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
          color: "hsl(220 15% 5%)",
          boxShadow: "0 14px 40px hsl(42 78% 55% / 0.4), inset 0 1px 0 hsl(45 100% 85% / 0.5)",
        }}
      >
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin relative z-10" />
        ) : (
          <>
            <span className="relative z-10">Finish setup</span>
            <Sparkles className="relative z-10 w-4 h-4" />
          </>
        )}
      </button>
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
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${c.left}%`,
              top: -20,
              width: c.size,
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

      {/* Big sparkle badge */}
      <div
        className="relative w-28 h-28 rounded-full flex items-center justify-center mb-8"
        style={{
          background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%), hsl(38 80% 45%))",
          boxShadow: "0 20px 60px hsl(42 78% 55% / 0.6), inset 0 2px 0 hsl(45 100% 85% / 0.6)",
          animation: "congrats-bounce-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        {/* Pulsing rings */}
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
