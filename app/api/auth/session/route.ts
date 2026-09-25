import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(env.databaseUrl);

  if (!configured) {
    return NextResponse.json({ authenticated: false, admin: null, configured: false });
  }

  try {
    await initDb();
    const admin = await getSessionAdmin();
    return NextResponse.json({
      authenticated: Boolean(admin),
      admin: admin ?? null,
      configured: true
    });
  } catch (err) {
    console.error("session error", err);
    return NextResponse.json({ authenticated: false, admin: null, configured: true });
  }
}
