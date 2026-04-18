import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { z } from "https://esm.sh/zod@3.24.1";

const bodySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^\d{10}$/),
  email: z.string().trim().email().max(255),
  role: z.enum(["teen", "parent", "both"]),
  source: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(120).nullable().optional(),
  referralCode: z.string().trim().regex(/^AURO-[A-Z]{3}-\d{4}$/).nullable().optional(),
});

type JoinWaitlistResponse = {
  ok: boolean;
  referral_code?: string | null;
  error?: string;
};

const json = (body: JoinWaitlistResponse) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let requestBody: unknown;

    try {
      requestBody = await req.json();
    } catch {
      return json({ ok: false, error: "Please enter valid waitlist details." });
    }

    const parsed = bodySchema.safeParse(requestBody);
    if (!parsed.success) {
      return json({ ok: false, error: "Please enter valid waitlist details." });
    }

    const { fullName, phone, email, role, source, city, referralCode } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let referredBy: string | null = null;

    if (referralCode) {
      const { data: refRow } = await admin
        .from("waitlist")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();
      referredBy = refRow?.id ?? null;
    }

    const { data, error } = await admin
      .from("waitlist")
      .insert({
        full_name: fullName,
        phone: `+91${phone}`,
        email: email.toLowerCase(),
        city: city ?? null,
        role,
        source,
        referred_by: referredBy,
      })
      .select("referral_code")
      .single();

    if (error) {
      console.error("join-waitlist insert error", error);

      const message = error.code === "23505" || error.message.includes("waitlist_email_lower_idx")
        ? "You're already on the list!"
        : "Couldn't join right now. Please try again.";

      return json({ ok: false, error: message });
    }

    return json({ ok: true, referral_code: data?.referral_code ?? null });
  } catch (error) {
    console.error("join-waitlist error", error);
    return json({ ok: false, error: "Couldn't join right now. Please try again." });
  }
});