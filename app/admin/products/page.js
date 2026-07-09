import { getSessionContext, fmtAED } from "@/lib/queries";
import ProductVisibility from "@/components/ProductVisibility";

export default async function AdminProducts() {
  const { supabase } = await getSessionContext();
  const [{ data: products }, { data: tiers }] = await Promise.all([
    supabase.from("products").select("*").order("sort_order"),
    supabase.from("tier_pricing").select("*")
  ]);

  const band = (pid, tier) => tiers?.find((t) => t.product_id === pid && t.tier === tier)?.discount_pct;

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display font-bold text-[22px]">Products &amp; Pricing</h1>
        <p className="text-muted text-[13px] mt-0.5">
          Hidden products stay in the catalog but never appear in any partner portal.
        </p>
      </div>
      <div className="card overflow-hidden divide-y divide-line">
        {(products || []).map((p) => (
          <div key={p.id} className={`flex items-center gap-4 px-4 py-3.5 ${!p.visible ? "opacity-55 bg-page/60" : ""}`}>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[14px]">{p.name}</div>
              <div className="text-[11.5px] text-faint">{p.category} · {p.unit}</div>
            </div>
            <div className="text-right font-mono text-[12.5px] w-24">
              <div className="text-[10px] uppercase text-faint font-body font-semibold">MSRP</div>
              {fmtAED(p.msrp_aed)}
            </div>
            {["silver", "gold", "platinum"].map((t) => (
              <div key={t} className="text-right font-mono text-[12.5px] w-16">
                <div className="text-[10px] uppercase text-faint font-body font-semibold">{t}</div>
                {band(p.id, t) != null ? `−${band(p.id, t)}%` : "—"}
              </div>
            ))}
            <ProductVisibility product={p} />
          </div>
        ))}
      </div>
      <p className="text-[12.5px] text-faint mt-3">
        Per-partner visibility overrides (soft launches) live in the partner_product_visibility
        table — UI coming in the next iteration.
      </p>
    </div>
  );
}
