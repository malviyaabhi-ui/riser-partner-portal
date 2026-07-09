import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/queries";
import Sidebar from "@/components/Sidebar";
import Mira from "@/components/Mira";

export default async function PortalLayout({ children }) {
  const { user, profile, partner } = await getSessionContext();
  if (!user) redirect("/login");

  if (partner && ["application", "in_review"].includes(partner.status)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 max-w-md text-center">
          <h1 className="font-display font-bold text-lg mb-2">Application under review</h1>
          <p className="text-muted text-[13px] leading-relaxed">
            Thanks for applying, {profile?.full_name?.split(" ")[0] || "there"}. The Riser team
            is verifying your company documents. You&apos;ll receive an email once your
            account is activated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar surface="partner" partner={partner} profile={profile} />
      <main className="flex-1 ml-[232px] min-w-0">
        <div className="max-w-[1180px] px-7 py-7">{children}</div>
      </main>
      <Mira />
    </div>
  );
}
