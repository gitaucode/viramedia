import { NextResponse } from "next/server";
import { adminPasswordConfigured, setAdminSession } from "@/lib/admin-auth";
import { getOpsDb } from "@/lib/ops-db";

const MAX_ATTEMPTS=8;
const WINDOW_MINUTES=15;

export async function POST(request: Request) {
  if (!adminPasswordConfigured()) return NextResponse.json({ error: "Admin password is not configured" }, { status: 503 });
  try {
    const db=getOpsDb();
    const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    if(db){
      const row=await db.prepare("SELECT attempts,last_attempt FROM admin_login_attempts WHERE ip = ?").bind(ip).first<{attempts:number;last_attempt:string}>();
      if(row){const age=(Date.now()-new Date(row.last_attempt+'Z').getTime())/60000;if(age<WINDOW_MINUTES&&row.attempts>=MAX_ATTEMPTS)return NextResponse.json({error:'Too many attempts. Try again later.'},{status:429});if(age>=WINDOW_MINUTES)await db.prepare("DELETE FROM admin_login_attempts WHERE ip = ?").bind(ip).run()}
    }
    const body = await request.json();
    if (typeof body.password !== "string" || body.password !== process.env.VIRA_ADMIN_PASSWORD) {
      if(db)await db.prepare("INSERT INTO admin_login_attempts (ip,attempts,last_attempt) VALUES (?,1,CURRENT_TIMESTAMP) ON CONFLICT(ip) DO UPDATE SET attempts=attempts+1,last_attempt=CURRENT_TIMESTAMP").bind(ip).run();
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    if(db)await db.prepare("DELETE FROM admin_login_attempts WHERE ip = ?").bind(ip).run();
    await setAdminSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
