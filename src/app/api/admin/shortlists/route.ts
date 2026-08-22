import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { error: "Legacy shortlist API retired", replacement: "/api/admin/campaigns + /api/admin/campaign-creators" },
    { status: 410 },
  );
}

export async function POST() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { error: "Legacy shortlist writes are disabled", replacement: "/api/admin/campaigns + /api/admin/campaign-creators" },
    { status: 410 },
  );
}
