import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startKyc } from "@/lib/kyc";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { Browser } from "@capacitor/browser";

interface KycGateProps {
  children: React.ReactNode;
  /** Short label shown in the prompt: "Add Money", "Send Money", etc. */
  feature: string;
}

const isNative = () => typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();

const openInAppBrowser = async (url: string) => {
  if (isNative()) {
    try {
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch {
      // fall through to window.open
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

const KycGate = ({ children, feature }: KycGateProps) => {
  const [status, setStatus] = useState<"loading" | "verified" | "pending">("loading");
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("pending"); return; }
      const { data } = await supabase.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle();
      setStatus(data?.kyc_status === "verified" ? "verified" : "pending");
    };
    check();
  }, []);

  const handleVerify = async () => {
    haptic.medium();
    setStarting(true);
    try {
      const res = await startKyc();
      if (res.redirect_url) await openInAppBrowser(res.redirect_url);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't start verification");
    }
    setStarting(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (status === "verified") return <>{children}</>;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-6 pb-24">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[100px]" style={{ background: "hsl(var(--primary))" }} />
      </div>

      <div className="relative z-10 max-w-sm w-full text-center" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
            border: "1px solid hsl(var(--primary) / 0.2)",
            boxShadow: "0 0 40px hsl(var(--primary) / 0.15)",
          }}>
          <Shield className="w-9 h-9 text-primary" />
        </div>

        <h1 className="text-[24px] font-bold tracking-[-0.5px] mb-2">Verify Your Identity</h1>
        <p className="text-[14px] text-white/50 leading-relaxed mb-8">
          Complete a quick Aadhaar eKYC to unlock <span className="text-white/80 font-medium">{feature}</span>.
          It takes less than 60 seconds and keeps your money secure.
        </p>

        <div className="space-y-2 mb-8 text-left">
          {[
            { icon: "🔒", title: "Bank-grade security", desc: "256-bit encryption end-to-end" },
            { icon: "⚡", title: "Higher transaction limits", desc: "Up to ₹1,00,000/day after KYC" },
            { icon: "🎁", title: "Exclusive rewards", desc: "Cashback & coupons for verified users" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
              <div className="text-xl">{item.icon}</div>
              <div>
                <p className="text-[13px] font-semibold">{item.title}</p>
                <p className="text-[11px] text-white/40">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleVerify} disabled={starting}
          className="w-full h-[54px] rounded-2xl font-semibold text-[14px] tracking-wide active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
            color: "hsl(220 20% 6%)",
            boxShadow: "0 4px 24px hsl(var(--primary) / 0.3)",
          }}>
          {starting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : <>Verify Now <ArrowRight className="w-4 h-4" /></>}
        </button>

        <button onClick={() => navigate(-1)} className="w-full h-[44px] mt-3 rounded-2xl text-[13px] text-white/40 active:scale-[0.97] transition-all">
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default KycGate;
