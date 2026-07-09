import { getSessionContext, fmtAED } from "@/lib/queries";
import PrintButton from "@/components/PrintButton";

export default async function PrintQuote({ params }) {
  const { supabase } = await getSessionContext();
  const { data: q } = await supabase
    .from("quotes")
    .select("*, partners(legal_name, address, country, vat_no, primary_contact_name, primary_contact_email, primary_contact_phone), quote_items(*, products(name), product_variants(name, unit))")
    .eq("id", params.id).single();
  if (!q) return <p className="p-10 text-muted">Quote not found.</p>;

  const p = q.partners;
  const validUntil = new Date(new Date(q.created_at).getTime() + 30 * 864e5);

  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="max-w-[820px] mx-auto p-10 print:p-0">
        <div className="flex justify-end mb-4 print:hidden">
          <PrintButton />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b-4 border-navy pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal to-[#3B7BF5] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
              </div>
              <div>
                <div className="font-display font-bold text-[18px] leading-tight">{p?.legal_name}</div>
                <div className="text-[11px] text-muted">Authorised Riser Technologies Partner</div>
              </div>
            </div>
            <div className="text-[11.5px] text-muted mt-3 leading-relaxed">
              {p?.address}{p?.country ? `, ${p.country}` : ""}<br />
              {p?.vat_no && <>VAT/TIN: {p.vat_no}<br /></>}
              {p?.primary_contact_email} {p?.primary_contact_phone && `· ${p.primary_contact_phone}`}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display font-bold text-[26px] text-navy">QUOTATION</div>
            <div className="font-mono text-[13px] mt-1">{q.quote_no}</div>
            <div className="text-[11.5px] text-muted mt-2 leading-relaxed">
              Date: {new Date(q.created_at).toLocaleDateString("en-GB")}<br />
              Valid until: {validUntil.toLocaleDateString("en-GB")}
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-[1.5px] text-faint font-semibold">Prepared for</div>
          <div className="font-display font-bold text-[16px] mt-1">{q.customer_name}</div>
          {q.customer_email && <div className="text-[12px] text-muted">{q.customer_email}</div>}
        </div>

        {/* Items */}
        <table className="w-full mt-6">
          <thead>
            <tr className="bg-navy text-white">
              <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Description</th>
              <th className="text-right text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Qty</th>
              <th className="text-right text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Unit price</th>
              <th className="text-right text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(q.quote_items || []).map((it, i) => (
              <tr key={it.id} className={i % 2 ? "bg-page/60" : ""}>
                <td className="px-4 py-3 text-[13px]">
                  <b>{it.description || it.products?.name}</b>
                  {it.product_variants?.unit && <span className="text-muted"> — {it.product_variants.unit}</span>}
                </td>
                <td className="px-4 py-3 text-[13px] text-right font-mono">{it.qty}</td>
                <td className="px-4 py-3 text-[13px] text-right font-mono">{fmtAED(it.unit_sell)}</td>
                <td className="px-4 py-3 text-[13px] text-right font-mono">{fmtAED(it.qty * it.unit_sell)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className="w-72">
            <div className="flex justify-between text-[13px] py-1.5">
              <span className="text-muted">Subtotal</span>
              <span className="font-mono">{fmtAED(q.total_sell)}</span>
            </div>
            <div className="flex justify-between text-[13px] py-1.5">
              <span className="text-muted">VAT</span>
              <span className="font-mono text-muted">Excluded</span>
            </div>
            <div className="flex justify-between text-[15px] py-2.5 border-t-2 border-navy font-semibold">
              <span>Total</span>
              <span className="font-mono">{fmtAED(q.total_sell)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-5 border-t border-line text-[11px] text-muted leading-relaxed">
          <b className="text-ink">Terms:</b> Prices exclude VAT and are valid for 30 days from the quotation date.
          Delivery timelines confirmed on order. Payment terms as agreed with {p?.legal_name}.
          Products supplied and supported by {p?.legal_name}, an authorised Riser Technologies partner.
        </div>
      </div>
    </div>
  );
}
