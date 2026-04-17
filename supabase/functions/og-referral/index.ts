// Dynamic Open Graph image for referral shares.
// Usage: https://<project>.functions.supabase.co/og-referral?ref=AURO-XXX-1234
// Returns a 1200x630 PNG with the referrer's name baked in.
// Cached in Supabase Storage (og-cache bucket) keyed by referral code —
// repeat hits are served via 302 redirect to the CDN URL (~50ms).
// Append ?refresh=1 to force re-render and overwrite the cache.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2?bundle";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const WASM_URL = "https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm";
const BUCKET = "og-cache";

let wasmReady: Promise<void> | null = null;
function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const res = await fetch(WASM_URL);
      const buf = await res.arrayBuffer();
      await initWasm(buf);
    })();
  }
  return wasmReady;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!)
  );
}

function buildSvg(name: string) {
  const safeName = escapeXml(name);
  const headline = `${safeName} invited you to AuroPay`;
  const sub = "Claim your ₹100 sign-up bonus";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050507"/>
      <stop offset="100%" stop-color="#0f0c08"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#c8952e" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="#c8952e" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#c8952e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#c8952e"/>
      <stop offset="50%" stop-color="#e0b048"/>
      <stop offset="100%" stop-color="#a37820"/>
    </linearGradient>
    <linearGradient id="goldSoft" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e0b048"/>
      <stop offset="100%" stop-color="#8a6520"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <g fill="#c8952e" opacity="0.55">
    <circle cx="120" cy="110" r="3"/>
    <circle cx="980" cy="160" r="4"/>
    <circle cx="1080" cy="480" r="3"/>
    <circle cx="200" cy="520" r="2.5"/>
    <circle cx="700" cy="80" r="2"/>
    <circle cx="60" cy="340" r="2"/>
    <circle cx="1130" cy="300" r="2.5"/>
    <circle cx="520" cy="560" r="2"/>
  </g>

  <g transform="translate(80, 110)">
    <rect width="72" height="72" rx="18" fill="url(#goldSoft)"/>
    <text x="36" y="51" font-family="Georgia, serif" font-size="42" font-weight="700"
          fill="#1a1208" text-anchor="middle">A</text>
  </g>

  <text x="80" y="270" font-family="Georgia, 'Times New Roman', serif"
        font-size="84" font-weight="700" fill="url(#gold)">AuroPay</text>

  <text x="80" y="370" font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="44" font-weight="700" fill="#ffffff">${escapeXml(headline)}</text>

  <text x="80" y="430" font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="32" font-weight="500" fill="#c8952e">${escapeXml(sub)}</text>

  <g transform="translate(80, 480)">
    <rect width="280" height="64" rx="32" fill="url(#gold)"/>
    <text x="140" y="42" font-family="'Helvetica Neue', Arial, sans-serif"
          font-size="22" font-weight="700" fill="#1a1208" text-anchor="middle">Get Early Access →</text>
  </g>

  <text x="80" y="595" font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="18" fill="#ffffff" opacity="0.45">auro-pay.lovable.app · India's first scan-and-pay app for teens</text>
</svg>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ref = (url.searchParams.get("ref") ?? "").trim().toUpperCase();
    const forceRefresh = url.searchParams.get("refresh") === "1";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const isValidRef = /^AURO-[A-Z]{3}-\d{4}$/.test(ref);
    const cacheKey = isValidRef ? `${ref}.png` : "_default.png";
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${cacheKey}`;

    // ---- 1. CACHE HIT: redirect to CDN ----
    if (!forceRefresh) {
      const head = await fetch(publicUrl, { method: "HEAD" });
      if (head.ok) {
        return Response.redirect(publicUrl, 302);
      }
    }

    // ---- 2. CACHE MISS: render ----
    let displayName = "Someone";
    if (isValidRef) {
      const { data } = await supabase
        .from("waitlist")
        .select("full_name")
        .eq("referral_code", ref)
        .maybeSingle();
      if (data?.full_name) {
        displayName = data.full_name.split(" ")[0].slice(0, 18);
      }
    }

    const svg = buildSvg(displayName);
    await ensureWasm();
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
    const png = resvg.render().asPng();

    // ---- 3. WRITE-THROUGH to storage (best-effort) ----
    try {
      await supabase.storage.from(BUCKET).upload(cacheKey, png, {
        contentType: "image/png",
        cacheControl: "31536000", // 1 year
        upsert: true,
      });
    } catch (cacheErr) {
      console.error("og-referral cache write failed:", cacheErr);
      // Non-fatal — still return the PNG to the caller
    }

    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    console.error("og-referral error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
