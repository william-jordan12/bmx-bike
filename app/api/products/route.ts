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
      `SELECT ${PRODUCT_COLUMNS.join(", ")} FROM bmx_products
       WHERE active = true
       ORDER BY featured DESC, sort_order ASC, created_at ASC`
    );
    return NextResponse.json({
      ok: true,
      products: rows.map((row) => productToBmxBike(rowToProduct(row)))
    });
  } catch (err) {
    console.error("GET /api/products failed:", err);
    return NextResponse.json({ ok: false, error: "Could not load products." }, { status: 500 });
  }
}
