import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const callerId = userData?.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { title, body, type = "broadcast", segment = "all" } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Build target user list based on segment
    let userIds: string[] = [];
    if (segment === "all") {
      const { data } = await supabase.from("profiles").select("id");
      userIds = (data || []).map((p: any) => p.id);
    } else if (segment === "kyc_pending") {
      const { data } = await supabase.from("profiles").select("id").eq("kyc_status", "pending");
      userIds = (data || []).map((p: any) => p.id);
    } else if (segment === "kyc_verified") {
      const { data } = await supabase.from("profiles").select("id").eq("kyc_status", "verified");
      userIds = (data || []).map((p: any) => p.id);
    } else if (segment === "teens") {
      const { data } = await supabase.from("profiles").select("id").eq("role", "teen");
      userIds = (data || []).map((p: any) => p.id);
    } else if (segment === "parents") {
      const { data } = await supabase.from("profiles").select("id").eq("role", "parent");
      userIds = (data || []).map((p: any) => p.id);
    }

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Insert notifications in batches of 500
    let sent = 0;
    for (let i = 0; i < userIds.length; i += 500) {
      const batch = userIds.slice(i, i + 500).map((uid) => ({
        user_id: uid, title, body, type,
      }));
      const { error } = await supabase.from("notifications").insert(batch);
      if (!error) sent += batch.length;
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      admin_user_id: callerId,
      action: "broadcast_notification",
      target_type: "users",
      details: { title, body, segment, sent },
    });

    return new Response(JSON.stringify({ success: true, sent, segment }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("admin-broadcast error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
