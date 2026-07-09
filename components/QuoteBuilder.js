"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function QuoteBuilder({ products, partnerId }) {
  const supabase = createClient();
  const router = useRouter();
  // flatten: every visible variant is a sellable option; products without variants sell as themselves
  const options = products.flatMap((p) =>
    p.variants?.length
      ? p.variants.filter((v) => v.buy != null).map((v) => ({
          key: v.id, variant_id: v.id, product_id: p.id,
          label: `${p.name} — ${v.name}`, unit: v.unit,
          msrp: Number(v.msrp_aed), buy: v.buy,
          discount: p.discount, floor: p.floor
        }))
      : p.buy != null ? [{
          key: p.id, variant_id: null, product_id: p.id,
          label: p.name, unit: p.unit,
          msrp: Number(p.msrp_aed), buy: p.buy,
          discount: p.discount, floor: p.floor
        }] : []
  );

  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function addItem() {
    if (!options.length) return;
    const o = options[0];
    setItems([...items, { key: o.key, qty: 1, unit_sell: o.msrp }]);
  }
  const opt = (key) => options.find((o) => o.key === key);
  const setItem = (i, patch) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

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
      needs_approval: belowFloor, created_by: user.id
    }).select().single();
    if (error) { setMsg(error.message); setBusy(false); return; }
    const rows = items.map((it) => {
      const o = opt(it.key);
      return {
        quote_id: q.id, product_id: o.product_id, variant_id: o.variant_id,
        description: o.label, qty: it.qty, unit_buy: o.buy, unit_sell: it.unit_sell
      };
    });
    const { error: e2 } = await supabase.from("quote_items").insert(rows);
    if (e2) { setMsg(e2.message); setBusy(false); return; }
    setOpen(false); setItems([]); setCustomer(""); setEmail(""); setBusy(false);
    router.refresh();
  }

  if (!open) return <button className="btn btn-teal" onClick={() => setOpen(true)}>New quote</button>;

  return (
    <div className="card p-5">
      <h2 className="font-display font-bold text-[15px] mb-4">New quote</h2>
      <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
        <div><label className="field-label">Customer name</label>
          <input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
        <div><label className="field-label">Customer email (optional)</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>

      {items.map((it, i) => {
        const o = opt(it.key);
        return (
          <div key={i} className="flex items-center gap-3 mb-2.5 flex-wrap">
            <select className="input !w-72" value={it.key}
              onChange={(e) => {
                const no = opt(e.target.value);
                setItem(i, { key: e.target.value, unit_sell: no.msrp });
              }}>
              {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <input className="input !w-20" type="number" min="1" value={it.qty}
              onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
            <div className="text-[12px] text-faint font-mono">buy {Math.round(o?.buy)}</div>
            <input className="input !w-28 font-mono" type="number" value={it.unit_sell}
              onChange={(e) => setItem(i, { unit_sell: Number(e.target.value) })} />
            <span className="text-[11px] text-faint">{o?.unit}</span>
            <button className="text-bad text-[12px]" onClick={() => setItems(items.filter((_, x) => x !== i))}>Remove</button>
          </div>
        );
      })}
      <button className="btn btn-ghost !py-1.5 !px-3 !text-[12px]" onClick={addItem}>+ Add item</button>

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
