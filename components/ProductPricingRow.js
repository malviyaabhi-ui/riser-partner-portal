"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProductVisibility from "@/components/ProductVisibility";

const TIERS = ["silver", "gold", "platinum"];

export default function ProductPricingRow({ product, bands }) {
  const supabase = createClient();
  const router = useRouter();
  const [msrp, setMsrp] = useState(product.msrp_aed);
  const [disc, setDisc] = useState(() => {
    const d = {};
    TIERS.forEach((t) => {
      const b = bands.find((x) => x.tier === t);
      d[t] = b ? b.discount_pct : "";
    });
    return d;
  });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { error: e1 } = await supabase
      .from("products").update({ msrp_aed: Number(msrp) }).eq("id", product.id);
    if (e1) { alert(e1.message); setBusy(false); return; }
    for (const t of TIERS) {
      if (disc[t] === "" || disc[t] == null) continue;
      const { error: e2 } = await supabase
        .from("tier_pricing")
        .upsert({ product_id: product.id, tier: t, discount_pct: Number(disc[t]) },
                { onConflict: "product_id,tier" });
      if (e2) { alert(e2.message); setBusy(false); return; }
    }
    setBusy(false); setDirty(false);
    router.refresh();
  }

  return (
    <div className={`flex items-center gap-4 px-4 py-3.5 ${!product.visible ? "opacity-55 bg-page/60" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-[14px]">{product.name}</div>
        <div className="text-[11.5px] text-faint">{product.category} · {product.unit}</div>
      </div>

      <div className="w-28">
        <div className="text-[10px] uppercase text-faint font-semibold text-right mb-1">MSRP (AED)</div>
        <input type="number" step="any"
          className="input !py-1 !px-2 font-mono text-right text-[12.5px]"
          value={msrp}
          onChange={(e) => { setMsrp(e.target.value); setDirty(true); }} />
      </div>

      {TIERS.map((t) => (
        <div key={t} className="w-[72px]">
          <div className="text-[10px] uppercase text-faint font-semibold text-right mb-1">{t} −%</div>
          <input type="number" step="any" min="0" max="90"
            className="input !py-1 !px-2 font-mono text-right text-[12.5px]"
            value={disc[t]}
            onChange={(e) => { setDisc({ ...disc, [t]: e.target.value }); setDirty(true); }} />
        </div>
      ))}

      <div className="w-[76px]">
        {dirty ? (
          <button className="btn btn-teal !py-1.5 !px-3 !text-[12px] w-full justify-center"
            onClick={save} disabled={busy}>
            {busy ? "…" : "Save"}
          </button>
        ) : (
          <div className="text-center text-[11px] text-faint">Saved</div>
        )}
      </div>

      <ProductVisibility product={product} />
    </div>
  );
}
