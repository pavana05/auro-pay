import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claims.claims.sub;

    // Service role client to bypass RLS
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin role
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get wallet IDs
    const { data: wallets } = await admin.from("wallets").select("id").eq("user_id", user_id);
    const walletIds = (wallets || []).map((w: any) => w.id);

    if (walletIds.length > 0) {
      await admin.from("transactions").delete().in("wallet_id", walletIds);
      await admin.from("spending_limits").delete().in("teen_wallet_id", walletIds);
      await admin.from("wallets").delete().in("id", walletIds);
    }

    // 2. Delete from all related tables
    // ticket_messages via support_tickets
    const { data: tickets } = await admin.from("support_tickets").select("id").eq("user_id", user_id);
    const ticketIds = (tickets || []).map((t: any) => t.id);
    if (ticketIds.length > 0) {
      await admin.from("ticket_messages").delete().in("ticket_id", ticketIds);
    }

    // bill_split_members via bill_splits
    const { data: splits } = await admin.from("bill_splits").select("id").eq("created_by", user_id);
    const splitIds = (splits || []).map((s: any) => s.id);
    if (splitIds.length > 0) {
      await admin.from("bill_split_members").delete().in("split_id", splitIds);
    }

    // Direct deletes
    await admin.from("scratch_cards").delete().eq("user_id", user_id);
    await admin.from("user_achievements").delete().eq("user_id", user_id);
    await admin.from("lesson_completions").delete().eq("user_id", user_id);
    await admin.from("friendships").delete().or(`user_id.eq.${user_id},friend_id.eq.${user_id}`);
    await admin.from("referrals").delete().or(`referrer_id.eq.${user_id},referred_id.eq.${user_id}`);
    await admin.from("bill_split_members").delete().eq("user_id", user_id);
    await admin.from("bill_splits").delete().eq("created_by", user_id);
    await admin.from("chores").delete().or(`parent_id.eq.${user_id},teen_id.eq.${user_id}`);
    await admin.from("support_tickets").delete().eq("user_id", user_id);
    await admin.from("kyc_requests").delete().eq("user_id", user_id);
    await admin.from("notifications").delete().eq("user_id", user_id);
    await admin.from("savings_goals").delete().eq("teen_id", user_id);
    await admin.from("user_roles").delete().eq("user_id", user_id);
    await admin.from("quick_pay_favorites").delete().eq("user_id", user_id);
    await admin.from("recurring_payments").delete().eq("user_id", user_id);
    await admin.from("budgets").delete().eq("user_id", user_id);
    await admin.from("user_streaks").delete().eq("user_id", user_id);
    await admin.from("parent_teen_links").delete().or(`parent_id.eq.${user_id},teen_id.eq.${user_id}`);
    await admin.from("reward_redemptions").delete().eq("user_id", user_id);
    await admin.from("profiles").delete().eq("id", user_id);

    // 3. Delete auth user
    const { error: authErr } = await admin.auth.admin.deleteUser(user_id);
    if (authErr) {
      console.error("Auth delete error:", authErr);
      return new Response(JSON.stringify({ error: "Failed to delete auth user: " + authErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Delete user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
