import { NextResponse } from "next/server";
import { rows, sendEmail } from "@/lib/email";
import { saveCreatorApplication } from "@/lib/creator-db";

function s(v:unknown,max=500){return typeof v==='string'?v.trim().slice(0,max):''}
function arr(v:unknown){return Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,20):[]}

export async function POST(request:Request){
 try{
  const b=await request.json();
  if(s(b.website))return NextResponse.json({ok:true});
  const fullName=s(b.fullName,100),email=s(b.email,160).toLowerCase(),phone=s(b.phone,50),city=s(b.city,100),tiktok=s(b.tiktok,250);
  if(!fullName||!email.includes('@')||!phone||!city||!tiktok)return NextResponse.json({error:'Missing required fields'},{status:400});

  const saved=await saveCreatorApplication({...b,email});
  if(!saved.saved&&saved.reason==='EMAIL_EXISTS')return NextResponse.json({error:'An application with this email already exists',code:'CREATOR_EMAIL_EXISTS'},{status:409});

  const html=`<div style="font-family:Arial,sans-serif;max-width:760px"><h2>New Creator Application</h2><p><strong>${fullName}</strong> has applied to the Vira Network.</p><table style="width:100%;border-collapse:collapse">${rows([['Name',fullName],['Email',email],['Phone / WhatsApp',phone],['City',city],['Age bracket',s(b.ageBracket,30)],['Gender',s(b.gender,30)],['TikTok',tiktok],['TikTok followers',s(b.tiktokFollowers,50)],['Average views',s(b.avgViews,50)],['Instagram',s(b.instagram,250)],['Instagram followers',s(b.instagramFollowers,50)],['YouTube / other',s(b.youtube,250)],['Best content',s(b.bestContent,500)],['Niches',arr(b.niches)],['Languages',s(b.languages,200)],['Formats',arr(b.formats)],['Brand experience',s(b.brandExperience,10)],['Past brands',s(b.pastBrands,1000)],['UGC',s(b.ugc,10)],['Posts to own account',s(b.ownAccount,10)],['Paid-ad usage',s(b.paidUsage,10)],['Physical shoots',s(b.physicalShoots,10)],['Travel',s(b.travel,10)],['Typical rate',s(b.rateRange,150)],['Portfolio / media kit',s(b.portfolio,500)]])}</table></div>`;
  const result=await sendEmail(`Creator application — ${fullName}`,html,email);

  if(saved.saved)return NextResponse.json({ok:true,saved:true,emailSent:result.ok});
  if(result.configurationMissing)return NextResponse.json({code:'EMAIL_NOT_CONFIGURED'},{status:503});
  if(!result.ok)return NextResponse.json({error:'Email failed'},{status:502});
  return NextResponse.json({ok:true,saved:false});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
