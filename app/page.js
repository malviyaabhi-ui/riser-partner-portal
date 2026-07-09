import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/queries";

export default async function Home() {
  const { user, profile } = await getSessionContext();
  if (!user) redirect("/login");
  if (profile && ["riser_admin", "riser_staff"].includes(profile.role)) redirect("/admin");
  redirect("/portal");
}
