import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getOpsDb } from "@/lib/ops-db";
import { sendEmailTo } from "@/lib/email";

const clean=(v:unknown,max=6000)=>typeof v==='string'?v.trim().slice(0,max):'';
const num=(v:unknown)=>Math.max(0,Number(v)||0);
const shareAllowed=new Set(['not_ready','awaiting_client','approved','changes_requested']);

export async function GET(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const id=Number(new URL(request.url).searchParams.get('campaignId')||0);if(!Number.isInteger(id)||id<1)return NextResponse.json({error:'Invalid campaign'},{status:400});
 const campaign=await db.prepare(`SELECT id,name,client,client_objective,report_summary,report_insights,report_recommendations,start_date,end_date,status FROM campaigns WHERE id=?`).bind(id).first();
 const metrics=await db.prepare(`SELECT d.id,d.title,d.creator_id,c.full_name creator_name,d.submission_url,d.status,d.client_approval_status,d.client_feedback,pm.views,pm.reach,pm.impressions,pm.likes,pm.comments,pm.shares,pm.saves,pm.clicks,pm.conversions,pm.spend FROM deliverables d LEFT JOIN creators c ON c.id=d.creator_id LEFT JOIN performance_metrics pm ON pm.deliverable_id=d.id WHERE d.campaign_id=? ORDER BY d.id`).bind(id).all();
 return NextResponse.json({campaign,deliverables:metrics.results||[]});
}

export async function PATCH(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{const b=await request.json(),campaignId=Number(b.campaignId);if(!Number.isInteger(campaignId)||campaignId<1)return NextResponse.json({error:'Invalid campaign'},{status:400});
  if(b.kind==='campaign'){
   await db.prepare(`UPDATE campaigns SET client_objective=?,report_summary=?,report_insights=?,report_recommendations=? WHERE id=?`).bind(clean(b.clientObjective),clean(b.reportSummary),clean(b.reportInsights),clean(b.reportRecommendations),campaignId).run();
   return NextResponse.json({ok:true});
  }
  const deliverableId=Number(b.deliverableId);if(!Number.isInteger(deliverableId)||deliverableId<1)return NextResponse.json({error:'Invalid deliverable'},{status:400});
  const owned=await db.prepare('SELECT d.status,d.title,camp.name campaign_name FROM deliverables d JOIN campaigns camp ON camp.id=d.campaign_id WHERE d.id=? AND d.campaign_id=?').bind(deliverableId,campaignId).first<{status:string;title:string;campaign_name:string}>();if(!owned)return NextResponse.json({error:'Deliverable not in campaign'},{status:400});
  if(b.kind==='share'){
   const status=String(b.clientApprovalStatus||'');if(!shareAllowed.has(status))return NextResponse.json({error:'Invalid client approval status'},{status:400});
   if(status==='awaiting_client'&&!['approved','done'].includes(owned.status))return NextResponse.json({error:'Approve the deliverable internally before sharing it with the client'},{status:400});
   await db.prepare(`UPDATE deliverables SET client_approval_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status,deliverableId).run();
   if(status==='awaiting_client'){
    const linked=await db.prepare(`SELECT c.contact_name,c.email FROM campaign_clients cc JOIN clients c ON c.id=cc.client_id WHERE cc.campaign_id=? AND c.status='active'`).bind(campaignId).all<{contact_name:string;email:string}>();
    const site=process.env.VIRA_SITE_URL||new URL(request.url).origin;
    for(const client of linked.results||[])await sendEmailTo(client.email,`Content ready for review — ${owned.campaign_name}`,`<div style="font-family:Arial,sans-serif"><h2>Content is ready for your review</h2><p>Hi ${client.contact_name}, Vira has shared <strong>${owned.title}</strong> from <strong>${owned.campaign_name}</strong> for approval.</p><p><a href="${site}/client/campaigns/${campaignId}">Review content</a></p></div>`);
   }
   return NextResponse.json({ok:true});
  }
  await db.prepare(`INSERT INTO performance_metrics (deliverable_id,views,reach,impressions,likes,comments,shares,saves,clicks,conversions,spend,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(deliverable_id) DO UPDATE SET views=excluded.views,reach=excluded.reach,impressions=excluded.impressions,likes=excluded.likes,comments=excluded.comments,shares=excluded.shares,saves=excluded.saves,clicks=excluded.clicks,conversions=excluded.conversions,spend=excluded.spend,updated_at=CURRENT_TIMESTAMP`).bind(deliverableId,Math.round(num(b.views)),Math.round(num(b.reach)),Math.round(num(b.impressions)),Math.round(num(b.likes)),Math.round(num(b.comments)),Math.round(num(b.shares)),Math.round(num(b.saves)),Math.round(num(b.clicks)),Math.round(num(b.conversions)),num(b.spend)).run();
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
