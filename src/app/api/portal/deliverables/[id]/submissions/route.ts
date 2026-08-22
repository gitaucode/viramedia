import { NextResponse } from "next/server";
import { getCreatorSession } from "@/lib/creator-auth";
import { recordActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email";
import { getMediaBucket,mediaObjectKey,safeMediaFileName } from "@/lib/media-storage";
import { getOpsDb } from "@/lib/ops-db";

type DeliverableAccess={id:number;campaign_id:number;title:string;status:string;campaign_name:string};
type VersionRow={id:number;deliverable_id:number;version_number:number;creator_id:number;source_type:'r2'|'external';r2_key:string|null;external_url:string|null;file_name:string|null;mime_type:string|null;file_size:number|null;creator_note:string;created_at:string};
const MAX_FILE_BYTES=50*1024*1024;
const allowedMimePrefixes=['video/','image/'];

async function getAccess(deliverableId:number,creatorId:number){
  const db=getOpsDb();if(!db)return null;
  return db.prepare(`SELECT d.id,d.campaign_id,d.title,d.status,camp.name campaign_name FROM deliverables d JOIN campaigns camp ON camp.id=d.campaign_id WHERE d.id=? AND d.creator_id=?`).bind(deliverableId,creatorId).first<DeliverableAccess>();
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const creator=await getCreatorSession();if(!creator)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id}=await params,deliverableId=Number(id);if(!Number.isInteger(deliverableId)||deliverableId<1)return NextResponse.json({error:'Invalid deliverable'},{status:400});
  const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
  const access=await getAccess(deliverableId,creator.id);if(!access)return NextResponse.json({error:'Not found'},{status:404});
  const rows=await db.prepare(`SELECT id,deliverable_id,version_number,creator_id,source_type,r2_key,external_url,file_name,mime_type,file_size,creator_note,created_at FROM submission_versions WHERE deliverable_id=? ORDER BY version_number DESC`).bind(deliverableId).all<VersionRow>();
  return NextResponse.json({versions:rows.results??[]});
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const creator=await getCreatorSession();if(!creator)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id}=await params,deliverableId=Number(id);if(!Number.isInteger(deliverableId)||deliverableId<1)return NextResponse.json({error:'Invalid deliverable'},{status:400});
  const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
  const access=await getAccess(deliverableId,creator.id);if(!access)return NextResponse.json({error:'Not found'},{status:404});
  if(['done'].includes(access.status))return NextResponse.json({error:'This deliverable is already complete'},{status:400});

  let uploadedKey:string|null=null;
  try{
    const form=await request.formData();
    const note=String(form.get('note')??'').trim().slice(0,5000);
    const externalUrl=String(form.get('url')??'').trim().slice(0,1000);
    const file=form.get('file');
    const latest=await db.prepare('SELECT COALESCE(MAX(version_number),0) n FROM submission_versions WHERE deliverable_id=?').bind(deliverableId).first<{n:number}>();
    const versionNumber=Number(latest?.n||0)+1;

    let sourceType:'r2'|'external';
    let r2Key:string|null=null;
    let fileName:string|null=null;
    let mimeType:string|null=null;
    let fileSize:number|null=null;
    let externalMediaUrl:string|null=null;

    if(file instanceof File&&file.size>0){
      if(file.size>MAX_FILE_BYTES)return NextResponse.json({error:'File is too large. Maximum direct upload size is 50 MB.'},{status:413});
      const type=file.type||'application/octet-stream';
      if(!allowedMimePrefixes.some(prefix=>type.startsWith(prefix)))return NextResponse.json({error:'Upload a video or image file.'},{status:415});
      const bucket=getMediaBucket();if(!bucket)return NextResponse.json({error:'Media storage is unavailable'},{status:503});
      fileName=safeMediaFileName(file.name||`submission-${versionNumber}`);mimeType=type;fileSize=file.size;
      r2Key=mediaObjectKey({campaignId:access.campaign_id,deliverableId,versionNumber,fileName});uploadedKey=r2Key;
      await bucket.put(r2Key,await file.arrayBuffer(),{httpMetadata:{contentType:mimeType,contentDisposition:`inline; filename="${fileName.replaceAll('"','')}"`},customMetadata:{campaignId:String(access.campaign_id),deliverableId:String(deliverableId),creatorId:String(creator.id),versionNumber:String(versionNumber)}});
      sourceType='r2';
    }else{
      if(!/^https?:\/\//i.test(externalUrl))return NextResponse.json({error:'Upload a media file or add a valid http(s) content link.'},{status:400});
      sourceType='external';externalMediaUrl=externalUrl;
    }

    const result=await db.prepare(`INSERT INTO submission_versions (deliverable_id,version_number,creator_id,source_type,r2_key,external_url,file_name,mime_type,file_size,creator_note) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(deliverableId,versionNumber,creator.id,sourceType,r2Key,externalMediaUrl,fileName,mimeType,fileSize,note).first<{id:number}>();
    if(!result?.id)throw new Error('Could not store submission version');
    const mediaUrl=sourceType==='r2'?`/api/media/submissions/${result.id}`:externalMediaUrl;
    await db.prepare("UPDATE deliverables SET submission_url=?,submission_note=?,status='submitted',submitted_at=CURRENT_TIMESTAMP,approved_at=NULL,internal_review_version_id=NULL,client_approval_status='not_ready',client_submission_version_id=NULL,client_feedback='',client_reviewed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(mediaUrl,note,deliverableId).run();
    await recordActivity({actorType:'creator',actorId:creator.id,campaignId:access.campaign_id,creatorId:creator.id,deliverableId,eventType:'deliverable.submitted',title:`Creator submitted V${versionNumber}`,detail:access.title,metadata:{submissionVersionId:result.id,versionNumber,sourceType,fileName,fileSize}});
    await sendEmail(`Creator submission — ${access.campaign_name} / ${access.title}`,`<div style="font-family:Arial,sans-serif"><h2>Creator submission received</h2><p><strong>${creator.full_name}</strong> submitted <strong>V${versionNumber}</strong> of <strong>${access.title}</strong> for ${access.campaign_name}.</p><p>${note||''}</p></div>`,creator.email);
    uploadedKey=null;
    return NextResponse.json({ok:true,status:'submitted',version:{id:result.id,versionNumber,sourceType,url:mediaUrl,fileName,mimeType,fileSize,note}});
  }catch(error){
    if(uploadedKey){const bucket=getMediaBucket();if(bucket)await bucket.delete(uploadedKey).catch(()=>undefined)}
    return NextResponse.json({error:'Could not store submission',detail:error instanceof Error?error.message:undefined},{status:400});
  }
}
