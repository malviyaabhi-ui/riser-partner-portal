"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const I = {
  dash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  box: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>,
  quote: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>,
  book: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  chat: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  building: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>,
  users: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  kyc: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 13l2 2 4-4"/></svg>
};

const PARTNER_NAV = [
  { label: "Overview", items: [
    { href: "/portal", label: "Dashboard", icon: I.dash, color: "#0CB8B6" }
  ]},
  { label: "Business", items: [
    { href: "/portal/products", label: "Products & Pricing", icon: I.box, color: "#3B7BF5" },
    { href: "/portal/quotes", label: "Quotes & Orders", icon: I.quote, color: "#C9A96E" }
  ]},
  { label: "Resources", items: [
    { href: "/portal/collateral", label: "Collateral Library", icon: I.book, color: "#A66BF5" }
  ]},
  { label: "Account", items: [
    { href: "/portal/company", label: "Company & Documents", icon: I.building, color: "#F56B9D" },
    { href: "/portal/tickets", label: "Support Tickets", icon: I.chat, color: "#4ECB71" }
  ]}
];

const ADMIN_NAV = [
  { label: "Overview", items: [
    { href: "/admin", label: "Overview", icon: I.dash, color: "#C9A96E" }
  ]},
  { label: "Channel", items: [
    { href: "/admin/partners", label: "Partners", icon: I.users, color: "#0CB8B6" },
    { href: "/admin/applications", label: "Applications & KYC", icon: I.kyc, color: "#F56B9D" }
  ]},
  { label: "Commercial", items: [
    { href: "/admin/products", label: "Products & Pricing", icon: I.box, color: "#3B7BF5" },
    { href: "/admin/quotes", label: "Quote Approvals", icon: I.quote, color: "#A66BF5" }
  ]},
  { label: "Support", items: [
    { href: "/admin/tickets", label: "Tickets", icon: I.chat, color: "#4ECB71" }
  ]}
];

export default function Sidebar({ surface, partner, profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = surface === "admin";
  const groups = isAdmin ? ADMIN_NAV : PARTNER_NAV;

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

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.label} className="mb-1">
            <div className="text-[9.5px] tracking-[1.8px] uppercase text-white/35 font-semibold px-2.5 pt-4 pb-1.5">
              {g.label}
            </div>
            {g.items.map((item) => {
              const base = isAdmin ? "/admin" : "/portal";
              const active = item.href === base
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-[7px] mb-0.5 text-[13px] font-medium transition
                    ${active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`}>
                  <span className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}${active ? "38" : "24"}`, color: item.color }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="m-3 p-3 rounded-lg bg-white/5 text-[11.5px] text-white/60 leading-relaxed">
        <b className="text-white">{profile?.full_name || profile?.email}</b><br />
        {isAdmin ? "Riser Technologies" : partner?.legal_name}
        {!isAdmin && partner && (
          <span className="mt-1 ml-1 inline-block px-2 py-0.5 rounded-full bg-champagne/20 text-champagne text-[10.5px] font-semibold capitalize">
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
