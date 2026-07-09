import { getSessionContext } from "@/lib/queries";
import TicketPanel from "@/components/TicketPanel";

export default async function Tickets() {
  const { supabase, partner } = await getSessionContext();
  const { data: tickets } = await supabase
    .from("tickets").select("*, ticket_messages(*)").order("created_at", { ascending: false });
  return <TicketPanel tickets={tickets || []} partnerId={partner?.id} surface="partner" />;
}
