import { NextResponse } from "next/server";
import { verifyCreatorCode } from "@/lib/creator-auth";

export async function POST(request:Request){
 try{
  const b=await request.json();const email=typeof b.email==='string'?b.email.trim().slice(0,160):'';const code=typeof b.code==='string'?b.code.trim().slice(0,6):'';
  if(!email.includes('@')||!/^[0-9]{6}$/.test(code))return NextResponse.json({error:'Invalid code'},{status:400});
  const result=await verifyCreatorCode(email,code);
  if(!result.ok)return NextResponse.json({error:result.reason==='EXPIRED'?'Code expired. Request a new one.':'Invalid code.'},{status:401});
  return NextResponse.json({ok:true,creator:result.creator});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
