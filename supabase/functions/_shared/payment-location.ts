// Shared payment-location helper used by every payment edge function.
//
// Pipeline:
//   1. Use the client-supplied GPS coordinates (from /permissions consent) and
//      reverse-geocode via OpenStreetMap Nominatim to fill city/region/country.
//   2. If no GPS, fall back to an IP-based lookup using the request's IP
//      (cf-connecting-ip / x-forwarded-for) via ipapi.co.
//   3. If both fail, return null — the transaction is still written, just
//      without location.
//
// All network calls are wrapped in tight timeouts so payment latency is
// unaffected when the geocoding services are slow.

export interface ClientLocationInput {
  latitude?: number;
  longitude?: number;
  captured_at?: string;
}

export interface ResolvedLocation {
  latitude: number | null;
  longitude: number | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  location_source: "gps" | "ip" | null;
  location_captured_at: string;
}

const FETCH_TIMEOUT = 2500;

async function timedFetch(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "User-Agent": "AuroPay/1.0 (location-tag)", ...(init?.headers || {}) },
    });
    clearTimeout(t);
    return res;
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`;
  const res = await timedFetch(url);
  if (!res?.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.address) return null;
  const a = data.address;
  return {
    city: a.city || a.town || a.village || a.suburb || a.county || null,
    region: a.state || a.region || null,
    country: a.country || null,
  };
}

function getClientIp(req: Request): string | null {
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

async function ipLookup(ip: string) {
  const url = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
  const res = await timedFetch(url);
  if (!res?.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || data.error) return null;
  const lat = typeof data.latitude === "number" ? data.latitude : null;
  const lon = typeof data.longitude === "number" ? data.longitude : null;
  return {
    latitude: lat,
    longitude: lon,
    city: data.city || null,
    region: data.region || null,
    country: data.country_name || null,
  };
}

export async function resolvePaymentLocation(
  req: Request,
  client?: ClientLocationInput | null
): Promise<ResolvedLocation> {
  const captured = client?.captured_at || new Date().toISOString();

  // 1. GPS path
  if (
    client &&
    typeof client.latitude === "number" &&
    typeof client.longitude === "number" &&
    Math.abs(client.latitude) <= 90 &&
    Math.abs(client.longitude) <= 180
  ) {
    const place = await reverseGeocode(client.latitude, client.longitude);
    return {
      latitude: client.latitude,
      longitude: client.longitude,
      location_city: place?.city ?? null,
      location_region: place?.region ?? null,
      location_country: place?.country ?? null,
      location_source: "gps",
      location_captured_at: captured,
    };
  }

  // 2. IP fallback
  const ip = getClientIp(req);
  if (ip && ip !== "127.0.0.1" && ip !== "::1") {
    const place = await ipLookup(ip);
    if (place) {
      return {
        latitude: place.latitude,
        longitude: place.longitude,
        location_city: place.city,
        location_region: place.region,
        location_country: place.country,
        location_source: "ip",
        location_captured_at: captured,
      };
    }
  }

  // 3. Nothing
  return {
    latitude: null,
    longitude: null,
    location_city: null,
    location_region: null,
    location_country: null,
    location_source: null,
    location_captured_at: captured,
  };
}

/**
 * Helper to merge a ResolvedLocation into a transaction-insert object.
 * Skips null fields so we never overwrite something with NULL by accident.
 */
export function withLocation<T extends Record<string, unknown>>(
  insert: T,
  loc: ResolvedLocation
): T {
  const out: Record<string, unknown> = { ...insert };
  if (loc.latitude !== null) out.latitude = loc.latitude;
  if (loc.longitude !== null) out.longitude = loc.longitude;
  if (loc.location_city) out.location_city = loc.location_city;
  if (loc.location_region) out.location_region = loc.location_region;
  if (loc.location_country) out.location_country = loc.location_country;
  if (loc.location_source) out.location_source = loc.location_source;
  if (loc.location_source) out.location_captured_at = loc.location_captured_at;
  return out as T;
}
