import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { recordActivity } from "@/lib/activity";
import { sendEmailTo } from "@/lib/email";
import { getOpsDb } from "@/lib/ops-db";

const actions=new Set(['approved','changes_requested']);
const clean=(v:unknown,max=5000)=>typeof v==='string'?v.trim().slice(0,max):'';

type VersionRow={
  id:number;deliverable_id:number;version_number:number;creator_id:number;source_type:string;r2_key:string|null;external_url:string|null;file_name:string|null;mime_type:string|null;file_size:number|null;creator_note:string;created_at:string;
  campaign_id:number;deliverable_title:string;deliverable_status:string;campaign_name:string;creator_name:string;creator_email:string;
};

export async function GET(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
  const campaignId=Number(new URL(request.url).searchParams.get('campaignId')||0);
  if(!Number.isInteger(campaignId)||campaignId<1)return NextResponse.json({error:'Invalid campaign'},{status:400});
  const versions=await db.prepare(`SELECT sv.id,sv.deliverable_id,sv.version_number,sv.creator_id,sv.source_type,sv.r2_key,sv.external_url,sv.file_name,sv.mime_type,sv.file_size,sv.creator_note,sv.created_at,d.internal_review_version_id,d.client_submission_version_id FROM submission_versions sv JOIN deliverables d ON d.id=sv.deliverable_id WHERE d.campaign_id=? ORDER BY sv.deliverable_id,sv.version_number DESC`).bind(campaignId).all();
  const events=await db.prepare(`SELECT re.id,re.deliverable_id,re.submission_version_id,re.reviewer_type,re.reviewer_id,re.action,re.feedback,re.created_at FROM review_events re JOIN deliverables d ON d.id=re.deliverable_id WHERE d.campaign_id=? ORDER BY datetime(re.created_at) DESC,re.id DESC`).bind(campaignId).all();
  return NextResponse.json({versions:versions.results||[],events:events.results||[]});
}

export async function POST(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
  try{
    const b=await request.json(),deliverableId=Number(b.deliverableId),versionId=Number(b.versionId),action=String(b.action||''),feedback=clean(b.feedback);
    if(!Number.isInteger(deliverableId)||deliverableId<1||!Number.isInteger(versionId)||versionId<1||!actions.has(action))return NextResponse.json({error:'Invalid review'},{status:400});
    if(action==='changes_requested'&&!feedback)return NextResponse.json({error:'Add feedback before requesting changes'},{status:400});
    const version=await db.prepare(`SELECT sv.id,sv.deliverable_id,sv.version_number,sv.creator_id,sv.source_type,sv.r2_key,sv.external_url,sv.file_name,sv.mime_type,sv.file_size,sv.creator_note,sv.created_at,d.campaign_id,d.title deliverable_title,d.status deliverable_status,camp.name campaign_name,c.full_name creator_name,c.email creator_email FROM submission_versions sv JOIN deliverables d ON d.id=sv.deliverable_id JOIN campaigns camp ON camp.id=d.campaign_id JOIN creators c ON c.id=sv.creator_id WHERE sv.id=? AND d.id=?`).bind(versionId,deliverableId).first<VersionRow>();
    if(!version)return NextResponse.json({error:'Submission version not found'},{status:404});
    const latest=await db.prepare('SELECT id,version_number FROM submission_versions WHERE deliverable_id=? ORDER BY version_number DESC LIMIT 1').bind(deliverableId).first<{id:number;version_number:number}>();
    if(!latest||latest.id!==versionId)return NextResponse.json({error:`V${latest?.version_number||'?'} is the latest submission. Review the latest version instead.`},{status:409});
    if(!['submitted','changes_requested','approved'].includes(version.deliverable_status))return NextResponse.json({error:'This deliverable is not ready for review'},{status:400});

    if(action==='approved'){
      await db.prepare(`UPDATE deliverables SET status='approved',feedback='',approved_at=CURRENT_TIMESTAMP,internal_review_version_id=?,client_approval_status='not_ready',client_submission_version_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(versionId,deliverableId).run();
    }else{
      await db.prepare(`UPDATE deliverables SET status='changes_requested',feedback=?,approved_at=NULL,internal_review_version_id=?,client_approval_status='not_ready',client_submission_version_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(feedback,versionId,deliverableId).run();
    }
    await db.prepare(`INSERT INTO review_events (deliverable_id,submission_version_id,reviewer_type,reviewer_id,action,feedback) VALUES (?,?,'admin',NULL,?,?)`).bind(deliverableId,versionId,action,feedback).run();
    await recordActivity({actorType:'admin',campaignId:version.campaign_id,creatorId:version.creator_id,deliverableId,eventType:action==='approved'?'submission.internal_approved':'submission.internal_changes_requested',title:action==='approved'?`V${version.version_number} approved internally`:`Changes requested on V${version.version_number}`,detail:version.deliverable_title,metadata:{submissionVersionId:versionId,versionNumber:version.version_number,feedback}});

    const origin=new URL(request.url).origin;
    const isChanges=action==='changes_requested';
    await sendEmailTo(version.creator_email,isChanges?`Changes requested on V${version.version_number} — ${version.campaign_name}`:`V${version.version_number} approved — ${version.campaign_name}`,`<div style="font-family:Arial,sans-serif"><h2>${isChanges?'Vira requested a revision':'Your submission was approved internally'}</h2><p>Hi ${version.creator_name}, <strong>V${version.version_number}</strong> of <strong>${version.deliverable_title}</strong> for <strong>${version.campaign_name}</strong> was ${isChanges?'returned for changes':'approved by Vira'}.</p>${feedback?`<p><strong>Feedback:</strong> ${feedback}</p>`:''}<p><a href="${origin}/portal/campaigns/${version.campaign_id}">Open Creator Portal</a></p></div>`);
    return NextResponse.json({ok:true,status:action==='approved'?'approved':'changes_requested',versionId,versionNumber:version.version_number});
  }catch(e){return NextResponse.json({error:'Could not save review',detail:e instanceof Error?e.message:undefined},{status:400})}
}
