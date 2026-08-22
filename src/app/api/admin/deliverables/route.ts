import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { recordActivity } from "@/lib/activity";
import { createDeliverable,getOpsDb,listDeliverables,updateDeliverable } from "@/lib/ops-db";
import { sendEmailTo } from "@/lib/email";

const allowed=new Set(['pending','in_progress','submitted','changes_requested','approved','done']);
const paymentAllowed=new Set(['not_set','pending','paid']);

export async function GET(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
  const u=new URL(request.url);
  const id=Number(u.searchParams.get('campaignId')||0);
  const deliverables=await listDeliverables(id||undefined);
  if(!deliverables)return NextResponse.json({error:'Database is not configured',code:'DB_NOT_CONFIGURED'},{status:503});
  return NextResponse.json({deliverables});
}

export async function POST(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=getOpsDb();
  if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
  try{
    const b=await request.json();
    const campaignId=Number(b.campaignId),creatorId=Number(b.creatorId)||0;
    if(!Number.isInteger(campaignId)||!String(b.title||'').trim())return NextResponse.json({error:'Campaign and title required'},{status:400});
    if(b.status&&!allowed.has(b.status))return NextResponse.json({error:'Invalid status'},{status:400});
    if(b.paymentStatus&&!paymentAllowed.has(b.paymentStatus))return NextResponse.json({error:'Invalid payment status'},{status:400});
    if(creatorId){
      const assignment=await db.prepare("SELECT 1 ok FROM campaign_creators WHERE campaign_id=? AND creator_id=? AND status='assigned'").bind(campaignId,creatorId).first<{ok:number}>();
      if(!assignment)return NextResponse.json({error:'Assign this creator to the campaign first'},{status:400});
    }
    await createDeliverable(b);
    await recordActivity({actorType:'admin',campaignId,creatorId:creatorId||null,eventType:'deliverable.created',title:'Deliverable created',detail:String(b.title||'New deliverable'),metadata:{dueDate:b.dueDate||null,status:b.status||'pending'}});
    if(creatorId){
      const creator=await db.prepare('SELECT full_name,email FROM creators WHERE id=?').bind(creatorId).first<{full_name:string;email:string}>();
      const campaign=await db.prepare('SELECT name FROM campaigns WHERE id=?').bind(campaignId).first<{name:string}>();
      if(creator&&campaign){const origin=new URL(request.url).origin;await sendEmailTo(creator.email,`New deliverable — ${campaign.name}`,`<div style="font-family:Arial,sans-serif"><h2>New campaign deliverable</h2><p>Hi ${creator.full_name}, Vira assigned you <strong>${String(b.title)}</strong> for <strong>${campaign.name}</strong>.</p><p>${b.dueDate?`Due: <strong>${String(b.dueDate)}</strong>`:'Open the portal for timing and instructions.'}</p><p><a href="${origin}/portal/campaigns/${campaignId}">View deliverable</a></p></div>`);}
    }
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}

export async function PATCH(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
  try{
    const b=await request.json();const id=Number(b.id);
    if(!Number.isInteger(id)||id<1)return NextResponse.json({error:'Invalid deliverable'},{status:400});
    if(b.status&&!allowed.has(b.status))return NextResponse.json({error:'Invalid status'},{status:400});
    if(b.paymentStatus&&!paymentAllowed.has(b.paymentStatus))return NextResponse.json({error:'Invalid payment status'},{status:400});
    if(b.status==='changes_requested'&&!String(b.feedback||'').trim())return NextResponse.json({error:'Add feedback before requesting changes'},{status:400});
    const before=await db.prepare(`SELECT d.id,d.title,d.creator_id,d.status,d.payment_status,camp.id campaign_id,camp.name campaign_name,c.full_name,c.email FROM deliverables d JOIN campaigns camp ON camp.id=d.campaign_id LEFT JOIN creators c ON c.id=d.creator_id WHERE d.id=?`).bind(id).first<{id:number;title:string;creator_id:number|null;status:string;payment_status:string;campaign_id:number;campaign_name:string;full_name:string|null;email:string|null}>();
    if(!before)return NextResponse.json({error:'Not found'},{status:404});
    const patch:Record<string,unknown>={...b};if(patch.feedback==='')delete patch.feedback;if(patch.paymentReference==='')delete patch.paymentReference;if(b.status==='approved'&&!b.approvedAt)patch.approvedAt=new Date().toISOString();if(b.paymentStatus==='paid'&&!b.paymentDate)patch.paymentDate=new Date().toISOString().slice(0,10);await updateDeliverable(id,patch);
    if(typeof b.status==='string'&&b.status!==before.status){await recordActivity({actorType:'admin',campaignId:before.campaign_id,creatorId:before.creator_id,deliverableId:id,eventType:'deliverable.status_changed',title:'Deliverable status changed',detail:`${before.title}: ${before.status.replaceAll('_',' ')} → ${b.status.replaceAll('_',' ')}`,metadata:{from:before.status,to:b.status}})}
    else if(typeof b.paymentStatus==='string'&&b.paymentStatus!==before.payment_status){await recordActivity({actorType:'admin',campaignId:before.campaign_id,creatorId:before.creator_id,deliverableId:id,eventType:'deliverable.payment_changed',title:'Creator payment status changed',detail:`${before.title}: ${before.payment_status.replaceAll('_',' ')} → ${b.paymentStatus.replaceAll('_',' ')}`,metadata:{from:before.payment_status,to:b.paymentStatus}})}
    else{const changed=Object.keys(b).filter(key=>key!=='id');await recordActivity({actorType:'admin',campaignId:before.campaign_id,creatorId:before.creator_id,deliverableId:id,eventType:'deliverable.updated',title:'Deliverable updated',detail:before.title,metadata:{changedFields:changed}})}
    if(before.email&&typeof b.status==='string'&&b.status!==before.status&&['changes_requested','approved'].includes(b.status)){const origin=new URL(request.url).origin;const cleanFeedback=typeof b.feedback==='string'?b.feedback.trim():'';const feedbackHtml=cleanFeedback?`<p><strong>Feedback:</strong> ${cleanFeedback}</p>`:'';const isChanges=b.status==='changes_requested';await sendEmailTo(before.email,isChanges?`Changes requested — ${before.campaign_name}`:`Content approved — ${before.campaign_name}`,`<div style="font-family:Arial,sans-serif"><h2>${isChanges?'Vira requested changes':'Your content was approved'}</h2><p>Hi ${before.full_name||'creator'}, <strong>${before.title}</strong> for <strong>${before.campaign_name}</strong> has been ${isChanges?'returned for revision':'approved'}.</p>${feedbackHtml}<p><a href="${origin}/portal/campaigns/${before.campaign_id}">Open Creator Portal</a></p></div>`)}
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
