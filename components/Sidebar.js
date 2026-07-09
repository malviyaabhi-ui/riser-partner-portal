"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PARTNER_NAV = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/products", label: "Products & Pricing" },
  { href: "/portal/quotes", label: "Quotes & Orders" },
  { href: "/portal/collateral", label: "Collateral Library" },
  { href: "/portal/tickets", label: "Support Tickets" },
  { href: "/portal/company", label: "Company & Documents" }
];

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/applications", label: "Applications & KYC" },
  { href: "/admin/products", label: "Products & Pricing" },
  { href: "/admin/quotes", label: "Quote Approvals" },
  { href: "/admin/tickets", label: "Tickets" }
];

export default function Sidebar({ surface, partner, profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = surface === "admin";
  const nav = isAdmin ? ADMIN_NAV : PARTNER_NAV;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={`w-[248px] fixed inset-y-0 left-0 z-10 flex flex-col text-white
      ${isAdmin ? "bg-gradient-to-b from-navy-2 to-[#050F28] border-r-2 border-champagne" : "bg-gradient-to-b from-navy to-navy-2"}`}>
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center
          ${isAdmin ? "bg-gradient-to-br from-champagne to-[#8F6F35]" : "bg-gradient-to-br from-teal to-[#3B7BF5]"}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isAdmin ? "#091E4D" : "#fff"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
        </div>
        <div>
          <div className="font-display font-bold leading-tight">Riser</div>
          <div className={`text-[9.5px] tracking-[1.6px] uppercase ${isAdmin ? "text-champagne font-semibold" : "text-white/50"}`}>
            {isAdmin ? "Admin Console" : "Partner Portal"}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {nav.map((item) => {
          const active = item.href === (isAdmin ? "/admin" : "/portal")
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`block rounded-lg px-2.5 py-2 mb-0.5 text-[13.5px] font-medium transition
                ${active
                  ? isAdmin ? "bg-champagne/15 text-champagne" : "bg-teal/10 text-teal"
                  : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 p-3 rounded-lg bg-white/5 text-[11.5px] text-white/60 leading-relaxed">
        <b className="text-white">{profile?.full_name || profile?.email}</b><br />
        {isAdmin ? "Riser Technologies" : partner?.legal_name}
        {!isAdmin && partner && (
          <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-champagne/20 text-champagne text-[10.5px] font-semibold capitalize">
            {partner.tier} partner
          </span>
        )}
        <button onClick={signOut} className="block mt-2 text-white/45 hover:text-white text-[11.5px] underline">
          Sign out
        </button>
      </div>
    </aside>
  );
}
