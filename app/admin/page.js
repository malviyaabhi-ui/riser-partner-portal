import Link from "next/link";
import { getSessionContext, fmtAED } from "@/lib/queries";

export default async function AdminOverview() {
  const { supabase } = await getSessionContext();
  const [{ data: partners }, { data: quotes }, { data: docs }, { data: tickets }] = await Promise.all([
    supabase.from("partners").select("*"),
    supabase.from("quotes").select("*"),
    supabase.from("partner_documents").select("*"),
    supabase.from("tickets").select("*").neq("status", "resolved").neq("status", "closed")
  ]);

  const active = (partners || []).filter((p) => p.status === "active");
  const applications = (partners || []).filter((p) => ["application", "in_review"].includes(p.status));
  const revenue = (quotes || []).filter((q) => q.status === "won")
    .reduce((s, q) => s + Number(q.total_sell || 0), 0);
  const pendingQuotes = (quotes || []).filter((q) => q.status === "pending_approval");
  const expiring = (docs || []).filter((d) =>
    d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 30 * 864e5));

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="font-display font-bold text-[22px]">Channel overview</h1>
          <p className="text-muted text-[13px] mt-0.5">All partners, all products — at a glance.</p>
        </div>
        {applications.length > 0 && (
          <Link href="/admin/applications" className="btn btn-navy">
            Review {applications.length} application{applications.length > 1 ? "s" : ""}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
        <div className="card p-4"><div className="stat-label">Active partners</div>
          <div className="stat-value">{active.length}</div></div>
        <div className="card p-4"><div className="stat-label">Channel revenue (won)</div>
          <div className="stat-value">{fmtAED(revenue)}</div></div>
        <div className="card p-4"><div className="stat-label">Pending approvals</div>
          <div className="stat-value">{applications.length + pendingQuotes.length}</div>
          <div className="text-[12px] text-warn mt-1.5">{applications.length} KYC · {pendingQuotes.length} quotes</div></div>
        <div className="card p-4"><div className="stat-label">Docs expiring ≤30d</div>
          <div className="stat-value">{expiring.length}</div></div>
      </div>

      <h2 className="font-display font-bold text-[15px] mt-7 mb-3">Needs your action</h2>
      <div className="card overflow-hidden">
        <table className="w-full"><tbody>
          {applications.map((p) => (
            <tr key={p.id}>
              <td className="td"><b>KYC review</b> — {p.legal_name} ({p.country})</td>
              <td className="td text-right"><Link href="/admin/applications" className="btn btn-ghost !py-1.5 !px-3 !text-[12px]">Review</Link></td>
            </tr>
          ))}
          {pendingQuotes.map((q) => (
            <tr key={q.id}>
              <td className="td"><b>Discount approval</b> — {q.quote_no}, {q.customer_name}</td>
              <td className="td text-right"><Link href="/admin/quotes" className="btn btn-ghost !py-1.5 !px-3 !text-[12px]">Review</Link></td>
            </tr>
          ))}
          {tickets?.slice(0, 3).map((t) => (
            <tr key={t.id}>
              <td className="td"><b>Open ticket</b> — {t.ticket_no}: {t.subject}</td>
              <td className="td text-right"><Link href="/admin/tickets" className="btn btn-ghost !py-1.5 !px-3 !text-[12px]">Open</Link></td>
            </tr>
          ))}
          {!applications.length && !pendingQuotes.length && !tickets?.length && (
            <tr><td className="td text-muted">All clear — nothing waiting on you.</td></tr>
          )}
        </tbody></table>
      </div>
    </div>
  );
}
