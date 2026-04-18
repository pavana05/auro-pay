import { supabase } from "@/integrations/supabase/client";

export type WaitlistRole = "teen" | "parent" | "both";

export interface JoinWaitlistInput {
  fullName: string;
  phone: string;
  email: string;
  role: WaitlistRole;
  source: string;
  city?: string | null;
}

export interface JoinWaitlistResult {
  referralCode: string | null;
}

export async function joinWaitlist(input: JoinWaitlistInput): Promise<JoinWaitlistResult> {
  const { data, error } = await supabase.functions.invoke("join-waitlist", {
    body: input,
  });

  if (error) {
    throw new Error(error.message || "Couldn't join right now. Please try again.");
  }

  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }

  return {
    referralCode: (data as { referral_code?: string | null } | null)?.referral_code ?? null,
  };
}
