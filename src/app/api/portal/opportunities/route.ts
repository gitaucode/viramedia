import { NextResponse } from "next/server";
import { getCreatorSession } from "@/lib/creator-auth";
import { getOpsDb } from "@/lib/ops-db";

type CreatorProfile={id:number;city:string;niches:string;tiktok:string;instagram:string|null;youtube:string|null};
type Opportunity={id:number;name:string;client:string;application_mode:string;opportunity_summary:string;opportunity_niches:string;opportunity_cities:string;opportunity_platform:string;opportunity_compensation:string;application_deadline:string|null;status:string;application_status:string|null;pitch:string|null;proposed_rate:string|null;availability:string|null;applied_at:string|null};
const parseList=(raw:string)=>{try{const v=JSON.parse(raw||'[]');return Array.isArray(v)?v.map(String).map(s=>s.trim()).filter(Boolean):[]}catch{return []}};
const norm=(v:string)=>v.trim().toLowerCase();
function matches(profile:CreatorProfile,o:Pick<Opportunity,'application_mode'|'opportunity_niches'|'opportunity_cities'|'opportunity_platform'>){
 if(o.application_mode==='all_approved')return true;
 const creatorNiches=parseList(profile.niches).map(norm),niches=parseList(o.opportunity_niches).map(norm),cities=parseList(o.opportunity_cities).map(norm),city=norm(profile.city||'');
 const p=norm(o.opportunity_platform||'');const platformOk=!p||(p==='tiktok'&&!!profile.tiktok)||(p==='instagram'&&!!profile.instagram)||(p==='youtube'&&!!profile.youtube);
 return (!niches.length||niches.some(n=>creatorNiches.includes(n)))&&(!cities.length||cities.includes(city))&&platformOk;
}

export async function GET(){
 const creator=await getCreatorSession();if(!creator)return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const profile=await db.prepare(`SELECT id,city,niches,tiktok,instagram,youtube FROM creators WHERE id=?`).bind(creator.id).first<CreatorProfile>();
 if(!profile)return NextResponse.json({error:'Creator not found'},{status:404});
 const r=await db.prepare(`SELECT c.id,c.name,c.client,c.application_mode,c.opportunity_summary,c.opportunity_niches,c.opportunity_cities,c.opportunity_platform,c.opportunity_compensation,c.application_deadline,c.status,a.status application_status,a.pitch,a.proposed_rate,a.availability,a.created_at applied_at FROM campaigns c LEFT JOIN campaign_applications a ON a.campaign_id=c.id AND a.creator_id=? WHERE c.application_mode!='private' AND c.status IN ('planning','active') AND (c.application_deadline IS NULL OR date(c.application_deadline)>=date('now')) ORDER BY CASE WHEN a.id IS NULL THEN 0 ELSE 1 END,CASE WHEN c.application_deadline IS NULL THEN 1 ELSE 0 END,c.application_deadline ASC,datetime(c.created_at) DESC`).bind(creator.id).all<Opportunity>();
 return NextResponse.json({creator:{id:creator.id,full_name:creator.full_name},opportunities:(r.results??[]).filter(o=>!!o.application_status||matches(profile,o))});
}

export async function POST(request:Request){
 const creator=await getCreatorSession();if(!creator)return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 try{
   const b=await request.json();const campaignId=Number(b.campaignId);
   if(!Number.isInteger(campaignId)||campaignId<1)return NextResponse.json({error:'Invalid campaign'},{status:400});
   const campaign=await db.prepare(`SELECT id,application_mode,application_deadline,status,opportunity_niches,opportunity_cities,opportunity_platform FROM campaigns WHERE id=?`).bind(campaignId).first<Opportunity>();
   if(!campaign||campaign.application_mode==='private'||!['planning','active'].includes(campaign.status))return NextResponse.json({error:'This opportunity is not accepting applications'},{status:400});
   if(campaign.application_deadline&&new Date(`${campaign.application_deadline}T23:59:59Z`).getTime()<Date.now())return NextResponse.json({error:'Applications are closed'},{status:400});
   const profile=await db.prepare(`SELECT id,city,niches,tiktok,instagram,youtube FROM creators WHERE id=?`).bind(creator.id).first<CreatorProfile>();
   if(!profile||!matches(profile,campaign))return NextResponse.json({error:'This campaign is not currently matched to your creator profile'},{status:403});
   const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
   await db.prepare(`INSERT INTO campaign_applications (campaign_id,creator_id,status,pitch,proposed_rate,availability,updated_at) VALUES (?,?,'applied',?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(campaign_id,creator_id) DO UPDATE SET pitch=excluded.pitch,proposed_rate=excluded.proposed_rate,availability=excluded.availability,updated_at=CURRENT_TIMESTAMP WHERE campaign_applications.status='applied'`).bind(campaignId,creator.id,clean(b.pitch,1200),clean(b.proposedRate,100),clean(b.availability,300)).run();
   return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
