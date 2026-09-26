import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getPool, initDb, isOrderStatus, ORDER_STATUSES, type OrderStatus } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { error: "Orders are unavailable: the database is not configured." },
      { status: 503 }
    );
  }

  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    await initDb();

    const statusParam = new URL(req.url).searchParams.get("status");
    if (statusParam && !isOrderStatus(statusParam)) {
      return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
    }
    const status = statusParam ? (statusParam as OrderStatus) : null;

    const result = await getPool().query(
      `SELECT o.id, o.reference, o.customer_name, o.email, o.phone, o.address, o.city, o.country,
              o.notes, o.delivery_method, o.payment_method, o.billing_address, o.contact_channel,
    o.status, o.subtotal, o.total, o.created_at, o.updated_at,
              COALESCE(SUM(oi.qty), 0)::int AS item_count
       FROM bmx_orders o
       LEFT JOIN bmx_order_items oi ON oi.order_id = o.id
       WHERE ($1::text IS NULL OR o.status = $1)
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [status]
    );

    return NextResponse.json({ orders: result.rows, statuses: ORDER_STATUSES });
  } catch (err) {
    console.error("list orders error", err);
    return NextResponse.json({ error: "Failed to load orders." }, { status: 500 });
  }
}
