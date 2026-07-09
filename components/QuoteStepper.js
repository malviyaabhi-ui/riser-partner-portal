export default function QuoteStepper({ quote }) {
  const s = quote.status;
  const steps = [
    { key: "draft", label: "Draft" },
    ...(quote.needs_approval ? [{ key: "approval", label: "Riser approval" }] : []),
    { key: "sent", label: "Sent to customer" },
    { key: "outcome", label: s === "lost" ? "Lost" : s === "declined" ? "Declined" : "Won" }
  ];

  const reached = (key) => {
    const order = ["draft", "approval", "sent", "outcome"];
    const cur =
      s === "draft" ? "draft" :
      s === "pending_approval" ? "approval" :
      s === "approved" ? "approval" :
      s === "sent" ? "sent" :
      "outcome"; // won / lost / declined
    return order.indexOf(key) <= order.indexOf(cur);
  };
  const bad = s === "lost" || s === "declined";

  return (
    <div className="flex items-center gap-0 my-4 flex-wrap">
      {steps.map((st, i) => {
        const on = reached(st.key);
        const isLast = i === steps.length - 1;
        return (
          <div key={st.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                ${on ? (isLast && bad ? "bg-bad text-white" : "bg-teal text-white") : "bg-line text-faint"}`}>
                {on ? (isLast && bad ? "✕" : "✓") : i + 1}
              </span>
              <span className={`text-[12.5px] font-semibold ${on ? "text-ink" : "text-faint"}`}>{st.label}</span>
            </div>
            {i < steps.length - 1 && (
              <span className={`w-10 h-[2px] mx-2.5 ${reached(steps[i + 1].key) ? "bg-teal" : "bg-line"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
