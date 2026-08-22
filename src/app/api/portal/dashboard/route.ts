import { NextResponse } from "next/server";
import { getCreatorSession } from "@/lib/creator-auth";
import { getOpsDb } from "@/lib/ops-db";

type CampaignRow={id:number;name:string;client:string;creator_brief:string;status:string;start_date:string|null;end_date:string|null;deliverable_count:number;next_due:string|null};
type DeliverableRow={id:number;campaign_id:number;campaign_name:string;title:string;due_date:string|null;status:string;feedback:string;submission_url:string|null;creator_fee:number;payment_status:string;payment_date:string|null};
export async function GET(){
 const creator=await getCreatorSession();if(!creator)return NextResponse.json({error:'Unauthorized'},{status:401});const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const campaigns=(await db.prepare(`SELECT camp.id,camp.name,camp.client,camp.creator_brief,camp.status,camp.start_date,camp.end_date,COUNT(d.id) deliverable_count,MIN(CASE WHEN d.status NOT IN ('done','approved') THEN d.due_date END) next_due FROM campaign_creators cc JOIN campaigns camp ON camp.id=cc.campaign_id LEFT JOIN deliverables d ON d.campaign_id=camp.id AND d.creator_id=? WHERE cc.creator_id=? AND cc.status IN ('accepted','assigned') GROUP BY camp.id ORDER BY CASE WHEN camp.status='active' THEN 0 WHEN camp.status='planning' THEN 1 ELSE 2 END,datetime(camp.created_at) DESC`).bind(creator.id,creator.id).all<CampaignRow>()).results??[];
 const deliverables=(await db.prepare(`SELECT d.id,d.campaign_id,camp.name campaign_name,d.title,d.due_date,d.status,d.feedback,d.submission_url,d.creator_fee,d.payment_status,d.payment_date FROM deliverables d JOIN campaigns camp ON camp.id=d.campaign_id WHERE d.creator_id=? ORDER BY CASE WHEN d.status IN ('done','approved') THEN 1 ELSE 0 END,CASE WHEN d.due_date IS NULL THEN 1 ELSE 0 END,d.due_date ASC`).bind(creator.id).all<DeliverableRow>()).results??[];
 const totalFees=deliverables.reduce((a,d)=>a+Number(d.creator_fee||0),0),paidFees=deliverables.filter(d=>d.payment_status==='paid').reduce((a,d)=>a+Number(d.creator_fee||0),0);
 const stats={activeCampaigns:campaigns.filter(c=>['planning','active'].includes(c.status)).length,openDeliverables:deliverables.filter(d=>!['done','approved'].includes(d.status)).length,awaitingApproval:deliverables.filter(d=>d.status==='submitted').length,totalFees,paidFees};
 return NextResponse.json({creator,campaigns,deliverables,stats});
}
