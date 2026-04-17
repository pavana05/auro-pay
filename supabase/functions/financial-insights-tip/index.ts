// Generates a single short, actionable savings tip from category spending data.
// Uses Lovable AI Gateway (Gemini Flash). Public function (no JWT required).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { categories, totalSpent, topCategory, wowChangePct, currency = "₹" } = body ?? {};

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const summary = (categories ?? [])
      .slice(0, 6)
      .map((c: any) => `${c.category}: ${currency}${(c.amount / 100).toFixed(0)}`)
      .join(", ");

    const userMsg = `User's spending breakdown this period: ${summary || "no data"}.
Total spent: ${currency}${((totalSpent ?? 0) / 100).toFixed(0)}.
Top category: ${topCategory ?? "n/a"}.
Week-over-week change: ${wowChangePct ?? 0}%.

Give ONE short, friendly, actionable savings tip (max 2 sentences, ~25 words). 
Be specific to the top category. No emojis. No greetings. Start with a verb.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a concise personal finance coach for Indian teens." },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited", tip: "Try cutting one impulse buy this week — your future self will thank you." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "credits", tip: "Set a small daily cap on your top category and watch the savings stack up." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error", r.status, t);
      return new Response(JSON.stringify({ tip: "Review your top category and set a weekly cap to keep spending in check." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    const tip = data?.choices?.[0]?.message?.content?.trim() ?? "Track your top category daily and aim to cut it by 10% next week.";

    return new Response(JSON.stringify({ tip }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("insights-tip error", e);
    return new Response(JSON.stringify({ tip: "Spend a minute reviewing your top category — small cuts compound fast." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
