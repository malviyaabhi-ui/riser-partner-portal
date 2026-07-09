import Link from "next/link";
import { getSessionContext, getVisibleProductsWithPricing, fmtAED } from "@/lib/queries";
import DatasheetButton from "@/components/DatasheetButton";

export default async function ProductDetail({ params }) {
  const { supabase, partner } = await getSessionContext();
  const products = await getVisibleProductsWithPricing(supabase, partner);
  const p = products.find((x) => x.id === params.id);
  if (!p) return <p className="text-muted">Product not found or not available to you.</p>;
  const paused = partner?.status === "pricing_paused";

  return (
    <div className="max-w-3xl">
      <Link href="/portal/products" className="text-teal-dark text-[12.5px] font-semibold">← All products</Link>
      <div className="mt-3 mb-1">
        <h1 className="font-display font-bold text-[24px]">{p.name}</h1>
        {p.tagline && <p className="text-muted text-[14px] mt-1">{p.tagline}</p>}
        <p className="text-[11.5px] text-faint mt-1">{p.category} · {p.unit}</p>
      </div>

      {p.variants?.length > 0 ? (
        <div className="card overflow-hidden my-5">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
            <h2 className="font-display font-bold text-[14px]">Editions &amp; pricing</h2>
            <span className="text-[11.5px] text-faint">
              Your discount: <b className="text-good font-mono">{p.discount != null && !paused ? `${p.discount}%` : "—"}</b>
            </span>
          </div>
          <table className="w-full">
            <thead><tr>
              <th className="th">Variant</th><th className="th">Billing</th>
              <th className="th text-right">MSRP</th><th className="th text-right">Your price</th>
              <th className="th">Availability</th>
            </tr></thead>
            <tbody>
              {p.variants.map((v) => (
                <tr key={v.id}>
                  <td className="td">
                    <b>{v.name}</b>
                    <div className="text-[11.5px] text-faint">{v.unit}{v.amc_pct ? ` · AMC ${v.amc_pct}%/yr` : ""}</div>
                    {v.note && <div className="text-[11.5px] text-teal-dark mt-0.5">{v.note}</div>}
                  </td>
                  <td className="td capitalize text-muted">{v.billing.replace("_", "-")}</td>
                  <td className="td font-mono text-right text-faint line-through">{fmtAED(v.msrp_aed)}</td>
                  <td className="td font-mono text-right font-semibold">
                    {v.buy != null && !paused ? fmtAED(v.buy) : "—"}
                  </td>
                  <td className="td">
                    {v.availability === "in_stock" && <span className="pill pill-green">In stock</span>}
                    {v.availability === "on_order" && <span className="pill pill-amber">On order</span>}
                    {v.availability === "n_a" && <span className="text-faint text-[12px]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card grid grid-cols-3 gap-2 px-5 py-4 my-5">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-semibold">MSRP</div>
            <div className="font-mono text-[15px] text-faint line-through mt-1">{fmtAED(p.msrp_aed)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-semibold">Your price</div>
            <div className="font-mono text-[17px] font-semibold mt-1">
              {p.buy != null && !paused ? fmtAED(p.buy) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-semibold">Your margin</div>
            <div className="font-mono text-[17px] font-semibold text-good mt-1">
              {p.discount != null && !paused ? `${p.discount}%` : "—"}
            </div>
          </div>
        </div>
      )}

      {Array.isArray(p.highlights) && p.highlights.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="font-display font-bold text-[15px] mb-3">Key highlights</h2>
          <ul className="space-y-2">
            {p.highlights.map((h, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0CB8B6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.details && (
        <div className="card p-5 mb-5">
          <h2 className="font-display font-bold text-[15px] mb-3">About {p.name}</h2>
          <div className="text-[13.5px] leading-relaxed text-muted whitespace-pre-wrap">{p.details}</div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Link href="/portal/quotes" className="btn btn-teal">Quote this product</Link>
        {p.datasheet_path && <DatasheetButton path={p.datasheet_path} name={p.name} />}
        {p.website_url && (
          <a href={p.website_url} target="_blank" className="btn btn-ghost">Product website ↗</a>
        )}
        <Link href="/portal/collateral" className="btn btn-ghost">Collateral</Link>
      </div>
    </div>
  );
}
