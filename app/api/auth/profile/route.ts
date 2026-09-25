import { NextResponse } from "next/server";
import { getSessionAdmin, updateAdminUsername } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { error: "Admin accounts are unavailable: the database is not configured." },
      { status: 503 }
    );
  }

  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    await initDb();

    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username : "";
    if (!username.trim()) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    const result = await updateAdminUsername(admin.id, username);
    if (!result.ok) {
      if (result.code === "invalid") {
        return NextResponse.json(
          { error: "Username must be 3-40 characters using letters, numbers, dots, dashes or underscores." },
          { status: 400 }
        );
      }
      if (result.code === "duplicate") {
        return NextResponse.json(
          { error: "That username is already taken." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, admin: result.admin });
  } catch (err) {
    console.error("profile update error", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
