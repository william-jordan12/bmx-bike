"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, RefreshCw, ShieldCheck, Star } from "lucide-react";

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

type RatingKey = "1" | "2" | "3" | "4" | "5";

type SummaryPayload = {
  average?: number;
  count?: number;
  distribution?: Partial<Record<RatingKey, number>>;
};

type ReviewsResponse = {
  ok?: boolean;
  summary?: SummaryPayload | null;
  reviews?: PublicReview[] | null;
  error?: unknown;
};

type CreateResponse = {
  ok?: boolean;
  pending?: boolean;
  error?: unknown;
};

type FieldErrors = {
  author_name?: string;
  rating?: string;
  title?: string;
  body?: string;
};

type ReviewForm = {
  author_name: string;
  rating: number;
  title: string;
  body: string;
};

const RATING_KEYS: RatingKey[] = ["5", "4", "3", "2", "1"];
const RATING_VALUES = [1, 2, 3, 4, 5];
const BODY_MAX = 2000;
const BODY_MIN = 10;

const emptyDistribution = (): Record<RatingKey, number> => ({ "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 });

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
};

const clampRating = (value: unknown): number => {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(5, parsed));
};

const normalizeDistribution = (value: Partial<Record<RatingKey, number>> | null | undefined): Record<RatingKey, number> => {
  const base = emptyDistribution();
  if (!value || typeof value !== "object") return base;
  for (const key of RATING_KEYS) {
    const parsed = Math.round(Number(value[key]));
    if (Number.isFinite(parsed) && parsed > 0) base[key] = parsed;
  }
  return base;
};

const toPublicReview = (value: unknown): PublicReview | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = toText(raw.id);
  const title = toText(raw.title);
  const body = toText(raw.body);
  if (!id || !title || !body) return null;
  const created = toText(raw.created_at);
  const parsedDate = created ? new Date(created) : null;
  const createdAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date(0).toISOString();
  return {
    id,
    product_slug: toText(raw.product_slug),
    product_name: toText(raw.product_name),
    author: toText(raw.author) || "Rider",
    rating: clampRating(raw.rating) || 5,
    title,
    body,
    verified: raw.verified === true,
    created_at: createdAt
  };
};

const timeAgo = (iso: string): string => {
  const stamp = new Date(iso).getTime();
  if (!Number.isFinite(stamp)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - stamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.max(1, Math.round(months / 12));
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const filled = clampRating(rating);
  const icon = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <span className="star-row flex items-center gap-0.5" role="img" aria-label={`${filled} out of 5 stars`}>
      {RATING_VALUES.map((value) => (
        <Star
          key={value}
          strokeWidth={1.6}
          className={`${icon} ${value <= filled ? "fill-[var(--orange)] text-[var(--orange)]" : "fill-[#e0dcd4] text-[#e0dcd4]"}`}
        />
      ))}
    </span>
  );
}

function DistributionList({ distribution, total }: { distribution: Record<RatingKey, number>; total: number }) {
  return (
    <ul className="space-y-2">
      {RATING_KEYS.map((key) => {
        const count = distribution[key];
        const percent = total > 0 ? Math.min(100, (count / total) * 100) : 0;
        return (
          <li key={key} className="flex items-center gap-3">
            <span className="flex w-9 shrink-0 items-center gap-1 text-[11px] font-bold text-[#5d5952]">
              {key}
              <Star className="h-3 w-3 fill-[var(--orange)] text-[var(--orange)]" strokeWidth={1.6} />
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5e0d8]">
              <span className="block h-full rounded-full bg-[var(--orange)] transition-all duration-300" style={{ width: `${percent}%` }} />
            </span>
            <span className="w-7 shrink-0 text-right text-[11px] font-semibold text-[#96918a]">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1.5 block text-[11px] font-semibold text-[#a5372a]" role="alert">
      {message}
    </span>
  );
}

export default function ProductReviewSection({
  slug,
  productName,
  compact = false
}: {
  slug: string;
  productName: string;
  compact?: boolean;
}) {
  const [summary, setSummary] = useState<{ average: number; count: number; distribution: Record<RatingKey, number> } | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ReviewForm>({ author_name: "", rating: 0, title: "", body: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const formId = `product-review-${compact ? "compact" : "full"}-${slug}`;
  const endpoint = `/api/products/${encodeURIComponent(slug)}/reviews`;

  useEffect(() => {
    void (async () => {
      let active = true;
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as ReviewsResponse | null;
        if (!active) return;
        if (!response.ok || !payload || payload.ok !== true) {
          setSummary(null);
          setReviews([]);
          setLoadError(
            typeof payload?.error === "string" && payload.error
              ? payload.error
              : "We could not load reviews right now."
          );
          return;
        }
        const list = Array.isArray(payload.reviews)
          ? payload.reviews.map(toPublicReview).filter((review): review is PublicReview => review !== null)
          : [];
        const count = Number(payload.summary?.count);
        setSummary({
          average: Number.isFinite(Number(payload.summary?.average)) ? Number(payload.summary?.average) : 0,
          count: Number.isFinite(count) && count > 0 ? Math.round(count) : list.length,
          distribution: normalizeDistribution(payload.summary?.distribution)
        });
        setReviews(list);
      } catch {
        if (!active) return;
        setSummary(null);
        setReviews([]);
        setLoadError("Network error. Check your connection and retry.");
      }

      return () => {
        active = false;
      };
    })();
  }, [endpoint, attempt]);

  useEffect(() => {
    void (async () => {
      setFormOpen(false);
      setSubmitted(false);
      setSubmitError("");
      setFieldErrors({});
      setHoverRating(0);
      setForm({ author_name: "", rating: 0, title: "", body: "" });
    })();
  }, [slug]);

  const total = summary ? summary.count : reviews.length;
  const hasRatings = total > 0;
  const visibleRating = hoverRating || form.rating;
  const bodyCount = form.body.length;
  const bodyCounterTone = bodyCount > BODY_MAX ? "text-[#a5372a]" : bodyCount > BODY_MAX - 200 ? "text-[#b06a1c]" : "text-[#96918a]";

  const panelBorder = compact ? "border-[#e4e0d8]" : "border-[#dedad2]";
  const averageSize = compact ? "text-4xl" : "text-5xl";
  const summaryColumns = compact ? "grid-cols-1" : "sm:grid-cols-[190px_minmax(0,1fr)]";
  const summaryPadding = compact ? "py-4" : "py-6";
  const itemPadding = compact ? "py-4" : "py-6";
  const avatarTone = compact ? "h-8 w-8 bg-[#e8e4dc] text-[11px] text-[#494641]" : "h-11 w-11 bg-[var(--ink)] text-sm text-white";
  const reviewTitleSize = compact ? "text-[13px]" : "text-[15px]";
  const reviewBodySize = compact ? "text-[13px] leading-6" : "text-sm leading-7";
  const formFields = compact ? "sm:grid-cols-2" : "grid-cols-1";

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    const authorName = form.author_name.trim();
    if (authorName.length < 2) errors.author_name = "Add your name (2 to 60 characters).";
    else if (authorName.length > 60) errors.author_name = "Keep your name under 60 characters.";

    if (form.rating < 1 || form.rating > 5) errors.rating = "Pick a star rating from 1 to 5.";

    const title = form.title.trim();
    if (title.length < 3) errors.title = "Add a headline (3 to 100 characters).";
    else if (title.length > 100) errors.title = "Keep the headline under 100 characters.";

    const body = form.body.trim();
    if (body.length < BODY_MIN) errors.body = `Tell us more — at least ${BODY_MIN} characters.`;
    else if (body.length > BODY_MAX) errors.body = `Keep your review under ${BODY_MAX} characters.`;

    return errors;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const errors = validate();
    setFieldErrors(errors);
    setSubmitError("");
    if (Object.keys(errors).length > 0) return;

    const honeypot = String(new FormData(event.currentTarget).get("website") ?? "");
    setSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: form.author_name.trim(),
          rating: form.rating,
          title: form.title.trim(),
          body: form.body.trim(),
          website: honeypot
        })
      });
      const payload = (await response.json().catch(() => null)) as CreateResponse | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setSubmitError(
          typeof payload?.error === "string" && payload.error
            ? payload.error
            : "We could not submit that review. Please try again."
        );
        return;
      }

      setSubmitted(true);
      setFieldErrors({});
      setForm({ author_name: "", rating: 0, title: "", body: "" });
      setHoverRating(0);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-label={`Customer reviews for ${productName}`} className={compact ? "text-[13px]" : undefined}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-[#8d887f]">Rider reviews</p>
          <h3 className={`mt-2 font-bold text-[#1d1c1a] ${compact ? "text-lg" : "text-xl sm:text-2xl"}`}>{productName}</h3>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((current) => !current)}
          aria-expanded={formOpen}
          aria-controls={formId}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition ${
            formOpen
              ? "border border-[#d8d3ca] bg-white text-[#494641] hover:bg-[#151515] hover:text-white"
              : "bg-[var(--orange)] text-white hover:bg-[#151515]"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          {formOpen ? "Close form" : "Write a review"}
        </button>
      </div>

      {formOpen ? (
        submitted ? (
          <div className={`mt-5 border ${panelBorder} bg-[#f7f5f0] p-5`} role="status">
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4e8a57]" strokeWidth={2.2} />
              <div>
                <p className="text-sm font-bold text-[#1d1c1a]">Thanks! Your review is waiting for approval.</p>
                <p className="mt-1.5 text-xs leading-5 text-[#77726b]">
                  Our crew reads every review before it goes live, so it will appear on this bike once it is approved.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--orange)] underline underline-offset-4"
                >
                  Write another review
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form id={formId} onSubmit={submit} noValidate className={`mt-5 border ${panelBorder} bg-white p-4 sm:p-5`}>
            <p className="eyebrow text-[var(--orange)]">Tell us about the ride</p>
            <div className={`mt-4 grid gap-4 ${formFields}`}>
              <div>
                <label htmlFor={`${formId}-author`} className="eyebrow block text-[#8d887f]">
                  Your name
                </label>
                <input
                  id={`${formId}-author`}
                  name="author_name"
                  type="text"
                  value={form.author_name}
                  onChange={(event) => setForm({ ...form, author_name: event.target.value })}
                  placeholder="Rider name"
                  autoComplete="name"
                  maxLength={60}
                  aria-invalid={Boolean(fieldErrors.author_name)}
                  aria-describedby={fieldErrors.author_name ? `${formId}-author-error` : undefined}
                  className={`mt-2 h-11 w-full border bg-white px-3 text-sm outline-none transition focus:border-[var(--orange)] ${
                    fieldErrors.author_name ? "border-[#a5372a]" : "border-[#d8d3ca]"
                  }`}
                />
                <FieldError id={`${formId}-author-error`} message={fieldErrors.author_name} />
              </div>
              <div>
                <span className="eyebrow block text-[#8d887f]">Your rating</span>
                <div
                  role="radiogroup"
                  aria-label="Your rating"
                  aria-invalid={Boolean(fieldErrors.rating)}
                  aria-describedby={fieldErrors.rating ? `${formId}-rating-error` : undefined}
                  onMouseLeave={() => setHoverRating(0)}
                  className="mt-2 flex h-11 items-center gap-0.5"
                >
                  {RATING_VALUES.map((value) => (
                    <label
                      key={value}
                      onMouseEnter={() => setHoverRating(value)}
                      className="cursor-pointer rounded-sm p-1 transition hover:bg-[#f7f5f0]"
                    >
                      <input
                        type="radio"
                        name={`${formId}-rating`}
                        value={value}
                        checked={form.rating === value}
                        onChange={() => setForm({ ...form, rating: value })}
                        className="peer sr-only"
                      />
                      <Star
                        strokeWidth={1.6}
                        className={`h-6 w-6 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--orange)] ${
                          value <= visibleRating ? "fill-[var(--orange)] text-[var(--orange)]" : "fill-[#e0dcd4] text-[#e0dcd4]"
                        }`}
                      />
                    </label>
                  ))}
                </div>
                <FieldError id={`${formId}-rating-error`} message={fieldErrors.rating} />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor={`${formId}-title`} className="eyebrow block text-[#8d887f]">
                Headline
              </label>
              <input
                id={`${formId}-title`}
                name="title"
                type="text"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Sum it up in a few words"
                maxLength={100}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? `${formId}-title-error` : undefined}
                className={`mt-2 h-11 w-full border bg-white px-3 text-sm outline-none transition focus:border-[var(--orange)] ${
                  fieldErrors.title ? "border-[#a5372a]" : "border-[#d8d3ca]"
                }`}
              />
              <FieldError id={`${formId}-title-error`} message={fieldErrors.title} />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`${formId}-body`} className="eyebrow block text-[#8d887f]">
                  Your review
                </label>
                <span className={`text-[11px] font-semibold ${bodyCounterTone}`}>
                  {bodyCount}/{BODY_MAX}
                </span>
              </div>
              <textarea
                id={`${formId}-body`}
                name="body"
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                rows={compact ? 3 : 5}
                placeholder="How does it ride? Durability, finish, sizing, the honest stuff."
                aria-invalid={Boolean(fieldErrors.body)}
                aria-describedby={fieldErrors.body ? `${formId}-body-error` : undefined}
                className={`mt-2 w-full resize-y border bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-[var(--orange)] ${
                  fieldErrors.body ? "border-[#a5372a]" : "border-[#d8d3ca]"
                }`}
              />
              <FieldError id={`${formId}-body-error`} message={fieldErrors.body} />
            </div>

            <div className="hidden" aria-hidden="true">
              <label htmlFor={`${formId}-website`}>Leave this field empty</label>
              <input
                id={`${formId}-website`}
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>

            {submitError ? (
              <p className="mt-4 border border-[#e8c3b8] bg-[#fdf1ec] px-3 py-2 text-xs font-semibold text-[#a5372a]" role="alert">
                {submitError}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 items-center justify-center gap-2 bg-[var(--orange)] px-5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#151515] disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Submit review"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex h-12 items-center justify-center border border-[#d8d3ca] px-5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#494641] transition hover:border-[#151515] hover:text-[#151515]"
              >
                Cancel
              </button>
            </div>
          </form>
        )
      ) : null}

      {loading ? (
        <div className={`mt-6 border-t ${panelBorder} ${summaryPadding}`} aria-busy="true" role="status">
          <span className="sr-only">Loading reviews…</span>
          <div className="flex items-end gap-4">
            <span className="block h-9 w-14 animate-pulse bg-[#e5e0d8]" />
            <span className="block h-4 w-24 animate-pulse bg-[#ece8e1]" />
          </div>
          <div className="mt-4 space-y-2">
            <span className="block h-2 w-full animate-pulse bg-[#ece8e1]" />
            <span className="block h-2 w-4/5 animate-pulse bg-[#ece8e1]" />
            <span className="block h-2 w-2/3 animate-pulse bg-[#ece8e1]" />
          </div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#96918a]" aria-hidden="true">
            Loading reviews...
          </p>
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className={`mt-6 flex flex-col gap-3 border ${panelBorder} bg-[#f7f5f0] p-5 sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="text-sm font-semibold text-[#5d5952]">{loadError}</p>
          <button
            type="button"
            onClick={() => setAttempt((current) => current + 1)}
            className="flex shrink-0 items-center justify-center gap-2 border border-[#151515] px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#151515] transition hover:bg-[#151515] hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className={`mt-6 grid items-start gap-6 border-t ${panelBorder} ${summaryColumns} ${summaryPadding}`}>
            <div>
              <div className="flex items-end gap-3">
                <span className={`font-display leading-none tracking-[-0.03em] text-[#1d1c1a] ${averageSize}`}>
                  {hasRatings && summary ? summary.average.toFixed(1) : "—"}
                </span>
                {hasRatings && summary ? <StarRow rating={summary.average} size={compact ? "sm" : "md"} /> : null}
              </div>
              <p className="mt-2 text-xs font-semibold text-[#77726b]">
                {hasRatings && summary ? plural(summary.count, "written review") : "No written reviews yet"}
              </p>
            </div>
            {compact ? null : summary ? <DistributionList distribution={summary.distribution} total={total} /> : null}
          </div>

          {reviews.length ? (
            <ul className={`mt-2 divide-y ${panelBorder}`}>
              {reviews.map((review) => (
                <li key={review.id} className={itemPadding}>
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold uppercase ${avatarTone}`}
                      aria-hidden="true"
                    >
                      {(review.author.trim().charAt(0) || "?").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span className={`font-bold text-[#1d1c1a] ${compact ? "text-[13px]" : "text-sm"}`}>{review.author}</span>
                        {review.verified ? (
                          <span className="flex items-center gap-1 border border-[#d8d3ca] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#4e8a57]">
                            <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                            Verified rider
                          </span>
                        ) : null}
                        <time
                          dateTime={review.created_at}
                          className="ml-auto text-[11px] font-semibold text-[#96918a]"
                        >
                          {timeAgo(review.created_at)}
                        </time>
                      </div>
                      <div className="mt-1.5">
                        <StarRow rating={review.rating} />
                      </div>
                      <p className={`mt-2 font-bold text-[#1d1c1a] ${reviewTitleSize}`}>{review.title}</p>
                      <p className={`mt-1.5 whitespace-pre-line text-[#5d5952] ${reviewBodySize}`}>{review.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center border border-dashed border-[#cfc9bf] bg-white px-6 py-9 text-center">
              <Star className="h-7 w-7 text-[var(--orange)]" strokeWidth={1.6} />
              <p className="mt-3 max-w-sm text-sm font-semibold text-[#494641]">
                No written reviews for this bike yet. Be the first to ride it.
              </p>
              {formOpen ? null : (
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="mt-5 border border-[#151515] px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#151515] transition hover:bg-[#151515] hover:text-white"
                >
                  Write a review
                </button>
              )}
            </div>
          )}
        </>
      )}

      <p className="mt-5 text-[11px] leading-5 text-[#96918a]">
        Every review is checked by our crew before it goes live, so you always read a real rider take on {productName}.
      </p>
    </section>
  );
}
