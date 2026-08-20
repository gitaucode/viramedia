import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCreatorDb, listCreators } from "@/lib/creator-db";
import { sendEmailTo } from "@/lib/email";

const allowedStatuses = new Set(["new", "reviewing", "approved", "rejected", "hold"]);

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const creators = await listCreators({
    q: url.searchParams.get("q") || undefined,
    status: url.searchParams.get("status") || undefined,
    city: url.searchParams.get("city") || undefined,
  });
  if (!creators) return NextResponse.json({ error: "Database is not configured", code: "DB_NOT_CONFIGURED" }, { status: 503 });
  return NextResponse.json({ creators });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getCreatorDb();
  if (!db) return NextResponse.json({ error: "Database is not configured", code: "DB_NOT_CONFIGURED" }, { status: 503 });
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Invalid creator" }, { status: 400 });
    const before=await db.prepare("SELECT full_name,email,status FROM creators WHERE id=?").bind(id).first<{full_name:string;email:string;status:string}>();
    if(!before)return NextResponse.json({error:"Creator not found"},{status:404});
    const updates: string[] = [];
    const values: unknown[] = [];
    if (typeof body.status === "string") {
      if (!allowedStatuses.has(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      updates.push("status = ?"); values.push(body.status);
    }
    if (typeof body.notes === "string") { updates.push("notes = ?"); values.push(body.notes.trim().slice(0, 5000)); }
    if (!updates.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await db.prepare(`UPDATE creators SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    if(body.status==='approved'&&before.status!=='approved'){
      const origin=new URL(request.url).origin;
      await sendEmailTo(before.email,"Welcome to Vira Network",`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Your Vira Network application is approved</h2><p>Hi ${before.full_name}, your creator profile has been approved.</p><p>You can now sign in to the Creator Portal with your approved email address to view campaign assignments, deliverables, feedback and payments.</p><p><a href="${origin}/portal/login">Open Creator Portal</a></p></div>`);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
