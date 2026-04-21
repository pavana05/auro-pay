import { useLocation, Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Download, Smartphone, ArrowLeft } from "lucide-react";

/**
 * Platform gate: app content (everything except landing, landing-help,
 * admin/*, and reset-password) is only allowed inside the native Android
 * app. On the web we render a "Download the App" screen instead.
 *
 * Admin routes remain accessible on web because admins manage from desktop.
 */
const ALLOWED_WEB_PREFIXES = ["/admin", "/landing-help", "/reset-password"];
const ALLOWED_WEB_EXACT = new Set<string>(["/", "/landing-help"]);

function isAllowedOnWeb(pathname: string): boolean {
  if (ALLOWED_WEB_EXACT.has(pathname)) return true;
  return ALLOWED_WEB_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.lovable.cbd25e4a769a42d6835afcaa159bbcc4";

const WebAppGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();

  if (isNative || isAllowedOnWeb(location.pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background px-6">
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
          <Smartphone className="h-8 w-8 text-primary-foreground" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-2">
          AuroPay is mobile-only
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          For your security, the AuroPay app runs only on Android. Download it
          from the Play Store to access your wallet, payments, and rewards.
        </p>

        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          style={{ boxShadow: "0 10px 30px hsl(var(--primary) / 0.3)" }}
        >
          <Download className="h-4 w-4" />
          Download on Google Play
        </a>

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
