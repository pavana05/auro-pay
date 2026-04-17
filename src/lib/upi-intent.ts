// UPI deep-link helper for Android (Capacitor)
// Fires intent:// URLs to open GPay/PhonePe/Paytm/BHIM directly.
// Falls back to Razorpay if the requested app isn't installed.
import { Capacitor } from "@capacitor/core";

export interface UpiIntentParams {
  /** Receiver UPI VPA, e.g. "merchant@upi" */
  pa: string;
  /** Receiver name */
  pn: string;
  /** Amount in rupees */
  am: number;
  /** Optional transaction note */
  tn?: string;
  /** Optional transaction reference id */
  tr?: string;
}

const PACKAGES: Record<string, string> = {
  gpay: "com.google.android.apps.nbu.paisa.user",
  phonepe: "com.phonepe.app",
  paytm: "net.one97.paytm",
  bhim: "in.org.npci.upiapp",
};

/** Returns true when running in a Capacitor Android wrapper. */
export const isAndroidNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
};

/** Build a `upi://pay?...` URL — works as a generic UPI intent. */
export const buildUpiUrl = (p: UpiIntentParams): string => {
  const params = new URLSearchParams({
    pa: p.pa,
    pn: p.pn,
    am: p.am.toFixed(2),
    cu: "INR",
    ...(p.tn ? { tn: p.tn } : {}),
    ...(p.tr ? { tr: p.tr } : {}),
  });
  return `upi://pay?${params.toString()}`;
};

/** Build an Android `intent://` URL targeting a specific UPI app package. */
export const buildAppIntent = (appId: string, p: UpiIntentParams): string => {
  const pkg = PACKAGES[appId];
  const params = new URLSearchParams({
    pa: p.pa,
    pn: p.pn,
    am: p.am.toFixed(2),
    cu: "INR",
    ...(p.tn ? { tn: p.tn } : {}),
    ...(p.tr ? { tr: p.tr } : {}),
  });
  if (!pkg) return buildUpiUrl(p);
  return `intent://pay?${params.toString()}#Intent;scheme=upi;package=${pkg};end`;
};

/**
 * Try to open the chosen UPI app via intent://; resolve true if the app
 * appears to handle the intent, false if we believe it failed.
 *
 * On Android, when the package isn't installed, the WebView typically does
 * NOT navigate away — the page stays visible. We use a visibility/blur race
 * to detect a successful handoff.
 */
export const openUpiApp = (appId: string, p: UpiIntentParams): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!isAndroidNative()) {
      // Web fallback: try the generic upi:// URL (Android Chrome may catch it)
      window.location.href = buildUpiUrl(p);
      // We can't reliably know the result on web → assume failure so caller
      // can offer Razorpay.
      setTimeout(() => resolve(false), 1500);
      return;
    }

    const intent = buildAppIntent(appId, p);
    let handled = false;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        handled = true;
        cleanup();
        resolve(true);
      }
    };
    const onBlur = () => {
      handled = true;
      cleanup();
      resolve(true);
    };
    const cleanup = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    // Fire the intent
    try {
      window.location.href = intent;
    } catch {
      cleanup();
      resolve(false);
      return;
    }

    // If after 1.5s nothing changed, treat as not installed
    setTimeout(() => {
      if (!handled) {
        cleanup();
        resolve(false);
      }
    }, 1500);
  });
};
