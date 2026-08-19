import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCreatorDb } from "@/lib/creator-db";

type ShortlistRow = { id: number; name: string; creator_count: number };

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getCreatorDb();
  if (!db) return NextResponse.json({ error: "Database is not configured", code: "DB_NOT_CONFIGURED" }, { status: 503 });
  const result = await db.prepare(`SELECT s.id, s.name, COUNT(sc.creator_id) AS creator_count
    FROM shortlists s LEFT JOIN shortlist_creators sc ON sc.shortlist_id = s.id
    GROUP BY s.id, s.name ORDER BY datetime(s.created_at) DESC`).all<ShortlistRow>();
  return NextResponse.json({ shortlists: result.results ?? [] });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getCreatorDb();
  if (!db) return NextResponse.json({ error: "Database is not configured", code: "DB_NOT_CONFIGURED" }, { status: 503 });
  try {
    const body = await request.json();
    if (body.action === "create") {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
      await db.prepare("INSERT INTO shortlists (name) VALUES (?)").bind(name).run();
      return NextResponse.json({ ok: true });
    }
    if (body.action === "add") {
      const shortlistId = Number(body.shortlistId), creatorId = Number(body.creatorId);
      if (!Number.isInteger(shortlistId) || !Number.isInteger(creatorId)) return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
      await db.prepare("INSERT OR IGNORE INTO shortlist_creators (shortlist_id, creator_id) VALUES (?, ?)").bind(shortlistId, creatorId).run();
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
