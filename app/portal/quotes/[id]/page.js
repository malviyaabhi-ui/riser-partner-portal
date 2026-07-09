import Link from "next/link";
import { getSessionContext, fmtAED } from "@/lib/queries";
import { QUOTE_PILL, QUOTE_LABEL } from "@/lib/quoteStatus";
import QuoteActions from "@/components/QuoteActions";

export default async function QuoteDetail({ params }) {
  const { supabase } = await getSessionContext();
  const { data: q } = await supabase
    .from("quotes")
    .select("*, quote_items(*, products(name), product_variants(name, unit))")
    .eq("id", params.id).single();
  if (!q) return <p className="text-muted">Quote not found.</p>;

  const margin = q.total_sell - q.total_buy;

  return (
    <div className="max-w-3xl">
      <Link href="/portal/quotes" className="text-teal-dark text-[12.5px] font-semibold">← All quotes</Link>
      <div className="flex items-end justify-between mt-3 mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[22px]">
            {q.quote_no} <span className="text-muted font-body font-normal text-[15px]">· {q.customer_name}</span>
          </h1>
          <span className={`pill ${QUOTE_PILL[q.status]} mt-2 inline-flex`}>{QUOTE_LABEL[q.status]}</span>
        </div>
        <QuoteActions quote={q} surface="partner" />
      </div>

      <div className="card overflow-hidden mb-4">
        <table className="w-full">
          <thead><tr>
            <th className="th">Item</th><th className="th text-right">Qty</th>
            <th className="th text-right">Unit price</th><th className="th text-right">Line total</th>
            <th className="th text-right">Your margin</th>
          </tr></thead>
          <tbody>
            {(q.quote_items || []).map((it) => (
              <tr key={it.id}>
                <td className="td">
                  <b>{it.description || it.products?.name}</b>
                  {it.product_variants?.unit && <div className="text-[11.5px] text-faint">{it.product_variants.unit}</div>}
                </td>
                <td className="td text-right font-mono">{it.qty}</td>
                <td className="td text-right font-mono">{fmtAED(it.unit_sell)}</td>
                <td className="td text-right font-mono">{fmtAED(it.qty * it.unit_sell)}</td>
                <td className="td text-right font-mono text-good">{fmtAED(it.qty * (it.unit_sell - it.unit_buy))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end gap-8 px-4 py-3.5 border-t border-line bg-page/60 text-[13.5px]">
          <div>Total: <b className="font-mono">{fmtAED(q.total_sell)}</b></div>
          <div>Your margin: <b className="font-mono text-good">{fmtAED(margin)}</b></div>
        </div>
      </div>

      {q.customer_email && (
        <p className="text-[12.5px] text-muted">Customer email: {q.customer_email}</p>
      )}
      {q.needs_approval && q.status === "pending_approval" && (
        <p className="text-[12.5px] text-warn mt-2">
          This quote is priced below your floor and is waiting for Riser approval.
          You&apos;ll be able to send it once approved.
        </p>
      )}
    </div>
  );
}
