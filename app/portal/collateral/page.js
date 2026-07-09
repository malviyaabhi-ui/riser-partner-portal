import { getSessionContext } from "@/lib/queries";
import CollateralRow from "@/components/CollateralRow";

export default async function Collateral() {
  const { supabase } = await getSessionContext();
  const { data: files } = await supabase
    .from("collateral").select("*, products(name)").order("updated_at", { ascending: false });

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display font-bold text-[22px]">Collateral Library</h1>
        <p className="text-muted text-[13px] mt-0.5">Always the latest version — Riser updates these centrally.</p>
      </div>
      <div className="card overflow-hidden divide-y divide-line">
        {(files || []).map((f) => <CollateralRow key={f.id} file={f} />)}
        {!files?.length && <p className="p-4 text-muted text-[13px]">Nothing here yet.</p>}
      </div>
    </div>
  );
}
