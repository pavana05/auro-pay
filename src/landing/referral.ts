import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "auropay_ref_code";

/** Read ?ref=AURO-XXX-1234 from URL, persist to localStorage, return code. */
export function captureReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("ref");
    if (fromUrl && /^AURO-[A-Z]{3}-\d{4}$/i.test(fromUrl.trim())) {
      const code = fromUrl.trim().toUpperCase();
      localStorage.setItem(STORAGE_KEY, code);
      return code;
    }
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Look up the referrer's waitlist UUID by their referral code. */
export async function getReferrerId(): Promise<string | null> {
  const code = captureReferralCode();
  if (!code) return null;
  const { data } = await supabase
    .from("waitlist")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();
  return data?.id ?? null;
}
