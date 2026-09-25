import { NextResponse } from "next/server";
import catalog from "@/data/bmx_bikes.json";
import { getPool, initDb } from "@/lib/db";
import { env } from "@/lib/env";
import { isValidEmail } from "@/lib/settings";
import type { BmxBike } from "@/lib/types";

export const dynamic = "force-dynamic";

const products = catalog as BmxBike[];
const MAX_QTY_PER_LINE = 20;
const MAX_LINES = 20;
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type IncomingLine = {
  productId?: unknown;
  color?: unknown;
  size?: unknown;
  quantity?: unknown;
};

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function makeReference(): string {
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `BMX-${suffix}`;
}

export async function POST(req: Request) {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { error: "Checkout is unavailable: the store database is not configured." },
      { status: 503 }
    );
  }

  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const customerName = clean(payload.name, 120);
  const email = clean(payload.email, 160);
  const phone = clean(payload.phone, 40);
  const address = clean(payload.address, 240);
  const city = clean(payload.city, 120);
  const country = clean(payload.country, 120);
  const notes = clean(payload.notes, 600);
  const rawItems = Array.isArray(payload.items) ? (payload.items as IncomingLine[]) : [];

  if (!customerName || customerName.length < 2) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!address || !city || !country) {
    return NextResponse.json({ error: "Please enter a full delivery address." }, { status: 400 });
  }
  if (rawItems.length === 0 || rawItems.length > MAX_LINES) {
    return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
  }

  const lines = rawItems.map((line) => {
    const productId = clean(line.productId, 80);
    const product = products.find((bike) => bike.id === productId);
    const quantity = Math.min(
      MAX_QTY_PER_LINE,
      Math.max(1, Math.floor(Number(line.quantity) || 0))
    );
    if (!product) {
      return null;
    }
    const color = clean(line.color, 40);
    const size = clean(line.size, 40);
    return {
      product,
      quantity,
      color: product.colors.includes(color) ? color : product.colors[0],
      size: product.sizes.includes(size) ? size : product.sizes[0]
    };
  });

  if (lines.some((line) => line === null)) {
    return NextResponse.json({ error: "One of the items is no longer available." }, { status: 400 });
  }

  const orderLines = lines.filter((line): line is NonNullable<typeof line> => line !== null);
  const subtotal = orderLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  try {
    await initDb();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const reference = makeReference();
      const orderResult = await client.query(
        `INSERT INTO bmx_orders (
           reference, customer_name, email, phone, address, city, country, notes,
           delivery_method, status, subtotal, total
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'email','pending',$9,$9)
         RETURNING id, reference, total, created_at`,
        [
          reference,
          customerName,
          email,
          phone,
          address,
          city,
          country,
          notes,
          subtotal.toFixed(2)
        ]
      );

      const order = orderResult.rows[0];
      for (const line of orderLines) {
        await client.query(
          `INSERT INTO bmx_order_items (order_id, product_slug, product_name, price, qty)
           VALUES ($1,$2,$3,$4,$5)`,
          [order.id, line.product.id, `${line.product.name} (${line.color} / ${line.size})`, line.product.price.toFixed(2), line.quantity]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json(
        { order: { reference: String(order.reference), total: String(order.total), createdAt: order.created_at } },
        { status: 201 }
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("create order error", err);
    return NextResponse.json({ error: "We could not place the order. Please try again." }, { status: 500 });
  }
}
