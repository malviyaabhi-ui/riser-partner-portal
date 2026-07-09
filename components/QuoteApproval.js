"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function QuoteApproval({ quote }) {
  const supabase = createClient();
  const router = useRouter();

  async function decide(status) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("quotes")
      .update({ status, approved_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", quote.id);
    if (error) alert(error.message);
    router.refresh();
  }

  return (
    <div className="flex gap-1.5">
      <button className="btn !py-1 !px-2.5 !text-[11.5px] bg-good text-white" onClick={() => decide("approved")}>Approve</button>
      <button className="btn !py-1 !px-2.5 !text-[11.5px] bg-bad/10 text-bad" onClick={() => decide("declined")}>Decline</button>
    </div>
  );
}
