"use client";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
export default function PortalNav(){const p=usePathname();async function logout(){await fetch('/api/portal/logout',{method:'POST'});location.href='/portal/login'}return <nav className="portal-nav"><div className="portal-nav-inner"><a className="portal-brand" href="/portal/dashboard">VIRA <span>NETWORK</span></a><div className="portal-nav-actions"><ThemeToggle compact/><a className={p.startsWith('/portal/dashboard')?'active':''} href="/portal/dashboard">Dashboard</a><a className={p.startsWith('/portal/opportunities')?'active':''} href="/portal/opportunities">Opportunities</a><button onClick={()=>void logout()}>Log out</button></div></div></nav>}
