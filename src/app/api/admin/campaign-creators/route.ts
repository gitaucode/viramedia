import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { recordActivity } from "@/lib/activity";
import { addCampaignCreator,getOpsDb,listCampaignCreators,removeCampaignCreator,type CampaignCreatorStatus } from "@/lib/ops-db";
import { sendEmailTo } from "@/lib/email";

const creatorStatuses=new Set<CampaignCreatorStatus>(['shortlisted','invited','accepted','assigned','declined','removed']);

export async function GET(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
  const id=Number(new URL(request.url).searchParams.get('campaignId')||0);
  if(!Number.isInteger(id)||id<1)return NextResponse.json({error:'Invalid campaign'},{status:400});
  const creators=await listCampaignCreators(id);
  if(!creators)return NextResponse.json({error:'Database unavailable'},{status:503});
  return NextResponse.json({creators});
}

export async function POST(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=getOpsDb();
  if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
  try{
    const b=await request.json();
    const campaignId=Number(b.campaignId),creatorId=Number(b.creatorId);
    if(!Number.isInteger(campaignId)||!Number.isInteger(creatorId))return NextResponse.json({error:'Invalid IDs'},{status:400});

    const creator=await db.prepare("SELECT id,full_name,email,status FROM creators WHERE id=?").bind(creatorId).first<{id:number;full_name:string;email:string;status:string}>();
    const campaign=await db.prepare('SELECT id,name,client FROM campaigns WHERE id=?').bind(campaignId).first<{id:number;name:string;client:string}>();
    if(!creator||!campaign)return NextResponse.json({error:'Creator or campaign not found'},{status:404});

    if(b.action==='remove'){
      await removeCampaignCreator(campaignId,creatorId);
      await recordActivity({actorType:'admin',campaignId,creatorId,eventType:'campaign_creator.removed',title:'Creator removed',detail:`${creator.full_name} was removed from ${campaign.name}.`});
      return NextResponse.json({ok:true});
    }

    if(b.action!=='add')return NextResponse.json({error:'Invalid action'},{status:400});
    if(creator.status!=='approved')return NextResponse.json({error:'Approved creator or campaign not found'},{status:404});

    const requested=String(b.status||'assigned') as CampaignCreatorStatus;
    if(!creatorStatuses.has(requested)||requested==='removed')return NextResponse.json({error:'Invalid creator status'},{status:400});
    const existing=await db.prepare('SELECT status FROM campaign_creators WHERE campaign_id=? AND creator_id=?').bind(campaignId,creatorId).first<{status:string}>();
    await addCampaignCreator(campaignId,creatorId,requested);

    if(existing?.status!==requested){
      const eventType=`campaign_creator.${requested}`;
      const label=requested.replaceAll('_',' ');
      await recordActivity({actorType:'admin',campaignId,creatorId,eventType,title:`Creator ${label}`,detail:`${creator.full_name} was marked ${label} for ${campaign.name}.`,metadata:{from:existing?.status||null,to:requested}});
    }

    if(requested==='assigned'&&existing?.status!=='assigned'){
      const origin=new URL(request.url).origin;
      await sendEmailTo(creator.email,`New Vira campaign — ${campaign.name}`,`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>You have been added to a Vira campaign</h2><p>Hi ${creator.full_name}, you have been assigned to <strong>${campaign.name}</strong>${campaign.client?` for ${campaign.client}`:''}.</p><p>Open your creator portal to view the brief and any deliverables assigned to you.</p><p><a href="${origin}/portal/dashboard">Open Creator Portal</a></p></div>`);
    }
    return NextResponse.json({ok:true,status:requested});
  }catch{
    return NextResponse.json({error:'Invalid request'},{status:400});
  }
}
