import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const isNative = () => typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();

const STORAGE_KEY = "haptics_enabled";

let enabled = true;
if (typeof window !== "undefined") {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) enabled = stored === "true";
}

export const setHapticsEnabled = (value: boolean) => {
  enabled = value;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(value));
  }
};

export const getHapticsEnabled = () => enabled;

const guard = async (fn: () => Promise<void> | void) => {
  if (!enabled) return;
  await fn();
};

export const haptic = {
  light: () => guard(async () => {
    if (isNative()) await Haptics.impact({ style: ImpactStyle.Light });
    else navigator.vibrate?.(5);
  }),
  medium: () => guard(async () => {
    if (isNative()) await Haptics.impact({ style: ImpactStyle.Medium });
    else navigator.vibrate?.(15);
  }),
  heavy: () => guard(async () => {
    if (isNative()) await Haptics.impact({ style: ImpactStyle.Heavy });
    else navigator.vibrate?.(30);
  }),
  success: () => guard(async () => {
    if (isNative()) await Haptics.notification({ type: NotificationType.Success });
    else navigator.vibrate?.([10, 50, 20]);
  }),
  error: () => guard(async () => {
    if (isNative()) await Haptics.notification({ type: NotificationType.Error });
    else navigator.vibrate?.([50, 30, 50, 30, 50]);
  }),
  warning: () => guard(async () => {
    if (isNative()) await Haptics.notification({ type: NotificationType.Warning });
    else navigator.vibrate?.([30, 20, 30]);
  }),
  selection: () => guard(async () => {
    if (isNative()) {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } else {
      navigator.vibrate?.(3);
    }
  }),
};
