"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PILL = {
  verified: "pill-green", pending_review: "pill-amber",
  expiring: "pill-amber", expired: "pill-red", rejected: "pill-red"
};

export default function DocReview({ doc }) {
  const supabase = createClient();
  const router = useRouter();

  async function preview() {
    const { data, error } = await supabase.storage
      .from("kyc-documents").createSignedUrl(doc.file_path, 300);
    if (error) { alert(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function setStatus(status) {
    let patch = { status };
    if (status === "verified") patch.verified_at = new Date().toISOString();
    if (status === "rejected") {
      const reason = prompt("Rejection reason (shown to the partner):");
      if (reason === null) return;
      patch.reject_reason = reason;
    }
    if (status === "verified") {
      const expiry = prompt("Expiry date if applicable (YYYY-MM-DD), or leave blank:");
      if (expiry) patch.expiry_date = expiry;
    }
    const { error } = await supabase.from("partner_documents").update(patch).eq("id", doc.id);
    if (error) alert(error.message);
    router.refresh();
  }

  return (
    <div className="border border-line rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="text-[13px] font-semibold">{doc.label || doc.doc_type}</div>
          <div className="text-[11px] text-faint font-mono">
            {doc.expiry_date ? `Expires ${doc.expiry_date}` : `Uploaded ${new Date(doc.created_at).toLocaleDateString()}`}
          </div>
        </div>
        <span className={`pill ${PILL[doc.status]}`}>{doc.status.replace("_", " ")}</span>
      </div>
      <div className="flex gap-2 mt-2">
        <button className="btn btn-ghost !py-1 !px-2.5 !text-[11.5px]" onClick={preview}>Preview</button>
        {doc.status !== "verified" && (
          <button className="btn !py-1 !px-2.5 !text-[11.5px] bg-good text-white" onClick={() => setStatus("verified")}>Verify</button>
        )}
        {doc.status !== "rejected" && (
          <button className="btn !py-1 !px-2.5 !text-[11.5px] bg-bad/10 text-bad" onClick={() => setStatus("rejected")}>Reject</button>
        )}
      </div>
    </div>
  );
}
