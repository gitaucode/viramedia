import { NextResponse } from "next/server";
import { getCreatorSession } from "@/lib/creator-auth";
import { getOpsDb } from "@/lib/ops-db";
import { recordActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email";

type Row={id:number;campaign_id:number;title:string;status:string;campaign_name:string};
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const creator=await getCreatorSession();if(!creator)return NextResponse.json({error:'Unauthorized'},{status:401});const {id}=await params;const deliverableId=Number(id);if(!Number.isInteger(deliverableId))return NextResponse.json({error:'Invalid deliverable'},{status:400});const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const row=await db.prepare(`SELECT d.id,d.campaign_id,d.title,d.status,camp.name campaign_name FROM deliverables d JOIN campaigns camp ON camp.id=d.campaign_id WHERE d.id=? AND d.creator_id=?`).bind(deliverableId,creator.id).first<Row>();if(!row)return NextResponse.json({error:'Not found'},{status:404});
 try{const b=await request.json();
  if(b.action==='start'){
   if(['done'].includes(row.status))return NextResponse.json({error:'This deliverable is already complete'},{status:400});
   await db.prepare("UPDATE deliverables SET status='in_progress',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(deliverableId).run();
   await recordActivity({actorType:'creator',actorId:creator.id,campaignId:row.campaign_id,creatorId:creator.id,deliverableId,eventType:'deliverable.started',title:'Creator started deliverable',detail:row.title});
   return NextResponse.json({ok:true,status:'in_progress'});
  }
  if(b.action==='submit'){
   if(['done'].includes(row.status))return NextResponse.json({error:'This deliverable is already complete'},{status:400});
   const url=typeof b.url==='string'?b.url.trim().slice(0,1000):'';const note=typeof b.note==='string'?b.note.trim().slice(0,5000):'';
   if(!/^https?:\/\//i.test(url))return NextResponse.json({error:'Add a valid http(s) content link'},{status:400});
   const latest=await db.prepare('SELECT COALESCE(MAX(version_number),0) n FROM submission_versions WHERE deliverable_id=?').bind(deliverableId).first<{n:number}>();const versionNumber=Number(latest?.n||0)+1;
   const version=await db.prepare(`INSERT INTO submission_versions (deliverable_id,version_number,creator_id,source_type,external_url,creator_note) VALUES (?,?,?,'external',?,?) RETURNING id`).bind(deliverableId,versionNumber,creator.id,url,note).first<{id:number}>();
   if(!version?.id)throw new Error('Could not store submission version');
   await db.prepare("UPDATE deliverables SET submission_url=?,submission_note=?,status='submitted',submitted_at=CURRENT_TIMESTAMP,approved_at=NULL,internal_review_version_id=NULL,client_approval_status='not_ready',client_submission_version_id=NULL,client_feedback='',client_reviewed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(url,note,deliverableId).run();
   await recordActivity({actorType:'creator',actorId:creator.id,campaignId:row.campaign_id,creatorId:creator.id,deliverableId,eventType:'deliverable.submitted',title:`Creator submitted V${versionNumber}`,detail:row.title,metadata:{submissionVersionId:version.id,versionNumber,sourceType:'external'}});
   await sendEmail(`Creator submission — ${row.campaign_name} / ${row.title}`,`<div style="font-family:Arial,sans-serif"><h2>Creator submission received</h2><p><strong>${creator.full_name}</strong> submitted <strong>V${versionNumber}</strong> of <strong>${row.title}</strong> for ${row.campaign_name}.</p><p><a href="${url}">Open submitted content</a></p><p>${note||''}</p></div>`,creator.email);
   return NextResponse.json({ok:true,status:'submitted',version:{id:version.id,versionNumber}});
  }
  return NextResponse.json({error:'Invalid action'},{status:400});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
