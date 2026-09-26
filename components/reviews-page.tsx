"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck
} from "lucide-react";
import { DEFAULT_SITE_SETTINGS, isSocialLink, type SiteSettings } from "@/lib/site-settings";

const REVIEWS_ENDPOINT = "/api/reviews";
const CATALOG_HREF = "/#catalog";

type RatingKey = "1" | "2" | "3" | "4" | "5";

type ListedReview = {
  id: string;
  productSlug: string;
  productName: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  helpful: number;
  createdAt: string;
};

type SummaryPayload = {
  average?: number;
  count?: number;
  distribution?: Partial<Record<RatingKey, number>>;
};

type ReviewsResponse = {
  summary?: SummaryPayload | null;
  reviews?: unknown;
  error?: unknown;
};

const RATING_KEYS: RatingKey[] = ["5", "4", "3", "2", "1"];
const RATING_VALUES = [1, 2, 3, 4, 5];

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

const normalizeDistribution = (
  value: Partial<Record<RatingKey, number>> | null | undefined
): Record<RatingKey, number> => {
  const base = emptyDistribution();
  if (!value || typeof value !== "object") return base;
  for (const key of RATING_KEYS) {
    const parsed = Math.round(Number(value[key]));
    if (Number.isFinite(parsed) && parsed > 0) base[key] = parsed;
  }
  return base;
};

const toListedReview = (value: unknown): ListedReview | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = toText(raw.id);
  const title = toText(raw.title);
  const body = toText(raw.body);
  if (!id || !title || !body) return null;
  const created = toText(raw.createdAt);
  const parsedDate = created ? new Date(created) : null;
  const createdAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date(0).toISOString();
  return {
    id,
    productSlug: toText(raw.productSlug),
    productName: toText(raw.productName) || "Retired bike",
    author: toText(raw.author) || "Rider",
    rating: clampRating(raw.rating) || 5,
    title,
    body,
    verified: raw.verified === true,
    helpful: Math.max(0, Math.trunc(Number(raw.helpful)) || 0),
    createdAt
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
    <ul className="space-y-2.5">
      {RATING_KEYS.map((key) => {
        const count = distribution[key];
        const percent = total > 0 ? Math.min(100, (count / total) * 100) : 0;
        return (
          <li key={key} className="flex items-center gap-3">
            <span className="flex w-9 shrink-0 items-center gap-1 text-[11px] font-bold text-[#5d5952]">
              {key}
              <Star className="h-3 w-3 fill-[var(--orange)] text-[var(--orange)]" strokeWidth={1.6} />
            </span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e5e0d8]">
              <span className="block h-full rounded-full bg-[var(--orange)] transition-all duration-300" style={{ width: `${percent}%` }} />
            </span>
            <span className="w-8 shrink-0 text-right text-[11px] font-semibold text-[#96918a]">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ReviewsPage() {
  const [summary, setSummary] = useState<{ average: number; count: number; distribution: Record<RatingKey, number> } | null>(null);
  const [reviews, setReviews] = useState<ListedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    let active = true;
    fetch("/api/site-settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { settings?: SiteSettings } | null) => {
        if (active && data?.settings) setSiteSettings(data.settings);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(REVIEWS_ENDPOINT, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as ReviewsResponse | null;
        if (!active) return;
        if (!response.ok || !payload) {
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
          ? payload.reviews.map(toListedReview).filter((review): review is ListedReview => review !== null)
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
    })();

    return () => {
      active = false;
    };
  }, [attempt]);

  const socialLinks = useMemo(
    () =>
      [
        { key: "instagram", label: "Instagram", short: "ig" },
        { key: "tiktok", label: "TikTok", short: "tk" },
        { key: "facebook", label: "Facebook", short: "fb" },
        { key: "youtube", label: "YouTube", short: "yt" }
      ]
        .map((social) => ({ ...social, href: siteSettings[social.key as keyof SiteSettings] }))
        .filter((social) => isSocialLink(social.href)),
    [siteSettings]
  );

  const bikesReviewed = useMemo(() => {
    const slugs = new Set<string>();
    for (const review of reviews) {
      if (review.productSlug) slugs.add(review.productSlug);
    }
    return slugs.size;
  }, [reviews]);

  const total = summary ? summary.count : reviews.length;
  const average = summary ? summary.average : 0;
  const hasRatings = total > 0;

  return (
    <>
      <div className="bg-[#151515] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] lg:px-8">
          <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
            <span className="text-[#ff7950]">Free delivery over $99</span>
            <span className="hidden text-[#8d8a84] sm:inline">100-day returns</span>
            <span className="hidden text-[#8d8a84] md:inline">Rider-owned support</span>
          </div>
          <a href={`mailto:${siteSettings.contactEmail}`} className="shrink-0 text-[#c7c3bc] transition hover:text-white">
            Support
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-[#dedad2] bg-[#fffdf8]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-4 lg:px-8">
          <Link
            href="/"
            className="shrink-0 font-display text-[27px] leading-none tracking-[-0.04em] text-[#151515] sm:text-[31px]"
          >
            RIDE<span className="text-[var(--orange)]">{"//"}</span>BMX
          </Link>
          <nav className="ml-auto hidden items-center gap-7 lg:flex">
            <Link href={CATALOG_HREF} className="flex h-11 items-center text-xs font-extrabold uppercase tracking-[0.1em] text-[#282725] transition hover:text-[var(--orange)]">
              Complete BMX Bikes
            </Link>
            <Link href="/reviews" aria-current="page" className="flex h-11 items-center text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--orange)]">
              Reviews
            </Link>
            <span className="h-4 w-px bg-[#e0dcd4]" />
            <span className="text-[10px] font-semibold text-[#96918a]">Rider feedback</span>
          </nav>
          <Link
            href={CATALOG_HREF}
            className="ml-auto inline-flex items-center gap-2 bg-[var(--orange)] px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#151515] lg:ml-0"
          >
            Shop bikes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-[#151515] text-white">
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="hero-glow pointer-events-none absolute -right-20 top-[-100px] h-[520px] w-[520px] rounded-full" />
          <div className="relative mx-auto max-w-[1440px] px-5 py-14 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <div className="mb-7 flex items-center gap-3">
                <span className="h-px w-10 bg-[var(--orange)]" />
                <span className="eyebrow text-[#ff7950]">Rider feedback / honest numbers</span>
              </div>
              <h1 className="font-display text-[clamp(2.9rem,8vw,6.2rem)] leading-[0.86] tracking-[-0.045em]">
                Customer reviews<span className="text-[var(--orange)]">.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#c4c0b9]">
                Every number on this page belongs to a review a customer actually wrote about a bike they ride. No catalog
                averages, no invented quotes, nothing edited to flatter a bike.
              </p>
              <div className="mt-10 flex flex-wrap items-end gap-8 border-t border-[#3d3a36] pt-6">
                <div>
                  <p className="font-display text-5xl leading-none text-white">{hasRatings ? average.toFixed(1) : "—"}</p>
                  <div className="mt-2">{hasRatings ? <StarRow rating={average} size="md" /> : null}</div>
                  <p className="eyebrow mt-2 text-[#8d8981]">Average rider rating</p>
                </div>
                <div>
                  <p className="font-display text-5xl leading-none text-white">{total}</p>
                  <p className="eyebrow mt-2 text-[#8d8981]">{total === 1 ? "Written review" : "Written reviews"}</p>
                </div>
                <div>
                  <p className="font-display text-5xl leading-none text-white">{bikesReviewed}</p>
                  <p className="eyebrow mt-2 text-[#8d8981]">{bikesReviewed === 1 ? "Bike reviewed" : "Bikes reviewed"}</p>
                </div>
              </div>
              <p className="mt-6 max-w-lg text-[11px] leading-5 text-[#77736c]">
                {hasRatings
                  ? `Averaged across ${plural(total, "approved review")} covering ${plural(bikesReviewed, "bike")}, newest first.`
                  : "No approved written reviews yet. The first one lands here the moment our crew approves it."}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-[#dedad2] bg-white">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[230px_minmax(0,1fr)_minmax(0,0.9fr)] lg:px-8">
            <div>
              <p className="eyebrow text-[var(--orange)]">Rating spread</p>
              <h2 className="font-display mt-2 text-4xl leading-[0.9] text-[#1d1c1a] sm:text-5xl">
                STAR BANDS<span className="text-[var(--orange)]">.</span>
              </h2>
              <p className="mt-4 max-w-xs text-sm leading-6 text-[#77726b]">
                How the most recent written reviews land across the five bands, counted one review at a time.
              </p>
            </div>
            <div>
              <DistributionList distribution={summary ? summary.distribution : emptyDistribution()} total={total} />
              <p className="mt-4 text-[11px] leading-5 text-[#96918a]">
                {hasRatings
                  ? `Every bar is one written review, so the bands add up to ${plural(total, "review")}.`
                  : "The bands stay empty until customers write their first review."}
              </p>
            </div>
            <div className="flex flex-col justify-center border border-[#e0dcd4] bg-[#f7f5f0] p-5 sm:p-6">
              <ShieldCheck className="h-6 w-6 text-[var(--orange)]" strokeWidth={1.8} />
              <h3 className="mt-4 text-lg font-bold text-[#1d1c1a]">How reviews get published</h3>
              <p className="mt-2 text-sm leading-6 text-[#5d5952]">
                Every written review is read by a real member of the crew before it goes live. Verified riders get a badge, and
                nothing gets edited to flatter a bike.
              </p>
              <Link
                href={CATALOG_HREF}
                className="mt-5 inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#494641] transition hover:text-[var(--orange)]"
              >
                Open a bike to review it <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-12 sm:py-16 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 border-b border-[#dedad2] pb-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow text-[var(--orange)]">Written reviews</p>
              <h2 className="font-display mt-2 text-4xl leading-[0.9] text-[#1d1c1a] sm:text-5xl">
                WHAT RIDERS SAY<span className="text-[var(--orange)]">.</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#77726b]">
              {hasRatings
                ? `${plural(total, "written review")}, newest first. Each one links back to the bike it was written about.`
                : "Written reviews land here as soon as customers submit them and the crew approves them."}
            </p>
          </div>

          {loading ? (
            <div className="mt-6 space-y-4" aria-busy="true" role="status">
              <span className="sr-only">Loading written reviews...</span>
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="border border-[#dedad2] bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="block h-11 w-11 shrink-0 animate-pulse bg-[#e5e0d8]" />
                    <div className="flex-1 space-y-2">
                      <span className="block h-3 w-40 animate-pulse bg-[#ece8e1]" />
                      <span className="block h-2.5 w-24 animate-pulse bg-[#ece8e1]" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <span className="block h-2.5 w-full animate-pulse bg-[#f0ece5]" />
                    <span className="block h-2.5 w-11/12 animate-pulse bg-[#f0ece5]" />
                    <span className="block h-2.5 w-8/12 animate-pulse bg-[#f0ece5]" />
                  </div>
                </div>
              ))}
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#96918a]" aria-hidden="true">
                Loading written reviews...
              </p>
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="mt-6 flex flex-col gap-3 border border-[#e0dcd4] bg-[#f7f5f0] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
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
          ) : reviews.length ? (
            <ul className="mt-6 divide-y divide-[#e4e0d8] border-y border-[#e4e0d8]">
              {reviews.map((review) => (
                <li key={review.id} className="bg-white py-6">
                  <article className="flex items-start gap-4">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center bg-[var(--ink)] text-sm font-extrabold uppercase text-white"
                      aria-hidden="true"
                    >
                      {(review.author.trim().charAt(0) || "?").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span className="text-sm font-bold text-[#1d1c1a]">{review.author}</span>
                        {review.verified ? (
                          <span className="flex items-center gap-1 border border-[#d8d3ca] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#4e8a57]">
                            <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                            Verified rider
                          </span>
                        ) : null}
                        <time dateTime={review.createdAt} className="ml-auto text-[11px] font-semibold text-[#96918a]">
                          {timeAgo(review.createdAt)}
                        </time>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <StarRow rating={review.rating} size="md" />
                        <span className="text-[11px] font-semibold text-[#96918a]">{review.rating} out of 5</span>
                      </div>
                      <h3 className="mt-3 text-[15px] font-bold leading-snug text-[#1d1c1a]">{review.title}</h3>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-7 text-[#5d5952]">{review.body}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#ece8e1] pt-3">
                        <Link
                          href={CATALOG_HREF}
                          aria-label={`View ${review.productName} in the catalog`}
                          className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#494641] transition hover:text-[var(--orange)]"
                        >
                          {review.productName}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                        {review.helpful > 0 ? (
                          <span className="text-[11px] font-semibold text-[#96918a]">
                            {plural(review.helpful, "rider")} found this helpful
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center border border-dashed border-[#cfc9bf] bg-white px-6 py-14 text-center">
              <Star className="h-8 w-8 text-[var(--orange)]" strokeWidth={1.6} />
              <h3 className="mt-4 text-lg font-bold text-[#1d1c1a]">No written reviews yet.</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#77726b]">
                Reviews appear here once customers write them and our crew approves them, so this page starts empty on purpose
                rather than filling up with numbers nobody wrote. Be the first rider to say something honest about your bike.
              </p>
              <Link
                href={CATALOG_HREF}
                className="mt-6 inline-flex items-center gap-2 bg-[var(--orange)] px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#151515]"
              >
                Pick a bike <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        <section className="bg-[#e9e5dc]">
          <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 px-5 py-12 sm:flex-row sm:items-center lg:px-8 lg:py-16">
            <div>
              <p className="eyebrow text-[var(--orange)]">Your turn</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1d1c1a] sm:text-3xl">Rode it? Say something honest.</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#625e57]">
                Open any bike in quick view, hit Write a review, and our crew will check it before it goes live.
              </p>
            </div>
            <Link
              href={CATALOG_HREF}
              className="inline-flex shrink-0 items-center gap-2 bg-[var(--orange)] px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#151515]"
            >
              Pick a bike <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="border-y border-[#dedad2] bg-white">
          <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#dedad2] lg:grid-cols-4">
            {[
              [Truck, "Free delivery", "On orders over $99"],
              [ShieldCheck, "Price match", "Found it cheaper? We’ll match it"],
              [RotateCcw, "100-day returns", "Ride it. Make sure it fits."],
              [Headphones, "Rider support", "Real advice from real riders"]
            ].map(([Icon, title, description]) => {
              const TrustIcon = Icon as typeof Truck;
              return (
                <div key={title as string} className="flex gap-3 px-4 py-6 sm:px-6 lg:px-8">
                  <TrustIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--orange)]" strokeWidth={1.8} />
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1d1c1a]">{title as string}</p>
                    <p className="mt-1 text-xs leading-5 text-[#858078]">{description as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="bg-[#151515] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="font-display text-3xl text-white">
                RIDE<span className="text-[var(--orange)]">{"//"}</span>BMX
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-6 text-[#96918a]">The complete BMX edit for riders who keep moving.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center border border-[#3c3934] text-xs font-bold uppercase transition hover:border-[var(--orange)] hover:text-[var(--orange)]"
                  >
                    {social.short}
                  </a>
                ))}
                <a
                  href={`mailto:${siteSettings.contactEmail}`}
                  aria-label="Email"
                  className="flex h-9 w-9 items-center justify-center border border-[#3c3934] text-xs font-bold transition hover:border-[var(--orange)] hover:text-[var(--orange)]"
                >
                  @
                </a>
              </div>
            </div>
            <div>
              <p className="eyebrow mb-4 text-[#ff7950]">Shop</p>
              <div className="space-y-3 text-sm text-[#aaa59d]">
                <Link href={CATALOG_HREF} className="block transition hover:text-white">Complete BMX bikes</Link>
                <Link href={CATALOG_HREF} className="block transition hover:text-white">BMX parts</Link>
                <Link href={CATALOG_HREF} className="block transition hover:text-white">Clothing & softgoods</Link>
                <Link href={CATALOG_HREF} className="block transition hover:text-white">Brands we stock</Link>
              </div>
            </div>
            <div>
              <p className="eyebrow mb-4 text-[#ff7950]">Help</p>
              <div className="space-y-3 text-sm text-[#aaa59d]">
                <a href={`mailto:${siteSettings.contactEmail}`} className="block transition hover:text-white">Contact the crew</a>
                <Link href={CATALOG_HREF} className="block transition hover:text-white">Delivery information</Link>
                <Link href={CATALOG_HREF} className="block transition hover:text-white">Returns</Link>
                <Link href={CATALOG_HREF} className="block transition hover:text-white">Bike finder</Link>
              </div>
            </div>
            <div>
              <p className="eyebrow mb-4 text-[#ff7950]">Come say hi</p>
              <p className="flex items-start gap-2 text-sm leading-6 text-[#aaa59d]">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--orange)]" />
                <span>{siteSettings.address}</span>
              </p>
              <div className="mt-3 space-y-2 text-sm text-[#aaa59d]">
                <a href={`mailto:${siteSettings.contactEmail}`} className="flex items-center gap-2 transition hover:text-white">
                  <Mail className="h-4 w-4 text-[var(--orange)]" /> {siteSettings.contactEmail}
                </a>
                {siteSettings.phone ? (
                  <a href={`tel:${siteSettings.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 transition hover:text-white">
                    <Phone className="h-4 w-4 text-[var(--orange)]" /> {siteSettings.phone}
                  </a>
                ) : null}
                {siteSettings.whatsapp ? (
                  <a
                    href={`https://wa.me/${siteSettings.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 transition hover:text-white"
                  >
                    <MessageCircle className="h-4 w-4 text-[var(--orange)]" /> WhatsApp orders
                  </a>
                ) : null}
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-white">
                <Headphones className="h-4 w-4 text-[var(--orange)]" /> Mon–Fri, 9–5
              </p>
            </div>
          </div>
          <div className="mt-12 flex flex-col justify-between gap-3 border-t border-[#34312d] pt-5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#77736c] sm:flex-row">
            <span>© 2026 RIDE{"//"}BMX</span>
            <span>Made for the next line · All rights reserved</span>
          </div>
        </div>
      </footer>
    </>
  );
}
