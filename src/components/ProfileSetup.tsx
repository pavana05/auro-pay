import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Users } from "lucide-react";

interface Props {
  userId: string;
  phone: string;
  onComplete: () => void;
}

const ProfileSetup = ({ userId, phone, onComplete }: Props) => {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"teen" | "parent" | "">("");
  const [dob, setDob] = useState("");
  const [teenPhone, setTeenPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStep1 = () => {
    if (!fullName.trim()) { toast.error("Enter your name"); return; }
    if (!role) { toast.error("Select your role"); return; }
    setStep(2);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        role,
        kyc_status: "pending",
      });
      if (profileError) throw profileError;

      // Create wallet
      const { error: walletError } = await supabase.from("wallets").insert({
        user_id: userId,
      });
      if (walletError) throw walletError;

      // If parent, link teen
      if (role === "parent" && teenPhone) {
        const { data: teen } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", `+91${teenPhone}`)
          .single();
        
        if (teen) {
          await supabase.from("parent_teen_links").insert({
            parent_id: userId,
            teen_id: teen.id,
          });
        }
      }

      toast.success("Profile created!");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: "teen" as const, label: "I am a Teen", icon: User, desc: "Age 13-19" },
    { value: "parent" as const, label: "I am a Parent", icon: Users, desc: "Monitor & manage" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background noise-overlay px-6 py-12">
      <h1 className="text-4xl font-bold gradient-text mb-2">AuroPay</h1>

      {/* Progress */}
      <div className="flex gap-2 my-6">
        <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
        <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
      </div>

      {step === 1 ? (
        <div className="animate-fade-in-up">
          <h2 className="text-[22px] font-semibold mb-1">Set up your profile</h2>
          <p className="text-sm text-muted-foreground mb-8">Tell us about yourself</p>

          <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">FULL NAME</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="input-auro w-full mb-6"
          />

          <label className="text-xs font-medium tracking-wider text-muted-foreground mb-3 block">I AM A</label>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                className={`p-5 rounded-lg border text-left transition-all duration-200 ${
                  role === r.value
                    ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(263_84%_58%/0.2)]"
                    : "border-border bg-card hover:border-border-active"
                }`}
              >
                <r.icon className={`w-8 h-8 mb-3 ${role === r.value ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-semibold text-sm">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
              </button>
            ))}
          </div>

          <button onClick={handleStep1} className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]">
            Continue
          </button>
        </div>
      ) : (
        <div className="animate-fade-in-up">
          <h2 className="text-[22px] font-semibold mb-1">
            {role === "teen" ? "Almost there!" : "Link your teen"}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {role === "teen" ? "A few more details" : "Enter your teen's phone number"}
          </p>

          {role === "teen" ? (
            <>
              <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">DATE OF BIRTH</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="input-auro w-full mb-6"
              />
              <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">REFERRAL CODE (OPTIONAL)</label>
              <input placeholder="Enter code" className="input-auro w-full mb-8" />
            </>
          ) : (
            <>
              <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">TEEN'S PHONE NUMBER</label>
              <div className="flex items-center gap-2 mb-8">
                <div className="h-[52px] px-4 rounded-[14px] bg-input border border-border flex items-center text-sm text-muted-foreground shrink-0">
                  🇮🇳 +91
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={teenPhone}
                  onChange={(e) => setTeenPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="Phone number"
                  className="input-auro flex-1 w-full"
                />
              </div>
            </>
          )}

          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Creating profile..." : "Complete Setup"}
          </button>
          <button
            onClick={() => setStep(1)}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Go back
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSetup;
