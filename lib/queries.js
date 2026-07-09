import { createClient } from "@/lib/supabase/server";

export async function getSessionContext() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, partner: null };
  const { data: profile } = await supabase
    .from("portal_users").select("*").eq("id", user.id).single();
  let partner = null;
  if (profile?.partner_id) {
    const { data } = await supabase
      .from("partners").select("*").eq("id", profile.partner_id).single();
    partner = data;
  }
  return { supabase, user, profile, partner };
}

export function fmtAED(n) {
  return "AED " + Number(n || 0).toLocaleString("en-AE", { maximumFractionDigits: 0 });
}

export async function getVisibleProductsWithPricing(supabase, partner) {
  const { data: products } = await supabase
    .from("products").select("*").order("sort_order");
  if (!products) return [];
  const { data: tiers } = await supabase.from("tier_pricing").select("*");
  const { data: overrides } = partner
    ? await supabase.from("partner_pricing_overrides").select("*").eq("partner_id", partner.id)
    : { data: [] };

  return products.map((p) => {
    const ov = overrides?.find((o) => o.product_id === p.id);
    const band = tiers?.find((t) => t.product_id === p.id && t.tier === partner?.tier);
    const discount = ov ? ov.discount_pct : band ? band.discount_pct : null;
    const buy = discount != null ? p.msrp_aed * (1 - discount / 100) : null;
    return { ...p, discount, buy, floor: band?.floor_discount_pct ?? 0, isOverride: !!ov };
  });
}
