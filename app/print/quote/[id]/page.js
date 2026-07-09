import { getSessionContext, fmtAED } from "@/lib/queries";
import { numToWords } from "@/lib/numToWords";
import PrintButton from "@/components/PrintButton";

export default async function PrintQuote({ params, searchParams }) {
  const template = searchParams?.template === "boxed" ? "boxed" : "classic";
  const { supabase } = await getSessionContext();
  const { data: q } = await supabase
    .from("quotes")
    .select(`*, partners(legal_name, address, country, vat_no, primary_contact_name,
      primary_contact_email, primary_contact_phone, payment_terms),
      quote_items(*, products(name), product_variants(name, unit, sku, hsn_code)),
      creator:portal_users!quotes_created_by_fkey(full_name)`)
    .eq("id", params.id).single();
  if (!q) return <p className="p-10 text-muted">Quote not found.</p>;

  const p = q.partners;
  const validUntil = new Date(new Date(q.created_at).getTime() + (q.valid_days || 30) * 864e5);
  const d = (x) => new Date(x).toLocaleDateString("en-GB");
  const items = q.quote_items || [];
  const hasHsn = items.some((it) => it.product_variants?.hsn_code);

  const Switcher = () => (
    <div className="flex items-center justify-between mb-5 print:hidden">
      <div className="inline-flex rounded-lg border border-line overflow-hidden text-[12.5px] font-semibold">
        <a href={`?template=classic`} className={`px-4 py-2 ${template === "classic" ? "bg-navy text-white" : "bg-white text-muted"}`}>PI/Quote</a>
        <a href={`?template=boxed`} className={`px-4 py-2 ${template === "boxed" ? "bg-navy text-white" : "bg-white text-muted"}`}>Distributor Quotation</a>
      </div>
      <PrintButton />
    </div>
  );

  /* ═════════ TEMPLATE B — boxed distributor quotation ═════════ */
  if (template === "boxed") {
    const bd = "border border-[#999]";
    return (
      <div className="min-h-screen bg-white text-[#111]">
        <div className="max-w-[860px] mx-auto p-8 print:p-0 text-[12px]" style={{ fontFamily: "Arial, sans-serif" }}>
          <Switcher />
          <div className="text-center font-bold text-[17px] tracking-wide mb-4">QUOTATION</div>

          <div className="flex gap-0">
            <div className={`flex-1 ${bd} p-2.5 leading-relaxed`}>
              <b>From :</b><br />
              <span className="font-bold uppercase">{p?.legal_name}</span><br />
              {p?.address}{p?.country ? `, ${p.country}` : ""}<br />
              {q.subject && <><b>Opportunity :</b> {q.subject}<br /></>}
              <b>Prepared for :</b> {q.customer_name}
            </div>
            <div className={`w-64 ${bd} border-l-0`}>
              {[["Quote No", q.quote_no], ["Date", d(q.created_at)], ["Valid Until", d(validUntil)], ["Currency", "AED"]].map(([k, v]) => (
                <div key={k} className="flex border-b border-[#999] last:border-b-0">
                  <div className="w-24 px-2 py-1.5 font-bold border-r border-[#999]">{k}</div>
                  <div className="flex-1 px-2 py-1.5">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <table className="w-full mt-3 border-collapse">
            <thead>
              <tr>
                {["Sr.no", ...(hasHsn ? ["HSN Code"] : []), "Item Code", "Description", "UOM", "Qty", "Unit Price", "Total"].map((h) => (
                  <th key={h} className={`${bd} bg-[#EEE] px-2 py-1.5 text-left font-bold`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} className="align-top">
                  <td className={`${bd} px-2 py-1.5 text-center`}>{i + 1}</td>
                  {hasHsn && <td className={`${bd} px-2 py-1.5`}>{it.product_variants?.hsn_code || ""}</td>}
                  <td className={`${bd} px-2 py-1.5`}>{it.product_variants?.sku || "—"}</td>
                  <td className={`${bd} px-2 py-1.5`}>
                    <span className="uppercase font-semibold">{it.description || it.products?.name}</span>
                    {it.long_desc && <div className="mt-0.5">{it.long_desc}</div>}
                  </td>
                  <td className={`${bd} px-2 py-1.5 text-center`}>{it.product_variants?.unit || "NOS"}</td>
                  <td className={`${bd} px-2 py-1.5 text-right`}>{it.qty}</td>
                  <td className={`${bd} px-2 py-1.5 text-right`}>{Number(it.unit_sell).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
                  <td className={`${bd} px-2 py-1.5 text-right`}>{(it.qty * it.unit_sell).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={hasHsn ? 7 : 6} className={`${bd} px-2 py-1.5 text-right font-bold`}>Sub Total (Pre Tax)</td>
                <td className={`${bd} px-2 py-1.5 text-right font-bold`}>{Number(q.total_sell).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td colSpan={hasHsn ? 7 : 6} className={`${bd} px-2 py-1.5 text-right font-bold`}>Total Amount</td>
                <td className={`${bd} px-2 py-1.5 text-right font-bold`}>{Number(q.total_sell).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 leading-relaxed">
            <b>Terms and Condition:</b><br />
            Prices exclude VAT. Quotation valid for {q.valid_days || 30} days from date of issue.<br />
            {p?.payment_terms && <>Payment: {p.payment_terms}<br /></>}
            {q.notes && <>{q.notes}<br /></>}
            <b>For any query, please contact :</b><br />
            {p?.primary_contact_name} · {p?.primary_contact_email} {p?.primary_contact_phone && `· ${p.primary_contact_phone}`}
          </div>

          <div className="mt-6 pt-2 border-t border-[#999] text-center text-[10.5px] text-[#555]">
            {p?.legal_name}{p?.address ? ` — ${p.address}` : ""}{p?.country ? `, ${p.country}` : ""}
          </div>
        </div>
      </div>
    );
  }

  /* ═════════ TEMPLATE A — classic PI/Quote ═════════ */
  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="max-w-[840px] mx-auto p-10 print:p-0">
        <Switcher />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal to-[#3B7BF5] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
              </div>
              <div className="font-display font-bold text-[20px]">{p?.legal_name}</div>
            </div>
            <div className="text-[11.5px] text-muted mt-2 leading-relaxed">
              {p?.address}{p?.country ? `, ${p.country}` : ""}<br />
              {p?.vat_no && <>VAT/TIN: {p.vat_no}<br /></>}
              {p?.primary_contact_email} {p?.primary_contact_phone && `· ${p.primary_contact_phone}`}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display font-bold text-[30px] text-navy leading-none">Quotation</div>
            <div className="font-mono text-[13px] mt-2"># {q.quote_no}</div>
          </div>
        </div>

        {/* Bill to + meta */}
        <div className="flex justify-between mt-7 gap-8">
          <div>
            <div className="text-[10px] uppercase tracking-[1.5px] text-faint font-semibold">Bill To</div>
            <div className="font-bold text-[15px] mt-1">{q.customer_name}</div>
            {q.customer_email && <div className="text-[12px] text-muted">{q.customer_email}</div>}
            {q.subject && (
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-[1.5px] text-faint font-semibold">Subject</div>
                <div className="text-[13px] mt-0.5">{q.subject}</div>
              </div>
            )}
          </div>
          <table className="text-[12.5px] self-start">
            <tbody>
              <tr><td className="text-muted pr-6 py-0.5 text-right">Quote Date :</td><td className="text-right">{d(q.created_at)}</td></tr>
              <tr><td className="text-muted pr-6 py-0.5 text-right">Expiry Date :</td><td className="text-right">{d(validUntil)}</td></tr>
              {q.creator?.full_name && (
                <tr><td className="text-muted pr-6 py-0.5 text-right">Sales person :</td><td className="text-right">{q.creator.full_name}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Items */}
        <table className="w-full mt-6">
          <thead>
            <tr className="bg-navy text-white">
              <th className="text-left text-[11px] font-semibold px-3 py-2.5 w-8">#</th>
              <th className="text-left text-[11px] font-semibold px-3 py-2.5">Item &amp; Description</th>
              <th className="text-left text-[11px] font-semibold px-3 py-2.5">Item Code</th>
              <th className="text-right text-[11px] font-semibold px-3 py-2.5">Qty</th>
              <th className="text-right text-[11px] font-semibold px-3 py-2.5">Rate</th>
              <th className="text-right text-[11px] font-semibold px-3 py-2.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className="border-b border-line align-top">
                <td className="px-3 py-3 text-[12.5px]">{i + 1}</td>
                <td className="px-3 py-3 text-[12.5px]">
                  <b>{it.description || it.products?.name}</b>
                  {it.long_desc && (
                    <div className="text-[11.5px] text-muted mt-1 leading-relaxed whitespace-pre-wrap">{it.long_desc}</div>
                  )}
                </td>
                <td className="px-3 py-3 text-[12px] font-mono">{it.product_variants?.sku || "—"}</td>
                <td className="px-3 py-3 text-[12.5px] text-right font-mono">{Number(it.qty).toFixed(2)}</td>
                <td className="px-3 py-3 text-[12.5px] text-right font-mono">{Number(it.unit_sell).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-3 text-[12.5px] text-right font-mono">{(it.qty * it.unit_sell).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-3">
          <div className="w-80">
            <div className="flex justify-between text-[13px] py-1.5 px-3">
              <span className="font-semibold">Sub Total</span>
              <span className="font-mono">{Number(q.total_sell).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[14px] py-2.5 px-3 bg-page font-bold">
              <span>Total</span>
              <span className="font-mono">{fmtAED(q.total_sell)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <div className="w-96 text-right text-[12px]">
            <span className="text-muted">Total In Words : </span>
            <b className="italic">{numToWords(q.total_sell, "AED")}</b>
          </div>
        </div>

        {q.notes && (
          <div className="mt-7">
            <div className="text-[12.5px] font-semibold mb-1">Notes</div>
            <p className="text-[12px] text-muted leading-relaxed whitespace-pre-wrap">{q.notes}</p>
          </div>
        )}

        <div className="mt-7">
          <div className="text-[12.5px] font-semibold mb-1">Terms &amp; Conditions</div>
          <p className="text-[12px] text-muted leading-relaxed">
            The above quotation is valid for {q.valid_days || 30} days.<br />
            {p?.payment_terms && <>Payment: {p.payment_terms}.<br /></>}
            Prices exclude VAT unless stated otherwise. Products supplied and supported by {p?.legal_name},
            an authorised Riser Technologies partner.
          </p>
        </div>

        <div className="mt-8 pt-3 border-t-2 border-teal text-center text-[11px] text-teal-dark font-semibold">
          {p?.legal_name}{p?.primary_contact_email ? ` || email: ${p.primary_contact_email}` : ""}
        </div>
      </div>
    </div>
  );
}
