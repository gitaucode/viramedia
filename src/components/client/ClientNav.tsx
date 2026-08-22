"use client";
import ThemeToggle from "@/components/ThemeToggle";
export default function ClientNav(){async function logout(){await fetch('/api/client/logout',{method:'POST'});location.href='/client/login'}return <nav className="client-nav"><div className="client-nav-inner"><a className="client-brand" href="/client/dashboard">VIRA <span>CLIENT PORTAL</span></a><div className="client-nav-actions"><ThemeToggle compact/><a href="/client/dashboard">Campaigns</a><button onClick={()=>void logout()}>Log out</button></div></div></nav>}
