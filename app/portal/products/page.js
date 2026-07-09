import { getSessionContext, getVisibleProductsWithPricing, fmtAED } from "@/lib/queries";

export default async function Products() {
  const { supabase, partner } = await getSessionContext();
  const products = await getVisibleProductsWithPricing(supabase, partner);
  const paused = partner?.status === "pricing_paused";

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display font-bold text-[22px]">Products &amp; Pricing</h1>
        <p className="text-muted text-[13px] mt-0.5">
          Your <span className="capitalize">{partner?.tier}</span>-tier buy prices. All prices exclude VAT.
        </p>
      </div>

      {paused && (
        <div className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3.5 mb-5 text-[13px] text-bad">
          <b>Pricing paused</b> — a required document has expired. Upload the renewal under
          Company &amp; Documents to restore your prices.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
        {products.map((p) => (
          <div key={p.id} className="card overflow-hidden flex flex-col hover:border-teal/50 transition">
            <div className="p-4 flex-1">
              <div className="font-display font-bold text-[15px]">{p.name}</div>
              <div className="text-[11.5px] text-faint mt-0.5">{p.category} · {p.unit}</div>
              <p className="text-[12.5px] text-muted leading-relaxed mt-2.5">{p.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-line bg-page/60 px-4 py-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-faint font-semibold">MSRP</div>
                <div className="font-mono text-[12.5px] text-faint line-through mt-1">{fmtAED(p.msrp_aed)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-faint font-semibold">Your price</div>
                <div className="font-mono text-[14px] font-semibold mt-1">
                  {p.buy != null && !paused ? fmtAED(p.buy) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-faint font-semibold">Margin</div>
                <div className="font-mono text-[14px] font-semibold text-good mt-1">
                  {p.discount != null && !paused ? `${p.discount}%` : "—"}
                </div>
              </div>
            </div>
            {p.isOverride && !paused && (
              <div className="px-4 py-2 border-t border-line text-[11px] text-teal-dark font-semibold bg-teal/5">
                Custom negotiated pricing applied
              </div>
            )}
          </div>
        ))}
        {!products.length && (
          <p className="text-muted text-[13px]">No products visible yet — contact Riser.</p>
        )}
      </div>
    </div>
  );
}
