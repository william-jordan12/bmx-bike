import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings, configured: Boolean(env.databaseUrl) });
}
