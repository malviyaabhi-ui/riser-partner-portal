import { getSessionContext } from "@/lib/queries";
import TicketPanel from "@/components/TicketPanel";

export default async function AdminTickets() {
  const { supabase } = await getSessionContext();
  const { data: tickets } = await supabase
    .from("tickets").select("*, ticket_messages(*), partners(legal_name)")
    .order("updated_at", { ascending: false });
  return <TicketPanel tickets={tickets || []} surface="admin" />;
}
