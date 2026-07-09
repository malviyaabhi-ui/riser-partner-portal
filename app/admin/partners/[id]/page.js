import { getSessionContext, fmtAED } from "@/lib/queries";
import PartnerActions from "@/components/PartnerActions";
import DocReview from "@/components/DocReview";

export default async function PartnerDetail({ params }) {
  const { supabase } = await getSessionContext();
  const [{ data: partner }, { data: docs }, { data: quotes }] = await Promise.all([
    supabase.from("partners").select("*").eq("id", params.id).single(),
    supabase.from("partner_documents").select("*").eq("partner_id", params.id).order("created_at"),
    supabase.from("quotes").select("*").eq("partner_id", params.id)
  ]);
  if (!partner) return <p className="text-muted">Partner not found.</p>;

  const revenue = (quotes || []).filter((q) => q.status === "won")
    .reduce((s, q) => s + Number(q.total_sell || 0), 0);

  return (
    <div>
      <a href="/admin/partners" className="text-teal-dark text-[12.5px] font-semibold">← Back to partners</a>
      <div className="flex items-end justify-between mt-3 mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[22px]">{partner.legal_name}</h1>
          <p className="text-muted text-[13px] mt-0.5 capitalize">
            {partner.type} · {partner.country} ·{" "}
            <span className="pill pill-gold capitalize">{partner.tier} tier</span>
          </p>
        </div>
        <PartnerActions partner={partner} />
      </div>

      <div className="grid grid-cols-3 gap-4 items-start max-lg:grid-cols-1">
        <div className="card p-5">
          <h2 className="font-display font-bold text-[15px] mb-4">Company information</h2>
          {[
            ["Legal name", partner.legal_name],
            ["Registration no.", partner.registration_no],
            ["VAT / TIN", partner.vat_no],
            ["Address", partner.address],
            ["Primary contact", `${partner.primary_contact_name || ""} · ${partner.primary_contact_email || ""}`],
            ["Phone", partner.primary_contact_phone],
            ["Payment terms", partner.payment_terms],
            ["Internal notes", partner.notes_internal]
          ].map(([l, v]) => (
            <div key={l} className="mb-3.5">
              <div className="field-label">{l}</div>
              <div className="text-[13.5px] font-medium">{v || "—"}</div>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h2 className="font-display font-bold text-[15px] mb-4">KYC documents</h2>
          <div className="space-y-2.5">
            {(docs || []).map((d) => <DocReview key={d.id} doc={d} />)}
            {!docs?.length && <p className="text-muted text-[13px]">No documents uploaded.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display font-bold text-[15px] mb-4">Performance</h2>
          <div className="mb-3.5"><div className="field-label">Revenue (won)</div>
            <div className="text-[15px] font-mono font-semibold">{fmtAED(revenue)}</div></div>
          <div className="mb-3.5"><div className="field-label">Total quotes</div>
            <div className="text-[15px] font-mono font-semibold">{quotes?.length || 0}</div></div>
          <div><div className="field-label">Partner since</div>
            <div className="text-[13.5px] font-medium">
              {partner.approved_at ? new Date(partner.approved_at).toLocaleDateString() : "Not approved yet"}
            </div></div>
        </div>
      </div>
    </div>
  );
}
