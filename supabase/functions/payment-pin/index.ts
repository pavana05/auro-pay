// Set or verify the user's 4-digit payment PIN.
// Routes:
//   POST { action: "set",    pin: "1234" }                     -> stores hash
//   POST { action: "verify", pin: "1234" }                     -> { valid: boolean }
//   POST { action: "status" }                                  -> { is_set: boolean }
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
