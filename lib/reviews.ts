export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const isReviewStatus = (value: unknown): value is ReviewStatus =>
  typeof value === "string" && (REVIEW_STATUSES as readonly string[]).includes(value);

export type PublicReview = {
  id: string;
  product_slug: string;
  product_name: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  created_at: string;
};

export type AdminReview = PublicReview & {
  status: ReviewStatus;
  featured: boolean;
  helpful: number;
  updated_at: string;
};

export type ReviewSummary = {
  average: number;
  count: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
};

const AUTHOR_MIN = 2;
const AUTHOR_MAX = 60;
const TITLE_MIN = 3;
const TITLE_MAX = 100;
const BODY_MIN = 10;
const BODY_MAX = 2000;

type Row = Record<string, unknown>;

function iso(value: unknown): string {
  if (!value) return new Date(0).toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function clampText(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function clampBody(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, BODY_MAX);
}

export function rowToPublicReview(row: Row): PublicReview {
  return {
    id: String(row.id ?? ""),
    product_slug: String(row.product_slug ?? ""),
    product_name: String(row.product_name ?? ""),
    author: String(row.author ?? ""),
    rating: Math.min(5, Math.max(1, Math.trunc(Number(row.rating) || 1))),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    verified: Boolean(row.verified),
    created_at: iso(row.created_at)
  };
}

export function rowToAdminReview(row: Row): AdminReview {
  return {
    ...rowToPublicReview(row),
    status: isReviewStatus(row.status) ? row.status : "pending",
    featured: Boolean(row.featured),
    helpful: Math.max(0, Math.trunc(Number(row.helpful) || 0)),
    updated_at: iso(row.updated_at)
  };
}

export function emptyDistribution(): ReviewSummary["distribution"] {
  return { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
}

export function summarise(rows: Row[]): ReviewSummary {
  const distribution = emptyDistribution();
  let total = 0;
  for (const row of rows) {
    const rating = Math.min(5, Math.max(1, Math.trunc(Number(row.rating) || 0)));
    if (!rating) continue;
    distribution[String(rating) as keyof typeof distribution] += 1;
    total += rating;
  }
  const count = rows.length;
  return {
    average: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    count,
    distribution
  };
}

export function validateReviewInput(body: unknown): { ok: true; value: {
  author: string;
  rating: number;
  title: string;
  body: string;
} } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Send the review as a JSON object." };
  }
  const input = body as Record<string, unknown>;

  if (String(input.website ?? "").trim() !== "") {
    return { ok: false, error: "Your review could not be submitted." };
  }

  const author = clampText(input.author_name, AUTHOR_MAX);
  if (author.length < AUTHOR_MIN) return { ok: false, error: "Please add your name (2 characters or more)." };
  if (author.length > AUTHOR_MAX) return { ok: false, error: "That name is too long." };

  const rating = Math.trunc(Number(input.rating));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Choose a star rating from 1 to 5." };
  }

  const title = clampText(input.title, TITLE_MAX);
  if (title.length < TITLE_MIN) return { ok: false, error: "Add a short title (3 characters or more)." };

  const reviewBody = clampBody(input.body);
  if (reviewBody.length < BODY_MIN) {
    return { ok: false, error: `Tell us a little more (${BODY_MIN} characters or more).` };
  }

  return { ok: true, value: { author, rating, title, body: reviewBody } };
}

export function validateReviewPatch(
  body: unknown
): { ok: true; value: { status?: ReviewStatus; featured?: boolean; helpful?: number; verified?: boolean } } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Send the changes as a JSON object." };
  }
  const input = body as Record<string, unknown>;
  const value: { status?: ReviewStatus; featured?: boolean; helpful?: number; verified?: boolean } = {};

  if (input.status !== undefined) {
    if (!isReviewStatus(input.status)) {
      return { ok: false, error: "Status must be pending, approved or rejected." };
    }
    value.status = input.status;
  }

  if (input.featured !== undefined) value.featured = Boolean(input.featured);
  if (input.verified !== undefined) value.verified = Boolean(input.verified);

  if (input.helpful !== undefined) {
    const helpful = Math.trunc(Number(input.helpful));
    if (!Number.isInteger(helpful) || helpful < 0) {
      return { ok: false, error: "Helpful count must be zero or more." };
    }
    value.helpful = Math.min(helpful, 100_000);
  }

  if (Object.keys(value).length === 0) {
    return { ok: false, error: "Nothing to change." };
  }
  return { ok: true, value };
}
