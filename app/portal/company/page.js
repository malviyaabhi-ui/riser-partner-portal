import { getSessionContext } from "@/lib/queries";
import DocUploader from "@/components/DocUploader";

const DOC_LABELS = {
  trade_license: "Trade License / Registration",
  vat_certificate: "VAT Certificate",
  director_id: "Director ID",
  moa: "Memorandum of Association",
  bank_letter: "Bank Letter",
  other: "Other document"
};

export default async function Company() {
  const { supabase, partner } = await getSessionContext();
  const { data: docs } = await supabase
    .from("partner_documents").select("*").order("created_at", { ascending: false });

  const pill = {
    verified: "pill-green", pending_review: "pill-amber",
    expiring: "pill-amber", expired: "pill-red", rejected: "pill-red"
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display font-bold text-[22px]">Company &amp; Documents</h1>
        <p className="text-muted text-[13px] mt-0.5">
          Your verified profile and KYC documents. Expired documents pause pricing access.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start max-md:grid-cols-1">
        <div className="card p-5">
          <h2 className="font-display font-bold text-[15px] mb-4">Company information</h2>
          {[
            ["Legal name", partner?.legal_name],
            ["Partner type", partner?.type],
            ["Registration no.", partner?.registration_no],
            ["VAT / TIN", partner?.vat_no],
            ["Address", partner?.address],
            ["Primary contact", `${partner?.primary_contact_name || ""} · ${partner?.primary_contact_email || ""}`],
            ["Payment terms", partner?.payment_terms]
          ].map(([label, value]) => (
            <div key={label} className="mb-3.5">
              <div className="field-label">{label}</div>
              <div className="text-[13.5px] font-medium capitalize-first">{value || "—"}</div>
            </div>
          ))}
          <p className="text-[12px] text-faint">
            Need a change to these details? Raise a ticket and the Riser team will update them.
          </p>
        </div>

        <div className="space-y-3">
          {(docs || []).map((d) => (
            <div key={d.id} className="card p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold">{d.label || DOC_LABELS[d.doc_type]}</div>
                <div className="text-[11.5px] text-faint font-mono mt-0.5">
                  {d.expiry_date ? `Expires ${d.expiry_date}` :
                    d.verified_at ? `Verified ${new Date(d.verified_at).toLocaleDateString()}` :
                    "Awaiting review"}
                </div>
                {d.reject_reason && <div className="text-[12px] text-bad mt-1">{d.reject_reason}</div>}
              </div>
              <span className={`pill ${pill[d.status] || "pill-navy"}`}>{d.status.replace("_", " ")}</span>
            </div>
          ))}
          <DocUploader partnerId={partner?.id} />
        </div>
      </div>
    </div>
  );
}
