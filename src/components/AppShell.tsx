"use client";

import { usePathname } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import RevealInit from "@/components/RevealInit";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return <>
    <SiteNav />
    <main className="site-main">{children}</main>
    <SiteFooter />
    <WhatsAppFloat />
    <RevealInit />
  </>;
}
