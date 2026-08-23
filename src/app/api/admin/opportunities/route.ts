import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getOpsDb } from "@/lib/ops-db";
import { recordActivity } from "@/lib/activity";

const modes=new Set(['private','matched','all_approved']);
const appStatuses=new Set(['applied','shortlisted','rejected']);
const clean=(v:unknown,max=2000)=>typeof v==='string'?v.trim().slice(0,max):'';
const listJson=(v:unknown)=>JSON.stringify((Array.isArray(v)?v:typeof v==='string'?v.split(','):[]).map(String).map(s=>s.trim()).filter(Boolean).slice(0,30));

export async function GET(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const campaignId=Number(new URL(request.url).searchParams.get('campaignId'))||0;
 const campaigns=(await db.prepare(`SELECT c.id,c.name,c.client,c.status,c.application_mode,c.opportunity_summary,c.opportunity_niches,c.opportunity_cities,c.opportunity_platform,c.opportunity_compensation,c.application_deadline,COUNT(a.id) application_count,SUM(CASE WHEN a.status='applied' THEN 1 ELSE 0 END) new_application_count FROM campaigns c LEFT JOIN campaign_applications a ON a.campaign_id=c.id GROUP BY c.id ORDER BY CASE WHEN c.status IN ('planning','active') THEN 0 ELSE 1 END,datetime(c.created_at) DESC`).all()).results??[];
 let applications:unknown[]=[];
 if(campaignId){applications=(await db.prepare(`SELECT a.id,a.campaign_id,a.creator_id,a.status,a.pitch,a.proposed_rate,a.availability,a.created_at,a.updated_at,c.full_name,c.email,c.city,c.niches,c.tiktok,c.tiktok_followers,c.instagram,c.instagram_followers,c.youtube,c.rate_range FROM campaign_applications a JOIN creators c ON c.id=a.creator_id WHERE a.campaign_id=? ORDER BY CASE a.status WHEN 'applied' THEN 0 WHEN 'shortlisted' THEN 1 ELSE 2 END,datetime(a.created_at) DESC`).bind(campaignId).all()).results??[]}
 return NextResponse.json({campaigns,applications});
}

export async function PATCH(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{
  const b=await request.json();const kind=clean(b.kind,30);
  if(kind==='campaign'){
   const campaignId=Number(b.campaignId);if(!Number.isInteger(campaignId)||campaignId<1)return NextResponse.json({error:'Invalid campaign'},{status:400});
   const mode=clean(b.applicationMode,30);if(!modes.has(mode))return NextResponse.json({error:'Invalid application mode'},{status:400});
   const platform=clean(b.platform,30).toLowerCase();if(platform&&!['tiktok','instagram','youtube'].includes(platform))return NextResponse.json({error:'Invalid platform'},{status:400});
   await db.prepare(`UPDATE campaigns SET application_mode=?,opportunity_summary=?,opportunity_niches=?,opportunity_cities=?,opportunity_platform=?,opportunity_compensation=?,application_deadline=? WHERE id=?`).bind(mode,clean(b.summary,1200),listJson(b.niches),listJson(b.cities),platform,clean(b.compensation,160),clean(b.deadline,30)||null,campaignId).run();
   await recordActivity({actorType:'admin',campaignId,eventType:'opportunity.updated',title:'Creator opportunity updated',detail:`Applications: ${mode}`,metadata:{applicationMode:mode}});
   return NextResponse.json({ok:true});
  }
  if(kind==='application'){
   const applicationId=Number(b.applicationId);const status=clean(b.status,30);if(!Number.isInteger(applicationId)||applicationId<1||!appStatuses.has(status))return NextResponse.json({error:'Invalid application update'},{status:400});
   const app=await db.prepare(`SELECT campaign_id,creator_id FROM campaign_applications WHERE id=?`).bind(applicationId).first<{campaign_id:number;creator_id:number}>();if(!app)return NextResponse.json({error:'Application not found'},{status:404});
   await db.prepare(`UPDATE campaign_applications SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status,applicationId).run();
   if(status==='shortlisted')await db.prepare(`INSERT INTO campaign_creators (campaign_id,creator_id,status,updated_at) VALUES (?,?,'shortlisted',CURRENT_TIMESTAMP) ON CONFLICT(campaign_id,creator_id) DO UPDATE SET status=CASE WHEN campaign_creators.status IN ('accepted','assigned','invited') THEN campaign_creators.status ELSE 'shortlisted' END,updated_at=CURRENT_TIMESTAMP`).bind(app.campaign_id,app.creator_id).run();
   await recordActivity({actorType:'admin',campaignId:app.campaign_id,eventType:'opportunity.application_reviewed',title:'Creator application reviewed',detail:`Application marked ${status}`,metadata:{creatorId:app.creator_id,applicationId,status}});
   return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:'Invalid request'},{status:400});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
