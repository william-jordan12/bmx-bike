import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";
import { slugify } from "@/lib/slugify";
import { PRODUCT_COLUMNS, rowToProduct, validateProductInput } from "@/lib/products";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function guard(id: string) {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { ok: false, error: "Products are unavailable: the database is not configured." },
      { status: 503 }
    );
  }
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ ok: false, error: "That product id is not valid." }, { status: 400 });
  }
  return null;
}

function notFound() {
  return NextResponse.json({ ok: false, error: "That product no longer exists." }, { status: 404 });
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const blocked = guard(id);
  if (blocked) return blocked;

  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  try {
    await initDb();
    const result = await getPool().query(`SELECT ${PRODUCT_COLUMNS.join(", ")} FROM bmx_products WHERE id = $1`, [id]);
    if (result.rows.length === 0) return notFound();
    return NextResponse.json({ ok: true, product: rowToProduct(result.rows[0]) });
  } catch (err) {
    console.error("load product error", err);
    return NextResponse.json({ ok: false, error: "Failed to load product." }, { status: 500 });
  }
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

  const parsed = validateProductInput(body, { partial: true });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const product = parsed.value;

  try {
    await initDb();
    const pool = getPool();

    const current = await pool.query<{ slug: string; name: string }>(
      `SELECT slug, name FROM bmx_products WHERE id = $1`,
      [id]
    );
    if (current.rows.length === 0) return notFound();

    let slug = current.rows[0].slug;
    if (product.name !== current.rows[0].name) {
      const candidate = slugify(product.name);
      if (candidate && candidate !== slug) {
        const clash = await pool.query(`SELECT 1 FROM bmx_products WHERE slug = $1 AND id <> $2`, [candidate, id]);
        if (clash.rows.length === 0) slug = candidate;
      }
    }

    const result = await pool.query(
      `UPDATE bmx_products SET
         slug = $2, name = $3, brand = $4, model = $5, price = $6, compare_at_price = $7,
         category = $8, badge = $9, wheel_size = $10, top_tube = $11, frame_material = $12,
         skill_level = $13, rating = $14, review_count = $15, image = $16, gallery = $17,
         riding_style = $18, colors = $19, sizes = $20, description = $21, specs = $22,
         stock = $23, active = $24, featured = $25, updated_at = now()
       WHERE id = $1
       RETURNING ${PRODUCT_COLUMNS.join(", ")}`,
      [
        id,
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
        product.featured
      ]
    );

    return NextResponse.json({ ok: true, product: rowToProduct(result.rows[0]) });
  } catch (err) {
    console.error("update product error", err);
    return NextResponse.json({ ok: false, error: "Failed to update product." }, { status: 500 });
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
    const deleted = await getPool().query(`DELETE FROM bmx_products WHERE id = $1 RETURNING id`, [id]);
    if (deleted.rowCount === 0) return notFound();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete product error", err);
    return NextResponse.json({ ok: false, error: "Failed to delete product." }, { status: 500 });
  }
}
