import { NextResponse } from "next/server";
import { initDb, getPool } from "@/lib/db";
import { env } from "@/lib/env";
import { productToBmxBike, rowToProduct, PRODUCT_COLUMNS } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!env.databaseUrl) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503 });
  }

  try {
    await initDb();
    const { rows } = await getPool().query(
      `SELECT ${PRODUCT_COLUMNS.map((column) => `p.${column}`).join(", ")},
              r.real_rating, r.real_count
       FROM bmx_products p
       LEFT JOIN (
         SELECT product_id,
                ROUND(AVG(rating)::numeric, 1) AS real_rating,
                COUNT(*)::int AS real_count
         FROM bmx_reviews
         WHERE status = 'approved'
         GROUP BY product_id
       ) r ON r.product_id = p.id
       WHERE p.active = true
       ORDER BY p.featured DESC, p.sort_order ASC, p.created_at ASC`
    );

    const products = rows.map((row) => {
      const bike = productToBmxBike(rowToProduct(row));
      const realCount = Number(row.real_count ?? 0);
      if (realCount > 0) {
        return { ...bike, rating: Number(row.real_rating ?? 0), reviewCount: realCount };
      }
      return bike;
    });

    return NextResponse.json({ ok: true, products });
  } catch (err) {
    console.error("GET /api/products failed:", err);
    return NextResponse.json({ ok: false, error: "Could not load products." }, { status: 500 });
  }
}
