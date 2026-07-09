"use client";
export default function PrintButton() {
  return (
    <button className="btn btn-navy" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}
