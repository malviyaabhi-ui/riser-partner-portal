"use client";
import { createClient } from "@/lib/supabase/client";

export default function DatasheetButton({ path, name }) {
  const supabase = createClient();
  async function download() {
    const { data, error } = await supabase.storage
      .from("collateral").createSignedUrl(path, 300);
    if (error) { alert(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }
  return (
    <button className="btn btn-ghost" onClick={download}>
      Datasheet (PDF)
    </button>
  );
}
