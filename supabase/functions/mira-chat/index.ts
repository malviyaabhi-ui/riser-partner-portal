// Mira — the Riser Partner Portal assistant.
// Deploy: supabase functions deploy mira-chat
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const authHeader = req.headers.get("Authorization") ?? "";

    // RLS-scoped client: Mira can only ever read what THIS user can read.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Gather the user's context (all RLS-filtered)
    const [{ data: profile }, { data: products }, { data: tiers },
           { data: quotes }, { data: docs }] = await Promise.all([
      supabase.from("portal_users").select("*, partners(*)").eq("id", user.id).single(),
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("tier_pricing").select("*"),
      supabase.from("quotes").select("quote_no,customer_name,status,total_sell,total_buy,created_at")
        .order("created_at", { ascending: false }).limit(15),
      supabase.from("partner_documents").select("doc_type,label,status,expiry_date")
    ]);

    const partner = profile?.partners;
    const isAdmin = ["riser_admin", "riser_staff"].includes(profile?.role);

    const priceLines = (products ?? []).map((p: any) => {
      const band = (tiers ?? []).find((t: any) =>
        t.product_id === p.id && t.tier === partner?.tier);
      const buy = band ? (p.msrp_aed * (1 - band.discount_pct / 100)).toFixed(0) : "n/a";
      return `- ${p.name} (${p.unit}): MSRP AED ${p.msrp_aed}` +
        (partner ? `, partner buy price AED ${buy} (${band?.discount_pct ?? "?"}% off, floor +${band?.floor_discount_pct ?? 0}%)` : "");
    }).join("\n");

    const system = `You are Mira, the AI assistant inside the Riser Technologies Partner Portal.
You help ${isAdmin ? "the Riser admin team" : "channel partners"} with pricing, quotes, KYC documents, products, and how the portal works.
Be concise, friendly and practical. Use AED. Never invent prices — only use the data below. If something isn't in the data, say so and suggest raising a ticket.

USER: ${profile?.full_name ?? user.email} (${profile?.role})
${partner ? `PARTNER: ${partner.legal_name} — ${partner.type}, ${partner.tier} tier, status ${partner.status}, country ${partner.country}` : "PARTNER: none (Riser staff)"}

PRODUCTS & PRICING (visible to this user):
${priceLines || "none"}

RECENT QUOTES:
${(quotes ?? []).map((q: any) => `- ${q.quote_no}: ${q.customer_name}, AED ${q.total_sell}, ${q.status}`).join("\n") || "none"}

DOCUMENTS:
${(docs ?? []).map((d: any) => `- ${d.label ?? d.doc_type}: ${d.status}${d.expiry_date ? `, expires ${d.expiry_date}` : ""}`).join("\n") || "none"}

Portal facts: quotes below the floor discount need Riser approval automatically; expired documents pause pricing access until renewed; collateral is version-controlled by Riser; tickets go directly to the Riser team.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system,
        messages
      })
    });

    const data = await anthropicRes.json();
    const reply = (data.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n") || "Sorry, I couldn't generate a reply.";

    return new Response(JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
