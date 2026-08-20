import { NextResponse } from "next/server";
import { requestCreatorCode } from "@/lib/creator-auth";

export async function POST(request:Request){
 try{
  const b=await request.json();const email=typeof b.email==='string'?b.email.trim().slice(0,160):'';
  if(!email.includes('@'))return NextResponse.json({error:'Enter a valid email'},{status:400});
  const result=await requestCreatorCode(email);
  if(!result.ok&&result.reason==='DB_NOT_CONFIGURED')return NextResponse.json({error:'Creator portal is not configured'},{status:503});
  return NextResponse.json({ok:true,message:'If that approved creator email exists, a sign-in code has been sent.'});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
