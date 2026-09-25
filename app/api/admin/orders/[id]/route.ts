import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getPool, initDb, isOrderStatus } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
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

    const { id } = await params;
    const orderResult = await getPool().query(
      `SELECT id, reference, customer_name, email, phone, address, city, country, notes,
              delivery_method, status, subtotal, total, created_at, updated_at
       FROM bmx_orders WHERE id = $1`,
      [id]
    );
    const order = orderResult.rows[0];
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const itemsResult = await getPool().query(
      `SELECT id, product_slug, product_name, price, qty
       FROM bmx_order_items WHERE order_id = $1 ORDER BY product_name ASC`,
      [id]
    );

    return NextResponse.json({ order: { ...order, items: itemsResult.rows } });
  } catch (err) {
    console.error("get order error", err);
    return NextResponse.json({ error: "Failed to load order." }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
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

    const { id } = await params;
    const body = await req.json();
    const status = typeof body?.status === "string" ? body.status : "";

    if (!isOrderStatus(status)) {
      return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
    }

    const result = await getPool().query(
      `UPDATE bmx_orders SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, reference, status, updated_at`,
      [status, id]
    );

    const order = result.rows[0];
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error("update order status error", err);
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}
