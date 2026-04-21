import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight analytics for the Web → App conversion funnel.
 * Fires fire-and-forget inserts into `gate_analytics_events`.
 *
 * Event types we care about:
 *   - gate_impression   : Gate screen rendered (Android or iOS variant)
 *   - deep_link_attempt : intent:// fired on Android web
 *   - play_store_click  : User clicked "Download on Google Play"
 *   - ios_waitlist_join : User submitted the iOS waitlist form
 */
export type GateEventType =
  | "gate_impression"
  | "deep_link_attempt"
  | "play_store_click"
  | "ios_waitlist_join";

export function trackGateEvent(
  eventType: GateEventType,
  extra: { path?: string; platform?: "android" | "ios" | "other" } = {}
) {
  try {
    const payload = {
      event_type: eventType,
      path: extra.path ?? (typeof location !== "undefined" ? location.pathname : null),
      platform: extra.platform ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };
    // Fire and forget — never block UI on analytics.
    void supabase.from("gate_analytics_events").insert(payload);
  } catch {
    /* swallow */
  }
}
