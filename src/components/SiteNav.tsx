"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  ["Services", "/services"], ["Work", "/work"], ["Creators", "/creators"], ["About", "/about"]
] as const;

export default function SiteNav(){
  const pathname = usePathname();
  const [open,setOpen]=useState(false);
  return <>
    <nav><div className="wrap">
      <Link className="logo" href="/" onClick={()=>setOpen(false)}>VIRA<span className="dot">.</span><span className="logo-sub">MEDIA</span></Link>
      <ul className="navlinks">{links.map(([label,href])=><li key={href}><Link className={`site-navlink ${pathname===href ? "active":""}`} href={href}>{label}</Link></li>)}</ul>
      <Link href="/contact" className="nav-cta">Start a Project</Link>
      <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open ? "×":"☰"}</button>
    </div></nav>
    <div className={`mobile-panel ${open?"open":""}`}>{links.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}<Link className="mobile-cta" href="/contact" onClick={()=>setOpen(false)}>Start a Project</Link></div>
  </>;
}
