/**
 * Cross-platform permission requests.
 * Uses Capacitor plugins on native, Web APIs on browser.
 * Each request resolves to "granted" | "denied" | "unsupported".
 */
import { Capacitor } from "@capacitor/core";

export type PermStatus = "granted" | "denied" | "unsupported";
export type PermKind = "location" | "contacts" | "notifications" | "camera";

const native = () => Capacitor.isNativePlatform();

/* -------------------- LOCATION -------------------- */
export async function requestLocation(): Promise<PermStatus> {
  try {
    if (native()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const res = await Geolocation.requestPermissions();
      return res.location === "granted" || res.location === "prompt-with-rationale"
        ? "granted"
        : "denied";
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
    return await new Promise<PermStatus>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve("granted"),
        (err) => resolve(err.code === 1 ? "denied" : "denied"),
        { timeout: 10000, maximumAge: 60000 }
      );
    });
  } catch {
    return "denied";
  }
}

/* -------------------- CONTACTS -------------------- */
export async function requestContacts(): Promise<PermStatus> {
  try {
    if (native()) {
      const mod: any = await import("@capacitor-community/contacts");
      const Contacts = mod.Contacts;
      const res = await Contacts.requestPermissions();
      return res?.contacts === "granted" ? "granted" : "denied";
    }
    // Web has no general Contacts permission. Try Contact Picker as a hint.
    if (typeof navigator !== "undefined" && (navigator as any).contacts?.select) {
      return "granted"; // user can pick on demand; treat as available
    }
    return "unsupported";
  } catch {
    return "denied";
  }
}

/* -------------------- NOTIFICATIONS -------------------- */
export async function requestNotifications(): Promise<PermStatus> {
  try {
    if (native()) {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const res = await PushNotifications.requestPermissions();
      return res.receive === "granted" ? "granted" : "denied";
    }
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    const res = await Notification.requestPermission();
    return res === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

/* -------------------- CAMERA -------------------- */
export async function requestCamera(): Promise<PermStatus> {
  try {
    if (native()) {
      const { Camera } = await import("@capacitor/camera");
      const res = await Camera.requestPermissions({ permissions: ["camera"] });
      return res.camera === "granted" ? "granted" : "denied";
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

export const REQUESTERS: Record<PermKind, () => Promise<PermStatus>> = {
  location: requestLocation,
  contacts: requestContacts,
  notifications: requestNotifications,
  camera: requestCamera,
};
