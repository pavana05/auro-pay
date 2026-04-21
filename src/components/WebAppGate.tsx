import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Download, Smartphone, ArrowLeft, Apple, Loader2, Check } from "lucide-react";
import {
  PLAY_STORE_URL,
  buildAndroidIntentUrl,
  isAndroidWeb,
  isIOSWeb,
} from "@/lib/platform";
import { trackGateEvent } from "@/lib/gate-analytics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Platform gate: currently disabled — all app routes render on the web.
 * Kept as a wrapper so we can re-enable platform-specific gating later
 * without touching the route tree.
 */
const WebAppGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();
  // Gate disabled: allow all app routes to render on the web.
  const allowed = true;

  const android = !isNative && !allowed && isAndroidWeb();
  const ios = !isNative && !allowed && isIOSWeb();

  const [attemptedDeepLink, setAttemptedDeepLink] = useState(false);
  const [revealGate, setRevealGate] = useState(false);

  // iOS waitlist state
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  // Android: try the intent:// once per route.
  useEffect(() => {
    if (!android || attemptedDeepLink) return;
    setAttemptedDeepLink(true);

    const fullPath = location.pathname + location.search + location.hash;
    const intentUrl = buildAndroidIntentUrl(fullPath);

    trackGateEvent("deep_link_attempt", { path: fullPath, platform: "android" });

    try {
      window.location.href = intentUrl;
    } catch {
      /* ignore */
    }

    const timer = window.setTimeout(() => setRevealGate(true), 1500);
    return () => window.clearTimeout(timer);
  }, [android, attemptedDeepLink, location.pathname, location.search, location.hash]);

  // Fire a gate impression once we actually show the gate.
  const willShowGate =
    !isNative && !allowed && (ios || (android && revealGate) || (!android && !ios));

  useEffect(() => {
    if (!willShowGate) return;
    trackGateEvent("gate_impression", {
      path: location.pathname,
      platform: ios ? "ios" : android ? "android" : "other",
    });
  }, [willShowGate, ios, android, location.pathname]);

  if (isNative || allowed) {
    return <>{children}</>;
  }

  // Android: stay quiet during the deep-link attempt so we don't flash
  // the gate before the OS chooser appears.
  if (android && !revealGate) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  const handlePlayStoreClick = () => {
    trackGateEvent("play_store_click", {
      path: location.pathname,
      platform: android ? "android" : "other",
    });
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = waitlistEmail.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setWaitlistSubmitting(true);
    try {
      const { error } = await supabase.from("ios_waitlist").insert({
        email,
        name: waitlistName.trim() || null,
        user_agent: navigator.userAgent,
      });
      if (error && error.code !== "23505") {
        // 23505 = unique violation; treat as already-joined success
        throw error;
      }
      trackGateEvent("ios_waitlist_join", { path: location.pathname, platform: "ios" });
      setWaitlistJoined(true);
      toast.success("You're on the list! We'll email you at launch.");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't join the waitlist. Try again.");
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background px-6 py-10">
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          border: "2px solid rgba(255,255,255,0.04)",
          background: "linear-gradient(180deg, #0e1014 0%, #0a0c0f 100%)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)",
            boxShadow: "0 10px 30px hsl(var(--primary) / 0.35)",
          }}
        >
          {ios ? (
            <Apple className="h-8 w-8 text-primary-foreground" />
          ) : (
            <Smartphone className="h-8 w-8 text-primary-foreground" />
          )}
        </div>

        {ios ? (
          <>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              iOS app coming soon
            </h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              AuroPay for iPhone is on the way. Drop your email and we'll
              ping you the moment it's live on the App Store.
            </p>

            {waitlistJoined ? (
              <div
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold"
                style={{
                  background: "hsl(var(--primary) / 0.12)",
                  color: "hsl(var(--primary))",
                  border: "1px solid hsl(var(--primary) / 0.35)",
                }}
              >
                <Check className="h-4 w-4" />
                You're on the waitlist
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-2.5 text-left">
                <input
                  type="text"
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                  placeholder="Your name (optional)"
                  autoComplete="name"
                  className="w-full rounded-xl bg-muted/30 border border-border/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary/60 transition-colors"
                />
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl bg-muted/30 border border-border/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary/60 transition-colors"
                />
                <button
                  type="submit"
                  disabled={waitlistSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
                  style={{ boxShadow: "0 10px 30px hsl(var(--primary) / 0.3)" }}
                >
                  {waitlistSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Joining…
                    </>
                  ) : (
                    <>
                      <Apple className="h-4 w-4" />
                      Notify me at launch
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              AuroPay is mobile-only
            </h1>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              For your security, the AuroPay app runs only on Android.
              Download it from the Play Store to access your wallet, payments,
              and rewards.
            </p>

            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handlePlayStoreClick}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              style={{ boxShadow: "0 10px 30px hsl(var(--primary) / 0.3)" }}
            >
              <Download className="h-4 w-4" />
              Download on Google Play
            </a>
          </>
        )}

        <Link
          to="/"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to website
        </Link>
      </div>
    </div>
  );
};

export default WebAppGate;
