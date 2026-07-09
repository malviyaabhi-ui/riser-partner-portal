"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function QuoteActions({ quote, surface }) {
  const supabase = createClient();
  const router = useRouter();
  const isAdmin = surface === "admin";

  async function setStatus(status) {
    const patch = { status };
    if (isAdmin && (status === "approved" || status === "declined")) {
      const { data: { user } } = await supabase.auth.getUser();
      patch.approved_by = user.id;
    }
    const { error } = await supabase.from("quotes").update(patch).eq("id", quote.id);
    if (error) { alert(error.message); return; }
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete draft ${quote.quote_no}? This cannot be undone.`)) return;
    await supabase.from("quote_items").delete().eq("quote_id", quote.id);
    const { error } = await supabase.from("quotes").delete().eq("id", quote.id);
    if (error) { alert(error.message); return; }
    router.push(isAdmin ? "/admin/quotes" : "/portal/quotes");
    router.refresh();
  }

  const s = quote.status;
  const btn = "btn !py-1.5 !px-3.5 !text-[12.5px]";

  return (
    <div className="flex gap-2 flex-wrap">
      <a href={`/print/quote/${quote.id}`} target="_blank" className={`${btn} btn-ghost`}>Print / PDF</a>

      {!isAdmin && <>
        {(s === "draft" || s === "approved") && (
          <button className={`${btn} btn-teal`} onClick={() => setStatus("sent")}>Mark as sent</button>
        )}
        {s === "sent" && <>
          <button className={`${btn} bg-good text-white`} onClick={() => setStatus("won")}>Mark won</button>
          <button className={`${btn} bg-bad/10 text-bad`} onClick={() => setStatus("lost")}>Mark lost</button>
          <button className={`${btn} btn-ghost`} onClick={() => setStatus("draft")}>Back to draft</button>
        </>}
        {(s === "lost" || s === "won") && (
          <button className={`${btn} btn-ghost`} onClick={() => setStatus("sent")}>Reopen</button>
        )}
        {s === "draft" && (
          <button className={`${btn} bg-bad/10 text-bad`} onClick={remove}>Delete draft</button>
        )}
      </>}

      {isAdmin && <>
        {s === "pending_approval" && <>
          <button className={`${btn} bg-good text-white`} onClick={() => setStatus("approved")}>Approve</button>
          <button className={`${btn} bg-bad/10 text-bad`} onClick={() => setStatus("declined")}>Decline</button>
        </>}
        {s === "declined" && (
          <button className={`${btn} bg-good text-white`} onClick={() => setStatus("approved")}>Approve after all</button>
        )}
        {(s === "draft" || s === "approved") && (
          <button className={`${btn} btn-teal`} onClick={() => setStatus("sent")}>Mark as sent</button>
        )}
        {s === "sent" && <>
          <button className={`${btn} bg-good text-white`} onClick={() => setStatus("won")}>Mark won</button>
          <button className={`${btn} bg-bad/10 text-bad`} onClick={() => setStatus("lost")}>Mark lost</button>
        </>}
        {(s === "won" || s === "lost") && (
          <button className={`${btn} btn-ghost`} onClick={() => setStatus("sent")}>Reopen</button>
        )}
      </>}
    </div>
  );
}
