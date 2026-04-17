/**
 * Biometric helper using @aparajita/capacitor-biometric-auth.
 * Safely no-ops on web (preview) where there's no native runtime.
 */
import { Capacitor } from "@capacitor/core";

const STORAGE_KEY = "auropay_biometric_enabled";

let pluginPromise: Promise<any> | null = null;
async function getPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!pluginPromise) {
    pluginPromise = import("@aparajita/capacitor-biometric-auth")
      .then((m) => (m as any).BiometricAuth)
      .catch(() => null);
  }
  return pluginPromise;
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const plugin = await getPlugin();
    if (!plugin) return false;
    const info = await plugin.checkBiometry();
    return Boolean(info?.isAvailable);
  } catch {
    return false;
  }
}

export async function authenticateBiometric(reason = "Unlock AuroPay"): Promise<boolean> {
  try {
    const plugin = await getPlugin();
    if (!plugin) return false;
    await plugin.authenticate({
      reason,
      cancelTitle: "Use PIN",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use Passcode",
      androidTitle: "AuroPay",
      androidSubtitle: reason,
    });
    return true;
  } catch {
    return false;
  }
}

export function isBiometricEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setBiometricEnabled(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasReturningSession(): boolean {
  // Heuristic: a previous successful sign-in stamped this flag
  try {
    return localStorage.getItem("auropay_last_user") !== null;
  } catch {
    return false;
  }
}

export function markReturningSession(userId: string) {
  try { localStorage.setItem("auropay_last_user", userId); } catch {}
}
