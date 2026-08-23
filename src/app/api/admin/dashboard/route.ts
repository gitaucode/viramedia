import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getOpsDb,listLeads } from "@/lib/ops-db";
import { listCreators } from "@/lib/creator-db";

type ActionItem={id:string;kind:string;priority:"high"|"medium"|"low";title:string;detail:string;campaignId:number|null;campaignName:string|null;count?:number;amount?:number;dueDate?:string|null};

export async function GET(){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=getOpsDb();if(!db)return NextResponse.json({error:"Database is not configured",code:"DB_NOT_CONFIGURED"},{status:503});
  const [leads,creators,campaignCounts,reviewRows,clientRows,deadlineRows,creatorPaymentRows,startRows,balanceRows]=await Promise.all([
    listLeads(),
    listCreators({}),
    db.prepare(`SELECT COUNT(*) total,COALESCE(SUM(CASE WHEN status='active' THEN 1 ELSE 0 END),0) active FROM campaigns`).first<{total:number;active:number}>(),
    db.prepare(`SELECT c.id campaign_id,c.name campaign_name,COUNT(*) count FROM deliverables d JOIN campaigns c ON c.id=d.campaign_id WHERE d.status='submitted' GROUP BY c.id,c.name ORDER BY count DESC`).all(),
    db.prepare(`SELECT c.id campaign_id,c.name campaign_name,COUNT(*) count,MIN(d.client_reviewed_at) oldest_review FROM deliverables d JOIN campaigns c ON c.id=d.campaign_id WHERE d.client_approval_status='awaiting_client' GROUP BY c.id,c.name ORDER BY oldest_review ASC`).all(),
    db.prepare(`SELECT c.id campaign_id,c.name campaign_name,COUNT(*) count,MIN(d.due_date) due_date FROM deliverables d JOIN campaigns c ON c.id=d.campaign_id WHERE d.status NOT IN ('done','approved') AND d.due_date IS NOT NULL AND date(d.due_date)<date('now') GROUP BY c.id,c.name ORDER BY due_date ASC`).all(),
    db.prepare(`SELECT c.id campaign_id,c.name campaign_name,COUNT(*) count,COALESCE(SUM(d.creator_fee),0) amount FROM deliverables d JOIN campaigns c ON c.id=d.campaign_id WHERE d.status='done' AND d.creator_fee>0 AND d.payment_status!='paid' GROUP BY c.id,c.name ORDER BY amount DESC`).all(),
    db.prepare(`SELECT id campaign_id,name campaign_name,start_date FROM campaigns WHERE status IN ('planning','active') AND start_date IS NOT NULL AND date(start_date)>=date('now') AND date(start_date)<=date('now','+7 day') ORDER BY start_date ASC`).all(),
    db.prepare(`SELECT c.id campaign_id,c.name campaign_name,c.invoiced_amount,COALESCE(SUM(cp.amount),0) paid FROM campaigns c LEFT JOIN client_payments cp ON cp.campaign_id=c.id WHERE c.invoiced_amount>0 GROUP BY c.id,c.name,c.invoiced_amount HAVING c.invoiced_amount>COALESCE(SUM(cp.amount),0) ORDER BY (c.invoiced_amount-COALESCE(SUM(cp.amount),0)) DESC`).all()
  ]);

  const actions:ActionItem[]=[];
  for(const r of reviewRows.results as Array<{campaign_id:number;campaign_name:string;count:number}>){actions.push({id:`review-${r.campaign_id}`,kind:"internal_review",priority:"high",title:`${r.count} submission${r.count===1?"":"s"} waiting for review`,detail:"Creator content needs an internal decision before it can move to the client.",campaignId:r.campaign_id,campaignName:r.campaign_name,count:r.count});}
  for(const r of deadlineRows.results as Array<{campaign_id:number;campaign_name:string;count:number;due_date:string|null}>){actions.push({id:`deadline-${r.campaign_id}`,kind:"overdue_deliverable",priority:"high",title:`${r.count} overdue deliverable${r.count===1?"":"s"}`,detail:`Oldest due date: ${r.due_date||"unknown"}.`,campaignId:r.campaign_id,campaignName:r.campaign_name,count:r.count,dueDate:r.due_date});}
  for(const r of clientRows.results as Array<{campaign_id:number;campaign_name:string;count:number;oldest_review:string|null}>){actions.push({id:`client-${r.campaign_id}`,kind:"client_review",priority:"medium",title:`${r.count} item${r.count===1?"":"s"} with client`,detail:"Approved creator content is awaiting client approval or feedback.",campaignId:r.campaign_id,campaignName:r.campaign_name,count:r.count});}
  for(const r of creatorPaymentRows.results as Array<{campaign_id:number;campaign_name:string;count:number;amount:number}>){actions.push({id:`creator-pay-${r.campaign_id}`,kind:"creator_payment",priority:"medium",title:`Creator payments outstanding`,detail:`${r.count} completed deliverable${r.count===1?"":"s"} still unpaid.`,campaignId:r.campaign_id,campaignName:r.campaign_name,count:r.count,amount:Number(r.amount||0)});}
  for(const r of balanceRows.results as Array<{campaign_id:number;campaign_name:string;invoiced_amount:number;paid:number}>){const outstanding=Math.max(Number(r.invoiced_amount||0)-Number(r.paid||0),0);actions.push({id:`client-balance-${r.campaign_id}`,kind:"client_balance",priority:"medium",title:"Client balance outstanding",detail:"Recorded receipts are below the invoiced amount.",campaignId:r.campaign_id,campaignName:r.campaign_name,amount:outstanding});}
  for(const r of startRows.results as Array<{campaign_id:number;campaign_name:string;start_date:string}>){actions.push({id:`start-${r.campaign_id}`,kind:"campaign_start",priority:"low",title:"Campaign starts soon",detail:`Starts ${r.start_date}. Check creator assignments, briefs and deliverables.`,campaignId:r.campaign_id,campaignName:r.campaign_name,dueDate:r.start_date});}

  const rank={high:0,medium:1,low:2};actions.sort((a,b)=>rank[a.priority]-rank[b.priority]);
  const recentLeads=(leads||[]).slice(0,5);
  const recentCreators=(creators||[]).slice(0,5);
  return NextResponse.json({
    stats:{newLeads:(leads||[]).filter(l=>l.status==="new").length,reviewCreators:(creators||[]).filter(c=>c.status==="review").length,approvedCreators:(creators||[]).filter(c=>c.status==="approved").length,activeCampaigns:Number(campaignCounts?.active||0),totalCampaigns:Number(campaignCounts?.total||0),openActions:actions.length,highPriorityActions:actions.filter(a=>a.priority==="high").length},
    actions:actions.slice(0,20),recentLeads,recentCreators
  });
}
