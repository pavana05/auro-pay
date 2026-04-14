// Haptic feedback utility for native-feel interactions
export const haptic = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(25),
  heavy: () => navigator.vibrate?.(50),
  success: () => navigator.vibrate?.([10, 50, 20]),
  error: () => navigator.vibrate?.([50, 30, 50, 30, 50]),
  tap: () => navigator.vibrate?.(5),
};

// Format currency from paise to rupees
export const formatRupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Format date to IST
export const formatIST = (date: string | Date, opts?: Intl.DateTimeFormatOptions) =>
  new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...opts });

// Relative time (e.g. "2 min ago")
export const timeAgo = (date: string | Date): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
