import Link from "next/link";
import { getSessionContext, fmtAED } from "@/lib/queries";
import { QUOTE_PILL, QUOTE_LABEL } from "@/lib/quoteStatus";
import QuoteActions from "@/components/QuoteActions";

export default async function AdminQuoteDetail({ params }) {
  const { supabase } = await getSessionContext();
  const { data: q } = await supabase
    .from("quotes")
    .select("*, partners(legal_name, tier), quote_items(*, products(name), product_variants(name, unit))")
    .eq("id", params.id).single();
  if (!q) return <p className="text-muted">Quote not found.</p>;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/quotes" className="text-teal-dark text-[12.5px] font-semibold">← All quotes</Link>
      <div className="flex items-end justify-between mt-3 mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[22px]">
            {q.quote_no} <span className="text-muted font-body font-normal text-[15px]">· {q.customer_name}</span>
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Partner: <b>{q.partners?.legal_name}</b> ({q.partners?.tier})
          </p>
          <span className={`pill ${QUOTE_PILL[q.status]} mt-2 inline-flex`}>{QUOTE_LABEL[q.status]}</span>
        </div>
        <QuoteActions quote={q} surface="admin" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="th">Item</th><th className="th text-right">Qty</th>
            <th className="th text-right">Partner buy</th><th className="th text-right">Customer price</th>
            <th className="th text-right">Line total</th>
          </tr></thead>
          <tbody>
            {(q.quote_items || []).map((it) => (
              <tr key={it.id}>
                <td className="td"><b>{it.description || it.products?.name}</b></td>
                <td className="td text-right font-mono">{it.qty}</td>
                <td className="td text-right font-mono text-muted">{fmtAED(it.unit_buy)}</td>
                <td className="td text-right font-mono">{fmtAED(it.unit_sell)}</td>
                <td className="td text-right font-mono">{fmtAED(it.qty * it.unit_sell)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end gap-8 px-4 py-3.5 border-t border-line bg-page/60 text-[13.5px]">
          <div>Customer total: <b className="font-mono">{fmtAED(q.total_sell)}</b></div>
          <div>Partner margin: <b className="font-mono text-good">{fmtAED(q.total_sell - q.total_buy)}</b></div>
        </div>
      </div>
    </div>
  );
}
