import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";
import { slugify } from "@/lib/slugify";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { error: "Categories are unavailable: the database is not configured." },
      { status: 503 }
    );
  }

  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    await initDb();
    const result = await getPool().query(
      `SELECT id, slug, name, description, created_at, updated_at
       FROM bmx_categories
       ORDER BY name ASC`
    );
    return NextResponse.json({ categories: result.rows });
  } catch (err) {
    console.error("list categories error", err);
    return NextResponse.json({ error: "Failed to load categories." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { error: "Categories are unavailable: the database is not configured." },
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
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const rawSlug = typeof body?.slug === "string" ? body.slug : name;

    if (!name) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const slug = slugify(rawSlug);
    if (!slug) {
      return NextResponse.json({ error: "Category slug is invalid." }, { status: 400 });
    }

    const result = await getPool().query(
      `INSERT INTO bmx_categories (slug, name, description) VALUES ($1, $2, $3)
       RETURNING id, slug, name, description, created_at, updated_at`,
      [slug, name, description]
    );

    return NextResponse.json({ category: result.rows[0] }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "That category slug already exists." }, { status: 409 });
    }
    console.error("create category error", err);
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
