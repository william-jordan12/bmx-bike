import { NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";
import { emptyDistribution, rowToPublicReview, summarise, type ReviewSummary } from "@/lib/reviews";

export const dynamic = "force-dynamic";

const REVIEW_LIMIT = 50;

type ReviewRow = {
  id: string;
  product_slug: string;
  product_name: string | null;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  helpful: number;
  created_at: string;
};

function emptySummary(): ReviewSummary {
  return { average: 0, count: 0, distribution: emptyDistribution() };
}

export async function GET() {
  if (!env.databaseUrl) {
    return NextResponse.json({ summary: emptySummary(), reviews: [] });
  }

  try {
    await initDb();

    const { rows } = await getPool().query<ReviewRow>(
      `SELECT r.id, r.product_slug, r.author, r.rating, r.title, r.body,
              r.verified, r.helpful, r.created_at,
              COALESCE(p.name, r.product_name) AS product_name
       FROM bmx_reviews r
       LEFT JOIN bmx_products p ON p.slug = r.product_slug
       WHERE r.status = 'approved'
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [REVIEW_LIMIT]
    );

    return NextResponse.json({
      summary: summarise(rows),
      reviews: rows.map((row) => {
        const review = rowToPublicReview(row);
        return {
          id: review.id,
          productSlug: review.product_slug,
          productName: review.product_name,
          author: review.author,
          rating: review.rating,
          title: review.title,
          body: review.body,
          verified: review.verified,
          helpful: Math.max(0, Math.trunc(Number(row.helpful) || 0)),
          createdAt: review.created_at
        };
      })
    });
  } catch (err) {
    console.error("list reviews error", err);
    return NextResponse.json({ error: "Failed to load reviews." }, { status: 500 });
  }
}
