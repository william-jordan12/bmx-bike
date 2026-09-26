import { NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!env.databaseUrl) {
    return NextResponse.json({ ok: false, error: "Categories are unavailable." }, { status: 503 });
  }

  try {
    await initDb();
    const result = await getPool().query(
      `SELECT c.id, c.slug, c.name, c.description,
              COALESCE(p.product_count, 0)::int AS product_count
       FROM bmx_categories c
       LEFT JOIN (
         SELECT category, COUNT(*) AS product_count
         FROM bmx_products
         WHERE active = true
         GROUP BY category
       ) p ON lower(p.category) = lower(c.name)
       ORDER BY c.name ASC`
    );
    return NextResponse.json({ ok: true, categories: result.rows });
  } catch (err) {
    console.error("list public categories error", err);
    return NextResponse.json({ ok: false, error: "Failed to load categories." }, { status: 500 });
  }
}
