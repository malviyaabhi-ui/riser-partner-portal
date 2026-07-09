"use client";
import { createClient } from "@/lib/supabase/client";

export default function CollateralRow({ file }) {
  const supabase = createClient();

  async function download() {
    const { data, error } = await supabase.storage
      .from("collateral").createSignedUrl(file.file_path, 300);
    if (error) { alert(error.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("collateral_downloads").insert({ collateral_id: file.id, user_id: user.id });
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-page/60">
      <div className="flex-1">
        <div className="text-[13px] font-semibold">{file.name}</div>
        <div className="text-[11.5px] text-faint mt-0.5">
          {file.category} · {file.products?.name || "All products"} · {file.version}
        </div>
      </div>
      <button className="btn btn-ghost !py-1.5 !px-3 !text-[12px]" onClick={download}>Download</button>
    </div>
  );
}
