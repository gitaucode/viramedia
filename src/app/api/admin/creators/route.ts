import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCreatorDb, listCreators } from "@/lib/creator-db";

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
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
