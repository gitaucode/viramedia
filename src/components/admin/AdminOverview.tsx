"use client";
import Link from "next/link";
import { FormEvent,useEffect,useState } from "react";
import AdminNav from "./AdminNav";
import ThemeToggle from "@/components/ThemeToggle";

type Stats={newLeads:number;reviewCreators:number;approvedCreators:number;activeCampaigns:number;totalCampaigns:number;openActions:number;highPriorityActions:number};
type ActionItem={id:string;kind:string;priority:"high"|"medium"|"low";title:string;detail:string;campaignId:number|null;campaignName:string|null;count?:number;amount?:number;dueDate?:string|null};
type Lead={id:number;company:string;name:string;service?:string;status:string};
type Data={stats:Stats;actions:ActionItem[];recentLeads:Lead[]};
const money=(n:number)=>new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:0}).format(n||0);
const actionHref=(a:ActionItem)=>a.campaignId?`/admin/campaigns/${a.campaignId}`:"/admin/campaigns";
const actionLabel=(a:ActionItem)=>a.kind==="internal_review"||a.kind==="client_review"?"Open review":a.kind==="creator_payment"||a.kind==="client_balance"?"Open finance":"Open campaign";

export default function AdminOverview(){
 const [data,setData]=useState<Data|null>(null);const [login,setLogin]=useState(false);const [password,setPassword]=useState("");const [error,setError]=useState("");
 async function load(){const r=await fetch("/api/admin/dashboard",{cache:"no-store"});if(r.status===401){setLogin(true);return}const j=await r.json();if(!r.ok){setError(j.error||"Could not load dashboard");return}setData(j);setLogin(false)}
 useEffect(()=>{void load()},[]);
 async function signIn(e:FormEvent){e.preventDefault();setError("");const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});const j=await r.json();if(!r.ok){setError(j.error||"Login failed");return}setPassword("");await load()}
 if(login)return <main className="admin-shell admin-centre"><div className="login-theme"><ThemeToggle/></div><form className="admin-login" onSubmit={signIn}><div className="admin-brand">VIRA <span>OPS</span></div><h1>Welcome back.</h1><p>Sign in to manage leads, campaigns and creators.</p><label>Admin password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoFocus required/></label><button>Sign in →</button>{error&&<p className="admin-error">{error}</p>}</form></main>;
 if(!data)return <main className="admin-shell admin-centre"><div className="admin-loader">{error||"Loading Vira Ops…"}</div></main>;
 const s=data.stats;
 return <main className="admin-shell"><AdminNav/><div className="admin-workspace"><header className="admin-top"><div><span className="admin-kicker">AGENCY OPERATIONS</span><h1>Command Centre</h1><p>Prioritized work that needs attention across the creator-marketing operating loop.</p></div></header>
  <section className="ops-kpis"><Link href="/admin/campaigns"><strong>{s.openActions}</strong><span>Open actions</span></Link><Link href="/admin/campaigns"><strong>{s.highPriorityActions}</strong><span>High priority</span></Link><Link href="/admin/leads"><strong>{s.newLeads}</strong><span>New leads</span></Link><Link href="/admin/creators"><strong>{s.reviewCreators}</strong><span>Creators to review</span></Link><Link href="/admin/campaigns"><strong>{s.activeCampaigns}</strong><span>Active campaigns</span></Link></section>

  <section className="ops-panel ops-panel-wide"><div className="ops-panel-head"><div><span>ACTION QUEUE</span><h2>What needs attention now</h2></div><strong>{s.openActions} open</strong></div><div className="command-queue">{data.actions.map(a=><article className={`command-item priority-${a.priority}`} key={a.id}><div className="command-priority"><span>{a.priority}</span></div><div className="command-copy"><strong>{a.title}</strong><span>{a.campaignName||"Agency"}</span><p>{a.detail}</p>{typeof a.amount==="number"&&a.amount>0&&<small>{money(a.amount)}</small>}</div><Link className="ops-primary" href={actionHref(a)}>{actionLabel(a)}</Link></article>)}</div>{!data.actions.length&&<div className="ops-empty"><strong>Nothing urgent right now.</strong><p>The operating loop has no review, deadline, payment or launch actions waiting.</p></div>}</section>

  <div className="ops-columns"><section className="ops-panel"><div className="ops-panel-head"><div><span>PIPELINE</span><h2>Recent leads</h2></div><Link href="/admin/leads">View all →</Link></div>{data.recentLeads.map(l=><Link className="ops-row" href="/admin/leads" key={l.id}><div><strong>{l.company}</strong><span>{l.name} · {l.service||"General enquiry"}</span></div><b>{l.status}</b></Link>)}{!data.recentLeads.length&&<p className="ops-empty">No leads yet.</p>}</section><section className="ops-panel"><div className="ops-panel-head"><div><span>AGENCY HEALTH</span><h2>Operating snapshot</h2></div></div><div className="workspace-kpis"><div><span>Campaigns</span><strong>{s.totalCampaigns}</strong></div><div><span>Active</span><strong>{s.activeCampaigns}</strong></div><div><span>Approved creators</span><strong>{s.approvedCreators}</strong></div><div><span>Open actions</span><strong>{s.openActions}</strong></div></div></section></div>
 </div></main>
}
