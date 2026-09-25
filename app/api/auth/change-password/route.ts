import { NextResponse } from "next/server";
import {
  changeAdminPassword,
  createSession,
  getSessionAdmin,
  MIN_PASSWORD_LENGTH,
  setSessionCookie
} from "@/lib/auth";
import { initDb } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const result = await changeAdminPassword(admin.id, currentPassword, newPassword);
    if (!result.ok) {
      if (result.code === "mismatch") {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 400 }
        );
      }
      if (result.code === "invalid") {
        return NextResponse.json(
          {
            error: `Choose a new password of at least ${MIN_PASSWORD_LENGTH} characters that you have not used before.`
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    const token = await createSession(admin.id);
    await setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("change password error", err);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
