import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { recordActivity } from "@/lib/activity";
import { getOpsDb } from "@/lib/ops-db";

const platforms=new Set(['tiktok','instagram','youtube','facebook','x','linkedin','other']);
const distributions=new Set(['organic','paid','mixed']);
const clean=(v:unknown,max=2000)=>typeof v==='string'?v.trim().slice(0,max):'';
const validUrl=(v:string)=>/^https?:\/\//i.test(v);

type PublicationAccess={
  deliverable_id:number;
  campaign_id:number;
  creator_id:number|null;
  title:string;
  client_approval_status:string;
  client_submission_version_id:number|null;
  version_number:number|null;
};

async function getEligibleVersion(deliverableId:number){
 const db=getOpsDb();if(!db)return null;
 return db.prepare(`SELECT d.id deliverable_id,d.campaign_id,d.creator_id,d.title,d.client_approval_status,d.client_submission_version_id,sv.version_number FROM deliverables d LEFT JOIN submission_versions sv ON sv.id=d.client_submission_version_id WHERE d.id=?`).bind(deliverableId).first<PublicationAccess>();
}

export async function GET(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const u=new URL(request.url),campaignId=Number(u.searchParams.get('campaignId')||0),deliverableId=Number(u.searchParams.get('deliverableId')||0);
 if(campaignId){const r=await db.prepare(`SELECT p.*,d.title deliverable_title,c.full_name creator_name,sv.version_number FROM publications p JOIN deliverables d ON d.id=p.deliverable_id LEFT JOIN creators c ON c.id=d.creator_id JOIN submission_versions sv ON sv.id=p.submission_version_id WHERE d.campaign_id=? ORDER BY datetime(p.published_at) DESC,p.id DESC`).bind(campaignId).all();return NextResponse.json({publications:r.results||[]})}
 if(deliverableId){const r=await db.prepare(`SELECT p.*,d.title deliverable_title,c.full_name creator_name,sv.version_number FROM publications p JOIN deliverables d ON d.id=p.deliverable_id LEFT JOIN creators c ON c.id=d.creator_id JOIN submission_versions sv ON sv.id=p.submission_version_id WHERE p.deliverable_id=? ORDER BY datetime(p.published_at) DESC,p.id DESC`).bind(deliverableId).all();return NextResponse.json({publications:r.results||[]})}
 return NextResponse.json({error:'campaignId or deliverableId is required'},{status:400});
}

export async function POST(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{
  const b=await request.json(),deliverableId=Number(b.deliverableId),platform=clean(b.platform,30).toLowerCase(),postUrl=clean(b.postUrl,1000),distributionType=clean(b.distributionType,30)||'organic';
  if(!Number.isInteger(deliverableId)||deliverableId<1)return NextResponse.json({error:'Invalid deliverable'},{status:400});
  if(!platforms.has(platform))return NextResponse.json({error:'Invalid platform'},{status:400});
  if(!validUrl(postUrl))return NextResponse.json({error:'Add a valid public post URL'},{status:400});
  if(!distributions.has(distributionType))return NextResponse.json({error:'Invalid distribution type'},{status:400});
  const access=await getEligibleVersion(deliverableId);if(!access)return NextResponse.json({error:'Deliverable not found'},{status:404});
  if(access.client_approval_status!=='approved'||!access.client_submission_version_id)return NextResponse.json({error:'Client approval is required before publishing'},{status:409});
  const publishedAt=clean(b.publishedAt,40)||new Date().toISOString();
  const creatorAccount=clean(b.creatorAccount,200),platformPostId=clean(b.platformPostId,300)||null,notes=clean(b.notes,3000),boostedSpend=Math.max(0,Number(b.boostedSpend)||0);
  const inserted=await db.prepare(`INSERT INTO publications (deliverable_id,submission_version_id,platform,post_url,creator_account,published_at,distribution_type,boosted_spend,platform_post_id,notes) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(deliverableId,access.client_submission_version_id,platform,postUrl,creatorAccount,publishedAt,distributionType,boostedSpend,platformPostId,notes).first<{id:number}>();
  if(!inserted?.id)throw new Error('Could not create publication');
  await recordActivity({actorType:'admin',campaignId:access.campaign_id,creatorId:access.creator_id,deliverableId,eventType:'publication.created',title:`Published on ${platform}`,detail:`${access.title} V${access.version_number||'?'} → ${postUrl}`,metadata:{publicationId:inserted.id,submissionVersionId:access.client_submission_version_id,platform,postUrl,distributionType,boostedSpend}});
  return NextResponse.json({ok:true,id:inserted.id,submissionVersionId:access.client_submission_version_id,versionNumber:access.version_number});
 }catch(error){const detail=error instanceof Error?error.message:'';if(/UNIQUE constraint failed: publications\.post_url/i.test(detail))return NextResponse.json({error:'This post URL is already recorded'},{status:409});return NextResponse.json({error:'Could not create publication',detail:detail||undefined},{status:400})}
}

export async function PATCH(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{
  const b=await request.json(),id=Number(b.id);if(!Number.isInteger(id)||id<1)return NextResponse.json({error:'Invalid publication'},{status:400});
  const before=await db.prepare(`SELECT p.*,d.campaign_id,d.creator_id,d.title FROM publications p JOIN deliverables d ON d.id=p.deliverable_id WHERE p.id=?`).bind(id).first<Record<string,unknown>>();if(!before)return NextResponse.json({error:'Publication not found'},{status:404});
  const sets:string[]=[],vals:unknown[]=[];
  if(typeof b.platform==='string'){const v=clean(b.platform,30).toLowerCase();if(!platforms.has(v))return NextResponse.json({error:'Invalid platform'},{status:400});sets.push('platform=?');vals.push(v)}
  if(typeof b.postUrl==='string'){const v=clean(b.postUrl,1000);if(!validUrl(v))return NextResponse.json({error:'Add a valid public post URL'},{status:400});sets.push('post_url=?');vals.push(v)}
  if(typeof b.creatorAccount==='string'){sets.push('creator_account=?');vals.push(clean(b.creatorAccount,200))}
  if(typeof b.publishedAt==='string'){sets.push('published_at=?');vals.push(clean(b.publishedAt,40))}
  if(typeof b.distributionType==='string'){const v=clean(b.distributionType,30);if(!distributions.has(v))return NextResponse.json({error:'Invalid distribution type'},{status:400});sets.push('distribution_type=?');vals.push(v)}
  if(b.boostedSpend!==undefined){sets.push('boosted_spend=?');vals.push(Math.max(0,Number(b.boostedSpend)||0))}
  if(typeof b.platformPostId==='string'){sets.push('platform_post_id=?');vals.push(clean(b.platformPostId,300)||null)}
  if(typeof b.notes==='string'){sets.push('notes=?');vals.push(clean(b.notes,3000))}
  if(!sets.length)return NextResponse.json({error:'Nothing to update'},{status:400});
  sets.push('updated_at=CURRENT_TIMESTAMP');vals.push(id);await db.prepare(`UPDATE publications SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();
  await recordActivity({actorType:'admin',campaignId:Number(before.campaign_id),creatorId:Number(before.creator_id)||null,deliverableId:Number(before.deliverable_id),eventType:'publication.updated',title:'Publication updated',detail:String(before.title||'Published content'),metadata:{publicationId:id,changedFields:Object.keys(b).filter(k=>k!=='id')}});
  return NextResponse.json({ok:true});
 }catch(error){const detail=error instanceof Error?error.message:'';if(/UNIQUE constraint failed: publications\.post_url/i.test(detail))return NextResponse.json({error:'This post URL is already recorded'},{status:409});return NextResponse.json({error:'Could not update publication'},{status:400})}
}

export async function DELETE(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{const b=await request.json(),id=Number(b.id);if(!Number.isInteger(id)||id<1)return NextResponse.json({error:'Invalid publication'},{status:400});const before=await db.prepare(`SELECT p.id,p.deliverable_id,p.platform,p.post_url,d.campaign_id,d.creator_id,d.title FROM publications p JOIN deliverables d ON d.id=p.deliverable_id WHERE p.id=?`).bind(id).first<{id:number;deliverable_id:number;platform:string;post_url:string;campaign_id:number;creator_id:number|null;title:string}>();if(!before)return NextResponse.json({error:'Publication not found'},{status:404});await db.prepare('DELETE FROM publications WHERE id=?').bind(id).run();await recordActivity({actorType:'admin',campaignId:before.campaign_id,creatorId:before.creator_id,deliverableId:before.deliverable_id,eventType:'publication.removed',title:'Publication removed',detail:`${before.title} · ${before.platform}`,metadata:{publicationId:id,postUrl:before.post_url}});return NextResponse.json({ok:true})}catch{return NextResponse.json({error:'Could not remove publication'},{status:400})}
}
