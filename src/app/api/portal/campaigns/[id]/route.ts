import { NextResponse } from "next/server";
import { getCreatorSession } from "@/lib/creator-auth";
import { getOpsDb } from "@/lib/ops-db";

type Campaign={id:number;name:string;client:string;creator_brief:string;status:string;start_date:string|null;end_date:string|null};
type Deliverable={id:number;title:string;due_date:string|null;status:string;instructions:string;submission_url:string|null;submission_note:string;feedback:string;submitted_at:string|null;approved_at:string|null;creator_fee:number;payment_status:string;payment_date:string|null;payment_reference:string};
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const creator=await getCreatorSession();if(!creator)return NextResponse.json({error:'Unauthorized'},{status:401});const {id}=await params;const campaignId=Number(id);if(!Number.isInteger(campaignId))return NextResponse.json({error:'Invalid campaign'},{status:400});const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const campaign=await db.prepare(`SELECT s.id,s.name,s.client,s.creator_brief,s.status,s.start_date,s.end_date FROM shortlists s JOIN shortlist_creators sc ON sc.shortlist_id=s.id WHERE s.id=? AND sc.creator_id=?`).bind(campaignId,creator.id).first<Campaign>();
 if(!campaign)return NextResponse.json({error:'Not found'},{status:404});
 const deliverables=(await db.prepare(`SELECT id,title,due_date,status,instructions,submission_url,submission_note,feedback,submitted_at,approved_at,creator_fee,payment_status,payment_date,payment_reference FROM deliverables WHERE campaign_id=? AND creator_id=? ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,due_date ASC,id DESC`).bind(campaignId,creator.id).all<Deliverable>()).results??[];
 return NextResponse.json({creator,campaign,deliverables});
}
