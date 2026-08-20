import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { getOpsDb } from "@/lib/ops-db";

export async function GET(){
 const client=await getClientSession();if(!client)return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=getOpsDb();if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});
 const campaigns=await db.prepare(`SELECT s.id,s.name,s.client,s.client_objective,s.status,s.start_date,s.end_date,COUNT(DISTINCT CASE WHEN d.status IN ('approved','done') AND d.client_approval_status!='not_ready' THEN d.id END) deliverable_count,COALESCE(SUM(pm.views),0) views,COALESCE(SUM(pm.reach),0) reach,COALESCE(SUM(pm.impressions),0) impressions,COALESCE(SUM(pm.likes+pm.comments+pm.shares+pm.saves),0) engagements FROM campaign_clients cc JOIN shortlists s ON s.id=cc.campaign_id LEFT JOIN deliverables d ON d.campaign_id=s.id LEFT JOIN performance_metrics pm ON pm.deliverable_id=d.id WHERE cc.client_id=? GROUP BY s.id ORDER BY CASE WHEN s.status='active' THEN 0 WHEN s.status='planning' THEN 1 ELSE 2 END,datetime(s.created_at) DESC`).bind(client.id).all();
 const rows=(campaigns.results||[]) as Array<Record<string,unknown>>;
 const totals=rows.reduce((a,r)=>({views:a.views+Number(r.views||0),reach:a.reach+Number(r.reach||0),engagements:a.engagements+Number(r.engagements||0)}),{views:0,reach:0,engagements:0});
 return NextResponse.json({client,campaigns:rows,stats:{campaigns:rows.length,activeCampaigns:rows.filter(r=>['active','planning'].includes(String(r.status))).length,...totals}});
}
