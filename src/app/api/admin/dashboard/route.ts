import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDashboardStats, listCampaigns, listDeliverables, listLeads } from "@/lib/ops-db";
import { listCreators } from "@/lib/creator-db";
export async function GET(){if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});const stats=await getDashboardStats();if(!stats)return NextResponse.json({error:'Database is not configured',code:'DB_NOT_CONFIGURED'},{status:503});const [leads,campaigns,deliverables,creators]=await Promise.all([listLeads(),listCampaigns(),listDeliverables(),listCreators({})]);return NextResponse.json({stats,recentLeads:(leads||[]).slice(0,5),campaigns:(campaigns||[]).filter(c=>['planning','active'].includes(c.status)).slice(0,5),deliverables:(deliverables||[]).filter(d=>d.status!=='done').slice(0,6),recentCreators:(creators||[]).slice(0,5)})}
