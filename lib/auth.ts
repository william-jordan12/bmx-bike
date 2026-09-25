import { cookies } from "next/headers";
import { getPool } from "./db";
import { env } from "./env";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./session-cookie";
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from "./password";

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS };
export const MIN_PASSWORD_LENGTH = 10;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 40;

const USERNAME_PATTERN = /^[a-z0-9._-]+$/i;

export interface Admin {
  id: string;
  username: string;
}

export type UpdateUsernameResult =
  | { ok: true; admin: Admin }
  | { ok: false; code: "invalid" | "duplicate" | "missing" };

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "mismatch" | "missing" };

export function normalizeUsername(value: string): string {
  return value.trim();
}

export function isValidUsername(value: string): boolean {
  return (
    value.length >= MIN_USERNAME_LENGTH &&
    value.length <= MAX_USERNAME_LENGTH &&
    USERNAME_PATTERN.test(value)
  );
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function createSession(adminId: string): Promise<string> {
  const token = generateSessionToken();
  await getPool().query(
    `UPDATE bmx_admins SET session_token = $1, updated_at = now() WHERE id = $2`,
    [hashSessionToken(token), adminId]
  );
  return token;
}

export async function destroySessionToken(tokenHash: string): Promise<void> {
  await getPool().query(
    `UPDATE bmx_admins SET session_token = NULL, updated_at = now() WHERE session_token = $1`,
    [tokenHash]
  );
}

export async function getSessionAdmin(): Promise<Admin | null> {
  if (!env.databaseUrl) return null;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const result = await getPool().query(
      `SELECT id, username FROM bmx_admins WHERE session_token = $1`,
      [hashSessionToken(token)]
    );
    const row = result.rows[0];
    if (!row) return null;
    return { id: String(row.id), username: String(row.username) };
  } catch (err) {
    console.error("getSessionAdmin error", err);
    return null;
  }
}

export async function loginAdmin(username: string, password: string): Promise<Admin | null> {
  if (!env.databaseUrl) return null;

  try {
    const result = await getPool().query(
      `SELECT id, username, password_hash FROM bmx_admins WHERE lower(username) = $1`,
      [normalizeUsername(username).toLowerCase()]
    );
    const row = result.rows[0];
    if (!row) return null;
    if (!verifyPassword(password, String(row.password_hash))) return null;
    return { id: String(row.id), username: String(row.username) };
  } catch (err) {
    console.error("loginAdmin error", err);
    return null;
  }
}

export async function updateAdminUsername(
  adminId: string,
  username: string
): Promise<UpdateUsernameResult> {
  if (!env.databaseUrl) return { ok: false, code: "missing" };

  const next = normalizeUsername(username);
  if (!isValidUsername(next)) return { ok: false, code: "invalid" };

  try {
    const taken = await getPool().query(
      `SELECT 1 FROM bmx_admins WHERE lower(username) = $1 AND id <> $2`,
      [next.toLowerCase(), adminId]
    );
    if (taken.rows.length > 0) return { ok: false, code: "duplicate" };

    const result = await getPool().query(
      `UPDATE bmx_admins SET username = $1, updated_at = now() WHERE id = $2
       RETURNING id, username`,
      [next, adminId]
    );
    const row = result.rows[0];
    if (!row) return { ok: false, code: "missing" };
    return { ok: true, admin: { id: String(row.id), username: String(row.username) } };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, code: "duplicate" };
    console.error("updateAdminUsername error", err);
    return { ok: false, code: "missing" };
  }
}

export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  if (!env.databaseUrl) return { ok: false, code: "missing" };
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { ok: false, code: "invalid" };

  try {
    const result = await getPool().query(
      `SELECT password_hash FROM bmx_admins WHERE id = $1`,
      [adminId]
    );
    const row = result.rows[0];
    if (!row) return { ok: false, code: "missing" };
    if (!verifyPassword(currentPassword, String(row.password_hash))) {
      return { ok: false, code: "mismatch" };
    }
    if (verifyPassword(newPassword, String(row.password_hash))) {
      return { ok: false, code: "invalid" };
    }

    await getPool().query(
      `UPDATE bmx_admins SET password_hash = $1, updated_at = now() WHERE id = $2`,
      [hashPassword(newPassword), adminId]
    );
    return { ok: true };
  } catch (err) {
    console.error("changeAdminPassword error", err);
    return { ok: false, code: "missing" };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}
