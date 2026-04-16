// Digio eKYC — webhook / callback handler
// Receives status updates from Digio (or, in mock mode, a manual GET) and
// flips the matching kyc_requests row + profiles.kyc_status when verified.
//
// Configure this URL in the Digio dashboard as the callback webhook:
//   https://<project-ref>.supabase.co/functions/v1/digio-kyc-webhook

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const isMock = url.searchParams.get("mock") === "1";

    let payload: Record<string, unknown> = {};
    if (req.method === "POST") {
      payload = await req.json().catch(() => ({}));
    } else {
      // GET — used by mock redirect
      url.searchParams.forEach((v, k) => (payload[k] = v));
    }

    // Digio webhook shape: { entity: "kyc_request", payload: { id, status, ... } }
    const inner = (payload.payload as Record<string, unknown>) ?? payload;
    const digioRequestId = (inner.id ?? inner.request_id ?? inner.kid) as string | undefined;
    const rawStatus = (inner.status ?? inner.kyc_status ?? "") as string;

    if (!digioRequestId) {
      return json({ error: "Missing request id" }, 400);
    }

    const verified =
      ["success", "approved", "verified", "completed"].includes(rawStatus.toLowerCase());

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find the matching KYC row (created by digio-kyc-request)
    const { data: kycRow, error: findErr } = await supabase
      .from("kyc_requests")
      .select("id, user_id")
      .eq("digio_request_id", digioRequestId)
      .maybeSingle();

    if (findErr || !kycRow) {
      console.error("KYC row not found for", digioRequestId, findErr);
      return json({ error: "KYC request not found" }, 404);
    }

    const newStatus = verified ? "verified" : "failed";

    await supabase
      .from("kyc_requests")
      .update({
        status: newStatus,
        verified_at: verified ? new Date().toISOString() : null,
      })
      .eq("id", kycRow.id);

    if (verified) {
      await supabase
        .from("profiles")
        .update({ kyc_status: "verified", aadhaar_verified: true })
        .eq("id", kycRow.user_id);

      await supabase.from("notifications").insert({
        user_id: kycRow.user_id,
        title: "✅ KYC Verified",
        body: "Your Aadhaar KYC has been verified successfully.",
        type: "kyc",
      });
    }

    // For the mock GET redirect, send the user back to the app
    if (isMock && req.method === "GET") {
      return new Response(null, {
        status: 302,
        headers: { Location: "/personal-info?kyc=success" },
      });
    }

    return json({ success: true, status: newStatus, mock: isMock });
  } catch (err) {
    console.error("digio-kyc-webhook error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
