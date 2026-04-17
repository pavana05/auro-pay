import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapApp, type URLOpenListenerEvent } from "@capacitor/app";

/**
 * Listens for native deep links (auropay:// or https://auro-pay.lovable.app/...)
 * and routes the user to the matching internal path via React Router.
 *
 * Examples handled:
 *   auropay://home              → /home
 *   auropay://transaction/abc   → /transaction/abc
 *   https://auro-pay.lovable.app/rewards → /rewards
 */
const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const handle = await CapApp.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
        try {
          const url = new URL(event.url);
          // For auropay://path the "host" is the first segment, pathname is the rest.
          // For https URLs we just use the pathname.
          const isCustomScheme = url.protocol === "auropay:";
          const path = isCustomScheme
            ? `/${[url.host, url.pathname.replace(/^\/+/, "")].filter(Boolean).join("/")}`
            : url.pathname;

          // Special-case the KYC callback so the gate can replay its success animation.
          // We dispatch a window event regardless of which screen the user is on.
          if (/^\/kyc\/callback\/?$/.test(path)) {
            window.dispatchEvent(new CustomEvent("auropay:kyc-callback", { detail: { url: event.url } }));
            return;
          }

          if (path && path !== "/") {
            navigate(path + url.search, { replace: false });
          }
        } catch {
          /* malformed URL — ignore */
        }
      });
      cleanup = () => handle.remove();
    };

    setup();
    return () => { cleanup?.(); };
  }, [navigate]);

  return null;
};

export default DeepLinkHandler;
