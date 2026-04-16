// Digio eKYC — request endpoint
// Creates a KYC request row and returns a redirect URL the user opens to
// complete Aadhaar verification on Digio's hosted flow.
//
// MOCK MODE: If DIGIO_CLIENT_ID / DIGIO_CLIENT_SECRET are not set, the function
// returns a mock redirect URL and immediately marks the request as "pending"
// (auto-approval can be triggered by calling the webhook with the returned id).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Digio production endpoint (sandbox: https://ext.digio.in:444)
const DIGIO_BASE = "https://api.digio.in";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const { aadhaar_name, date_of_birth } = body as {
      aadhaar_name?: string;
      date_of_birth?: string;
    };

    const DIGIO_CLIENT_ID = Deno.env.get("DIGIO_CLIENT_ID");
    const DIGIO_CLIENT_SECRET = Deno.env.get("DIGIO_CLIENT_SECRET");
    const isMock = !DIGIO_CLIENT_ID || !DIGIO_CLIENT_SECRET;

    let digioRequestId: string;
    let redirectUrl: string;

    if (isMock) {
      // ── MOCK FLOW ──────────────────────────────────────────────────────────
      digioRequestId = `MOCK-${crypto.randomUUID()}`;
      // In mock mode, expose a URL that triggers our own webhook for easy testing
      const projectRef = Deno.env.get("SUPABASE_URL")!
        .replace("https://", "")
        .split(".")[0];
      redirectUrl =
        `https://${projectRef}.supabase.co/functions/v1/digio-kyc-webhook` +
        `?mock=1&request_id=${digioRequestId}&status=success`;
    } else {
      // ── REAL DIGIO FLOW ────────────────────────────────────────────────────
      const auth = btoa(`${DIGIO_CLIENT_ID}:${DIGIO_CLIENT_SECRET}`);
      const digioRes = await fetch(`${DIGIO_BASE}/v3/client/kyc/aadhaar/request`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_identifier: user.email || user.phone || user.id,
          customer_name: aadhaar_name || "",
          reference_id: user.id,
          notify_customer: false,
          generate_access_token: true,
        }),
      });
      const digioJson = await digioRes.json();
      if (!digioRes.ok) {
        console.error("Digio request failed", digioJson);
        return json({ error: "Digio request failed", details: digioJson }, 502);
      }
      digioRequestId = digioJson.id ?? digioJson.kid;
      redirectUrl = digioJson.access_token?.url ?? digioJson.url;
    }

    // Persist the request — RLS lets the user read their own row
    const { error: insertErr } = await supabase.from("kyc_requests").insert({
      user_id: user.id,
      aadhaar_name: aadhaar_name ?? null,
      date_of_birth: date_of_birth ?? null,
      digio_request_id: digioRequestId,
      status: "pending",
    });
    if (insertErr) console.error("kyc_requests insert error", insertErr);

    return json({
      success: true,
      mock: isMock,
      digio_request_id: digioRequestId,
      redirect_url: redirectUrl,
    });
  } catch (err) {
    console.error("digio-kyc-request error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
