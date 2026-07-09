"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PartnerActions({ partner }) {
  const supabase = createClient();
  const router = useRouter();

  async function update(patch) {
    const { error } = await supabase.from("partners").update(patch).eq("id", partner.id);
    if (error) alert(error.message);
    router.refresh();
  }

  async function approve() {
    const { error } = await supabase.rpc("approve_partner", { p_partner_id: partner.id });
    if (error) alert(error.message);
    router.refresh();
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {["application", "in_review"].includes(partner.status) && (
        <button className="btn bg-good text-white" onClick={approve}>Approve partner</button>
      )}
      <select className="input !w-auto" value={partner.tier}
        onChange={(e) => update({ tier: e.target.value })}>
        <option value="silver">Silver</option>
        <option value="gold">Gold</option>
        <option value="platinum">Platinum</option>
      </select>
      {partner.status === "active" && (
        <button className="btn bg-bad/10 text-bad" onClick={() => update({ status: "suspended" })}>Suspend</button>
      )}
      {["suspended", "pricing_paused"].includes(partner.status) && (
        <button className="btn bg-good text-white" onClick={() => update({ status: "active" })}>Reactivate</button>
      )}
    </div>
  );
}
