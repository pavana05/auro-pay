import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase.functions.invoke<JoinWaitlistResponse>("join-waitlist", {
    body: input,
  });

  if (error) {
    throw new Error(error.message || "Couldn't join right now. Please try again.");
  }

  if (!data?.ok) {
    throw new Error(data?.error || "Couldn't join right now. Please try again.");
  }

  return {
    referralCode: data.referral_code ?? null,
  };
}
