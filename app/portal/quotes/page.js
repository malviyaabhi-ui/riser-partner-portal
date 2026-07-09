import { getSessionContext, getVisibleProductsWithPricing, fmtAED } from "@/lib/queries";
import QuoteBuilder from "@/components/QuoteBuilder";

export default async function Quotes() {
  const { supabase, partner } = await getSessionContext();
  const [{ data: quotes }, products] = await Promise.all([
    supabase.from("quotes").select("*, quote_items(*)").order("created_at", { ascending: false }),
    getVisibleProductsWithPricing(supabase, partner)
  ]);

  const pill = {
    draft: "pill-navy", pending_approval: "pill-amber", approved: "pill-teal",
    sent: "pill-teal", won: "pill-green", lost: "pill-red", declined: "pill-red"
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display font-bold text-[22px]">Quotes &amp; Orders</h1>
        <p className="text-muted text-[13px] mt-0.5">
          Quotes discounted below your floor price are sent to Riser for approval automatically.
        </p>
      </div>

      <QuoteBuilder products={products} partnerId={partner?.id} />

      <h2 className="font-display font-bold text-[15px] mt-7 mb-3">Your quotes</h2>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="th">Quote</th><th className="th">Customer</th>
            <th className="th">Items</th><th className="th">Value</th>
            <th className="th">Your margin</th><th className="th">Status</th>
          </tr></thead>
          <tbody>
            {(quotes || []).map((q) => (
              <tr key={q.id}>
                <td className="td font-mono text-[12px] text-faint">{q.quote_no}</td>
                <td className="td">{q.customer_name}</td>
                <td className="td text-muted">{q.quote_items?.length || 0}</td>
                <td className="td font-mono">{fmtAED(q.total_sell)}</td>
                <td className="td font-mono text-good">{fmtAED(q.total_sell - q.total_buy)}</td>
                <td className="td"><span className={`pill ${pill[q.status]}`}>{q.status.replace("_", " ")}</span></td>
              </tr>
            ))}
            {!quotes?.length && <tr><td className="td text-muted" colSpan={6}>No quotes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
