"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  Loader2,
  MessageSquareQuote,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Star,
  ThumbsUp,
  Trash2,
  Undo2,
  X
} from "lucide-react";

export type NotifyFn = (kind: "success" | "error", text: string) => void;

export type ReviewStatus = "pending" | "approved" | "rejected";

export type AdminReview = {
  id: string;
  product_slug: string;
  product_name: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  verified: boolean;
  featured: boolean;
  helpful: number;
  created_at: string;
  updated_at: string;
};

type StatusFilter = "all" | ReviewStatus;

type Counts = { all: number; pending: number; approved: number; rejected: number };

type ReviewPatch = { status?: ReviewStatus; featured?: boolean; helpful?: number };

type ReviewAction = "approve" | "reject" | "pending" | "feature" | "helpful" | "delete";

type ReviewsListResponse = { ok?: boolean; counts?: Partial<Counts>; reviews?: AdminReview[]; error?: string };
type ReviewWriteResponse = { ok?: boolean; review?: AdminReview; error?: string };
type DeleteResponse = { ok?: boolean; error?: string };

const FILTERS: ReadonlyArray<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" }
];

const REVIEW_STATUS_STYLES: Record<ReviewStatus, string> = {
  pending: "bg-[#fff3e0] text-[#a35d10]",
  approved: "bg-[#e5f5e8] text-[#2c7a3f]",
  rejected: "bg-[#fbe6e3] text-[#a5372a]"
};

const EMPTY_COPY: Record<StatusFilter, string> = {
  all: "No reviews yet. They arrive when customers submit them on a product page.",
  pending: "Nothing waiting for review. Nice and clear.",
  approved: "No approved reviews yet.",
  rejected: "Nothing has been rejected."
};

const ACTION_BUTTON_CLASS =
  "flex h-9 items-center gap-1.5 border border-[#d8d3ca] px-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#494641] transition hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-60";

const LONG_BODY = 240;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

function timeAgo(iso: string): string {
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return "Unknown date";
  const elapsed = Date.now() - stamp;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `${minutes} min ago`;
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (elapsed < WEEK) {
    const days = Math.floor(elapsed / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (elapsed < 52 * WEEK) {
    const weeks = Math.floor(elapsed / WEEK);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  try {
    return new Date(stamp).toLocaleDateString();
  } catch {
    return "Unknown date";
  }
}

function toCount(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function normalizeCounts(value: Partial<Counts> | undefined): Counts {
  return {
    all: toCount(value?.all),
    pending: toCount(value?.pending),
    approved: toCount(value?.approved),
    rejected: toCount(value?.rejected)
  };
}

function shiftCounts(current: Counts, from: ReviewStatus, to: ReviewStatus | null): Counts {
  if (to === from) return current;
  return {
    all: Math.max(0, current.all + (to === null ? -1 : 0)),
    pending: Math.max(0, current.pending + (to === "pending" ? 1 : 0) - (from === "pending" ? 1 : 0)),
    approved: Math.max(0, current.approved + (to === "approved" ? 1 : 0) - (from === "approved" ? 1 : 0)),
    rejected: Math.max(0, current.rejected + (to === "rejected" ? 1 : 0) - (from === "rejected" ? 1 : 0))
  };
}

function actionKey(id: string, action: ReviewAction): string {
  return `${id}:${action}`;
}

export default function ReviewsTab({ notify }: { notify: NotifyFn }) {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<string[]>([]);

  const landed = useRef(false);

  const load = useCallback(
    async (target: StatusFilter): Promise<Counts | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/reviews?status=${target}`, { cache: "no-store" });
        const data = (await response.json()) as ReviewsListResponse;
        if (!response.ok) {
          setError(data.error ?? "Could not load the reviews.");
          notify("error", data.error ?? "Could not load the reviews.");
          return null;
        }
        const next = normalizeCounts(data.counts);
        setCounts(next);
        setReviews(data.reviews ?? []);
        return next;
      } catch {
        setError("Network error while loading the reviews.");
        notify("error", "Network error while loading the reviews.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    void (async () => {
      if (!landed.current) {
        landed.current = true;
        const first = await load("pending");
        if (first) setStatus(first.pending > 0 ? "pending" : "all");
        return;
      }
      await load(status);
    })();
  }, [load, status]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return reviews;
    return reviews.filter(
      (review) =>
        (review.author ?? "").toLowerCase().includes(needle) ||
        (review.product_name ?? "").toLowerCase().includes(needle) ||
        (review.title ?? "").toLowerCase().includes(needle)
    );
  }, [reviews, query]);

  function startAction(id: string, action: ReviewAction) {
    setPendingActions((current) => [...current, actionKey(id, action)]);
  }

  function endAction(id: string, action: ReviewAction) {
    setPendingActions((current) => current.filter((key) => key !== actionKey(id, action)));
  }

  function isBusy(id: string, action: ReviewAction): boolean {
    return pendingActions.includes(actionKey(id, action));
  }

  function applyReview(updated: AdminReview) {
    setReviews((current) => {
      const next = current.map((item) => (item.id === updated.id ? updated : item));
      return status === "all" ? next : next.filter((item) => item.status === status);
    });
  }

  async function patchReview(review: AdminReview, body: ReviewPatch, action: ReviewAction, message: string) {
    startAction(review.id, action);
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await response.json()) as ReviewWriteResponse;
      if (!response.ok || !data.ok) {
        notify("error", data.error ?? "Could not update the review.");
        return;
      }
      const updated = data.review;
      if (updated) {
        setCounts((current) => shiftCounts(current, review.status, updated.status));
        applyReview(updated);
      }
      notify("success", message);
    } catch {
      notify("error", "Network error while updating the review.");
    } finally {
      endAction(review.id, action);
    }
  }

  function setReviewStatus(review: AdminReview, next: ReviewStatus) {
    if (next === review.status) return;
    const action: ReviewAction = next === "approved" ? "approve" : next === "rejected" ? "reject" : "pending";
    const message = next === "pending" ? "Review sent back to the moderation queue." : `Review by ${review.author} ${next}.`;
    void patchReview(review, { status: next }, action, message);
  }

  function toggleFeatured(review: AdminReview) {
    const next = !review.featured;
    void patchReview(
      review,
      { featured: next },
      "feature",
      next ? `Review by ${review.author} is now featured.` : `Feature removed from ${review.author}.`
    );
  }

  function markHelpful(review: AdminReview) {
    void patchReview(review, { helpful: review.helpful + 1 }, "helpful", "Helpful count bumped.");
  }

  async function removeReview(review: AdminReview) {
    const confirmed = window.confirm(
      `Delete the review by ${review.author} on “${review.product_name}”? This cannot be undone.`
    );
    if (!confirmed) return;
    startAction(review.id, "delete");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
      const data = (await response.json()) as DeleteResponse;
      if (!response.ok || !data.ok) {
        notify("error", data.error ?? "Could not delete the review.");
        return;
      }
      setReviews((current) => current.filter((item) => item.id !== review.id));
      setCounts((current) => shiftCounts(current, review.status, null));
      notify("success", `Review by ${review.author} deleted.`);
    } catch {
      notify("error", "Network error while deleting the review.");
    } finally {
      endAction(review.id, "delete");
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Reviews"
        description="Moderate what customers wrote on the product pages. Pending reviews stay hidden from the storefront until you approve them."
        action={
          <button
            type="button"
            onClick={() => void load(status)}
            disabled={loading}
            className="flex h-10 items-center gap-2 border border-[#ddd9d1] px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#625e57] transition hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        }
      />

      <div className="flex flex-col gap-3 border border-[#ddd9d1] bg-[var(--cream)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = status === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatus(filter.id)}
                aria-pressed={active}
                className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] transition ${
                  active
                    ? "bg-[var(--ink)] text-white"
                    : "border border-[#d8d3ca] text-[#625e57] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                }`}
              >
                {filter.label}
                <span className={active ? "ml-2 text-white/70" : "ml-2 text-[#a8a39b]"}>{counts[filter.id]}</span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 border border-[#d8d3ca] bg-white px-3 lg:w-72">
          <Search className="h-4 w-4 text-[#8d887f]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search author, product or title"
            className="h-10 w-full bg-transparent text-sm outline-none"
            aria-label="Search reviews"
          />
        </label>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[#f0c4bc] bg-[#fbe6e3] px-5 py-4">
          <p className="flex items-center gap-2 text-xs font-bold text-[#a5372a]">
            <X className="h-4 w-4" /> {error}
          </p>
          <button
            type="button"
            onClick={() => void load(status)}
            className="flex h-9 items-center gap-2 border border-[#a5372a] px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a5372a] transition hover:bg-[#a5372a] hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 border border-[#ddd9d1] bg-[var(--cream)] px-5 py-4 text-xs font-bold text-[#77726b]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading reviews…
        </p>
      ) : visible.length === 0 ? (
        <EmptyState
          label={
            reviews.length === 0 && query.trim() === ""
              ? EMPTY_COPY[status]
              : "No reviews match this search."
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              isBusy={(action) => isBusy(review.id, action)}
              onStatus={(next) => setReviewStatus(review, next)}
              onFeature={() => toggleFeatured(review)}
              onHelpful={() => markHelpful(review)}
              onDelete={() => void removeReview(review)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <section className="border border-[#ddd9d1] bg-[var(--cream)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd9d1] px-5 py-4">
        <div>
          <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
          <p className="mt-1 text-xs text-[#77726b]">{description}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 border border-dashed border-[#d8d3ca] bg-[var(--cream)] px-5 py-12 text-center">
      <MessageSquareQuote className="h-6 w-6 text-[#b6b1a8]" />
      <p className="text-sm text-[#77726b]">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: ReviewStatus }) {
  return (
    <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${REVIEW_STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function StarRow({ rating }: { rating: number }) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${
            index < filled ? "fill-[var(--orange)] text-[var(--orange)]" : "text-[#cfcac0]"
          }`}
        />
      ))}
      <span className="ml-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#77726b]">
        {value.toFixed(1)}
      </span>
    </span>
  );
}

type ReviewCardProps = {
  review: AdminReview;
  isBusy: (action: ReviewAction) => boolean;
  onStatus: (status: ReviewStatus) => void;
  onFeature: () => void;
  onHelpful: () => void;
  onDelete: () => void;
};

function ReviewCard({ review, isBusy, onStatus, onFeature, onHelpful, onDelete }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  const author = review.author ?? "Anonymous";
  const body = review.body ?? "";
  const long = body.trim().length > LONG_BODY;
  const preview = `${body.slice(0, LONG_BODY).trimEnd()}…`;
  const helpful = toCount(review.helpful);

  function actionIcon(spinning: boolean, icon: ReactNode) {
    return spinning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon;
  }

  return (
    <article className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-extrabold uppercase text-white">
            {author.trim().slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold">{author}</p>
            <p className="mt-1 eyebrow text-[#8d887f]">{review.product_name ?? "Unknown product"}</p>
            <div className="mt-2">
              <StarRow rating={review.rating} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {review.verified ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#2c7a3f]">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          ) : null}
          <StatusPill status={review.status} />
        </div>
      </div>

      {review.title ? <p className="mt-4 text-sm font-extrabold leading-6">{review.title}</p> : null}

      {body ? (
        <div className="mt-2">
          <p className="text-xs leading-6 text-[#4e4a44]">{long && !expanded ? preview : body}</p>
          {long ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} the full review by ${author}`}
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--orange)] transition hover:text-[var(--ink)]"
            >
              {expanded ? "Show less" : "Read full review"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[#8d887f]">No written body on this review.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e0d8] pt-4">
        <p className="text-[11px] text-[#8d887f]">
          {timeAgo(review.created_at)} · {helpful} found this helpful
          {review.featured ? " · pinned to the top" : ""}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {review.status !== "approved" ? (
            <button
              type="button"
              onClick={() => onStatus("approved")}
              disabled={isBusy("approve")}
              className={`${ACTION_BUTTON_CLASS} border-[#2c7a3f] text-[#2c7a3f] hover:bg-[#2c7a3f] hover:text-white`}
            >
              {actionIcon(isBusy("approve"), <Check className="h-3.5 w-3.5" />)}
              Approve
            </button>
          ) : null}

          {review.status !== "rejected" ? (
            <button
              type="button"
              onClick={() => onStatus("rejected")}
              disabled={isBusy("reject")}
              className={`${ACTION_BUTTON_CLASS} border-[#a5372a] text-[#a5372a] hover:bg-[#a5372a] hover:text-white`}
            >
              {actionIcon(isBusy("reject"), <X className="h-3.5 w-3.5" />)}
              Reject
            </button>
          ) : null}

          {review.status !== "pending" ? (
            <button
              type="button"
              onClick={() => onStatus("pending")}
              disabled={isBusy("pending")}
              className={ACTION_BUTTON_CLASS}
            >
              {actionIcon(isBusy("pending"), <Undo2 className="h-3.5 w-3.5" />)}
              Back to pending
            </button>
          ) : null}

          <button
            type="button"
            onClick={onFeature}
            disabled={isBusy("feature")}
            aria-pressed={review.featured}
            className={review.featured ? `${ACTION_BUTTON_CLASS} border-[var(--orange)] text-[var(--orange)]` : ACTION_BUTTON_CLASS}
          >
            {actionIcon(
              isBusy("feature"),
              review.featured ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />
            )}
            {review.featured ? "Unfeature" : "Feature"}
          </button>

          <button
            type="button"
            onClick={onHelpful}
            disabled={isBusy("helpful")}
            className={ACTION_BUTTON_CLASS}
          >
            {actionIcon(isBusy("helpful"), <ThumbsUp className="h-3.5 w-3.5" />)}
            Helpful {helpful}
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy("delete")}
            className="flex h-9 w-9 items-center justify-center border border-[#d8d3ca] text-[#a5372a] transition hover:border-[#a5372a] hover:bg-[#a5372a] hover:text-white disabled:opacity-60"
            aria-label={`Delete the review by ${author}`}
          >
            {isBusy("delete") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}
