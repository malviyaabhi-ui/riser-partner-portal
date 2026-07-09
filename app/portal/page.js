import Link from "next/link";
import { getSessionContext, fmtAED } from "@/lib/queries";

export default async function Dashboard() {
  const { supabase, profile, partner } = await getSessionContext();

  const [{ data: quotes }, { data: docs }, { data: news }] = await Promise.all([
    supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("partner_documents").select("*").order("created_at"),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(3)
  ]);

  const won = (quotes || []).filter((q) => q.status === "won");
  const revenue = won.reduce((s, q) => s + Number(q.total_sell || 0), 0);
  const open = (quotes || []).filter((q) => ["draft", "pending_approval", "sent"].includes(q.status));
  const expiring = (docs || []).filter((d) =>
    d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 30 * 864e5));

  const statusPill = {
    draft: "pill-navy", pending_approval: "pill-amber", approved: "pill-teal",
    sent: "pill-teal", won: "pill-green", lost: "pill-red", declined: "pill-red"
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[22px]">
            Welcome back, {profile?.full_name?.split(" ")[0] || "partner"}
          </h1>
          <p className="text-muted text-[13px] mt-0.5">
            Here&apos;s how {partner?.legal_name} is doing.
          </p>
        </div>
        <Link href="/portal/quotes" className="btn btn-teal">New quote</Link>
      </div>

      {expiring.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3.5 mb-5 text-[13px] text-[#7A4E12]">
          <span className="font-semibold">
            {expiring.length} document{expiring.length > 1 ? "s" : ""} expiring within 30 days.
          </span>
          <span>Upload renewals to keep pricing access active.</span>
          <Link href="/portal/company" className="btn btn-ghost !py-1 !px-3 !text-[12px] ml-auto shrink-0">Update</Link>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
        <div className="card p-4"><div className="stat-label">Revenue (won)</div>
          <div className="stat-value">{fmtAED(revenue)}</div></div>
        <div className="card p-4"><div className="stat-label">Won deals</div>
          <div className="stat-value">{won.length}</div></div>
        <div className="card p-4"><div className="stat-label">Open quotes</div>
          <div className="stat-value">{open.length}</div></div>
        <div className="card p-4"><div className="stat-label">Documents</div>
          <div className="stat-value">{(docs || []).length}</div></div>
      </div>

      <h2 className="font-display font-bold text-[15px] mt-7 mb-3">Recent quotes</h2>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="th">Quote</th><th className="th">Customer</th>
            <th className="th">Value</th><th className="th">Status</th>
          </tr></thead>
          <tbody>
            {(quotes || []).map((q) => (
              <tr key={q.id}>
                <td className="td font-mono text-[12px] text-faint">{q.quote_no}</td>
                <td className="td">{q.customer_name}</td>
                <td className="td font-mono">{fmtAED(q.total_sell)}</td>
                <td className="td"><span className={`pill ${statusPill[q.status] || "pill-navy"}`}>{q.status.replace("_", " ")}</span></td>
              </tr>
            ))}
            {!quotes?.length && (
              <tr><td className="td text-muted" colSpan={4}>
                No quotes yet — create your first from Products &amp; Pricing.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!!news?.length && (
        <>
          <h2 className="font-display font-bold text-[15px] mt-7 mb-3">From Riser</h2>
          <div className="card p-4 space-y-3">
            {news.map((n) => (
              <p key={n.id} className="text-[13px] leading-relaxed text-muted">
                <b className="text-ink">{n.title}</b> — {n.body}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
