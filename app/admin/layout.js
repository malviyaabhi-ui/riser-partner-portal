import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/queries";
import Sidebar from "@/components/Sidebar";
import Mira from "@/components/Mira";

export default async function AdminLayout({ children }) {
  const { user, profile } = await getSessionContext();
  if (!user) redirect("/login");
  if (!profile || !["riser_admin", "riser_staff"].includes(profile.role)) redirect("/portal");

  return (
    <div className="flex min-h-screen">
      <Sidebar surface="admin" profile={profile} />
      <main className="flex-1 ml-[232px] min-w-0">
        <div className="max-w-[1180px] px-7 py-7">{children}</div>
      </main>
      <Mira />
    </div>
  );
}
