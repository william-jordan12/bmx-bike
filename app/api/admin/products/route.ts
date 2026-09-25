import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";
import { slugify } from "@/lib/slugify";
import { PRODUCT_COLUMNS, rowToProduct, validateProductInput } from "@/lib/products";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { ok: false, error: "Products are unavailable: the database is not configured." },
    { status: 503 }
  );
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
}

export async function GET() {
  if (!env.databaseUrl) return unavailable();

  const admin = await getSessionAdmin();
  if (!admin) return unauthorized();

  try {
    await initDb();
    const result = await getPool().query(
      `SELECT ${PRODUCT_COLUMNS.join(", ")} FROM bmx_products
       ORDER BY featured DESC, sort_order ASC, created_at ASC`
    );
    return NextResponse.json({ ok: true, products: result.rows.map(rowToProduct) });
  } catch (err) {
    console.error("list products error", err);
    return NextResponse.json({ ok: false, error: "Failed to load products." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!env.databaseUrl) return unavailable();

  const admin = await getSessionAdmin();
  if (!admin) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = validateProductInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const product = parsed.value;

  try {
    await initDb();
    const pool = getPool();

    const base = slugify(product.name) || "product";
    let slug = base;
    const { rows: clash } = await pool.query(
      `SELECT 1 FROM bmx_products WHERE slug = $1 OR slug LIKE $1 || '-%' LIMIT 1`,
      [base]
    );
    if (clash.length > 0) {
      const { rows: count } = await pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM bmx_products`);
      slug = `${base}-${Number(count[0].n) + 1}`;
    }

    const { rows: order } = await pool.query<{ next: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM bmx_products`
    );

    const result = await pool.query(
      `INSERT INTO bmx_products (
         slug, name, brand, model, price, compare_at_price, category, badge,
         wheel_size, top_tube, frame_material, skill_level, rating, review_count,
         image, gallery, riding_style, colors, sizes, description, specs,
         stock, active, featured, sort_order
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
       ) RETURNING ${PRODUCT_COLUMNS.join(", ")}`,
      [
        slug,
        product.name,
        product.brand,
        product.model,
        product.price.toFixed(2),
        product.compareAtPrice === null ? null : product.compareAtPrice.toFixed(2),
        product.category,
        product.badge,
        product.wheelSize,
        product.topTube,
        product.frameMaterial,
        product.skillLevel,
        product.rating,
        product.reviewCount,
        product.image,
        product.gallery,
        product.ridingStyle,
        product.colors,
        product.sizes,
        product.description,
        JSON.stringify(product.specs),
        product.stock,
        product.active,
        product.featured,
        Number(order[0].next)
      ]
    );

    return NextResponse.json({ ok: true, product: rowToProduct(result.rows[0]) }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ ok: false, error: "A product with that name already exists." }, { status: 409 });
    }
    console.error("create product error", err);
    return NextResponse.json({ ok: false, error: "Failed to create product." }, { status: 500 });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
