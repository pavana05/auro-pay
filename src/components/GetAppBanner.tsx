import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { X, Download } from "lucide-react";
import { PLAY_STORE_URL, isAndroidWeb, isIOSWeb } from "@/lib/platform";

const DISMISS_KEY = "auropay_get_app_banner_dismissed";

/**
 * Slim sticky banner shown on top of the landing page for mobile-web
 * visitors, funneling them into the Android app (or signaling "coming soon"
 * on iOS). Dismissal is persisted in localStorage so we don't nag.
 *
 * Hidden entirely inside Capacitor and on desktop.
 */
const GetAppBanner = () => {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    const dismissed = (() => {
      try {
        return localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        return false;
      }
    })();
    if (dismissed) return;

    const onAndroid = isAndroidWeb();
    const onIOS = isIOSWeb();
    if (!onAndroid && !onIOS) return;

    setIos(onIOS);
    setVisible(true);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="sticky top-0 z-[60] w-full"
      style={{
        background: "linear-gradient(180deg, #0e1014 0%, #0a0c0f 100%)",
        borderBottom: "1px solid rgba(200,149,46,0.18)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
      }}
      role="region"
      aria-label="Get the AuroPay app"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)",
            boxShadow: "0 6px 16px hsl(var(--primary) / 0.3)",
          }}
        >
          <Download className="h-4 w-4 text-primary-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">
            Get the AuroPay app
          </p>
          <p className="truncate text-[11px] text-white/60">
            {ios ? "iOS coming soon — Android available now" : "Faster, secure scan-and-pay on your phone"}
          </p>
        </div>

        {ios ? (
          <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70">
            Coming soon
          </span>
        ) : (
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            style={{ boxShadow: "0 6px 16px hsl(var(--primary) / 0.3)" }}
          >
            Install
          </a>
        )}

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default GetAppBanner;
