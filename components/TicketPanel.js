"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PILL = {
  open: "pill-red", in_progress: "pill-teal", awaiting_partner: "pill-amber",
  awaiting_riser: "pill-amber", resolved: "pill-green", closed: "pill-navy"
};

export default function TicketPanel({ tickets, partnerId, surface }) {
  const supabase = createClient();
  const router = useRouter();
  const [openNew, setOpenNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [body, setBody] = useState("");
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");
  const isAdmin = surface === "admin";

  async function createTicket() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: t, error } = await supabase.from("tickets")
      .insert({ partner_id: partnerId, subject, category, created_by: user.id })
      .select().single();
    if (error) { alert(error.message); return; }
    if (body) await supabase.from("ticket_messages")
      .insert({ ticket_id: t.id, author_id: user.id, body });
    setOpenNew(false); setSubject(""); setBody("");
    router.refresh();
  }

  async function sendReply(t) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ticket_messages").insert({ ticket_id: t.id, author_id: user.id, body: reply });
    if (isAdmin) await supabase.from("tickets").update({ status: "awaiting_partner", updated_at: new Date().toISOString() }).eq("id", t.id);
    else await supabase.from("tickets").update({ status: "awaiting_riser", updated_at: new Date().toISOString() }).eq("id", t.id);
    setReply("");
    router.refresh();
  }

  async function setStatus(t, status) {
    await supabase.from("tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", t.id);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="font-display font-bold text-[22px]">
            {isAdmin ? "Partner tickets" : "Support Tickets"}
          </h1>
          <p className="text-muted text-[13px] mt-0.5">
            {isAdmin ? "Support requests from all partners." : "Raise technical, billing or sales-support tickets with the Riser team."}
          </p>
        </div>
        {!isAdmin && <button className="btn btn-teal" onClick={() => setOpenNew(!openNew)}>New ticket</button>}
      </div>

      {openNew && (
        <div className="card p-5 mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="field-label">Subject</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><label className="field-label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="sales_support">Sales support</option>
                <option value="customer_issue">Customer issue</option>
                <option value="other">Other</option>
              </select></div>
          </div>
          <div><label className="field-label">Describe the issue</label>
            <textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <button className="btn btn-teal" onClick={createTicket}>Submit ticket</button>
        </div>
      )}

      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="card">
            <button className="w-full flex items-center gap-4 px-4 py-3.5 text-left"
              onClick={() => setActive(active === t.id ? null : t.id)}>
              <span className="font-mono text-[12px] text-faint">{t.ticket_no}</span>
              <span className="flex-1 text-[13px] font-semibold">{t.subject}</span>
              <span className="text-[12px] text-faint capitalize">{t.category.replace("_", " ")}</span>
              <span className={`pill ${PILL[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
            </button>
            {active === t.id && (
              <div className="border-t border-line px-4 py-4 space-y-3">
                {(t.ticket_messages || [])
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                  .map((m) => (
                  <div key={m.id} className="text-[13px]">
                    <span className="text-faint font-mono text-[11px]">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                    <p className="mt-0.5 leading-relaxed">{m.body}</p>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <input className="input" placeholder="Write a reply…" value={reply}
                    onChange={(e) => setReply(e.target.value)} />
                  <button className="btn btn-teal shrink-0" onClick={() => sendReply(t)}>Send</button>
                  {isAdmin && t.status !== "resolved" && (
                    <button className="btn btn-ghost shrink-0" onClick={() => setStatus(t, "resolved")}>Resolve</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {!tickets.length && <p className="text-muted text-[13px]">No tickets yet.</p>}
      </div>
    </div>
  );
}
