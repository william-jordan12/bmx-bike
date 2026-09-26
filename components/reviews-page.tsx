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
import bmxBikes from "@/data/bmx_bikes.json";
import { DEFAULT_SITE_SETTINGS, isSocialLink, type SiteSettings } from "@/lib/site-settings";
import type { BmxBike } from "@/lib/types";

const fallbackProducts = bmxBikes as BmxBike[];

const createPriceFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD"
  });

type RatingKey = "1" | "2" | "3" | "4" | "5";

type CatalogProduct = BmxBike & { slug?: string };

type ProductsResponse = {
  ok?: boolean;
  products?: CatalogProduct[] | null;
  error?: unknown;
};

const RATING_KEYS: RatingKey[] = ["5", "4", "3", "2", "1"];
const RATING_VALUES = [1, 2, 3, 4, 5];
const BAND_BY_STAR: Record<number, RatingKey> = { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5" };

const clampRating = (value: unknown): number => {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(5, parsed));
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
  const [products, setProducts] = useState<CatalogProduct[]>(fallbackProducts);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);

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
    void (async () => {
      let active = true;
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as ProductsResponse | null;
        if (!active) return;
        if (!response.ok || !payload || payload.ok !== true) {
          setLoadError("Live catalog unavailable, so these are our seeded catalog ratings.");
          return;
        }
        if (Array.isArray(payload.products) && payload.products.length > 0) setProducts(payload.products);
      } catch {
        if (!active) return;
        setLoadError("Network error, so these are our seeded catalog ratings.");
      }

      return () => {
        active = false;
      };
    })();
  }, [attempt]);

  const formatPrice = useMemo(() => {
    const formatter = createPriceFormatter(siteSettings.currency);
    return (price: number) => formatter.format(price);
  }, [siteSettings.currency]);

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

  const totals = useMemo(() => {
    const distribution: Record<RatingKey, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    let ratingTotal = 0;
    let weighted = 0;
    for (const product of products) {
      const count = Math.max(0, Math.trunc(product.reviewCount));
      const rating = clampRating(product.rating);
      ratingTotal += count;
      weighted += rating * count;
      if (count === 0) continue;
      distribution[BAND_BY_STAR[rating === 0 ? 1 : rating]] += count;
    }
    return { ratingTotal, average: ratingTotal > 0 ? weighted / ratingTotal : 0, distribution };
  }, [products]);

  const withReviews = useMemo(
    () =>
      products
        .filter((product) => product.reviewCount > 0)
        .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating || a.name.localeCompare(b.name)),
    [products]
  );

  const rankedProducts = useMemo(
    () => [...products].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name)),
    [products]
  );

  const hasRatings = totals.ratingTotal > 0;

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
            <Link href="/#catalog" className="flex h-11 items-center text-xs font-extrabold uppercase tracking-[0.1em] text-[#282725] transition hover:text-[var(--orange)]">
              Complete BMX Bikes
            </Link>
            <Link href="/reviews" aria-current="page" className="flex h-11 items-center text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--orange)]">
              Reviews
            </Link>
            <span className="h-4 w-px bg-[#e0dcd4]" />
            <span className="text-[10px] font-semibold text-[#96918a]">Rider feedback</span>
          </nav>
          <Link
            href="/#catalog"
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
                Star ratings straight from our catalog, plus written reviews from riders once our crew approves them. No paid
                placements, no invented quotes.
              </p>
              <div className="mt-10 flex flex-wrap items-end gap-8 border-t border-[#3d3a36] pt-6">
                <div>
                  <p className="font-display text-5xl leading-none text-white">{hasRatings ? totals.average.toFixed(1) : "—"}</p>
                  <div className="mt-2">{hasRatings ? <StarRow rating={totals.average} size="md" /> : null}</div>
                  <p className="eyebrow mt-2 text-[#8d8981]">Overall rider rating</p>
                </div>
                <div>
                  <p className="font-display text-5xl leading-none text-white">{totals.ratingTotal}</p>
                  <p className="eyebrow mt-2 text-[#8d8981]">Catalog star ratings</p>
                </div>
                <div>
                  <p className="font-display text-5xl leading-none text-white">{products.length}</p>
                  <p className="eyebrow mt-2 text-[#8d8981]">Bikes rated</p>
                </div>
              </div>
              <p className="mt-6 max-w-lg text-[11px] leading-5 text-[#77736c]">
                Weighted across every catalog star rating on {plural(products.length, "bike")}. Written customer reviews are
                listed further down this page.
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
                How the {totals.ratingTotal} catalog star ratings land across the five bands, grouped by each bike&apos;s
                average.
              </p>
            </div>
            <div>
              <DistributionList distribution={totals.distribution} total={totals.ratingTotal} />
              <p className="mt-4 text-[11px] leading-5 text-[#96918a]">
                Bands come from catalog averages, not from individual written reviews. Per-bike distributions appear in quick
                view.
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
                href="/#catalog"
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
              {withReviews.length
                ? `${plural(withReviews.length, "bike")} carry written rider reviews. Open one to read the full text.`
                : "Written reviews land here as soon as customers submit them."}
            </p>
          </div>

          <div className="flex items-start gap-3 border border-[#e0dcd4] bg-[#f7f5f0] p-4 sm:p-5">
            <Star className="mt-0.5 h-5 w-5 shrink-0 text-[var(--orange)]" strokeWidth={1.8} />
            <div>
              <p className="text-sm font-bold text-[#494641]">
                Written reviews appear here once customers submit them and they are approved. Star ratings below are from our
                catalog.
              </p>
              {withReviews.length === 0 ? (
                <p className="mt-2 text-xs leading-5 text-[#77726b]">
                  No bike has an approved written review yet, so this page is showing catalog star ratings only. Be the first
                  rider to write one from a bike&apos;s quick view.
                </p>
              ) : null}
            </div>
          </div>

          {withReviews.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {withReviews.map((product) => (
                <article key={product.slug || product.id} className="product-card flex flex-col justify-between border border-[#dedad2] bg-white p-5">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="eyebrow text-[#8d887f]">{product.brand}</p>
                        <h3 className="mt-1.5 text-[15px] font-bold leading-snug text-[#1d1c1a]">{product.name}</h3>
                      </div>
                      <span className="shrink-0 text-lg font-extrabold tracking-tight text-[#1d1c1a]">
                        {product.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <StarRow rating={product.rating} size="md" />
                      <span className="text-[11px] font-semibold text-[#96918a]">{plural(product.reviewCount, "rating")}</span>
                    </div>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#e4e0d8] pt-4">
                    <span className="text-base font-extrabold tracking-tight text-[#1d1c1a]">{formatPrice(product.price)}</span>
                    <Link
                      href="/#catalog"
                      aria-label={`Read reviews for ${product.name}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#494641] transition hover:text-[var(--orange)]"
                    >
                      Read reviews <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {loadError ? (
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
          ) : null}
        </section>

        <section className="border-y border-[#dedad2] bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-12 sm:py-16 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-[#dedad2] pb-7 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow text-[var(--orange)]">Every bike, rated</p>
                <h2 className="font-display mt-2 text-4xl leading-[0.9] text-[#1d1c1a] sm:text-5xl">
                  THE FULL RANGE<span className="text-[var(--orange)]">.</span>
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#77726b]">
                <span className="flex h-2 w-2 rounded-full bg-[var(--orange)]" />
                {loading ? "Refreshing ratings from the catalog…" : `Catalog star ratings for ${plural(products.length, "bike")}`}
              </div>
            </div>

            {rankedProducts.length ? (
              <ul className="divide-y divide-[#e4e0d8] border-y border-[#e4e0d8]">
                {rankedProducts.map((product, index) => (
                  <li key={product.slug || product.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-4">
                    <span className="eyebrow w-7 shrink-0 text-[#b2ada4]">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-[180px] flex-1">
                      <p className="eyebrow text-[#8d887f]">{product.brand}</p>
                      <p className="mt-1 text-sm font-bold leading-snug text-[#1d1c1a]">{product.name}</p>
                    </div>
                    <StarRow rating={product.rating} />
                    <span className="w-10 text-sm font-extrabold text-[#1d1c1a]">{product.rating.toFixed(1)}</span>
                    <span className="w-24 text-[11px] font-semibold text-[#96918a]">
                      {product.reviewCount > 0 ? plural(product.reviewCount, "rating") : "No ratings yet"}
                    </span>
                    <span className="w-24 text-right text-sm font-bold text-[#3c3935]">{formatPrice(product.price)}</span>
                    <Link
                      href="/#catalog"
                      aria-label={`View ${product.name} in the catalog`}
                      className="inline-flex w-24 items-center justify-end gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#69645d] transition hover:text-[var(--orange)]"
                    >
                      Shop <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center border border-dashed border-[#cfc9bf] bg-[#fffdf8] px-6 text-center">
                <Star className="h-8 w-8 text-[var(--orange)]" strokeWidth={1.6} />
                <h3 className="mt-4 text-lg font-bold text-[#1d1c1a]">The catalog is empty right now.</h3>
                <p className="mt-2 max-w-sm text-sm text-[#77726b]">
                  No bikes have loaded, so there is nothing to rate yet. Check back in a minute or head to the shop.
                </p>
              </div>
            )}
          </div>
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
              href="/#catalog"
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
                <Link href="/#catalog" className="block transition hover:text-white">Complete BMX bikes</Link>
                <Link href="/#catalog" className="block transition hover:text-white">BMX parts</Link>
                <Link href="/#catalog" className="block transition hover:text-white">Clothing & softgoods</Link>
                <Link href="/#catalog" className="block transition hover:text-white">Brands we stock</Link>
              </div>
            </div>
            <div>
              <p className="eyebrow mb-4 text-[#ff7950]">Help</p>
              <div className="space-y-3 text-sm text-[#aaa59d]">
                <a href={`mailto:${siteSettings.contactEmail}`} className="block transition hover:text-white">Contact the crew</a>
                <Link href="/#catalog" className="block transition hover:text-white">Delivery information</Link>
                <Link href="/#catalog" className="block transition hover:text-white">Returns</Link>
                <Link href="/#catalog" className="block transition hover:text-white">Bike finder</Link>
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
