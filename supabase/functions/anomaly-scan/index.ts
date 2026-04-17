import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let lookback = 60;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (typeof body?.lookback_minutes === "number" && body.lookback_minutes > 0 && body.lookback_minutes <= 1440) {
          lookback = Math.floor(body.lookback_minutes);
        }
      }
    } catch (_) { /* ignore */ }

    const { data, error } = await supabase.rpc("scan_transaction_anomalies", {
      _lookback_minutes: lookback,
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    const flagged = result?.flagged_count ?? 0;
    const scanned = result?.scanned_count ?? 0;

    // Notify admins when new anomalies are flagged
    if (flagged > 0) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins?.length) {
        const rows = admins.map((a: any) => ({
          user_id: a.user_id,
          title: `🚩 ${flagged} new anomaly${flagged > 1 ? "ies" : ""} flagged`,
          body: `Anomaly engine flagged ${flagged} suspicious transaction${flagged > 1 ? "s" : ""} (scanned ${scanned} in last ${lookback}m).`,
          type: "anomaly_alert",
        }));
        await supabase.from("notifications").insert(rows);
      }
    }

    console.log(`[anomaly-scan] flagged=${flagged} scanned=${scanned} lookback=${lookback}m`);

    return new Response(
      JSON.stringify({ ok: true, flagged_count: flagged, scanned_count: scanned, lookback_minutes: lookback }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[anomaly-scan] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
