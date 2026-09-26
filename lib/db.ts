import { Pool, type PoolClient } from "pg";
import catalog from "@/data/bmx_bikes.json";
import { env, getAdminInitialPassword } from "./env";
import { hashPassword } from "./password";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled"
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);

declare global {
  var __bmxPool: Pool | undefined;
}

const MAX_CONNECTIONS = 5;
const STATUS_LIST = ORDER_STATUSES.map((status) => `'${status}'`).join(", ");

function sslConfig() {
  if (env.databaseCa) {
    return { ca: env.databaseCa, rejectUnauthorized: false };
  }
  return undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString: env.databaseUrl,
    ssl: sslConfig(),
    max: MAX_CONNECTIONS,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
}

export function getPool(): Pool {
  if (!globalThis.__bmxPool) {
    globalThis.__bmxPool = createPool();
  }
  return globalThis.__bmxPool;
}

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS bmx_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    session_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE bmx_admins ADD COLUMN IF NOT EXISTS username TEXT`,
  `ALTER TABLE bmx_admins ADD COLUMN IF NOT EXISTS password_hash TEXT`,
  `ALTER TABLE bmx_admins ADD COLUMN IF NOT EXISTS session_token TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS bmx_admins_username_key ON bmx_admins(username)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS bmx_admins_username_lower_key ON bmx_admins(lower(username))`,
  `CREATE TABLE IF NOT EXISTS bmx_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE bmx_categories ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS bmx_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    delivery_method TEXT NOT NULL DEFAULT 'email',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (${STATUS_LIST})),
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE bmx_orders ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bmx_orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`,
  `CREATE TABLE IF NOT EXISTS bmx_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES bmx_orders(id) ON DELETE CASCADE,
    product_slug TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1
  )`,
  `ALTER TABLE bmx_order_items ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS bmx_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS bmx_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    compare_at_price NUMERIC(10,2),
    category TEXT NOT NULL DEFAULT 'Freestyle',
    badge TEXT NOT NULL DEFAULT '',
    wheel_size TEXT NOT NULL DEFAULT '',
    top_tube TEXT NOT NULL DEFAULT '',
    frame_material TEXT NOT NULL DEFAULT '',
    skill_level TEXT NOT NULL DEFAULT '',
    rating NUMERIC(2,1) NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    image TEXT NOT NULL DEFAULT '',
    gallery TEXT[] NOT NULL DEFAULT '{}',
    riding_style TEXT[] NOT NULL DEFAULT '{}',
    colors TEXT[] NOT NULL DEFAULT '{}',
    sizes TEXT[] NOT NULL DEFAULT '{}',
    description TEXT NOT NULL DEFAULT '',
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    stock INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    featured BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS badge TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS wheel_size TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS top_tube TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS frame_material TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS skill_level TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) NOT NULL DEFAULT 0`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS gallery TEXT[] NOT NULL DEFAULT '{}'`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS riding_style TEXT[] NOT NULL DEFAULT '{}'`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS colors TEXT[] NOT NULL DEFAULT '{}'`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS sizes TEXT[] NOT NULL DEFAULT '{}'`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE bmx_products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`,
  `CREATE UNIQUE INDEX IF NOT EXISTS bmx_products_slug_key ON bmx_products(slug)`,
  `CREATE INDEX IF NOT EXISTS bmx_products_active_idx ON bmx_products(active)`,
  `CREATE INDEX IF NOT EXISTS bmx_products_category_idx ON bmx_products(category)`,
  `CREATE TABLE IF NOT EXISTS bmx_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES bmx_products(id) ON DELETE CASCADE,
    product_slug TEXT NOT NULL,
    product_name TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    verified BOOLEAN NOT NULL DEFAULT false,
    featured BOOLEAN NOT NULL DEFAULT false,
    helpful INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE bmx_reviews ADD COLUMN IF NOT EXISTS product_id UUID`,
  `ALTER TABLE bmx_reviews ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bmx_reviews ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE bmx_reviews ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE bmx_reviews ADD COLUMN IF NOT EXISTS helpful INTEGER NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS bmx_reviews_product_idx ON bmx_reviews(product_id)`,
  `CREATE INDEX IF NOT EXISTS bmx_reviews_status_idx ON bmx_reviews(status)`
];

const DEFAULT_CATEGORIES: ReadonlyArray<{ slug: string; name: string; description: string }> = [
  {
    slug: "freestyle",
    name: "Freestyle",
    description: "Street and park complete bikes built for grinds, airs, and everyday riding."
  },
  {
    slug: "race",
    name: "Race",
    description: "Full race machines with lightweight frames and competition spec parts."
  },
  {
    slug: "cruiser",
    name: "Cruiser",
    description: "Big wheel and tall cruisers made for smooth, fast pavement miles."
  },
  {
    slug: "kids",
    name: "Kids",
    description: "Smaller frames and light components for young riders getting started."
  },
  {
    slug: "parts",
    name: "Parts",
    description: "Bars, cranks, forks, wheels and every other build component in stock."
  },
  {
    slug: "clothing",
    name: "Clothing",
    description: "Tees, hoodies, caps and pads for warm-ups and cold sessions."
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Helmets, gloves, pumps, pegs and the small stuff that finishes the build."
  },
  {
    slug: "brands",
    name: "Brands",
    description: "Every brand we stock, from park legends to race programme specialists."
  }
];

type DemoItem = { slug: string; qty: number };

type DemoOrder = {
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  deliveryMethod: "email" | "whatsapp";
  status: OrderStatus;
  daysAgo: number;
  items: DemoItem[];
};

const DEMO_ORDERS: ReadonlyArray<DemoOrder> = [
  {
    reference: "BMX-7QK2M4",
    customerName: "Marcus Webb",
    email: "marcus.webb@example.com",
    phone: "+1 (512) 555-0143",
    address: "88 Solidarity St",
    city: "Austin",
    country: "United States",
    notes: "Please pack the cranks in a separate box, forks were loose last time.",
    deliveryMethod: "email",
    status: "delivered",
    daysAgo: 24,
    items: [
      { slug: "kink-gap", qty: 1 },
      { slug: "sunday-race-x", qty: 1 }
    ]
  },
  {
    reference: "BMX-3TR9PL",
    customerName: "Sofia Delgado",
    email: "sofia.delgado@example.com",
    phone: "+1 (305) 555-0188",
    address: "412 Palm Terrace",
    city: "Miami",
    country: "United States",
    notes: "",
    deliveryMethod: "whatsapp",
    status: "shipped",
    daysAgo: 11,
    items: [
      { slug: "cult-ak", qty: 1 },
      { slug: "wtp-phase", qty: 1 }
    ]
  },
  {
    reference: "BMX-5HD2XW",
    customerName: "Danny Okafor",
    email: "danny.okafor@example.com",
    phone: "+44 20 7946 0812",
    address: "17 Wicklow Row",
    city: "London",
    country: "United Kingdom",
    notes: "Shipping to a hotel, please ring the bell twice.",
    deliveryMethod: "email",
    status: "confirmed",
    daysAgo: 6,
    items: [
      { slug: "sunday-echo", qty: 2 }
    ]
  },
  {
    reference: "BMX-8VN6JC",
    customerName: "Priya Raman",
    email: "priya.raman@example.com",
    phone: "+1 (415) 555-0119",
    address: "900 Mission Bay Blvd",
    city: "San Francisco",
    country: "United States",
    notes: "Gift wrap the bars if possible.",
    deliveryMethod: "whatsapp",
    status: "pending",
    daysAgo: 2,
    items: [
      { slug: "fit-trigger", qty: 1 },
      { slug: "fly-element", qty: 1 }
    ]
  },
  {
    reference: "BMX-1LP4BD",
    customerName: "Tomasz Nowak",
    email: "tomasz.nowak@example.com",
    phone: "+48 22 555 0170",
    address: "24 Marszalkowska",
    city: "Warsaw",
    country: "Poland",
    notes: "",
    deliveryMethod: "email",
    status: "cancelled",
    daysAgo: 1,
    items: [
      { slug: "kink-scout-24", qty: 1 }
    ]
  }
];

export const SETTING_KEYS = [
  "contact_email",
  "phone",
  "address",
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "currency"
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

export type { SettingKey };

const SETTING_DEFAULTS: Record<SettingKey, string> = {
  contact_email: env.contactEmail,
  phone: env.phone,
  address: env.address,
  whatsapp: env.whatsapp,
  instagram: env.instagram,
  facebook: env.facebook,
  tiktok: env.tiktok,
  youtube: env.youtube,
  currency: env.currency
};

let initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!env.databaseUrl) return;
  if (!initPromise) {
    initPromise = runInit().catch((err: unknown) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function runInit(): Promise<void> {
  const client = await getPool().connect();
  try {
    for (const sql of SCHEMA_SQL) {
      await client.query(sql);
    }
    await seedAdmin(client);
    await seedCategories(client);
    await seedSettings(client);
    await seedProducts(client);
    await seedOrders(client);
  } finally {
    client.release();
  }
}

async function seedAdmin(client: PoolClient): Promise<void> {
  const countResult = await client.query(`SELECT COUNT(*)::int AS n FROM bmx_admins`);
  if (Number(countResult.rows[0].n) > 0) return;

  const username = env.adminUsername || "admin";
  await client.query(
    `INSERT INTO bmx_admins (username, password_hash) VALUES ($1, $2)
     ON CONFLICT (username) DO NOTHING`,
    [username, hashPassword(getAdminInitialPassword())]
  );
}

async function seedCategories(client: PoolClient): Promise<void> {
  for (const category of DEFAULT_CATEGORIES) {
    await client.query(
      `INSERT INTO bmx_categories (slug, name, description) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING`,
      [category.slug, category.name, category.description]
    );
  }
}

async function seedSettings(client: PoolClient): Promise<void> {
  for (const key of SETTING_KEYS) {
    const value = SETTING_DEFAULTS[key];
    if (!value) continue;
    await client.query(
      `INSERT INTO bmx_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [key, value]
    );
  }
}

async function seedProducts(client: PoolClient): Promise<void> {
  const countResult = await client.query(`SELECT COUNT(*)::int AS n FROM bmx_products`);
  if (Number(countResult.rows[0].n) > 0) return;

  for (const [index, bike] of catalog.entries()) {
    await client.query(
      `INSERT INTO bmx_products (
         slug, name, brand, model, price, compare_at_price, category, badge,
         wheel_size, top_tube, frame_material, skill_level, rating, review_count,
         image, gallery, riding_style, colors, sizes, description, specs,
         stock, active, featured, sort_order
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,true,true,$23
       ) ON CONFLICT (slug) DO NOTHING`,
      [
        bike.id,
        bike.name,
        bike.brand,
        bike.model,
        bike.price.toFixed(2),
        bike.compareAtPrice ? bike.compareAtPrice.toFixed(2) : null,
        bike.category,
        bike.badge,
        bike.wheelSize,
        bike.topTube,
        bike.frameMaterial,
        bike.skillLevel,
        bike.rating,
        bike.reviewCount,
        bike.image,
        bike.gallery,
        bike.ridingStyle,
        bike.colors,
        bike.sizes,
        bike.description,
        JSON.stringify(bike.specs),
        index < 4 ? 8 - index : 4,
        index
      ]
    );
  }
  console.log(`seedProducts imported ${catalog.length} bikes from data/bmx_bikes.json`);
}

async function seedOrders(client: PoolClient): Promise<void> {
  const countResult = await client.query(`SELECT COUNT(*)::int AS n FROM bmx_orders`);
  if (Number(countResult.rows[0].n) > 0) return;

  const products = new Map(
    catalog.map((bike) => [bike.id, { name: bike.name, price: bike.price }])
  );

  for (const demo of DEMO_ORDERS) {
    const missing = demo.items.filter((item) => !products.has(item.slug)).map((i) => i.slug);
    if (missing.length > 0) {
      console.error(`seedOrders skipped ${demo.reference}: unknown product slug(s) ${missing.join(", ")}`);
      continue;
    }

    const items = demo.items.map((item) => {
      const product = products.get(item.slug)!;
      return { ...item, name: product.name, price: product.price };
    });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const createdAt = new Date(Date.now() - demo.daysAgo * 86_400_000).toISOString();

    await client.query("BEGIN");
    try {
      const orderResult = await client.query(
        `INSERT INTO bmx_orders (
           reference, customer_name, email, phone, address, city, country, notes,
           delivery_method, status, subtotal, total, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
         ON CONFLICT (reference) DO NOTHING
         RETURNING id`,
        [
          demo.reference,
          demo.customerName,
          demo.email,
          demo.phone,
          demo.address,
          demo.city,
          demo.country,
          demo.notes,
          demo.deliveryMethod,
          demo.status,
          subtotal.toFixed(2),
          subtotal.toFixed(2),
          createdAt
        ]
      );
      const orderId = orderResult.rows[0]?.id as string | undefined;
      if (orderId) {
        for (const item of items) {
          await client.query(
            `INSERT INTO bmx_order_items (order_id, product_slug, product_name, price, qty)
             VALUES ($1,$2,$3,$4,$5)`,
            [orderId, item.slug, item.name, item.price.toFixed(2), item.qty]
          );
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
}
