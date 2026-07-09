"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function QuoteBuilder({ products, partnerId }) {
  const supabase = createClient();
  const router = useRouter();
  const options = products.flatMap((p) =>
    p.variants?.length
      ? p.variants.filter((v) => v.buy != null).map((v) => ({
          key: v.id, variant_id: v.id, product_id: p.id,
          label: `${p.name} — ${v.name}`, unit: v.unit,
          msrp: Number(v.msrp_aed), buy: v.buy,
          discount: p.discount, floor: p.floor,
          desc: [p.tagline, v.note].filter(Boolean).join(" ")
            || p.description || ""
        }))
      : p.buy != null ? [{
          key: p.id, variant_id: null, product_id: p.id,
          label: p.name, unit: p.unit,
          msrp: Number(p.msrp_aed), buy: p.buy,
          discount: p.discount, floor: p.floor,
          desc: p.tagline || p.description || ""
        }] : []
  );

  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [validDays, setValidDays] = useState(30);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const opt = (key) => options.find((o) => o.key === key);
  function addItem() {
    if (!options.length) return;
    const o = options[0];
    setItems([...items, { key: o.key, qty: 1, unit_sell: o.msrp, long_desc: o.desc }]);
  }
  const setItem = (i, patch) =>
    setItems(items.map((it, x) => (x === i ? { ...it, ...patch } : it)));

  const totalSell = items.reduce((s, it) => s + it.qty * it.unit_sell, 0);
  const totalBuy = items.reduce((s, it) => s + it.qty * (opt(it.key)?.buy || 0), 0);
  const belowFloor = items.some((it) => {
    const o = opt(it.key);
    if (!o) return false;
    const floorPrice = o.msrp * (1 - (Number(o.discount) + Number(o.floor)) / 100);
    return it.unit_sell < floorPrice - 0.01;
  });

  async function save() {
    if (!customer || !items.length) { setMsg("Add a customer name and at least one item."); return; }
    setBusy(true); setMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    const { data: q, error } = await supabase.from("quotes").insert({
      partner_id: partnerId, customer_name: customer, customer_email: email,
      status: belowFloor ? "pending_approval" : "draft",
      total_sell: totalSell, total_buy: totalBuy,
      needs_approval: belowFloor, created_by: user.id,
      notes: notes || null, valid_days: Number(validDays) || 30
    }).select().single();
    if (error) { setMsg(error.message); setBusy(false); return; }
    const rows = items.map((it) => {
      const o = opt(it.key);
      return {
        quote_id: q.id, product_id: o.product_id, variant_id: o.variant_id,
        description: o.label, long_desc: it.long_desc || null,
        qty: it.qty, unit_buy: o.buy, unit_sell: it.unit_sell
      };
    });
    const { error: e2 } = await supabase.from("quote_items").insert(rows);
    if (e2) { setMsg(e2.message); setBusy(false); return; }
    setBusy(false);
    router.push(`/portal/quotes/${q.id}`);
    router.refresh();
  }

  if (!open) return <button className="btn btn-teal" onClick={() => setOpen(true)}>New quote</button>;

  return (
    <div className="card p-5">
      <h2 className="font-display font-bold text-[15px] mb-4">New quote</h2>
      <div className="grid grid-cols-3 gap-4 mb-4 max-md:grid-cols-1">
        <div><label className="field-label">Customer name</label>
          <input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
        <div><label className="field-label">Customer email (optional)</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="field-label">Quote valid for (days)</label>
          <input className="input font-mono" type="number" min="1" value={validDays}
            onChange={(e) => setValidDays(e.target.value)} /></div>
      </div>

      <div className="space-y-3">
        {items.map((it, i) => {
          const o = opt(it.key);
          const lineMargin = it.qty * (it.unit_sell - (o?.buy || 0));
          return (
            <div key={i} className="border border-line rounded-xl p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <select className="input !w-72" value={it.key}
                  onChange={(e) => {
                    const no = opt(e.target.value);
                    setItem(i, { key: e.target.value, unit_sell: no.msrp, long_desc: no.desc });
                  }}>
                  {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <div>
                  <label className="field-label">Qty</label>
                  <input className="input !w-20 font-mono" type="number" min="1" value={it.qty}
                    onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="field-label">Unit price (AED)</label>
                  <input className="input !w-32 font-mono" type="number" value={it.unit_sell}
                    onChange={(e) => setItem(i, { unit_sell: Number(e.target.value) })} />
                </div>
                <div className="text-[12px] text-faint leading-snug">
                  Your buy: <span className="font-mono">AED {Math.round(o?.buy)}</span> / {o?.unit}<br />
                  Line margin: <span className={`font-mono font-semibold ${lineMargin >= 0 ? "text-good" : "text-bad"}`}>
                    AED {Math.round(lineMargin).toLocaleString()}
                  </span>
                </div>
                <button className="ml-auto text-bad text-[12px]" onClick={() => setItems(items.filter((_, x) => x !== i))}>
                  Remove
                </button>
              </div>
              <div className="mt-3">
                <label className="field-label">Description on quotation (customer sees this)</label>
                <textarea className="input text-[12.5px]" rows={2} value={it.long_desc}
                  onChange={(e) => setItem(i, { long_desc: e.target.value })} />
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-ghost !py-1.5 !px-3 !text-[12px] mt-3" onClick={addItem}>+ Add item</button>

      <div className="mt-4">
        <label className="field-label">Notes on quotation (delivery, scope, terms — customer sees this)</label>
        <textarea className="input text-[12.5px]" rows={2} value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery within 2–3 weeks of order confirmation. Installation included for Dubai sites." />
      </div>

      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-line text-[13px] flex-wrap">
        <div>Total: <b className="font-mono">AED {totalSell.toLocaleString()}</b></div>
        <div>Your margin: <b className="font-mono text-good">AED {Math.round(totalSell - totalBuy).toLocaleString()}</b></div>
        {belowFloor && <span className="pill pill-amber">Below floor — needs Riser approval</span>}
        <div className="ml-auto flex gap-2">
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-teal" onClick={save} disabled={busy}>
            {busy ? "Saving…" : belowFloor ? "Submit for approval" : "Save quote"}
          </button>
        </div>
      </div>
      {msg && <p className="text-[12.5px] text-warn mt-2">{msg}</p>}
    </div>
  );
}
