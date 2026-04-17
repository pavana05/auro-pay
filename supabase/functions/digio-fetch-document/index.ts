// Digio document fetch — admin-only
// Returns the Aadhaar document image (base64 data URL) for a KYC request.
// In MOCK mode, returns a generated placeholder card so admins still get
// a real preview during development.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIGIO_BASE = "https://api.digio.in";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    // Admin gate via has_role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { kyc_request_id } = body as { kyc_request_id?: string };
    if (!kyc_request_id) return json({ error: "kyc_request_id required" }, 400);

    const { data: kyc, error: kycErr } = await supabase
      .from("kyc_requests")
      .select("digio_request_id, aadhaar_name, aadhaar_number, date_of_birth")
      .eq("id", kyc_request_id)
      .maybeSingle();
    if (kycErr || !kyc) return json({ error: "KYC request not found" }, 404);
    if (!kyc.digio_request_id) return json({ error: "No Digio request linked" }, 422);

    const DIGIO_CLIENT_ID = Deno.env.get("DIGIO_CLIENT_ID");
    const DIGIO_CLIENT_SECRET = Deno.env.get("DIGIO_CLIENT_SECRET");
    const isMock = !DIGIO_CLIENT_ID || !DIGIO_CLIENT_SECRET || kyc.digio_request_id.startsWith("MOCK-");

    if (isMock) {
      // Generate an SVG placeholder Aadhaar card so admins see a real preview
      const masked = kyc.aadhaar_number ? `XXXX XXXX ${kyc.aadhaar_number.slice(-4)}` : "XXXX XXXX XXXX";
      const svg = mockAadhaarSvg(kyc.aadhaar_name || "—", masked, kyc.date_of_birth || "—");
      const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
      return json({ success: true, mock: true, image_url: dataUrl });
    }

    // Real Digio fetch — endpoint returns base64 PDF/image of submitted document
    const auth = btoa(`${DIGIO_CLIENT_ID}:${DIGIO_CLIENT_SECRET}`);
    const res = await fetch(`${DIGIO_BASE}/v3/client/kyc/document/${kyc.digio_request_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Digio document fetch failed", res.status, detail);
      return json({ error: "Digio document fetch failed", status: res.status }, 502);
    }

    const dj = await res.json();
    // Digio shape varies — try common fields
    const b64 = dj.document_data || dj.image || dj.data;
    const mime = dj.content_type || "image/jpeg";
    if (!b64) return json({ error: "No document data in response" }, 502);

    return json({ success: true, mock: false, image_url: `data:${mime};base64,${b64}` });
  } catch (err) {
    console.error("digio-fetch-document error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mockAadhaarSvg(name: string, aadhaar: string, dob: string): string {
  const safeName = name.replace(/[<>&]/g, "").slice(0, 30);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#fde68a"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" rx="16" fill="url(#bg)"/>
  <rect x="16" y="16" width="608" height="60" rx="8" fill="#dc2626"/>
  <text x="32" y="55" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#fff">भारत सरकार · GOVERNMENT OF INDIA</text>
  <text x="32" y="120" font-family="Arial, sans-serif" font-size="14" fill="#78350f">Unique Identification Authority of India</text>
  <rect x="32" y="150" width="120" height="150" rx="8" fill="#fff" stroke="#92400e" stroke-width="2"/>
  <text x="92" y="230" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#d4d4d4">👤</text>
  <text x="180" y="170" font-family="Arial, sans-serif" font-size="11" fill="#78350f">Name / नाम</text>
  <text x="180" y="195" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#1f2937">${safeName}</text>
  <text x="180" y="230" font-family="Arial, sans-serif" font-size="11" fill="#78350f">DOB / जन्म तिथि</text>
  <text x="180" y="252" font-family="Arial, sans-serif" font-size="16" fill="#1f2937">${dob}</text>
  <text x="32" y="345" font-family="Arial, sans-serif" font-size="11" fill="#78350f">Aadhaar Number / आधार संख्या</text>
  <text x="32" y="378" font-family="'Courier New', monospace" font-size="28" font-weight="bold" letter-spacing="4" fill="#1f2937">${aadhaar}</text>
  <text x="608" y="378" text-anchor="end" font-family="Arial, sans-serif" font-size="9" fill="#dc2626" font-weight="bold">MOCK · DEV PREVIEW</text>
</svg>`;
}
