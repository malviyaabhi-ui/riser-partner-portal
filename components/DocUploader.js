"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TYPES = [
  ["trade_license", "Trade License / Registration"],
  ["vat_certificate", "VAT Certificate"],
  ["director_id", "Director ID"],
  ["moa", "Memorandum of Association"],
  ["bank_letter", "Bank Letter"],
  ["other", "Other"]
];

export default function DocUploader({ partnerId }) {
  const supabase = createClient();
  const router = useRouter();
  const [docType, setDocType] = useState("trade_license");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function upload(e) {
    const file = e.target.files[0];
    if (!file || !partnerId) return;
    if (file.size > 5 * 1024 * 1024) { setMsg("Max file size is 5 MB."); return; }
    setBusy(true); setMsg("Uploading…");
    const path = `${partnerId}/${docType}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("kyc-documents").upload(path, file);
    if (upErr) { setMsg(upErr.message); setBusy(false); return; }
    const label = TYPES.find(([k]) => k === docType)?.[1];
    const { error: regErr } = await supabase.rpc("register_partner_document", {
      p_partner_id: partnerId, p_doc_type: docType, p_label: label,
      p_file_path: path, p_file_size_kb: Math.round(file.size / 1024)
    });
    setMsg(regErr ? regErr.message : "Uploaded — awaiting Riser review.");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="border-[1.5px] border-dashed border-line rounded-xl p-4">
      <div className="flex items-center gap-3">
        <select className="input !w-auto" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className={`btn btn-teal cursor-pointer ${busy ? "opacity-60 pointer-events-none" : ""}`}>
          {busy ? "Uploading…" : "Upload document"}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={upload} />
        </label>
      </div>
      {msg && <p className="text-[12px] text-muted mt-2">{msg}</p>}
      <p className="text-[11.5px] text-faint mt-2">PDF/JPG, max 5 MB.</p>
    </div>
  );
}
