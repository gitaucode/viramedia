"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Creator = {
  id:number; created_at:string; status:string; full_name:string; email:string; phone:string; city:string; age_bracket:string|null; gender:string|null;
  tiktok:string; tiktok_followers:string|null; avg_views:string|null; instagram:string|null; instagram_followers:string|null; youtube:string|null; best_content:string|null;
  niches:string; languages:string|null; formats:string; brand_experience:string|null; past_brands:string|null; ugc:string|null; own_account:string|null; paid_usage:string|null;
  physical_shoots:string|null; travel:string|null; rate_range:string|null; portfolio:string|null; notes:string;
};
type Shortlist = { id:number; name:string; creator_count:number };
const statuses=["new","reviewing","approved","hold","rejected"];
function list(v:string){try{const a=JSON.parse(v||"[]");return Array.isArray(a)?a:[]}catch{return []}}

export default function CreatorDirectory(){
 const [auth,setAuth]=useState<'checking'|'login'|'ready'>('checking');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 const [dbMissing,setDbMissing]=useState(false);
 const [creators,setCreators]=useState<Creator[]>([]);
 const [shortlists,setShortlists]=useState<Shortlist[]>([]);
 const [selected,setSelected]=useState<Creator|null>(null);
 const [q,setQ]=useState(''); const [status,setStatus]=useState('all'); const [city,setCity]=useState('all');
 const [newShortlist,setNewShortlist]=useState('');

 const load=useCallback(async()=>{
   const p=new URLSearchParams(); if(q)p.set('q',q); if(status!=='all')p.set('status',status); if(city!=='all')p.set('city',city);
   const r=await fetch(`/api/admin/creators?${p.toString()}`,{cache:'no-store'});
   if(r.status===401){setAuth('login');return}
   const j=await r.json();
   if(!r.ok){if(j.code==='DB_NOT_CONFIGURED'){setDbMissing(true);setAuth('ready');return}setError(j.error||'Could not load creators');return}
   setCreators(j.creators||[]);setDbMissing(false);setAuth('ready');
   const sr=await fetch('/api/admin/shortlists',{cache:'no-store'});if(sr.ok){const sj=await sr.json();setShortlists(sj.shortlists||[])}
 },[q,status,city]);
 useEffect(()=>{const t=setTimeout(()=>void load(),q?250:0);return()=>clearTimeout(t)},[load,q]);

 async function login(e:FormEvent){e.preventDefault();setError('');const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const j=await r.json();if(!r.ok){setError(j.error||'Login failed');return}setPassword('');setAuth('checking');await load()}
 async function updateCreator(id:number,patch:Record<string,string>){const r=await fetch('/api/admin/creators',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...patch})});if(r.ok){await load();setSelected(s=>s&&s.id===id?{...s,...patch}:s)}}
 async function createShortlist(e:FormEvent){e.preventDefault();if(!newShortlist.trim())return;const r=await fetch('/api/admin/shortlists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',name:newShortlist})});if(r.ok){setNewShortlist('');await load()}}
 async function addToShortlist(creatorId:number,shortlistId:number){await fetch('/api/admin/shortlists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add',creatorId,shortlistId})});await load()}
 const cities=useMemo(()=>Array.from(new Set(creators.map(c=>c.city).filter(Boolean))).sort(),[creators]);
 const counts=useMemo(()=>Object.fromEntries(statuses.map(s=>[s,creators.filter(c=>c.status===s).length])),[creators]);

 if(auth==='checking')return <main className="admin-shell admin-centre"><div className="admin-loader">Loading Vira Directory…</div></main>;
 if(auth==='login')return <main className="admin-shell admin-centre"><form className="admin-login" onSubmit={login}><div className="admin-brand">VIRA <span>ADMIN</span></div><h1>Creator Directory</h1><p>Private workspace for the Vira team.</p><label>Admin password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoFocus required/></label><button>Open directory →</button>{error&&<p className="admin-error">{error}</p>}</form></main>;

 return <main className="admin-shell">
  <header className="admin-top"><div><div className="admin-brand">VIRA <span>ADMIN</span></div><h1>Creator Directory</h1><p>Find the right people for the next brief.</p></div><div className="admin-count"><strong>{creators.length}</strong><span>creators shown</span></div></header>
  {dbMissing?<section className="admin-setup"><span>SETUP REQUIRED</span><h2>Connect the Vira D1 database.</h2><p>The directory UI is ready, but no <code>VIRA_DB</code> binding is available yet. Create the D1 database, run the migration, then bind it to this Worker.</p><code>npx wrangler d1 create vira-creators</code><code>npx wrangler d1 migrations apply vira-creators --remote</code></section>:<>
  <section className="admin-stats">{statuses.slice(0,4).map(s=><button key={s} onClick={()=>setStatus(s)} className={status===s?'active':''}><strong>{counts[s]||0}</strong><span>{s}</span></button>)}</section>
  <section className="admin-toolbar"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, TikTok, niche or language…"/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><select value={city} onChange={e=>setCity(e.target.value)}><option value="all">All cities</option>{cities.map(c=><option key={c}>{c}</option>)}</select></section>
  <div className="admin-grid"><section className="creator-table-wrap"><table className="creator-table"><thead><tr><th>Creator</th><th>Location</th><th>Audience</th><th>Niches</th><th>Status</th></tr></thead><tbody>{creators.map(c=><tr key={c.id} onClick={()=>setSelected(c)}><td><strong>{c.full_name}</strong><span>{c.tiktok}</span></td><td>{c.city}</td><td><strong>{c.tiktok_followers||'—'}</strong><span>TikTok</span></td><td><div className="mini-pills">{list(c.niches).slice(0,3).map((n:string)=><span key={n}>{n}</span>)}</div></td><td><span className={`status-pill status-${c.status}`}>{c.status}</span></td></tr>)}</tbody></table>{creators.length===0&&<div className="admin-empty"><h3>No creators found.</h3><p>Applications will appear here once they are saved to Vira&apos;s database.</p></div>}</section>
  <aside className="shortlist-panel"><div className="panel-head"><span>CAMPAIGNS</span><h2>Shortlists</h2></div><form onSubmit={createShortlist}><input value={newShortlist} onChange={e=>setNewShortlist(e.target.value)} placeholder="e.g. Mombasa food launch"/><button>Create</button></form>{shortlists.map(s=><div className="shortlist-row" key={s.id}><strong>{s.name}</strong><span>{s.creator_count} creators</span></div>)}{!shortlists.length&&<p className="muted">Create a shortlist when a brief comes in.</p>}</aside></div></>}
  {selected&&<div className="creator-drawer-backdrop" onClick={()=>setSelected(null)}><aside className="creator-drawer" onClick={e=>e.stopPropagation()}><button className="drawer-close" onClick={()=>setSelected(null)}>×</button><span className={`status-pill status-${selected.status}`}>{selected.status}</span><h2>{selected.full_name}</h2><p className="creator-handle">{selected.tiktok} · {selected.city}</p><div className="creator-facts"><Fact label="TikTok followers" value={selected.tiktok_followers}/><Fact label="Average views" value={selected.avg_views}/><Fact label="Languages" value={selected.languages}/><Fact label="Rate" value={selected.rate_range}/><Fact label="UGC" value={selected.ugc}/><Fact label="Physical shoots" value={selected.physical_shoots}/></div><div className="drawer-section"><span>NICHES</span><div className="mini-pills">{list(selected.niches).map((n:string)=><b key={n}>{n}</b>)}</div></div><div className="drawer-section"><span>CONTACT</span><a href={`mailto:${selected.email}`}>{selected.email}</a><a href={`tel:${selected.phone}`}>{selected.phone}</a>{selected.portfolio&&<a href={selected.portfolio} target="_blank" rel="noreferrer">Portfolio ↗</a>}</div><div className="drawer-section"><span>STATUS</span><select value={selected.status} onChange={e=>{const v=e.target.value;setSelected({...selected,status:v});void updateCreator(selected.id,{status:v})}}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><div className="drawer-section"><span>INTERNAL NOTES</span><textarea defaultValue={selected.notes||''} onBlur={e=>void updateCreator(selected.id,{notes:e.target.value})} placeholder="Rates, reliability, camera presence, past work…"/></div>{shortlists.length>0&&<div className="drawer-section"><span>ADD TO CAMPAIGN</span><div className="shortlist-buttons">{shortlists.map(s=><button key={s.id} onClick={()=>void addToShortlist(selected.id,s.id)}>+ {s.name}</button>)}</div></div>}</aside></div>}
 </main>
}
function Fact({label,value}:{label:string;value:string|null}){return <div><span>{label}</span><strong>{value||'—'}</strong></div>}
