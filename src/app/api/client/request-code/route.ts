import { NextResponse } from "next/server";
import { requestClientCode } from "@/lib/client-auth";
export async function POST(request:Request){try{const b=await request.json();const email=String(b.email||'').trim();if(!email)return NextResponse.json({error:'Email required'},{status:400});const r=await requestClientCode(email);if(!r.ok)return NextResponse.json({error:'Client portal is unavailable'},{status:503});return NextResponse.json({ok:true})}catch{return NextResponse.json({error:'Invalid request'},{status:400})}}
