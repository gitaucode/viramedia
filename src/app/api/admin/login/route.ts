import { NextResponse } from "next/server";
import { adminPasswordConfigured, setAdminSession } from "@/lib/admin-auth";
import { getOpsDb } from "@/lib/ops-db";

const MAX_ATTEMPTS=8;
const WINDOW_MINUTES=15;

export async function POST(request: Request) {
  if (!adminPasswordConfigured()) return NextResponse.json({ error: "Admin password is not configured" }, { status: 503 });

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db=getOpsDb();
  const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';

  // Login rate limiting is a production safeguard, not a hard dependency.
  // Local Next.js development does not always expose a usable D1 binding.
  if(db){
    try{
      const row=await db.prepare("SELECT attempts,last_attempt FROM admin_login_attempts WHERE ip = ?").bind(ip).first<{attempts:number;last_attempt:string}>();
      if(row){
        const age=(Date.now()-new Date(row.last_attempt+'Z').getTime())/60000;
        if(age<WINDOW_MINUTES&&row.attempts>=MAX_ATTEMPTS)return NextResponse.json({error:'Too many attempts. Try again later.'},{status:429});
        if(age>=WINDOW_MINUTES)await db.prepare("DELETE FROM admin_login_attempts WHERE ip = ?").bind(ip).run();
      }
    }catch(error){
      if(process.env.NODE_ENV!=="production")console.warn("Admin login rate-limit DB unavailable in local development",error);
    }
  }

  if (typeof body.password !== "string" || body.password !== process.env.VIRA_ADMIN_PASSWORD) {
    if(db){
      try{
        await db.prepare("INSERT INTO admin_login_attempts (ip,attempts,last_attempt) VALUES (?,1,CURRENT_TIMESTAMP) ON CONFLICT(ip) DO UPDATE SET attempts=attempts+1,last_attempt=CURRENT_TIMESTAMP").bind(ip).run();
      }catch(error){
        if(process.env.NODE_ENV!=="production")console.warn("Could not record admin login attempt locally",error);
      }
    }
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  if(db){
    try{await db.prepare("DELETE FROM admin_login_attempts WHERE ip = ?").bind(ip).run()}catch(error){if(process.env.NODE_ENV!=="production")console.warn("Could not clear admin login attempts locally",error)}
  }

  try{
    await setAdminSession();
    return NextResponse.json({ ok: true });
  }catch(error){
    console.error("Admin session creation failed",error);
    return NextResponse.json({ error: "Could not create admin session" }, { status: 500 });
  }
}
