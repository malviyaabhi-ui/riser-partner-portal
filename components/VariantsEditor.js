"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BILLING = [["monthly","Monthly"],["yearly","Yearly"],["one_time","One-time"]];
const AVAIL = [["n_a","—"],["in_stock","In stock"],["on_order","On order"]];
const blank = { name: "", unit: "", billing: "monthly", msrp_aed: "", amc_pct: "", availability: "n_a", note: "", visible: true, sort_order: 100 };

export default function VariantsEditor({ productId, variants }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState(variants.map((v) => ({ ...v, amc_pct: v.amc_pct ?? "", note: v.note ?? "", dirty: false })));
  const [adding, setAdding] = useState(null);
  const [busy, setBusy] = useState(false);

  const setRow = (i, patch) =>
    setRows(rows.map((r, x) => (x === i ? { ...r, ...patch, dirty: true } : r)));

  async function saveRow(i) {
    const r = rows[i];
    setBusy(true);
    const { error } = await supabase.from("product_variants").update({
      name: r.name, unit: r.unit, billing: r.billing,
      msrp_aed: Number(r.msrp_aed),
      amc_pct: r.amc_pct === "" ? null : Number(r.amc_pct),
      availability: r.availability, note: r.note || null,
      visible: r.visible, sort_order: Number(r.sort_order) || 100
    }).eq("id", r.id);
    setBusy(false);
    if (error) { alert(error.message); return; }
    setRows(rows.map((x, idx) => (idx === i ? { ...x, dirty: false } : x)));
    router.refresh();
  }

  async function removeRow(i) {
    if (!confirm(`Delete variant "${rows[i].name}"?`)) return;
    const { error } = await supabase.from("product_variants").delete().eq("id", rows[i].id);
    if (error) { alert(error.message); return; }
    setRows(rows.filter((_, x) => x !== i));
    router.refresh();
  }

  async function addNew() {
    setBusy(true);
    const { data, error } = await supabase.from("product_variants").insert({
      product_id: productId, name: adding.name, unit: adding.unit,
      billing: adding.billing, msrp_aed: Number(adding.msrp_aed || 0),
      amc_pct: adding.amc_pct === "" ? null : Number(adding.amc_pct),
      availability: adding.availability, note: adding.note || null,
      visible: true, sort_order: Number(adding.sort_order) || 100
    }).select().single();
    setBusy(false);
    if (error) { alert(error.message); return; }
    setRows([...rows, { ...data, amc_pct: data.amc_pct ?? "", note: data.note ?? "", dirty: false }]);
    setAdding(null);
    router.refresh();
  }

  const Fields = ({ v, onChange }) => (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-3"><label className="field-label">Variant name</label>
        <input className="input !py-1.5" value={v.name} onChange={(e) => onChange({ name: e.target.value })} /></div>
      <div className="col-span-2"><label className="field-label">Unit</label>
        <input className="input !py-1.5" value={v.unit} placeholder="per unit" onChange={(e) => onChange({ unit: e.target.value })} /></div>
      <div className="col-span-2"><label className="field-label">Billing</label>
        <select className="input !py-1.5" value={v.billing} onChange={(e) => onChange({ billing: e.target.value })}>
          {BILLING.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select></div>
      <div className="col-span-2"><label className="field-label">MSRP (AED)</label>
        <input type="number" step="any" className="input !py-1.5 font-mono" value={v.msrp_aed} onChange={(e) => onChange({ msrp_aed: e.target.value })} /></div>
      <div className="col-span-1"><label className="field-label">AMC %</label>
        <input type="number" step="any" className="input !py-1.5 font-mono" value={v.amc_pct} onChange={(e) => onChange({ amc_pct: e.target.value })} /></div>
      <div className="col-span-2"><label className="field-label">Availability</label>
        <select className="input !py-1.5" value={v.availability} onChange={(e) => onChange({ availability: e.target.value })}>
          {AVAIL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select></div>
      <div className="col-span-10"><label className="field-label">Note (shown to partners)</label>
        <input className="input !py-1.5" value={v.note} onChange={(e) => onChange({ note: e.target.value })} /></div>
      <div className="col-span-2"><label className="field-label">Sort</label>
        <input type="number" className="input !py-1.5 font-mono" value={v.sort_order} onChange={(e) => onChange({ sort_order: e.target.value })} /></div>
    </div>
  );

  return (
    <div className="card p-6 max-w-3xl mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-[15px]">Variants ({rows.length})</h2>
        {!adding && (
          <button className="btn btn-ghost !py-1.5 !px-3 !text-[12px]" onClick={() => setAdding({ ...blank })}>
            + Add variant
          </button>
        )}
      </div>

      <div className="space-y-4">
        {rows.map((v, i) => (
          <div key={v.id} className="border border-line rounded-xl p-4">
            <Fields v={v} onChange={(patch) => setRow(i, patch)} />
            <div className="flex items-center gap-3 mt-3">
              <label className="flex items-center gap-2 text-[12.5px]">
                <input type="checkbox" checked={v.visible}
                  onChange={(e) => setRow(i, { visible: e.target.checked })} />
                Visible to partners
              </label>
              <div className="ml-auto flex gap-2">
                <button className="text-bad text-[12px]" onClick={() => removeRow(i)}>Delete</button>
                {v.dirty && (
                  <button className="btn btn-teal !py-1.5 !px-4 !text-[12px]" disabled={busy} onClick={() => saveRow(i)}>
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {adding && (
          <div className="border-[1.5px] border-dashed border-teal/50 rounded-xl p-4 bg-teal/5">
            <Fields v={adding} onChange={(patch) => setAdding({ ...adding, ...patch })} />
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn btn-ghost !py-1.5 !px-3 !text-[12px]" onClick={() => setAdding(null)}>Cancel</button>
              <button className="btn btn-teal !py-1.5 !px-4 !text-[12px]" disabled={busy || !adding.name} onClick={addNew}>
                Add variant
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-[11.5px] text-faint mt-4">
        Tier discounts apply at product level across all variants. AMC % applies to one-time
        (perpetual) variants — shown to partners as annual maintenance on top of licence value.
      </p>
    </div>
  );
}
