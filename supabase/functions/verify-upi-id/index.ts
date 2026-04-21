// Edge Function: verify-upi-id
// Two-tier UPI lookup used by /send to show the registered name (GPay/PhonePe-style).
//
// Tier 1 (Zenzo user lookup): If a 10-digit phone or zenzo-handle UPI matches a
// registered Zenzo profile, we return the user's name + avatar.
// Tier 2 (Format check only): Validate UPI ID structure. Returns `verified:true`
// with `name:null` so the UI can show "Verified UPI ID" without inventing a name.
//
// Public network UPI→name resolution is intentionally OUT of scope (requires paid
// RazorpayX/Cashfree/Setu APIs and additional KYC). The frontend treats a
// verified-but-unnamed UPI as proceedable; the real beneficiary name is shown
// after the bank confirms the transfer.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Strict UPI VPA regex: handle@psp where handle is 2-256 chars of [a-z0-9.\-_]
// and psp is 2-64 chars of [a-z]. UPI IDs are case-insensitive — we lowercase first.
const UPI_REGEX = /^[a-z0-9._-]{2,256}@[a-z]{2,64}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { upi_id?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const upiRaw = (body.upi_id || "").trim().toLowerCase();
  const phoneRaw = (body.phone || "").replace(/\D/g, "").slice(-10);

  if (!upiRaw && !phoneRaw) {
    return json({ error: "Provide upi_id or phone" }, 400);
  }

  // Auth check — pass the caller's JWT through so the lookup happens with
  // their identity (rate-limited via the existing teen_lookup_log function).
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // ── Tier 1: Zenzo user by phone ───────────────────────────────────────────
  if (phoneRaw) {
    if (!PHONE_REGEX.test(phoneRaw)) {
      return json({ verified: false, error: "Invalid phone number" });
    }
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, phone")
      .eq("phone", phoneRaw)
      .maybeSingle();
    if (pErr) console.warn("profile lookup error", pErr.message);

    if (profile) {
      return json({
        verified: true,
        is_zenzo_user: true,
        name: profile.full_name ?? "Zenzo User",
        upi_id: `${phoneRaw}@zenzo`,
        avatar_url: profile.avatar_url,
        source: "zenzo_user",
      });
    }
    // Phone is valid format but not on Zenzo — caller will need to pick a UPI handle.
    return json({
      verified: true,
      is_zenzo_user: false,
      name: null,
      upi_id: `${phoneRaw}@upi`,
      source: "phone_format",
    });
  }

  // ── Tier 2: UPI ID format check + Zenzo handle lookup ─────────────────────
  if (!UPI_REGEX.test(upiRaw)) {
    return json({
      verified: false,
      error: "Enter a valid UPI ID (e.g. name@bank)",
    });
  }

  // If it's our own @zenzo handle, look up the owner.
  const [handle, psp] = upiRaw.split("@");
  if (psp === "zenzo" && PHONE_REGEX.test(handle)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("phone", handle)
      .maybeSingle();
    if (profile) {
      return json({
        verified: true,
        is_zenzo_user: true,
        name: profile.full_name ?? "Zenzo User",
        upi_id: upiRaw,
        avatar_url: profile.avatar_url,
        source: "zenzo_user",
      });
    }
  }

  // Generic VPA — format-valid only. Bank will resolve the name on transfer.
  return json({
    verified: true,
    is_zenzo_user: false,
    name: null,
    upi_id: upiRaw,
    source: "format_check",
  });
});
