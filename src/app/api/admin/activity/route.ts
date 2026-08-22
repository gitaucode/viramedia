import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listActivityEvents } from "@/lib/activity";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const campaignId = Number(url.searchParams.get("campaignId") || 0);
  const limit = Number(url.searchParams.get("limit") || 100);
  if (!Number.isInteger(campaignId) || campaignId < 1) return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });
  const events = await listActivityEvents(campaignId, limit);
  if (!events) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  return NextResponse.json({ events });
}
