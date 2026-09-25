import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";
import { slugify } from "@/lib/slugify";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
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

    const { id } = await params;
    const body = await req.json();
    const hasName = typeof body?.name === "string" && body.name.trim().length > 0;
    const hasSlug = typeof body?.slug === "string" && body.slug.trim().length > 0;
    const hasDescription = typeof body?.description === "string";

    if (!hasName && !hasSlug && !hasDescription) {
      return NextResponse.json({ error: "No changes were provided." }, { status: 400 });
    }

    const existing = await getPool().query(`SELECT slug, name FROM bmx_categories WHERE id = $1`, [
      id
    ]);
    const current = existing.rows[0];
    if (!current) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const name = hasName ? (body.name as string).trim() : String(current.name);
    const rawSlug = hasSlug ? (body.slug as string) : hasName ? (body.name as string) : String(current.slug);
    const slug = slugify(rawSlug);
    if (!slug) {
      return NextResponse.json({ error: "Category slug is invalid." }, { status: 400 });
    }

    const description = hasDescription ? (body.description as string).trim() : undefined;

    const result = await getPool().query(
      `UPDATE bmx_categories
       SET name = $1, slug = $2, description = COALESCE($3, description), updated_at = now()
       WHERE id = $4
       RETURNING id, slug, name, description, created_at, updated_at`,
      [name, slug, description ?? null, id]
    );

    return NextResponse.json({ category: result.rows[0] });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "That category slug already exists." }, { status: 409 });
    }
    console.error("update category error", err);
    return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
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

    const { id } = await params;
    const result = await getPool().query(`DELETE FROM bmx_categories WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete category error", err);
    return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
