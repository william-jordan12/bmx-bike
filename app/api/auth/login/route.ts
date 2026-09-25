import { NextResponse } from "next/server";
import { createSession, loginAdmin, setSessionCookie } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { error: "Admin login is unavailable: the database is not configured." },
      { status: 503 }
    );
  }

  try {
    await initDb();

    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username.trim() || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const admin = await loginAdmin(username, password);
    if (!admin) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const token = await createSession(admin.id);
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, admin });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
