// Set, verify, or reset the user's 4-digit payment PIN.
// Routes:
//   POST { action: "set",         pin: "1234" }                     -> stores hash
//   POST { action: "verify",      pin: "1234" }                     -> { valid: boolean }
//   POST { action: "status" }                                       -> { is_set: boolean }
//   POST { action: "request_otp" }                                  -> sends OTP to user phone
//   POST { action: "reset",       otp: "123456", pin: "1234" }      -> verifies OTP + sets new PIN
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "status") {
      const { data: profile } = await supabase.from("profiles").select("pin_hash").eq("id", user.id).single();
      return json({ is_set: !!profile?.pin_hash });
    }

    if (action === "request_otp") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("id", user.id)
        .single();

      // Generate 6-digit OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + OTP_TTL_MS;
      const payload = JSON.stringify({ otp, expiresAt });

      // Store in app_settings keyed by user
      const key = `pin_otp:${user.id}`;
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("app_settings").update({ value: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("app_settings").insert({ key, value: payload });
      }

      // Send SMS via existing send-sms function (mock-friendly)
      const message = `AuroPay PIN reset code: ${otp}. Valid for 10 minutes. Don't share this with anyone.`;
      try {
        await supabase.functions.invoke("send-sms", {
          body: { user_id: user.id, phone: profile?.phone || null, message },
        });
      } catch (smsErr) {
        console.error("[payment-pin] send-sms failed:", smsErr);
      }

      // Always return success-shape; mask phone for the UI hint
      const maskedPhone = profile?.phone
        ? profile.phone.replace(/^(\+?\d{0,3})(\d+)(\d{2})$/, (_m, a, b, c) => `${a}${"•".repeat(b.length)}${c}`)
        : null;
      return json({ success: true, masked_phone: maskedPhone, expires_in_seconds: OTP_TTL_MS / 1000 });
    }

    if (action === "reset") {
      const otp = String(body.otp || "");
      const pin = String(body.pin || "");
      if (!/^\d{6}$/.test(otp)) return json({ error: "OTP must be 6 digits" }, 400);
      if (!/^\d{4}$/.test(pin)) return json({ error: "PIN must be exactly 4 digits" }, 400);

      const key = `pin_otp:${user.id}`;
      const { data: stored } = await supabase
        .from("app_settings")
        .select("id, value")
        .eq("key", key)
        .maybeSingle();

      if (!stored?.value) return json({ error: "No reset request found. Please request a new code." }, 400);

      let parsed: { otp: string; expiresAt: number };
      try {
        parsed = JSON.parse(stored.value);
      } catch {
        return json({ error: "Invalid reset state" }, 400);
      }

      if (Date.now() > parsed.expiresAt) {
        await supabase.from("app_settings").delete().eq("id", stored.id);
        return json({ error: "OTP expired. Please request a new code." }, 400);
      }

      if (parsed.otp !== otp) return json({ error: "Invalid OTP" }, 400);

      // OTP valid → set new PIN
      const hash = await hashPin(pin, user.id);
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ pin_hash: hash, pin_set_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updErr) return json({ error: updErr.message }, 500);

      // Clear OTP
      await supabase.from("app_settings").delete().eq("id", stored.id);

      // Notify user
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "🔐 Payment PIN reset",
        body: "Your payment PIN was reset successfully. If this wasn't you, contact support immediately.",
        type: "security",
      });

      return json({ success: true });
    }

    const pin = String(body.pin || "");
    if (!/^\d{4}$/.test(pin)) return json({ error: "PIN must be exactly 4 digits" }, 400);

    if (action === "set") {
      const hash = await hashPin(pin, user.id);
      const { error } = await supabase
        .from("profiles")
        .update({ pin_hash: hash, pin_set_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "verify") {
      const { data: profile } = await supabase.from("profiles").select("pin_hash").eq("id", user.id).single();
      if (!profile?.pin_hash) return json({ valid: false, reason: "not_set" });
      const hash = await hashPin(pin, user.id);
      return json({ valid: hash === profile.pin_hash });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    return json({ error: err?.message || "Server error" }, 500);
  }
});
