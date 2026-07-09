import Link from "next/link";
import { getSessionContext, fmtAED } from "@/lib/queries";

const STATUS_PILL = {
  active: "pill-green", pricing_paused: "pill-amber", suspended: "pill-red",
  in_review: "pill-amber", application: "pill-navy", rejected: "pill-red"
};

export default async function Partners() {
  const { supabase } = await getSessionContext();
  const [{ data: partners }, { data: quotes }] = await Promise.all([
    supabase.from("partners").select("*").order("created_at"),
    supabase.from("quotes").select("partner_id,total_sell,status")
  ]);

  const revenueOf = (id) => (quotes || [])
    .filter((q) => q.partner_id === id && q.status === "won")
    .reduce((s, q) => s + Number(q.total_sell || 0), 0);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display font-bold text-[22px]">Partners</h1>
        <p className="text-muted text-[13px] mt-0.5">Click a partner for full detail — documents, pricing, performance.</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="th">Partner</th><th className="th">Type</th><th className="th">Tier</th>
            <th className="th">Country</th><th className="th">Revenue (won)</th><th className="th">Status</th>
          </tr></thead>
          <tbody>
            {(partners || []).map((p) => (
              <tr key={p.id} className="hover:bg-page/60">
                <td className="td">
                  <Link href={`/admin/partners/${p.id}`} className="font-semibold text-navy hover:underline">
                    {p.legal_name}
                  </Link>
                </td>
                <td className="td capitalize">{p.type}</td>
                <td className="td"><span className="pill pill-gold capitalize">{p.tier}</span></td>
                <td className="td">{p.country}</td>
                <td className="td font-mono">{fmtAED(revenueOf(p.id))}</td>
                <td className="td"><span className={`pill ${STATUS_PILL[p.status]}`}>{p.status.replace("_", " ")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
