// Admin-only proxy that fetches recent edge function invocations from
// Supabase analytics (function_edge_logs). Requires the caller to have
// the 'admin' role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROJECT_REF = "mkduupshubnzjwefptcw";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: claims.claims.sub,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query Supabase analytics for the last 20 edge function invocations.
    const sql = `
      select
        id,
        function_edge_logs.timestamp as ts,
        event_message,
        response.status_code as status_code,
        request.method as method,
        m.function_id as function_id,
        m.execution_time_ms as execution_time_ms,
        m.version as version
      from function_edge_logs
        cross join unnest(metadata) as m
        cross join unnest(m.response) as response
        cross join unnest(m.request) as request
      order by timestamp desc
      limit 20
    `;

    const analyticsUrl = `https://api.supabase.com/platform/projects/${PROJECT_REF}/analytics/endpoints/logs.all?sql=${encodeURIComponent(sql)}`;
    const SUPA_PAT = Deno.env.get("SUPABASE_ACCESS_TOKEN");

    let rows: any[] = [];
    let analyticsError: string | null = null;

    if (SUPA_PAT) {
      try {
        const r = await fetch(analyticsUrl, {
          headers: { Authorization: `Bearer ${SUPA_PAT}` },
        });
        if (r.ok) {
          const json = await r.json();
          rows = Array.isArray(json?.result) ? json.result : [];
        } else {
          analyticsError = `Analytics API ${r.status}`;
          await r.text();
        }
      } catch (e) {
        analyticsError = String(e);
      }
    } else {
      analyticsError = "SUPABASE_ACCESS_TOKEN not configured";
    }

    return new Response(
      JSON.stringify({ rows, error: analyticsError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
