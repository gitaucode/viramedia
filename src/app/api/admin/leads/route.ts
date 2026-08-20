import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listLeads, updateLead } from "@/lib/ops-db";
const allowed=new Set(['new','contacted','qualified','proposal','won','lost']);
export async function GET(){if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});const leads=await listLeads();if(!leads)return NextResponse.json({error:'Database is not configured',code:'DB_NOT_CONFIGURED'},{status:503});return NextResponse.json({leads})}
export async function PATCH(request:Request){if(!(await isAdminAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});try{const b=await request.json();const id=Number(b.id);if(!Number.isInteger(id)||id<1)return NextResponse.json({error:'Invalid lead'},{status:400});if(b.status&&!allowed.has(b.status))return NextResponse.json({error:'Invalid status'},{status:400});await updateLead(id,b.status,typeof b.notes==='string'?b.notes:undefined);return NextResponse.json({ok:true})}catch{return NextResponse.json({error:'Invalid request'},{status:400})}}
