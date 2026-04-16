import { supabase } from "@/integrations/supabase/client";

export type StartKycInput = {
  aadhaar_name?: string;
  date_of_birth?: string; // ISO yyyy-mm-dd
};

export type StartKycResult = {
  success: boolean;
  mock: boolean;
  digio_request_id: string;
  redirect_url: string;
};

/**
 * Kicks off the Digio Aadhaar eKYC flow for the current user.
 * Returns the redirect URL to open (Digio hosted page in production,
 * or our mock webhook in dev mode).
 */
export async function startKyc(input: StartKycInput = {}): Promise<StartKycResult> {
  const { data, error } = await supabase.functions.invoke("digio-kyc-request", {
    body: input,
  });
  if (error) throw error;
  return data as StartKycResult;
}
