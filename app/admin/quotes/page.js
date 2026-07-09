import { getSessionContext, fmtAED } from "@/lib/queries";
import QuoteApproval from "@/components/QuoteApproval";

export default async function AdminQuotes() {
  const { supabase } = await getSessionContext();
  const { data: quotes } = await supabase
    .from("quotes").select("*, partners(legal_name)")
    .order("created_at", { ascending: false });

  const pending = (quotes || []).filter((q) => q.status === "pending_approval");
  const rest = (quotes || []).filter((q) => q.status !== "pending_approval");

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display font-bold text-[22px]">Quote approvals</h1>
        <p className="text-muted text-[13px] mt-0.5">
          Quotes discounted below floor price require your sign-off before the partner can send them.
        </p>
      </div>

      <h2 className="font-display font-bold text-[15px] mb-3">Awaiting approval ({pending.length})</h2>
      <div className="card overflow-hidden mb-7">
        <table className="w-full">
          <thead><tr>
            <th className="th">Quote</th><th className="th">Partner</th><th className="th">Customer</th>
            <th className="th">Value</th><th className="th">Action</th>
          </tr></thead>
          <tbody>
            {pending.map((q) => (
              <tr key={q.id}>
                <td className="td font-mono text-[12px] text-faint">{q.quote_no}</td>
                <td className="td">{q.partners?.legal_name}</td>
                <td className="td">{q.customer_name}</td>
                <td className="td font-mono">{fmtAED(q.total_sell)}</td>
                <td className="td"><QuoteApproval quote={q} /></td>
              </tr>
            ))}
            {!pending.length && <tr><td className="td text-muted" colSpan={5}>Nothing waiting.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="font-display font-bold text-[15px] mb-3">All quotes</h2>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="th">Quote</th><th className="th">Partner</th><th className="th">Customer</th>
            <th className="th">Value</th><th className="th">Status</th>
          </tr></thead>
          <tbody>
            {rest.map((q) => (
              <tr key={q.id}>
                <td className="td font-mono text-[12px] text-faint">{q.quote_no}</td>
                <td className="td">{q.partners?.legal_name}</td>
                <td className="td">{q.customer_name}</td>
                <td className="td font-mono">{fmtAED(q.total_sell)}</td>
                <td className="td capitalize">{q.status.replace("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
