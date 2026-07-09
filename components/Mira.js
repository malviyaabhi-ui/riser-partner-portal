"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Mira() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mira-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ messages: next.slice(-12) })
        }
      );
      const data = await res.json();
      setMessages([...next, {
        role: "assistant",
        content: data.reply || data.error || "Sorry — something went wrong. Try again."
      }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Connection problem — try again." }]);
    }
    setBusy(false);
  }

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-40 w-13 h-13 rounded-full shadow-lg flex items-center justify-center
          bg-gradient-to-br from-teal to-[#3B7BF5] text-white w-[52px] h-[52px] hover:scale-105 transition"
        title="Ask Mira">
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z"/></svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-[84px] right-5 z-40 w-[360px] max-h-[540px] card shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-navy to-navy-3 text-white px-4 py-3">
            <div className="font-display font-bold text-[14px]">Mira</div>
            <div className="text-[11px] text-white/60">
              Your Riser assistant — pricing, quotes, documents, products.
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-[220px]">
            {!messages.length && (
              <div className="text-[12.5px] text-muted leading-relaxed">
                Try: <i>&quot;What&apos;s my price for 12 Riser Lumen screens?&quot;</i> or{" "}
                <i>&quot;Which of my documents expire soon?&quot;</i>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-[13px] leading-relaxed rounded-xl px-3 py-2 whitespace-pre-wrap
                ${m.role === "user" ? "bg-navy text-white ml-8" : "bg-page mr-4"}`}>
                {m.content}
              </div>
            ))}
            {busy && <div className="text-[12px] text-faint">Mira is thinking…</div>}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 p-3 border-t border-line">
            <input className="input" placeholder="Ask Mira…" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} />
            <button className="btn btn-teal shrink-0 !px-3" onClick={send} disabled={busy}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
