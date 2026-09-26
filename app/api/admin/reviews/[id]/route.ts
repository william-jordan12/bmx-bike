import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";
import { rowToAdminReview, validateReviewPatch } from "@/lib/reviews";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLUMNS =
  "id, product_slug, product_name, author, rating, title, body, status, verified, featured, helpful, created_at, updated_at";

type Params = { params: Promise<{ id: string }> };

function guard(id: string) {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { ok: false, error: "Reviews are unavailable: the database is not configured." },
      { status: 503 }
    );
  }
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ ok: false, error: "That review id is not valid." }, { status: 400 });
  }
  return null;
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const blocked = guard(id);
  if (blocked) return blocked;

  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = validateReviewPatch(body);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  const change = parsed.value;

  try {
    await initDb();
    const { rows } = await getPool().query(
      `UPDATE bmx_reviews SET
         status = COALESCE($2, status),
         featured = COALESCE($3, featured),
         helpful = COALESCE($4, helpful),
         verified = COALESCE($5, verified),
         updated_at = now()
       WHERE id = $1
       RETURNING ${COLUMNS}`,
      [
        id,
        change.status ?? null,
        change.featured === undefined ? null : change.featured,
        change.helpful === undefined ? null : change.helpful,
        change.verified === undefined ? null : change.verified
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "That review no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, review: rowToAdminReview(rows[0]) });
  } catch (err) {
    console.error("update review error", err);
    return NextResponse.json({ ok: false, error: "Failed to update the review." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const blocked = guard(id);
  if (blocked) return blocked;

  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  try {
    await initDb();
    const deleted = await getPool().query(`DELETE FROM bmx_reviews WHERE id = $1 RETURNING id`, [id]);
    if (deleted.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "That review no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete review error", err);
    return NextResponse.json({ ok: false, error: "Failed to delete the review." }, { status: 500 });
  }
}
