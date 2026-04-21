/**
 * Best-effort payment location capture for the client.
 *
 * Used at payment time. Does NOT prompt the user — it relies on the
 * permission already granted on /permissions and silently times out
 * (≤ 4s) so payments are never blocked by location.
 *
 * Returned object is sent to the edge function which will reverse-geocode
 * and persist on the transaction row. If null, the edge function will
 * fall back to IP-based geolocation.
 */
import { Capacitor } from "@capacitor/core";

export interface ClientLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  captured_at: string;
}

const TIMEOUT_MS = 4000;

export async function getPaymentLocation(): Promise<ClientLocation | null> {
  try {
    // Native: use Capacitor Geolocation if available
    if (Capacitor.isNativePlatform()) {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== "granted") return null;
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: TIMEOUT_MS,
          maximumAge: 60_000,
        });
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          captured_at: new Date().toISOString(),
        };
      } catch {
        return null;
      }
    }

    // Web: navigator.geolocation
    if (typeof navigator === "undefined" || !navigator.geolocation) return null;

    return await new Promise<ClientLocation | null>((resolve) => {
      let done = false;
      const t = setTimeout(() => {
        if (!done) { done = true; resolve(null); }
      }, TIMEOUT_MS + 500);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (done) return;
          done = true;
          clearTimeout(t);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            captured_at: new Date().toISOString(),
          });
        },
        () => {
          if (done) return;
          done = true;
          clearTimeout(t);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 60_000 }
      );
    });
  } catch {
    return null;
  }
}
