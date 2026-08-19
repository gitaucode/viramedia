import { NextResponse } from "next/server";
import { adminPasswordConfigured, setAdminSession } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!adminPasswordConfigured()) return NextResponse.json({ error: "Admin password is not configured" }, { status: 503 });
  try {
    const body = await request.json();
    if (typeof body.password !== "string" || body.password !== process.env.VIRA_ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    await setAdminSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
