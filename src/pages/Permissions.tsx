/**
 * Post-profile permissions screen.
 * Strong-nudge enforcement: each declined permission shows a retry modal.
 * After 2 declines on the same permission, a "Skip for now" option appears
 * (so we stay store-policy compliant — never hard-blocking the user).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Users, Bell, Camera, Check, ShieldAlert, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { REQUESTERS, type PermKind, type PermStatus } from "@/lib/permissions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PermDef {
  kind: PermKind;
  title: string;
  body: string;
  why: string;
  Icon: typeof MapPin;
}

const PERMS: PermDef[] = [
  {
    kind: "location",
    title: "Location",
    body: "Detect your city for fraud protection & nearby offers.",
    why: "We use your location only when verifying high-value payments and showing rewards near you. Never tracked in the background.",
    Icon: MapPin,
  },
  {
    kind: "contacts",
    title: "Contacts",
    body: "Find friends already on AuroPay & quick-pay them.",
    why: "Used to match phone numbers in your contacts to AuroPay accounts. Numbers are hashed before being checked.",
    Icon: Users,
  },
  {
    kind: "notifications",
    title: "Notifications",
    body: "Payment alerts, parent approvals, fraud warnings.",
    why: "Critical for instant payment confirmations and parent approval requests. You can mute categories later.",
    Icon: Bell,
  },
  {
    kind: "camera",
    title: "Camera",
    body: "Scan UPI QR codes & complete KYC verification.",
    why: "Required to scan-and-pay and capture documents during KYC. We never record video.",
    Icon: Camera,
  },
];

export default function Permissions() {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Record<PermKind, PermStatus | "pending">>({
    location: "pending", contacts: "pending", notifications: "pending", camera: "pending",
  });
  const [busy, setBusy] = useState<PermKind | null>(null);
  const [denyCount, setDenyCount] = useState<Record<PermKind, number>>({
    location: 0, contacts: 0, notifications: 0, camera: 0,
  });
  const [errorFor, setErrorFor] = useState<PermDef | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Bounce out if user already completed the flow.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth", { replace: true }); return; }
      const { data } = await supabase
        .from("profiles")
        .select("permissions_completed_at, role, kyc_status, pin_hash")
        .eq("id", session.user.id)
        .maybeSingle();
      if ((data as any)?.permissions_completed_at) {
        // Already done — route forward by status.
        if ((data as any).kyc_status !== "verified") navigate("/verify-kyc", { replace: true });
        else if (!(data as any).pin_hash) navigate("/security?setup=1", { replace: true });
        else navigate((data as any).role === "parent" ? "/parent" : "/home", { replace: true });
      }
    })();
  }, [navigate]);

  const grantedCount = useMemo(
    () => Object.values(statuses).filter((s) => s === "granted" || s === "unsupported").length,
    [statuses]
  );

  const handleRequest = async (def: PermDef) => {
    setBusy(def.kind);
    const result = await REQUESTERS[def.kind]();
    setBusy(null);
    setStatuses((s) => ({ ...s, [def.kind]: result }));

    if (result === "denied") {
      setDenyCount((c) => ({ ...c, [def.kind]: c[def.kind] + 1 }));
      setErrorFor(def);
    } else if (result === "unsupported") {
      toast.warn(`${def.title} not available`, {
        description: "This permission isn't supported on your device — skipping.",
      });
    } else {
      toast.ok(`${def.title} enabled`);
    }
  };

  const handleSkipPermission = (kind: PermKind) => {
    setStatuses((s) => ({ ...s, [kind]: "denied" }));
    setErrorFor(null);
    toast.warn("You can enable this later", {
      description: "Go to your profile → Permissions to turn it on anytime.",
    });
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Session expired");
      await supabase
        .from("profiles")
        .update({ permissions_completed_at: new Date().toISOString() } as any)
        .eq("id", session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, kyc_status, pin_hash")
        .eq("id", session.user.id)
        .maybeSingle();

      if ((profile as any)?.kyc_status !== "verified") navigate("/verify-kyc", { replace: true });
      else if (!(profile as any)?.pin_hash) navigate("/security?setup=1", { replace: true });
      else navigate((profile as any)?.role === "parent" ? "/parent" : "/home", { replace: true });
    } catch (e: any) {
      toast.fail("Couldn't save", { description: e?.message || "Try again." });
      setFinishing(false);
    }
  };

  const allHandled = Object.values(statuses).every((s) => s !== "pending");

  return (
    <div className="min-h-[100dvh] bg-background text-foreground px-5 py-8 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.08))",
              border: "1px solid hsl(var(--primary) / 0.35)",
            }}
          >
            <ShieldAlert className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/80 font-semibold">Almost there</p>
            <h1 className="text-2xl font-bold leading-tight">Enable device access</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          AuroPay needs these to keep your money safe and the app fully functional. You can change them anytime in Settings.
        </p>

        {/* Progress */}
        <div className="mt-5 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))" }}
              initial={{ width: 0 }}
              animate={{ width: `${(grantedCount / PERMS.length) * 100}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{grantedCount}/{PERMS.length}</span>
        </div>
      </motion.div>

      {/* Permission cards */}
      <div className="flex-1 space-y-3">
        {PERMS.map((p, i) => {
          const status = statuses[p.kind];
          const isGranted = status === "granted" || status === "unsupported";
          const isDenied = status === "denied";
          const isBusy = busy === p.kind;

          return (
            <motion.button
              key={p.kind}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => !isGranted && !isBusy && handleRequest(p)}
              disabled={isGranted || isBusy}
              className="w-full text-left relative rounded-2xl p-4 overflow-hidden transition-all hover:translate-y-[-1px] disabled:cursor-default"
              style={{
                background: isGranted
                  ? "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.04))"
                  : isDenied
                  ? "linear-gradient(135deg, hsl(0 70% 50% / 0.08), hsl(0 70% 50% / 0.02))"
                  : "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
                border: `1px solid ${
                  isGranted
                    ? "hsl(var(--primary) / 0.35)"
                    : isDenied
                    ? "hsl(0 70% 50% / 0.35)"
                    : "rgba(255,255,255,0.08)"
                }`,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isGranted
                      ? "hsl(var(--primary) / 0.18)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isGranted ? "hsl(var(--primary) / 0.4)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  {isBusy ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : isGranted ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <p.Icon className={`w-5 h-5 ${isDenied ? "text-red-400" : "text-white/80"}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[15px]">{p.title}</h3>
                    {isGranted && (
                      <span className="text-[10px] uppercase tracking-wider text-primary font-bold px-1.5 py-0.5 rounded bg-primary/15 border border-primary/30">
                        {status === "unsupported" ? "N/A" : "On"}
                      </span>
                    )}
                    {isDenied && (
                      <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30">
                        Tap to retry
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.body}</p>
                </div>
                {!isGranted && !isBusy && (
                  <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-6 space-y-3"
      >
        <Button
          onClick={handleFinish}
          disabled={!allHandled || finishing}
          className="w-full h-12 text-base font-semibold rounded-2xl"
          style={{
            background: allHandled
              ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))"
              : undefined,
            color: allHandled ? "#1a1206" : undefined,
            boxShadow: allHandled ? "0 8px 24px hsl(var(--primary) / 0.35)" : undefined,
          }}
        >
          {finishing ? <Loader2 className="w-5 h-5 animate-spin" /> : allHandled ? "Continue" : "Respond to all permissions to continue"}
        </Button>
        <p className="text-[11px] text-center text-muted-foreground/70 px-4">
          We never share your data with third parties. You can revoke any permission later from your phone's Settings.
        </p>
      </motion.div>

      {/* Strong-nudge denial dialog */}
      <Dialog open={!!errorFor} onOpenChange={(o) => !o && setErrorFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-2">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <DialogTitle className="text-xl">{errorFor?.title} access required</DialogTitle>
            <DialogDescription className="leading-relaxed pt-1">
              {errorFor?.why}
              <br /><br />
              <span className="text-foreground/90 font-medium">
                If you've previously blocked this, you'll need to enable it manually from your phone Settings → AuroPay → Permissions.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2 mt-2">
            <Button
              onClick={() => errorFor && handleRequest(errorFor)}
              className="w-full h-11 font-semibold"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                color: "#1a1206",
              }}
            >
              Try again
            </Button>
            {errorFor && denyCount[errorFor.kind] >= 2 && (
              <Button
                variant="ghost"
                onClick={() => errorFor && handleSkipPermission(errorFor.kind)}
                className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
              >
                Skip for now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
