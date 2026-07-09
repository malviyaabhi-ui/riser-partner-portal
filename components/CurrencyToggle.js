"use client";
import { useRouter } from "next/navigation";

export default function CurrencyToggle({ current }) {
  const router = useRouter();
  function set(c) {
    document.cookie = `currency=${c}; path=/; max-age=31536000`;
    router.refresh();
  }
  return (
    <div className="inline-flex rounded-lg border border-line overflow-hidden text-[12px] font-semibold">
      {["AED", "USD"].map((c) => (
        <button key={c} onClick={() => set(c)}
          className={`px-3 py-1.5 ${current === c ? "bg-navy text-white" : "bg-white text-muted hover:text-ink"}`}>
          {c}
        </button>
      ))}
    </div>
  );
}
