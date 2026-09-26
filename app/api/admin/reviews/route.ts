import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";
import { isReviewStatus, rowToAdminReview, summarise } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { ok: false, error: "Reviews are unavailable: the database is not configured." },
      { status: 503 }
    );
  }

  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  const requested = new URL(req.url).searchParams.get("status") ?? "all";
  const status = isReviewStatus(requested) ? requested : "all";

  try {
    await initDb();
    const pool = getPool();

    const filtered =
      status === "all"
        ? await pool.query(
            `SELECT id, product_slug, product_name, author, rating, title, body, status,
                    verified, featured, helpful, created_at, updated_at
             FROM bmx_reviews ORDER BY created_at DESC`
          )
        : await pool.query(
            `SELECT id, product_slug, product_name, author, rating, title, body, status,
                    verified, featured, helpful, created_at, updated_at
             FROM bmx_reviews WHERE status = $1 ORDER BY created_at DESC`,
            [status]
          );

    const countsResult = await pool.query<{ status: string; n: number }>(
      `SELECT status, COUNT(*)::int AS n FROM bmx_reviews GROUP BY status`
    );
    const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
    for (const row of countsResult.rows) {
      counts.all += Number(row.n);
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = Number(row.n);
      }
    }

    const approved = await pool.query(
      `SELECT rating FROM bmx_reviews WHERE status = 'approved'`
    );

    return NextResponse.json({
      ok: true,
      status,
      counts,
      summary: summarise(approved.rows),
      reviews: filtered.rows.map(rowToAdminReview)
    });
  } catch (err) {
    console.error("list reviews error", err);
    return NextResponse.json({ ok: false, error: "Failed to load reviews." }, { status: 500 });
  }
}
