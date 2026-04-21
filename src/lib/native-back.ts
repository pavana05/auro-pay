// useNativeBack — wires the Android hardware back button to either a
// component-scoped handler (e.g. close a Sheet/Dialog/Drawer) or the
// route-level useSafeBack fallback.
//
// Usage in a modal/sheet:
//   useNativeBack(open, () => setOpen(false));
//
// Usage in a page (lets the OS back gesture mirror the in-app back button):
//   useNativePageBack();   // walks history or falls back via useSafeBack
//
// Listeners are stacked LIFO by Capacitor (most recently registered runs
// first), so a Sheet opened on top of a page closes the Sheet first, then
// a second back press pops the page. That matches native Android UX.
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useSafeBack } from "@/lib/safe-back";

const isNative = () => Capacitor.isNativePlatform();

/**
 * Wire the Android back button to a custom handler while `active` is true.
 * Pass `active=false` to detach immediately. Returns nothing.
 */
export function useNativeBack(active: boolean, handler: () => void) {
  useEffect(() => {
    if (!isNative() || !active) return;
    let removed = false;
    const sub = CapacitorApp.addListener("backButton", () => {
      handler();
    });
    return () => {
      if (removed) return;
      removed = true;
      // Capacitor v5+ returns a Promise<PluginListenerHandle>
      Promise.resolve(sub).then((h) => h.remove());
    };
  }, [active, handler]);
}

/**
 * Page-level back: walks browser history when possible, otherwise routes
 * to a sensible fallback (parent home for /parent/*, teen home elsewhere).
 * Drop into every full-screen page so the OS back gesture works correctly.
 */
export function useNativePageBack(fallback?: string) {
  const safeBack = useSafeBack(fallback);
  useNativeBack(true, safeBack);
}
