// Force-action wallet credit/debit (admin-only).
// Requires: typed reason >= 20 chars + 6-digit OTP previously emailed to admin.
// Routes:
//   POST { action: "request_otp" }                                          -> issues + stores OTP for caller admin
//   POST { action: "confirm", wallet_id, kind: "credit"|"debit",
//          amount_paise, reason, otp }                                      -> applies adjustment + audit log
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const OTP_TTL_MS = 10 * 60 * 1000;
const FORCE_THRESHOLD_PAISE = 10_000 * 100; // ₹10,000

const maskEmail = (e: string | null | undefined) => {
  if (!e) return null;
  const [u, d] = e.split("@");
  if (!d) return null;
  const head = u.slice(0, 2);
  return `${head}${"•".repeat(Math.max(2, u.length - 2))}@${d}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (authErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const admin = userData.user;

    // Must be an admin
    const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: admin.id, _role: "admin" });
    if (!hasAdmin) return json({ error: "Admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const otpKey = `force_wallet_otp:${admin.id}`;

    if (action === "request_otp") {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + OTP_TTL_MS;
      const payload = JSON.stringify({ otp, expiresAt });

      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", otpKey).maybeSingle();
      if (existing?.id) {
        await supabase.from("app_settings").update({ value: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("app_settings").insert({ key: otpKey, value: payload });
      }

      // In-app notification (also functions as a record for the admin).
      await supabase.from("notifications").insert({
        user_id: admin.id,
        title: "🔐 Force-action verification",
        body: `Your one-time code is ${otp}. Valid for 10 minutes. Don't share.`,
        type: "security",
      });

      // TODO: when Lovable Emails / send-transactional-email is wired, send via email too.
      console.log("[admin-force-wallet-adjust] OTP issued for admin", admin.id);

      return json({ success: true, masked_email: maskEmail(admin.email), expires_in_seconds: OTP_TTL_MS / 1000 });
    }

    if (action === "confirm") {
      const walletId = String(body.wallet_id || "");
      const kind = String(body.kind || "");
      const amountPaise = Number(body.amount_paise || 0);
      const reason = String(body.reason || "").trim();
      const otp = String(body.otp || "");

      if (!walletId) return json({ error: "wallet_id required" }, 400);
      if (kind !== "credit" && kind !== "debit") return json({ error: "kind must be credit or debit" }, 400);
      if (!Number.isFinite(amountPaise) || amountPaise <= 0) return json({ error: "amount must be positive" }, 400);
      if (reason.length < 20) return json({ error: "Reason must be at least 20 characters" }, 400);
      if (!/^\d{6}$/.test(otp)) return json({ error: "OTP must be 6 digits" }, 400);

      // Verify OTP
      const { data: stored } = await supabase.from("app_settings").select("id, value").eq("key", otpKey).maybeSingle();
      if (!stored?.value) return json({ error: "No OTP issued. Request a new code." }, 400);
      let parsed: { otp: string; expiresAt: number };
      try { parsed = JSON.parse(stored.value); } catch { return json({ error: "Invalid OTP state" }, 400); }
      if (Date.now() > parsed.expiresAt) {
        await supabase.from("app_settings").delete().eq("id", stored.id);
        return json({ error: "OTP expired. Request a new code." }, 400);
      }
      if (parsed.otp !== otp) return json({ error: "Incorrect OTP" }, 400);

      // Load wallet
      const { data: wallet, error: wErr } = await supabase
        .from("wallets").select("id, user_id, balance").eq("id", walletId).maybeSingle();
      if (wErr || !wallet) return json({ error: "Wallet not found" }, 404);

      const oldBalance = wallet.balance || 0;
      const delta = kind === "credit" ? amountPaise : -amountPaise;
      const newBalance = oldBalance + delta;
      if (newBalance < 0) return json({ error: "Debit would push balance below zero" }, 400);

      // Threshold gate (server-side enforcement — must match client)
      if (amountPaise < FORCE_THRESHOLD_PAISE) {
        return json({ error: "Amount below ₹10,000 — use the inline editor instead." }, 400);
      }

      // Apply update
      const { error: uErr } = await supabase.from("wallets").update({ balance: newBalance }).eq("id", walletId);
      if (uErr) return json({ error: uErr.message }, 500);

      // Insert transaction row so the user sees it in their history
      const { data: txn } = await supabase.from("transactions").insert({
        wallet_id: walletId,
        amount: amountPaise,
        type: kind,
        status: "success",
        category: "admin_adjustment",
        description: `Admin ${kind} · ${reason.slice(0, 80)}`,
        merchant_name: "AuroPay Admin",
      }).select("id").single();

      // Audit
      await supabase.from("audit_logs").insert({
        admin_user_id: admin.id,
        action: `wallet_force_${kind}`,
        target_type: "wallet",
        target_id: walletId,
        details: {
          amount_paise: amountPaise,
          old_balance: oldBalance,
          new_balance: newBalance,
          reason,
          transaction_id: txn?.id || null,
          target_user_id: wallet.user_id,
          otp_verified: true,
        },
      });

      // Notify the wallet's user
      await supabase.from("notifications").insert({
        user_id: wallet.user_id,
        title: kind === "credit" ? "✅ Admin credit applied" : "⚠️ Admin debit applied",
        body: `An admin ${kind === "credit" ? "credited" : "debited"} ₹${(amountPaise / 100).toLocaleString("en-IN")} to your wallet. Reason: ${reason.slice(0, 140)}`,
        type: "admin_action",
      });

      // Clear the OTP
      await supabase.from("app_settings").delete().eq("id", stored.id);

      return json({ success: true, new_balance: newBalance, transaction_id: txn?.id || null });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("[admin-force-wallet-adjust] error", e);
    return json({ error: e?.message || "Server error" }, 500);
  }
});
