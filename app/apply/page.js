"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DOCS = [
  { key: "trade_license",   label: "Trade License / Business Registration", required: true },
  { key: "vat_certificate", label: "VAT Certificate / TIN",                 required: true },
  { key: "director_id",     label: "Owner / Director ID or Passport",       required: true },
  { key: "moa",             label: "Memorandum of Association",             required: false },
  { key: "bank_letter",     label: "Bank Letter / Account Details",         required: false }
];

export default function Apply() {
  const supabase = createClient();
  const [form, setForm] = useState({
    legal_name: "", type: "reseller", country: "", registration_no: "", vat_no: "",
    address: "", contact_name: "", contact_email: "", contact_phone: "", password: ""
  });
  const [files, setFiles] = useState({});
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    for (const d of DOCS) if (d.required && !files[d.key]) {
      setStatus(`Please attach: ${d.label}`); return;
    }
    setSubmitting(true); setStatus("Creating your account…");

    // 1. auth signup
    const { data: auth, error: authErr } = await supabase.auth.signUp({
      email: form.contact_email, password: form.password
    });
    if (authErr) { setStatus(authErr.message); setSubmitting(false); return; }
    const uid = auth.user?.id;

    // 2. partner row (status: application) via RPC to bypass RLS pre-approval
    setStatus("Submitting application…");
    const { data: partnerId, error: appErr } = await supabase.rpc("submit_partner_application", {
      p_legal_name: form.legal_name, p_type: form.type, p_country: form.country,
      p_registration_no: form.registration_no, p_vat_no: form.vat_no, p_address: form.address,
      p_contact_name: form.contact_name, p_contact_email: form.contact_email,
      p_contact_phone: form.contact_phone
    });
    if (appErr) { setStatus(appErr.message); setSubmitting(false); return; }

    // 3. upload documents
    for (const d of DOCS) {
      const file = files[d.key];
      if (!file) continue;
      setStatus(`Uploading ${d.label}…`);
      const path = `${partnerId}/${d.key}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("kyc-documents").upload(path, file);
      if (upErr) { setStatus(`Upload failed (${d.label}): ${upErr.message}`); setSubmitting(false); return; }
      await supabase.rpc("register_partner_document", {
        p_partner_id: partnerId, p_doc_type: d.key, p_label: d.label,
        p_file_path: path, p_file_size_kb: Math.round(file.size / 1024)
      });
    }
    setDone(true);
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-navy-2 p-4">
      <div className="card p-8 max-w-md text-center">
        <div className="w-12 h-12 rounded-full bg-good/10 text-good flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h1 className="font-display font-bold text-lg mb-2">Application submitted</h1>
        <p className="text-muted text-[13px] leading-relaxed">
          The Riser team will review your documents and email you once your account is
          approved. You can then sign in to see your pricing and start quoting.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-2 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl text-white">Become a Riser partner</h1>
          <p className="text-white/60 text-[13px] mt-2">
            Resell SpacioHub, Nexus AI Panels, SocialWiFiOnline and Riser Lumen across your market.
          </p>
        </div>
        <form onSubmit={submit} className="card p-6 space-y-5">
          <h2 className="font-display font-bold">Company details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="field-label">Legal company name</label>
              <input className="input" value={form.legal_name} onChange={set("legal_name")} required /></div>
            <div><label className="field-label">Partner type</label>
              <select className="input" value={form.type} onChange={set("type")}>
                <option value="reseller">Reseller</option>
                <option value="distributor">Distributor</option>
              </select></div>
            <div><label className="field-label">Country</label>
              <input className="input" value={form.country} onChange={set("country")} required /></div>
            <div><label className="field-label">Registration no.</label>
              <input className="input" value={form.registration_no} onChange={set("registration_no")} required /></div>
            <div><label className="field-label">VAT / TIN</label>
              <input className="input" value={form.vat_no} onChange={set("vat_no")} /></div>
            <div className="col-span-2"><label className="field-label">Registered address</label>
              <input className="input" value={form.address} onChange={set("address")} required /></div>
          </div>

          <h2 className="font-display font-bold pt-2">Primary contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="field-label">Full name</label>
              <input className="input" value={form.contact_name} onChange={set("contact_name")} required /></div>
            <div><label className="field-label">Phone</label>
              <input className="input" value={form.contact_phone} onChange={set("contact_phone")} required /></div>
            <div><label className="field-label">Email (your login)</label>
              <input className="input" type="email" value={form.contact_email} onChange={set("contact_email")} required /></div>
            <div><label className="field-label">Choose a password</label>
              <input className="input" type="password" minLength={8} value={form.password} onChange={set("password")} required /></div>
          </div>

          <h2 className="font-display font-bold pt-2">Company documents</h2>
          <p className="text-[12.5px] text-muted -mt-3">
            PDF or JPG, max 5 MB each. Your account activates once Riser verifies these.
          </p>
          <div className="space-y-3">
            {DOCS.map((d) => (
              <div key={d.key} className="flex items-center gap-3 border border-line rounded-lg px-3 py-2.5">
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{d.label}
                    {d.required && <span className="text-bad"> *</span>}</div>
                  {files[d.key] && <div className="text-[11.5px] text-faint font-mono">{files[d.key].name}</div>}
                </div>
                <label className="btn btn-ghost !py-1.5 !px-3 text-[12px] cursor-pointer">
                  {files[d.key] ? "Replace" : "Attach"}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                    onChange={(e) => setFiles({ ...files, [d.key]: e.target.files[0] })} />
                </label>
              </div>
            ))}
          </div>

          {status && <p className="text-[12.5px] text-warn">{status}</p>}
          <button className="btn btn-teal w-full justify-center" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </form>
      </div>
    </div>
  );
}
