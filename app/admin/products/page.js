import { getSessionContext } from "@/lib/queries";
import ProductPricingRow from "@/components/ProductPricingRow";

export default async function AdminProducts() {
  const { supabase } = await getSessionContext();
  const [{ data: products }, { data: tiers }] = await Promise.all([
    supabase.from("products").select("*").order("sort_order"),
    supabase.from("tier_pricing").select("*")
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display font-bold text-[22px]">Products &amp; Pricing</h1>
        <p className="text-muted text-[13px] mt-0.5">
          Edit MSRP and tier discounts inline — Save appears when a row changes.
          Hidden products stay in the catalog but never appear in any partner portal.
        </p>
      </div>
      <div className="card overflow-hidden divide-y divide-line">
        {(products || []).map((p) => (
          <ProductPricingRow key={p.id} product={p}
            bands={(tiers || []).filter((t) => t.product_id === p.id)} />
        ))}
      </div>
      <p className="text-[12.5px] text-faint mt-3">
        Changes apply to partner portals immediately. Floor discounts and per-partner
        overrides are still edited via SQL — UI coming in the next iteration.
      </p>
    </div>
  );
}
