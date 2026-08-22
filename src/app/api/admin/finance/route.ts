import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { recordActivity } from "@/lib/activity";
import { getOpsDb } from "@/lib/ops-db";

const costCategories=new Set(["production","media","other"]);
const num=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)&&n>=0?n:null};
const date=(value:unknown)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:null;

async function summary(db:NonNullable<ReturnType<typeof getOpsDb>>,campaignId:number){
  const campaign=await db.prepare("SELECT id,name,commercial_value,invoiced_amount FROM campaigns WHERE id=?").bind(campaignId).first<{id:number;name:string;commercial_value:number;invoiced_amount:number}>();
  if(!campaign)return null;
  const creator=await db.prepare(`SELECT COALESCE(SUM(creator_fee),0) committed,COALESCE(SUM(CASE WHEN payment_status='paid' THEN creator_fee ELSE 0 END),0) paid FROM deliverables WHERE campaign_id=?`).bind(campaignId).first<{committed:number;paid:number}>();
  const costRows=(await db.prepare("SELECT * FROM campaign_costs WHERE campaign_id=? ORDER BY incurred_at DESC,id DESC").bind(campaignId).all()).results as Array<Record<string,unknown>>;
  const payments=(await db.prepare(`SELECT cp.*,cl.company client_company FROM client_payments cp LEFT JOIN clients cl ON cl.id=cp.client_id WHERE cp.campaign_id=? ORDER BY cp.paid_at DESC,cp.id DESC`).bind(campaignId).all()).results as Array<Record<string,unknown>>;
  const costs=await db.prepare(`SELECT COALESCE(SUM(CASE WHEN category='production' THEN amount ELSE 0 END),0) production,COALESCE(SUM(CASE WHEN category='media' THEN amount ELSE 0 END),0) media,COALESCE(SUM(CASE WHEN category='other' THEN amount ELSE 0 END),0) other FROM campaign_costs WHERE campaign_id=?`).bind(campaignId).first<{production:number;media:number;other:number}>();
  const publication=await db.prepare(`SELECT COALESCE(SUM(p.boosted_spend),0) boosted FROM publications p JOIN deliverables d ON d.id=p.deliverable_id WHERE d.campaign_id=?`).bind(campaignId).first<{boosted:number}>();
  const paidRow=await db.prepare("SELECT COALESCE(SUM(amount),0) paid FROM client_payments WHERE campaign_id=?").bind(campaignId).first<{paid:number}>();
  const commercialValue=Number(campaign.commercial_value||0),invoiced=Number(campaign.invoiced_amount||0),clientPaid=Number(paidRow?.paid||0);
  const creatorCommitted=Number(creator?.committed||0),creatorPaid=Number(creator?.paid||0);
  const production=Number(costs?.production||0),manualMedia=Number(costs?.media||0),other=Number(costs?.other||0),boosted=Number(publication?.boosted||0);
  const totalCosts=creatorCommitted+production+manualMedia+other+boosted;
  return {campaign:{id:campaign.id,name:campaign.name,commercialValue,invoicedAmount:invoiced},totals:{commercialValue,invoicedAmount:invoiced,clientPaid,clientOutstanding:Math.max(invoiced-clientPaid,0),creatorCommitted,creatorPaid,creatorOutstanding:Math.max(creatorCommitted-creatorPaid,0),productionCosts:production,manualMediaCosts:manualMedia,boostedSpend:boosted,otherCosts:other,totalCosts,grossMargin:commercialValue-totalCosts},costs:costRows,payments};
}

export async function GET(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=getOpsDb();if(!db)return NextResponse.json({error:"Database unavailable"},{status:503});
  const campaignId=Number(new URL(request.url).searchParams.get("campaignId")||0);
  if(!Number.isInteger(campaignId)||campaignId<1)return NextResponse.json({error:"Invalid campaign"},{status:400});
  const data=await summary(db,campaignId);if(!data)return NextResponse.json({error:"Campaign not found"},{status:404});
  return NextResponse.json(data);
}

export async function PATCH(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=getOpsDb();if(!db)return NextResponse.json({error:"Database unavailable"},{status:503});
  try{const b=await request.json();const campaignId=Number(b.campaignId),commercialValue=num(b.commercialValue),invoicedAmount=num(b.invoicedAmount);if(!Number.isInteger(campaignId)||campaignId<1||commercialValue===null||invoicedAmount===null)return NextResponse.json({error:"Valid campaign value and invoiced amount are required"},{status:400});
    const result=await db.prepare("UPDATE campaigns SET commercial_value=?,invoiced_amount=? WHERE id=?").bind(commercialValue,invoicedAmount,campaignId).run();if(!result.meta.changes)return NextResponse.json({error:"Campaign not found"},{status:404});
    await recordActivity({actorType:"admin",campaignId,eventType:"finance.commercial_updated",title:"Commercial terms updated",detail:`Campaign value and invoiced amount updated`,metadata:{commercialValue,invoicedAmount}});
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"Invalid request"},{status:400})}
}

export async function POST(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=getOpsDb();if(!db)return NextResponse.json({error:"Database unavailable"},{status:503});
  try{const b=await request.json();const campaignId=Number(b.campaignId);if(!Number.isInteger(campaignId)||campaignId<1)return NextResponse.json({error:"Invalid campaign"},{status:400});
    if(b.kind==="cost"){
      const amount=num(b.amount),category=String(b.category||"");if(amount===null||amount<=0||!costCategories.has(category))return NextResponse.json({error:"Valid cost category and amount are required"},{status:400});
      const incurredAt=date(b.incurredAt)||new Date().toISOString().slice(0,10),vendor=String(b.vendor||"").trim().slice(0,200),notes=String(b.notes||"").trim().slice(0,2000);
      const r=await db.prepare("INSERT INTO campaign_costs (campaign_id,category,amount,vendor,notes,incurred_at) VALUES (?,?,?,?,?,?) RETURNING id").bind(campaignId,category,amount,vendor,notes,incurredAt).first<{id:number}>();
      await recordActivity({actorType:"admin",campaignId,eventType:"finance.cost_added",title:"Campaign cost added",detail:`${category.replaceAll('_',' ')}: KES ${amount}`,metadata:{costId:r?.id,category,amount,vendor}});
      return NextResponse.json({ok:true,id:r?.id});
    }
    if(b.kind==="payment"){
      const amount=num(b.amount),clientId=Number(b.clientId)||null;if(amount===null||amount<=0)return NextResponse.json({error:"Valid payment amount is required"},{status:400});
      if(clientId){const linked=await db.prepare("SELECT 1 ok FROM campaign_clients WHERE campaign_id=? AND client_id=?").bind(campaignId,clientId).first();if(!linked)return NextResponse.json({error:"Client is not linked to this campaign"},{status:400});}
      const paidAt=date(b.paidAt)||new Date().toISOString().slice(0,10),reference=String(b.reference||"").trim().slice(0,200),notes=String(b.notes||"").trim().slice(0,2000);
      const r=await db.prepare("INSERT INTO client_payments (campaign_id,client_id,amount,paid_at,reference,notes) VALUES (?,?,?,?,?,?) RETURNING id").bind(campaignId,clientId,amount,paidAt,reference,notes).first<{id:number}>();
      await recordActivity({actorType:"admin",campaignId,eventType:"finance.client_payment_added",title:"Client payment recorded",detail:`KES ${amount} received`,metadata:{paymentId:r?.id,amount,clientId,reference}});
      return NextResponse.json({ok:true,id:r?.id});
    }
    return NextResponse.json({error:"Invalid finance action"},{status:400});
  }catch{return NextResponse.json({error:"Invalid request"},{status:400})}
}

export async function DELETE(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=getOpsDb();if(!db)return NextResponse.json({error:"Database unavailable"},{status:503});
  try{const b=await request.json();const id=Number(b.id),kind=String(b.kind||"");if(!Number.isInteger(id)||id<1||!new Set(["cost","payment"]).has(kind))return NextResponse.json({error:"Invalid record"},{status:400});
    if(kind==="cost"){const row=await db.prepare("SELECT campaign_id,category,amount FROM campaign_costs WHERE id=?").bind(id).first<{campaign_id:number;category:string;amount:number}>();if(!row)return NextResponse.json({error:"Not found"},{status:404});await db.prepare("DELETE FROM campaign_costs WHERE id=?").bind(id).run();await recordActivity({actorType:"admin",campaignId:row.campaign_id,eventType:"finance.cost_removed",title:"Campaign cost removed",detail:`${row.category}: KES ${row.amount}`,metadata:{costId:id}});}
    else{const row=await db.prepare("SELECT campaign_id,amount FROM client_payments WHERE id=?").bind(id).first<{campaign_id:number;amount:number}>();if(!row)return NextResponse.json({error:"Not found"},{status:404});await db.prepare("DELETE FROM client_payments WHERE id=?").bind(id).run();await recordActivity({actorType:"admin",campaignId:row.campaign_id,eventType:"finance.client_payment_removed",title:"Client payment removed",detail:`KES ${row.amount}`,metadata:{paymentId:id}});}
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"Invalid request"},{status:400})}
}
