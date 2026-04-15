import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const isNative = () => typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();

export const haptic = {
  light: async () => {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else {
      navigator.vibrate?.(5);
    }
  },
  medium: async () => {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
      navigator.vibrate?.(15);
    }
  },
  heavy: async () => {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else {
      navigator.vibrate?.(30);
    }
  },
  success: async () => {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      navigator.vibrate?.([10, 50, 20]);
    }
  },
  error: async () => {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Error });
    } else {
      navigator.vibrate?.([50, 30, 50, 30, 50]);
    }
  },
  warning: async () => {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Warning });
    } else {
      navigator.vibrate?.([30, 20, 30]);
    }
  },
  selection: async () => {
    if (isNative()) {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } else {
      navigator.vibrate?.(3);
    }
  },
};
