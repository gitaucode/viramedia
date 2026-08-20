import { NextResponse } from "next/server";
import { getCreatorSession } from "@/lib/creator-auth";
import { getOpsDb } from "@/lib/ops-db";
import { sendEmail } from "@/lib/email";

type Row={id:number;campaign_id:number;title:string;status:string;campaign_name:string};
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const creator=await getCreatorSession();if(!creator)return NextResponse.json({error:'Unauthorized'},{status:401});const {id}=await params;const deliverableId=Number(id);if(!Number.isInteger(deliverableId))return NextResponse.json({error:'Invalid deliverable'},{status:400});const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const row=await db.prepare(`SELECT d.id,d.campaign_id,d.title,d.status,s.name campaign_name FROM deliverables d JOIN shortlists s ON s.id=d.campaign_id WHERE d.id=? AND d.creator_id=?`).bind(deliverableId,creator.id).first<Row>();if(!row)return NextResponse.json({error:'Not found'},{status:404});
 try{const b=await request.json();
  if(b.action==='start'){
   if(['approved','done'].includes(row.status))return NextResponse.json({error:'This deliverable is already complete'},{status:400});
   await db.prepare("UPDATE deliverables SET status='in_progress',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(deliverableId).run();return NextResponse.json({ok:true,status:'in_progress'});
  }
  if(b.action==='submit'){
   const url=typeof b.url==='string'?b.url.trim().slice(0,1000):'';const note=typeof b.note==='string'?b.note.trim().slice(0,5000):'';
   if(!/^https?:\/\//i.test(url))return NextResponse.json({error:'Add a valid http(s) content link'},{status:400});
   await db.prepare("UPDATE deliverables SET submission_url=?,submission_note=?,status='submitted',submitted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(url,note,deliverableId).run();
   await sendEmail(`Creator submission — ${row.campaign_name} / ${row.title}`,`<div style="font-family:Arial,sans-serif"><h2>Creator submission received</h2><p><strong>${creator.full_name}</strong> submitted <strong>${row.title}</strong> for ${row.campaign_name}.</p><p><a href="${url}">Open submitted content</a></p><p>${note||''}</p></div>`,creator.email);
   return NextResponse.json({ok:true,status:'submitted'});
  }
  return NextResponse.json({error:'Invalid action'},{status:400});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
