import { NextResponse } from "next/server";
import { clearCreatorSession } from "@/lib/creator-auth";
export async function POST(){await clearCreatorSession();return NextResponse.json({ok:true})}
