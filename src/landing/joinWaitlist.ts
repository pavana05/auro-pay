const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type WaitlistRole = "teen" | "parent" | "both";

export interface JoinWaitlistInput {
  fullName: string;
  phone: string;
  email: string;
  role: WaitlistRole;
  source: string;
  city?: string | null;
  referralCode?: string | null;
}

export interface JoinWaitlistResult {
  referralCode: string | null;
}

interface JoinWaitlistResponse {
  ok?: boolean;
  error?: string;
  referral_code?: string | null;
}

export async function joinWaitlist(input: JoinWaitlistInput): Promise<JoinWaitlistResult> {
  const url = `${SUPABASE_URL}/functions/v1/join-waitlist`;

  // 25s timeout so the user never gets stuck on "Securing your spot…"
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 25_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
  } catch (err) {
    window.clearTimeout(timeoutId);
    if ((err as Error)?.name === "AbortError") {
      throw new Error("This is taking too long. Please try again in a moment.");
    }
    throw new Error("Network error. Please check your connection and try again.");
  }
  window.clearTimeout(timeoutId);

  let data: JoinWaitlistResponse | null = null;
  try {
    data = (await res.json()) as JoinWaitlistResponse;
  } catch {
    throw new Error("Couldn't join right now. Please try again.");
  }

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Couldn't join right now. Please try again.");
  }

  return { referralCode: data.referral_code ?? null };
}
