import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { getOpsDb } from "@/lib/ops-db";

type DashboardTotals={views:number;reach:number;engagements:number};

export async function GET(){
 const client=await getClientSession();if(!client)return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const campaigns=await db.prepare(`SELECT camp.id,camp.name,camp.client,camp.client_objective,camp.status,camp.start_date,camp.end_date,COUNT(DISTINCT CASE WHEN d.client_approval_status!='not_ready' THEN d.id END) deliverable_count,COALESCE(SUM(CASE WHEN d.client_approval_status!='not_ready' THEN pm.views ELSE 0 END),0) views,COALESCE(SUM(CASE WHEN d.client_approval_status!='not_ready' THEN pm.reach ELSE 0 END),0) reach,COALESCE(SUM(CASE WHEN d.client_approval_status!='not_ready' THEN pm.impressions ELSE 0 END),0) impressions,COALESCE(SUM(CASE WHEN d.client_approval_status!='not_ready' THEN pm.likes+pm.comments+pm.shares+pm.saves ELSE 0 END),0) engagements FROM campaign_clients cc JOIN campaigns camp ON camp.id=cc.campaign_id LEFT JOIN deliverables d ON d.campaign_id=camp.id LEFT JOIN performance_metrics pm ON pm.deliverable_id=d.id WHERE cc.client_id=? GROUP BY camp.id ORDER BY CASE WHEN camp.status='active' THEN 0 WHEN camp.status='planning' THEN 1 ELSE 2 END,datetime(camp.created_at) DESC`).bind(client.id).all();
 const rows=(campaigns.results||[]) as Array<Record<string,unknown>>;
 const totals=rows.reduce<DashboardTotals>((a,r)=>({views:a.views+Number(r.views||0),reach:a.reach+Number(r.reach||0),engagements:a.engagements+Number(r.engagements||0)}),{views:0,reach:0,engagements:0});
 return NextResponse.json({client,campaigns:rows,stats:{campaigns:rows.length,activeCampaigns:rows.filter(r=>['active','planning'].includes(String(r.status))).length,...totals}});
}
