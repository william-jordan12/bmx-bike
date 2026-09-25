import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, destroySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { env } from "@/lib/env";
import { hashSessionToken } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (token && env.databaseUrl) {
    try {
      await destroySessionToken(hashSessionToken(token));
    } catch (err) {
      console.error("logout error", err);
    }
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
