// NativeShell — mounted once at the App root. Handles all Capacitor-only
// side-effects so individual pages stay platform-agnostic:
//
//   • StatusBar: dark style + brand bg, never overlays the webview
//   • Keyboard:  exposes height as CSS var --keyboard-h so inputs can
//                add padding-bottom and dodge the on-screen keyboard
//   • SafeArea:  exposes env(safe-area-inset-*) as CSS vars on <html>
//                (already provided by WebKit/Android-WebView; we just
//                normalise so the .pt-safe / .pb-safe utility classes
//                in index.css work everywhere)
//
// On the web this component is a no-op.
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

const isNative = () => Capacitor.isNativePlatform();

const NativeShell = () => {
  useEffect(() => {
    if (!isNative()) return;

    let cleanup: Array<() => void> = [];

    (async () => {
      // ── StatusBar ──────────────────────────────────────────────────
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        // setBackgroundColor is Android-only and silently rejects on iOS
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: "#0a0c0f" });
          await StatusBar.setOverlaysWebView({ overlay: false });
        }
      } catch (e) {
        console.warn("[NativeShell] StatusBar init failed", e);
      }

      // ── Keyboard ───────────────────────────────────────────────────
      try {
        const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
        // "native" resize lets the WebView shrink so the page stays scrollable.
        await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
        await Keyboard.setAccessoryBarVisible({ isVisible: false });

        const showSub = await Keyboard.addListener("keyboardWillShow", (info) => {
          document.documentElement.style.setProperty(
            "--keyboard-h",
            `${info.keyboardHeight}px`,
          );
          document.documentElement.classList.add("kb-open");
        });
        const hideSub = await Keyboard.addListener("keyboardWillHide", () => {
          document.documentElement.style.setProperty("--keyboard-h", "0px");
          document.documentElement.classList.remove("kb-open");
        });

        cleanup.push(() => showSub.remove(), () => hideSub.remove());
      } catch (e) {
        console.warn("[NativeShell] Keyboard init failed", e);
      }
    })();

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, []);

  return null;
};

export default NativeShell;
