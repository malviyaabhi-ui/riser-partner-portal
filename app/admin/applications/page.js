import Link from "next/link";
import { getSessionContext } from "@/lib/queries";
import DocReview from "@/components/DocReview";
import PartnerActions from "@/components/PartnerActions";

export default async function Applications() {
  const { supabase } = await getSessionContext();
  const { data: apps } = await supabase
    .from("partners").select("*, partner_documents(*)")
    .in("status", ["application", "in_review"])
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display font-bold text-[22px]">Applications &amp; KYC review</h1>
        <p className="text-muted text-[13px] mt-0.5">
          Verify documents, then approve to activate the partner&apos;s portal access.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start max-lg:grid-cols-1">
        {(apps || []).map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <b className="text-[15px]">{p.legal_name}</b>
                <div className="text-[12px] text-faint capitalize">
                  {p.type} · {p.country} · Applied {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className="pill pill-amber">In review</span>
            </div>
            {[
              ["Registration no.", p.registration_no],
              ["VAT / TIN", p.vat_no],
              ["Contact", `${p.primary_contact_name} · ${p.primary_contact_email}`]
            ].map(([l, v]) => (
              <div key={l} className="mb-2.5">
                <div className="field-label">{l}</div>
                <div className="text-[13px] font-medium">{v || "—"}</div>
              </div>
            ))}
            <h3 className="font-display font-bold text-[13.5px] mt-4 mb-2.5">Submitted documents</h3>
            <div className="space-y-2.5 mb-4">
              {(p.partner_documents || []).map((d) => <DocReview key={d.id} doc={d} />)}
              {!p.partner_documents?.length && (
                <p className="text-[12.5px] text-bad">No documents submitted yet.</p>
              )}
            </div>
            <PartnerActions partner={p} />
          </div>
        ))}
        {!apps?.length && <p className="text-muted text-[13px]">No pending applications.</p>}
      </div>
    </div>
  );
}
