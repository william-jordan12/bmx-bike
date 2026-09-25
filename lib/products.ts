import type { BmxBike, ProductCategory } from "./types";

export const PRODUCT_CATEGORIES: ReadonlyArray<ProductCategory> = [
  "Freestyle",
  "Race",
  "Cruiser",
  "Kids"
];

export type AdminProduct = BmxBike & {
  slug: string;
  stock: number;
  active: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductInput = {
  name: string;
  brand: string;
  model: string;
  price: number;
  compareAtPrice: number | null;
  category: string;
  badge: string;
  wheelSize: string;
  topTube: string;
  frameMaterial: string;
  skillLevel: string;
  rating: number;
  reviewCount: number;
  stock: number;
  description: string;
  image: string;
  gallery: string[];
  ridingStyle: string[];
  colors: string[];
  sizes: string[];
  specs: Record<string, string>;
  active: boolean;
  featured: boolean;
};

type Row = Record<string, unknown>;

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function toSpecs(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, string> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!key.trim()) continue;
      out[key.trim()] = raw === null || raw === undefined ? "" : String(raw);
    }
    return out;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return toSpecs(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return {};
}

export function rowToProduct(row: Row): AdminProduct {
  const specs = toSpecs(row.specs);
  return {
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    name: String(row.name ?? ""),
    price: toNumber(row.price),
    compareAtPrice: row.compare_at_price === null || row.compare_at_price === undefined
      ? undefined
      : toNumber(row.compare_at_price),
    category: (String(row.category ?? "Freestyle") as ProductCategory) || "Freestyle",
    ridingStyle: toStringList(row.riding_style),
    wheelSize: String(row.wheel_size ?? ""),
    topTube: String(row.top_tube ?? ""),
    frameMaterial: String(row.frame_material ?? ""),
    skillLevel: String(row.skill_level ?? ""),
    rating: toNumber(row.rating),
    reviewCount: Math.trunc(toNumber(row.review_count)),
    badge: String(row.badge ?? ""),
    image: String(row.image ?? ""),
    gallery: toStringList(row.gallery),
    colors: toStringList(row.colors),
    sizes: toStringList(row.sizes),
    description: String(row.description ?? ""),
    specs,
    stock: Math.trunc(toNumber(row.stock)),
    active: row.active !== false,
    featured: Boolean(row.featured),
    sort_order: Math.trunc(toNumber(row.sort_order)),
    created_at: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date(0).toISOString(),
    updated_at: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date(0).toISOString()
  };
}

export function productToBmxBike(product: AdminProduct): BmxBike {
  return {
    id: product.slug || product.id,
    brand: product.brand,
    model: product.model,
    name: product.name,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    category: product.category,
    ridingStyle: product.ridingStyle,
    wheelSize: product.wheelSize,
    topTube: product.topTube,
    frameMaterial: product.frameMaterial,
    skillLevel: product.skillLevel,
    rating: product.rating,
    reviewCount: product.reviewCount,
    badge: product.badge,
    image: product.image,
    gallery: product.gallery,
    colors: product.colors,
    sizes: product.sizes,
    description: product.description,
    specs: product.specs
  };
}

export function isValidImageUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/uploads/")) return /^\/uploads\/[A-Za-z0-9._\-/]+$/.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function cleanList(value: unknown, max = 12): string[] {
  return toStringList(value)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function validateProductInput(
  body: unknown,
  options: { partial?: boolean } = {}
): { ok: true; value: ProductInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Send the product as a JSON object." };
  }
  const input = body as Record<string, unknown>;

  const name = String(input.name ?? "").trim();
  if (!options.partial && name.length === 0) return { ok: false, error: "Product name is required." };
  if (name.length > 140) return { ok: false, error: "Product name is too long." };
  if (!options.partial && name.length < 2) {
    return { ok: false, error: "Product name must be at least 2 characters." };
  }

  const price = toNumber(input.price, Number.NaN);
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Price must be zero or more." };
  if (price > 1_000_000) return { ok: false, error: "Price looks too large." };

  const rawCompare = input.compareAtPrice;
  let compareAtPrice: number | null = null;
  if (rawCompare !== undefined && rawCompare !== null && rawCompare !== "") {
    const parsed = toNumber(rawCompare, Number.NaN);
    if (!Number.isFinite(parsed) || parsed < 0) return { ok: false, error: "Compare-at price must be zero or more." };
    if (parsed < price) return { ok: false, error: "Compare-at price cannot be lower than the price." };
    compareAtPrice = parsed;
  }

  const categoryRaw = String(input.category ?? "Freestyle").trim();
  const category = PRODUCT_CATEGORIES.includes(categoryRaw as ProductCategory)
    ? categoryRaw
    : "Freestyle";

  const rating = toNumber(input.rating, 0);
  if (rating < 0 || rating > 5) return { ok: false, error: "Rating must be between 0 and 5." };

  const image = String(input.image ?? "").trim();
  if (!isValidImageUrl(image)) return { ok: false, error: "Main image must be a full http(s) URL or an /uploads path." };

  const gallery = cleanList(input.gallery, 16);
  for (const url of gallery) {
    if (!isValidImageUrl(url)) return { ok: false, error: "Gallery images must be full http(s) URLs or /uploads paths." };
  }

  const specs: Record<string, string> = {};
  const rawSpecs = input.specs;
  if (rawSpecs && typeof rawSpecs === "object" && !Array.isArray(rawSpecs)) {
    for (const [key, value] of Object.entries(rawSpecs as Record<string, unknown>)) {
      const cleanKey = key.trim().slice(0, 60);
      if (!cleanKey) continue;
      specs[cleanKey] = String(value ?? "").trim().slice(0, 200);
      if (Object.keys(specs).length >= 24) break;
    }
  }

  return {
    ok: true,
    value: {
      name: name || "Untitled product",
      brand: String(input.brand ?? "").trim().slice(0, 60),
      model: String(input.model ?? "").trim().slice(0, 60),
      price,
      compareAtPrice,
      category,
      badge: String(input.badge ?? "").trim().slice(0, 40),
      wheelSize: String(input.wheelSize ?? "").trim().slice(0, 40),
      topTube: String(input.topTube ?? "").trim().slice(0, 40),
      frameMaterial: String(input.frameMaterial ?? "").trim().slice(0, 60),
      skillLevel: String(input.skillLevel ?? "").trim().slice(0, 60),
      rating: Math.round(rating * 10) / 10,
      reviewCount: Math.max(0, Math.trunc(toNumber(input.reviewCount, 0))),
      stock: Math.max(0, Math.trunc(toNumber(input.stock, 0))),
      description: String(input.description ?? "").trim().slice(0, 4000),
      image,
      gallery,
      ridingStyle: cleanList(input.ridingStyle, 8),
      colors: cleanList(input.colors, 12),
      sizes: cleanList(input.sizes, 12),
      specs,
      active: input.active === undefined ? true : Boolean(input.active),
      featured: Boolean(input.featured)
    }
  };
}

export const PRODUCT_COLUMNS = [
  "id",
  "slug",
  "name",
  "brand",
  "model",
  "price",
  "compare_at_price",
  "category",
  "badge",
  "wheel_size",
  "top_tube",
  "frame_material",
  "skill_level",
  "rating",
  "review_count",
  "image",
  "gallery",
  "riding_style",
  "colors",
  "sizes",
  "description",
  "specs",
  "stock",
  "active",
  "featured",
  "sort_order",
  "created_at",
  "updated_at"
] as const;
