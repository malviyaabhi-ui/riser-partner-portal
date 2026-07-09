"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProductEditor({ product }) {
  const supabase = createClient();
  const router = useRouter();
  const [f, setF] = useState({
    name: product.name || "",
    category: product.category || "SaaS",
    unit: product.unit || "",
    tagline: product.tagline || "",
    description: product.description || "",
    details: product.details || "",
    website_url: product.website_url || "",
    highlights: Array.isArray(product.highlights) ? product.highlights.join("\n") : ""
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setBusy(true); setMsg("");
    const highlights = f.highlights.split("\n").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("products").update({
      name: f.name, category: f.category, unit: f.unit,
      tagline: f.tagline, description: f.description,
      details: f.details, website_url: f.website_url, highlights
    }).eq("id", product.id);
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg("Saved.");
    router.refresh();
  }

  return (
    <div className="card p-6 max-w-3xl space-y-4">
      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <div><label className="field-label">Product name</label>
          <input className="input" value={f.name} onChange={set("name")} /></div>
        <div><label className="field-label">Category</label>
          <select className="input" value={f.category} onChange={set("category")}>
            <option>SaaS</option><option>Hardware</option><option>Service</option>
          </select></div>
        <div><label className="field-label">Pricing unit</label>
          <input className="input" value={f.unit} onChange={set("unit")} placeholder="per room/month" /></div>
      </div>

      <div><label className="field-label">Tagline (one line under the name)</label>
        <input className="input" value={f.tagline} onChange={set("tagline")}
          placeholder="Smart workspace management for modern teams" /></div>

      <div><label className="field-label">Short description (shown on the pricing card)</label>
        <textarea className="input" rows={2} value={f.description} onChange={set("description")} /></div>

      <div><label className="field-label">Key highlights (one per line — shown as a feature list)</label>
        <textarea className="input font-mono text-[12.5px]" rows={5} value={f.highlights} onChange={set("highlights")}
          placeholder={"Room booking with week grid\nDoor displays with token pairing\nVisitor management"} /></div>

      <div><label className="field-label">Full details (long-form — positioning, specs, target customers, deployment notes)</label>
        <textarea className="input" rows={10} value={f.details} onChange={set("details")} /></div>

      <div><label className="field-label">Product website URL</label>
        <input className="input" value={f.website_url} onChange={set("website_url")}
          placeholder="https://spaciohub.com" /></div>

      <div className="flex items-center gap-3 pt-2">
        <button className="btn btn-teal" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save product information"}
        </button>
        {msg && <span className="text-[12.5px] text-muted">{msg}</span>}
      </div>
    </div>
  );
}
