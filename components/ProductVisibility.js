"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProductVisibility({ product }) {
  const supabase = createClient();
  const router = useRouter();

  async function toggle() {
    const { error } = await supabase
      .from("products").update({ visible: !product.visible }).eq("id", product.id);
    if (error) alert(error.message);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2.5 w-32 justify-end">
      <span className="text-[11px] text-faint">{product.visible ? "Visible" : "Hidden"}</span>
      <button onClick={toggle}
        className={`relative w-10 h-[22px] rounded-full transition ${product.visible ? "bg-teal" : "bg-[#D4D8E1]"}`}>
        <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all
          ${product.visible ? "left-[21px]" : "left-[3px]"}`} />
      </button>
    </div>
  );
}
