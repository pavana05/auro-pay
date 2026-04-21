/**
 * Platform detection helpers used by web-only gating + Get-the-app banner.
 * Native (Capacitor) callers should branch on Capacitor.isNativePlatform()
 * BEFORE calling these — these are for web-browser UA sniffing only.
 */

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.lovable.cbd25e4a769a42d6835afcaa159bbcc4";

export const ANDROID_PACKAGE = "app.lovable.cbd25e4a769a42d6835afcaa159bbcc4";

export function getUA(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

export function isAndroidWeb(): boolean {
  return /Android/i.test(getUA());
}

export function isIOSWeb(): boolean {
  const ua = getUA();
  // iPad on iPadOS 13+ reports as Mac; detect via touch points.
  const iPadOS =
    /Macintosh/i.test(ua) &&
    typeof navigator !== "undefined" &&
    (navigator as any).maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || iPadOS;
}

export function isMobileWeb(): boolean {
  return isAndroidWeb() || isIOSWeb();
}

/**
 * Build an Android intent:// URL that opens the installed app at the given
 * in-app path, or falls back to the Play Store if the app is missing.
 *
 * The fragment encodes:
 *   - scheme=https        -> the URL the app's deep-link filter matches
 *   - package=<id>        -> the target app package
 *   - S.browser_fallback_url=<encoded Play Store URL>
 *
 * The host/path after intent:// must match an Android App Link the app
 * accepts. We use the published web origin so Android's verified-link
 * routing kicks in if the user has the app.
 */
export function buildAndroidIntentUrl(path: string): string {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const host = "auro-pay.lovable.app";
  const fallback = encodeURIComponent(PLAY_STORE_URL);
  return `intent://${host}${safePath}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}
