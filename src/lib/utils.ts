import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export the real native-aware haptic so any older imports from
// `@/lib/utils` get the correct implementation instead of a web-only stub.
export { haptic } from "@/lib/haptics";

