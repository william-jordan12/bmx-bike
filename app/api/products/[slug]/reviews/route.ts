import { NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";
import { rowToPublicReview, summarise, validateReviewInput } from "@/lib/reviews";

export const dynamic = "force-dynamic";

const RATE_LIMIT_ATTEMPTS = 4;
const RATE_LIMIT_WINDOW_MINUTES = 60;

type Params = { params: Promise<{ slug: string }> };

async function findProduct(slug: string) {
  await initDb();
  const { rows } = await getPool().query(
    `SELECT id, slug, name FROM bmx_products WHERE slug = $1 AND active = true`,
    [slug]
  );
  return rows[0] as { id: string; slug: string; name: string } | undefined;
}

async function recentAttempts(slug: string, author: string): Promise<number> {
  const { rows } = await getPool().query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM bmx_reviews
     WHERE product_slug = $1 AND lower(author) = lower($2)
       AND created_at > now() - ($3 || ' minutes')::interval`,
    [slug, author, String(RATE_LIMIT_WINDOW_MINUTES)]
  );
  return Number(rows[0]?.n ?? 0);
}

export async function GET(_req: Request, { params }: Params) {
  if (!env.databaseUrl) {
    return NextResponse.json({ ok: false, error: "Reviews are unavailable right now." }, { status: 503 });
  }

  const { slug } = await params;

  try {
    const product = await findProduct(slug);
    if (!product) {
      return NextResponse.json({ ok: false, error: "That product no longer exists." }, { status: 404 });
    }

    const { rows } = await getPool().query(
      `SELECT id, product_slug, product_name, author, rating, title, body, verified, created_at
       FROM bmx_reviews
       WHERE product_slug = $1 AND status = 'approved'
       ORDER BY featured DESC, created_at DESC`,
      [slug]
    );

    return NextResponse.json({
      ok: true,
      summary: summarise(rows),
      reviews: rows.map(rowToPublicReview)
    });
  } catch (err) {
    console.error("list reviews error", err);
    return NextResponse.json({ ok: false, error: "Failed to load reviews." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  if (!env.databaseUrl) {
    return NextResponse.json({ ok: false, error: "Reviews are unavailable right now." }, { status: 503 });
  }

  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = validateReviewInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const review = parsed.value;

  try {
    const product = await findProduct(slug);
    if (!product) {
      return NextResponse.json({ ok: false, error: "That product no longer exists." }, { status: 404 });
    }

    if ((await recentAttempts(slug, review.author)) >= RATE_LIMIT_ATTEMPTS) {
      return NextResponse.json(
        { ok: false, error: "You have sent several reviews recently. Try again later." },
        { status: 429 }
      );
    }

    const { rows: buyer } = await getPool().query(
      `SELECT 1 FROM bmx_orders o
       JOIN bmx_order_items i ON i.order_id = o.id
       WHERE i.product_slug = $1 AND lower(o.customer_name) = lower($2)
         AND o.status = 'delivered'
       LIMIT 1`,
      [slug, review.author]
    );

    const result = await getPool().query(
      `INSERT INTO bmx_reviews (product_id, product_slug, product_name, author, rating, title, body, status, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
       RETURNING id, created_at`,
      [product.id, product.slug, product.name, review.author, review.rating, review.title, review.body, buyer.length > 0]
    );

    console.log(`review submitted for ${product.slug}, id ${result.rows[0].id}`);
    return NextResponse.json({ ok: true, pending: true }, { status: 201 });
  } catch (err) {
    console.error("create review error", err);
    return NextResponse.json({ ok: false, error: "Failed to submit the review." }, { status: 500 });
  }
}
