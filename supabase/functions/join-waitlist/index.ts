import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Please enter valid waitlist details." }, 400);
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
      const message = error.code === "23505" || error.message.includes("waitlist_email_lower_idx")
        ? "You're already on the list!"
        : "Couldn't join right now. Please try again.";
      return json({ error: message }, error.code === "23505" ? 409 : 500);
    }

    return json({ success: true, referral_code: data?.referral_code ?? null });
  } catch (error) {
    console.error("join-waitlist error", error);
    return json({ error: "Couldn't join right now. Please try again." }, 500);
  }
});
