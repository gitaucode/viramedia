import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getOpsDb } from "@/lib/ops-db";
import { sendEmailTo } from "@/lib/email";

const statuses=new Set(['active','inactive']);
const clean=(v:unknown,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';

export async function GET(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const u=new URL(request.url),campaignId=Number(u.searchParams.get('campaignId')||0);
 if(campaignId){const r=await db.prepare(`SELECT c.id,c.company,c.contact_name,c.email,c.phone,c.status FROM campaign_clients cc JOIN clients c ON c.id=cc.client_id WHERE cc.campaign_id=? ORDER BY c.company,c.contact_name`).bind(campaignId).all();return NextResponse.json({clients:r.results||[]})}
 const r=await db.prepare(`SELECT c.*, COUNT(DISTINCT cc.campaign_id) campaign_count FROM clients c LEFT JOIN campaign_clients cc ON cc.client_id=c.id GROUP BY c.id ORDER BY c.company,c.contact_name`).all();
 return NextResponse.json({clients:r.results||[]});
}

export async function POST(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{
  const b=await request.json(),action=String(b.action||'create');
  if(action==='create'){
   const company=clean(b.company,120),contact=clean(b.contactName,120),email=clean(b.email,180).toLowerCase(),phone=clean(b.phone,60);
   if(!company||!contact||!email)return NextResponse.json({error:'Company, contact name and email are required'},{status:400});
   await db.prepare(`INSERT INTO clients (company,contact_name,email,phone) VALUES (?,?,?,?)`).bind(company,contact,email,phone).run();
   return NextResponse.json({ok:true});
  }
  const campaignId=Number(b.campaignId),clientId=Number(b.clientId);
  if(!Number.isInteger(campaignId)||!Number.isInteger(clientId)||campaignId<1||clientId<1)return NextResponse.json({error:'Invalid campaign or client'},{status:400});
  if(action==='link'){
   await db.prepare("INSERT OR IGNORE INTO campaign_clients (campaign_id,client_id) VALUES (?,?)").bind(campaignId,clientId).run();
   const client=await db.prepare('SELECT company,contact_name,email FROM clients WHERE id=?').bind(clientId).first<{company:string;contact_name:string;email:string}>();
   const campaign=await db.prepare('SELECT name FROM shortlists WHERE id=?').bind(campaignId).first<{name:string}>();
   if(client&&campaign){const site=process.env.VIRA_SITE_URL||new URL(request.url).origin;await sendEmailTo(client.email,`Campaign portal access — ${campaign.name}`,`<div style="font-family:Arial,sans-serif"><h2>Your Vira campaign portal is ready</h2><p>Hi ${client.contact_name}, ${client.company} now has portal access to <strong>${campaign.name}</strong>.</p><p><a href="${site}/client/login">Open Client Portal</a></p></div>`)}
   return NextResponse.json({ok:true});
  }
  if(action==='unlink'){await db.prepare("DELETE FROM campaign_clients WHERE campaign_id=? AND client_id=?").bind(campaignId,clientId).run();return NextResponse.json({ok:true})}
  return NextResponse.json({error:'Invalid action'},{status:400});
 }catch(e){return NextResponse.json({error:'Could not save client',detail:e instanceof Error?e.message:undefined},{status:400})}
}

export async function PATCH(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{const b=await request.json(),id=Number(b.id);if(!Number.isInteger(id)||id<1)return NextResponse.json({error:'Invalid client'},{status:400});const sets:string[]=[],vals:unknown[]=[];
  for(const [key,col,max] of [['company','company',120],['contactName','contact_name',120],['email','email',180],['phone','phone',60]] as const){if(typeof b[key]==='string'){sets.push(`${col}=?`);vals.push(clean(b[key],max))}}
  if(typeof b.status==='string'){if(!statuses.has(b.status))return NextResponse.json({error:'Invalid status'},{status:400});sets.push('status=?');vals.push(b.status)}
  if(!sets.length)return NextResponse.json({error:'Nothing to update'},{status:400});sets.push('updated_at=CURRENT_TIMESTAMP');vals.push(id);await db.prepare(`UPDATE clients SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();return NextResponse.json({ok:true})
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
