import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { getOpsDb } from "@/lib/ops-db";
import { sendEmail } from "@/lib/email";

const allowed=new Set(['approved','changes_requested']);
const clean=(v:unknown,max=3000)=>typeof v==='string'?v.trim().slice(0,max):'';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const client=await getClientSession();if(!client)return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const {id}=await params,campaignId=Number(id);if(!Number.isInteger(campaignId)||campaignId<1)return NextResponse.json({error:'Invalid campaign'},{status:400});
 const campaign=await db.prepare(`SELECT s.id,s.name,s.client,s.client_objective,s.report_summary,s.report_insights,s.report_recommendations,s.status,s.start_date,s.end_date FROM campaign_clients cc JOIN shortlists s ON s.id=cc.campaign_id WHERE cc.client_id=? AND s.id=?`).bind(client.id,campaignId).first();
 if(!campaign)return NextResponse.json({error:'Not found'},{status:404});
 const d=await db.prepare(`SELECT d.id,d.title,d.status,d.submission_url,d.client_approval_status,d.client_feedback,d.client_reviewed_at,c.full_name creator_name,COALESCE(pm.views,0) views,COALESCE(pm.reach,0) reach,COALESCE(pm.impressions,0) impressions,COALESCE(pm.likes,0) likes,COALESCE(pm.comments,0) comments,COALESCE(pm.shares,0) shares,COALESCE(pm.saves,0) saves,COALESCE(pm.clicks,0) clicks,COALESCE(pm.conversions,0) conversions,COALESCE(pm.spend,0) spend FROM deliverables d LEFT JOIN creators c ON c.id=d.creator_id LEFT JOIN performance_metrics pm ON pm.deliverable_id=d.id WHERE d.campaign_id=? AND d.status IN ('approved','done') AND d.client_approval_status!='not_ready' ORDER BY d.id`).bind(campaignId).all();
 const rows=(d.results||[]) as Array<Record<string,unknown>>;
 const totals=rows.reduce((a,r)=>({views:a.views+Number(r.views||0),reach:a.reach+Number(r.reach||0),impressions:a.impressions+Number(r.impressions||0),likes:a.likes+Number(r.likes||0),comments:a.comments+Number(r.comments||0),shares:a.shares+Number(r.shares||0),saves:a.saves+Number(r.saves||0),clicks:a.clicks+Number(r.clicks||0),conversions:a.conversions+Number(r.conversions||0),spend:a.spend+Number(r.spend||0)}),{views:0,reach:0,impressions:0,likes:0,comments:0,shares:0,saves:0,clicks:0,conversions:0,spend:0});
 return NextResponse.json({campaign,deliverables:rows,totals});
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const client=await getClientSession();if(!client)return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{const {id}=await params,campaignId=Number(id),b=await request.json(),deliverableId=Number(b.deliverableId),status=String(b.status||'');if(!Number.isInteger(campaignId)||!Number.isInteger(deliverableId)||!allowed.has(status))return NextResponse.json({error:'Invalid review'},{status:400});const access=await db.prepare(`SELECT d.id,d.title,s.name campaign_name FROM campaign_clients cc JOIN deliverables d ON d.campaign_id=cc.campaign_id JOIN shortlists s ON s.id=d.campaign_id WHERE cc.client_id=? AND d.campaign_id=? AND d.id=? AND d.status IN ('approved','done') AND d.client_approval_status!='not_ready'`).bind(client.id,campaignId,deliverableId).first<{id:number;title:string;campaign_name:string}>();if(!access)return NextResponse.json({error:'Not available for review'},{status:403});const feedback=clean(b.feedback);if(status==='changes_requested'&&!feedback)return NextResponse.json({error:'Add feedback before requesting changes'},{status:400});await db.prepare(`UPDATE deliverables SET client_approval_status=?,client_feedback=?,client_reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status,feedback,deliverableId).run();await sendEmail(`Client review — ${access.campaign_name}`,`<div style="font-family:Arial,sans-serif"><h2>${client.company} reviewed ${access.title}</h2><p>Status: <strong>${status.replace('_',' ')}</strong></p>${feedback?`<p>Feedback: ${feedback}</p>`:''}</div>`,client.email);return NextResponse.json({ok:true})}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
