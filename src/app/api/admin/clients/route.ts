import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { recordActivity } from "@/lib/activity";
import { getOpsDb } from "@/lib/ops-db";
import { sendEmailTo } from "@/lib/email";

const statuses=new Set(['active','inactive']);
const clean=(v:unknown,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';

export async function GET(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const u=new URL(request.url),campaignId=Number(u.searchParams.get('campaignId')||0);
 if(campaignId){const r=await db.prepare(`SELECT c.id,c.company,c.contact_name,c.email,c.phone,c.status,cc.role,CASE WHEN camp.primary_client_id=c.id THEN 1 ELSE 0 END is_primary FROM campaign_clients cc JOIN clients c ON c.id=cc.client_id JOIN campaigns camp ON camp.id=cc.campaign_id WHERE cc.campaign_id=? ORDER BY is_primary DESC,c.company,c.contact_name`).bind(campaignId).all();return NextResponse.json({clients:r.results||[]})}
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
  const client=await db.prepare('SELECT id,company,contact_name,email FROM clients WHERE id=?').bind(clientId).first<{id:number;company:string;contact_name:string;email:string}>();
  const campaign=await db.prepare('SELECT id,name,primary_client_id FROM campaigns WHERE id=?').bind(campaignId).first<{id:number;name:string;primary_client_id:number|null}>();
  if(!client||!campaign)return NextResponse.json({error:'Campaign or client not found'},{status:404});

  if(action==='link'){
   const makePrimary=b.primary===true||campaign.primary_client_id==null;
   await db.prepare("INSERT OR IGNORE INTO campaign_clients (campaign_id,client_id,role) VALUES (?,?,?)").bind(campaignId,clientId,makePrimary?'primary':'client').run();
   if(makePrimary){
    await db.prepare("UPDATE campaign_clients SET role=CASE WHEN client_id=? THEN 'primary' ELSE 'client' END WHERE campaign_id=?").bind(clientId,campaignId).run();
    await db.prepare("UPDATE campaigns SET primary_client_id=? WHERE id=?").bind(clientId,campaignId).run();
   }
   await recordActivity({actorType:'admin',campaignId,clientId,eventType:'campaign_client.linked',title:'Client linked',detail:`${client.company} was linked to ${campaign.name}.`,metadata:{primary:makePrimary}});
   if(makePrimary)await recordActivity({actorType:'admin',campaignId,clientId,eventType:'campaign_client.primary_changed',title:'Primary client set',detail:`${client.company} is the primary client for ${campaign.name}.`});
   const site=process.env.VIRA_SITE_URL||new URL(request.url).origin;
   await sendEmailTo(client.email,`Campaign portal access — ${campaign.name}`,`<div style="font-family:Arial,sans-serif"><h2>Your Vira campaign portal is ready</h2><p>Hi ${client.contact_name}, ${client.company} now has portal access to <strong>${campaign.name}</strong>.</p><p><a href="${site}/client/login">Open Client Portal</a></p></div>`);
   return NextResponse.json({ok:true,primary:makePrimary});
  }
  if(action==='set_primary'){
   const linked=await db.prepare("SELECT 1 ok FROM campaign_clients WHERE campaign_id=? AND client_id=?").bind(campaignId,clientId).first<{ok:number}>();
   if(!linked)return NextResponse.json({error:'Link this client to the campaign first'},{status:400});
   await db.prepare("UPDATE campaign_clients SET role=CASE WHEN client_id=? THEN 'primary' ELSE 'client' END WHERE campaign_id=?").bind(clientId,campaignId).run();
   await db.prepare("UPDATE campaigns SET primary_client_id=? WHERE id=?").bind(clientId,campaignId).run();
   await recordActivity({actorType:'admin',campaignId,clientId,eventType:'campaign_client.primary_changed',title:'Primary client changed',detail:`${client.company} is now the primary client for ${campaign.name}.`});
   return NextResponse.json({ok:true});
  }
  if(action==='unlink'){
   await db.prepare("DELETE FROM campaign_clients WHERE campaign_id=? AND client_id=?").bind(campaignId,clientId).run();
   if(campaign.primary_client_id===clientId){
    const replacement=await db.prepare("SELECT client_id FROM campaign_clients WHERE campaign_id=? ORDER BY created_at,id LIMIT 1").bind(campaignId).first<{client_id:number}>().catch(()=>null);
    const replacementId=replacement?.client_id??null;
    await db.prepare("UPDATE campaigns SET primary_client_id=? WHERE id=?").bind(replacementId,campaignId).run();
    await db.prepare("UPDATE campaign_clients SET role=CASE WHEN client_id=? THEN 'primary' ELSE 'client' END WHERE campaign_id=?").bind(replacementId,campaignId).run();
    if(replacementId){
      const replacementClient=await db.prepare("SELECT company FROM clients WHERE id=?").bind(replacementId).first<{company:string}>();
      await recordActivity({actorType:'admin',campaignId,clientId:replacementId,eventType:'campaign_client.primary_changed',title:'Primary client changed',detail:`${replacementClient?.company||'Another linked client'} is now the primary client for ${campaign.name}.`});
    }
   }
   await recordActivity({actorType:'admin',campaignId,clientId,eventType:'campaign_client.unlinked',title:'Client unlinked',detail:`${client.company} was unlinked from ${campaign.name}.`});
   return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:'Invalid action'},{status:400});
 }catch(e){return NextResponse.json({error:'Could not save client',detail:e instanceof Error?e.message:undefined},{status:400})}
}

export async function PATCH(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{const b=await request.json(),id=Number(b.id);if(!Number.isInteger(id)||id<1)return NextResponse.json({error:'Invalid client'},{status:400});const sets:string[]=[],vals:unknown[]=[];
  for(const [key,col,max] of [['company','company',120],['contactName','contact_name',120],['email','email',180],['phone','phone',60]] as const){if(typeof b[key]==='string'){sets.push(`${col}=?`);vals.push(key==='email'?clean(b[key],max).toLowerCase():clean(b[key],max))}}
  if(typeof b.status==='string'){if(!statuses.has(b.status))return NextResponse.json({error:'Invalid status'},{status:400});sets.push('status=?');vals.push(b.status)}
  if(!sets.length)return NextResponse.json({error:'Nothing to update'},{status:400});sets.push('updated_at=CURRENT_TIMESTAMP');vals.push(id);await db.prepare(`UPDATE clients SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();return NextResponse.json({ok:true})
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
