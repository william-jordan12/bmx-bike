"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bike,
  ChevronRight,
  Headphones,
  LayoutGrid,
  MapPin,
  Package,
  RotateCcw,
  Search,
  Shirt,
  ShoppingBag,
  Sparkles,
  Tags,
  Truck,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DEFAULT_SITE_SETTINGS, isSocialLink } from "@/lib/site-settings";

const createPriceFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD"
  });

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  product_count: number;
};

type GroupId = "bikes" | "gear" | "more";

type LoadStatus = "loading" | "ready" | "error";

type Department = {
  key: string;
  name: string;
  description: string;
  countLabel: string;
  comingSoon: boolean;
  href: string;
  icon: LucideIcon;
  panelClass: string;
  iconClass: string;
};

type Group = {
  id: GroupId;
  departments: Department[];
};

type GroupMeta = {
  title: string;
  eyebrow: string;
  blurb: string;
  panelClass: string;
  countUnit: string;
};

type NavLink = {
  label: string;
  sublabel: string;
  href: string;
};

const CATEGORY_LINK_BASE = "/#catalog?category=";
const FREE_SHIPPING_TARGET = 99.99;

const BIKE_DEPARTMENTS = ["freestyle", "race", "cruiser", "kids"];
const GEAR_DEPARTMENTS = ["accessories", "clothing", "parts", "brands"];
const GROUP_ORDER: GroupId[] = ["bikes", "gear", "more"];

const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  freestyle: Bike,
  race: Bike,
  cruiser: Bike,
  kids: Bike,
  accessories: Package,
  clothing: Shirt,
  parts: Wrench,
  brands: Tags
};

const GROUP_META: Record<GroupId, GroupMeta> = {
  bikes: {
    title: "Complete bikes",
    eyebrow: "01 / complete bikes",
    blurb: "Pick the discipline and the catalog opens pre-filtered. Street, park, race or a first bike that finally fits.",
    panelClass: "bg-[#e9e5dc]",
    countUnit: "bike"
  },
  gear: {
    title: "Parts, apparel & brands",
    eyebrow: "02 / parts, apparel & brands",
    blurb: "The parts that change how a bike feels, the gear you ride in, and the brands we are proud to stock.",
    panelClass: "bg-[#f0ece5]",
    countUnit: "product"
  },
  more: {
    title: "More",
    eyebrow: "03 / more from the range",
    blurb: "New departments land here as the crew adds them. Nothing gets hidden, nothing gets dropped.",
    panelClass: "bg-[#e4e0d8]",
    countUnit: "product"
  }
};

const DEPARTMENT_NAME_STYLE: CSSProperties = {
  fontSize: "2.25rem",
  letterSpacing: "0.03em",
  lineHeight: 1
};

const NAV_LINKS: readonly NavLink[] = [
  { label: "Complete bikes", sublabel: "Street, park, race", href: "/collections/bmx-bikes" },
  { label: "Parts", sublabel: "Precision upgrades", href: `${CATEGORY_LINK_BASE}${encodeURIComponent("Parts")}` },
  { label: "Clothing", sublabel: "Ride in comfort", href: `${CATEGORY_LINK_BASE}${encodeURIComponent("Clothing")}` },
  { label: "Accessories", sublabel: "Finish the setup", href: `${CATEGORY_LINK_BASE}${encodeURIComponent("Accessories")}` },
  { label: "Brands", sublabel: "Meet the crew", href: `${CATEGORY_LINK_BASE}${encodeURIComponent("Brands")}` },
  { label: "Outlet / Sale", sublabel: "Good deals", href: "/#catalog" }
];

const SOCIAL_LINKS = [
  { key: "instagram", label: "Instagram", short: "ig" },
  { key: "tiktok", label: "TikTok", short: "tk" },
  { key: "facebook", label: "Facebook", short: "fb" },
  { key: "youtube", label: "YouTube", short: "yt" }
] as const;

const readErrorMessage = (payload: unknown) => {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  }
  return "The department list could not be loaded. Try again in a moment.";
};

const readCategories = (payload: unknown): Category[] => {
  if (typeof payload !== "object" || payload === null) return [];
  const record = payload as Record<string, unknown>;
  const list = record.categories;
  if (!Array.isArray(list)) return [];

  const categories: Category[] = [];
  for (const entry of list) {
    if (typeof entry !== "object" || entry === null) continue;
    const item = entry as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) continue;
    const count = typeof item.product_count === "number" && Number.isFinite(item.product_count) ? Math.trunc(item.product_count) : 0;
    categories.push({
      id: typeof item.id === "string" && item.id ? item.id : name,
      slug: typeof item.slug === "string" && item.slug ? item.slug : name,
      name,
      description: typeof item.description === "string" ? item.description.trim() : "",
      product_count: count > 0 ? count : 0
    });
  }
  return categories;
};

const buildCountLabel = (count: number, unit: string) => {
  if (count === 0) return `0 ${unit}s yet`;
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
};

const buildDepartment = (category: Category, groupId: GroupId): Department => {
  const key = category.name.toLowerCase();
  const meta = GROUP_META[groupId];
  const comingSoon = category.product_count === 0;
  return {
    key: category.id,
    name: category.name,
    description: category.description || "The crew is still listing this one. Check back soon.",
    countLabel: buildCountLabel(category.product_count, meta.countUnit),
    comingSoon,
    href: `${CATEGORY_LINK_BASE}${encodeURIComponent(category.name)}`,
    icon: DEPARTMENT_ICONS[key] ?? LayoutGrid,
    panelClass: meta.panelClass,
    iconClass: comingSoon ? "text-[#b2ada4]" : groupId === "bikes" ? "text-[var(--orange)]" : "text-[#494641]"
  };
};

function DepartmentCard({ department }: { department: Department }) {
  const Icon = department.icon;

  return (
    <Link
      href={department.href}
      className={`group flex h-full flex-col border transition hover:-translate-y-1 hover:border-[#bdb8ae] hover:shadow-[0_18px_40px_rgba(21,21,21,0.09)] ${
        department.comingSoon ? "border-[#e4e0d8] bg-[#fbfaf7]" : "border-[#e0dcd4] bg-white"
      }`}
    >
      <div className={`relative flex aspect-[16/10] items-end overflow-hidden border-b border-[#e0dcd4] ${department.panelClass}`}>
        <span aria-hidden="true" className="eyebrow block w-full truncate px-4 pb-3 text-[#cbc5ba]" style={DEPARTMENT_NAME_STYLE}>
          {department.name}
        </span>
        <Icon className={`absolute right-4 top-4 h-7 w-7 ${department.iconClass}`} strokeWidth={1.5} />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold tracking-tight text-[#1d1c1a]">{department.name}</h3>
          {department.comingSoon ? (
            <span className="mt-1 shrink-0 border border-[#d8d3ca] bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#96918a]">
              Coming soon
            </span>
          ) : null}
        </div>
        <p className={`mt-2 mb-5 text-sm leading-6 ${department.comingSoon ? "text-[#96918a]" : "text-[#77726b]"}`}>{department.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#e4e0d8] pt-4">
          <span className="text-xs font-semibold text-[#77726b]">{department.countLabel}</span>
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#282725] transition group-hover:text-[var(--orange)]">
            {department.comingSoon ? "Preview" : "Shop"}<ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function DepartmentGroup({ group }: { group: Group }) {
  const meta = GROUP_META[group.id];
  if (!group.departments.length) return null;

  return (
    <section className="mt-14 first:mt-0">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dedad2] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-[#8d887f]">{meta.eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl leading-[0.95] tracking-tight text-[#1d1c1a] sm:text-4xl">
            {meta.title}
            <span className="text-[var(--orange)]">.</span>
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-[#77726b]">{meta.blurb}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {group.departments.map((department) => (
          <DepartmentCard key={department.key} department={department} />
        ))}
      </div>
    </section>
  );
}

function DepartmentSkeleton() {
  return (
    <div className="animate-pulse border border-[#e4e0d8] bg-white">
      <div className="aspect-[16/10] bg-[#e9e5dc]" />
      <div className="space-y-3 p-4 sm:p-5">
        <div className="h-5 w-2/3 bg-[#e9e5dc]" />
        <div className="h-3 w-full bg-[#f0ece5]" />
        <div className="h-3 w-4/5 bg-[#f0ece5]" />
        <div className="h-3 w-1/3 bg-[#f0ece5]" />
      </div>
    </div>
  );
}

function SiteHeader() {
  return (
    <>
      <div className="bg-[#151515] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] lg:px-8">
          <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
            <span className="text-[#ff7950]">Free delivery over $99</span>
            <span className="hidden text-[#8d8a84] sm:inline">100-day returns</span>
            <span className="hidden text-[#8d8a84] md:inline">Rider-owned support</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-1.5 text-[#c7c3bc] sm:flex">
              <MapPin className="h-3 w-3" /> USD / US
            </span>
            <a href="#support" className="text-[#c7c3bc] transition hover:text-white">Support</a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-[#dedad2] bg-[#fffdf8]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-4 lg:px-8">
          <Link href="/" className="shrink-0 font-display text-[27px] leading-none tracking-[-0.04em] text-[#151515] sm:text-[31px]">
            RIDE<span className="text-[var(--orange)]">{"//"}</span>BMX
          </Link>
          <Link
            href="/#catalog"
            className="ml-auto hidden h-11 w-full max-w-[460px] items-center gap-3 border border-[#d8d3ca] bg-[#f7f5f0] px-4 text-sm text-[#99948b] transition hover:border-[var(--orange)] md:flex"
          >
            <Search className="h-4 w-4" /> Search bikes, parts, brands...
          </Link>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link href="/#catalog" className="flex h-10 items-center gap-2 px-2 text-xs font-bold text-[#282725] transition hover:text-[var(--orange)]">
              <ShoppingBag className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Bag</span>
            </Link>
          </div>
        </div>

        <nav className="no-scrollbar flex gap-5 overflow-x-auto border-t border-[#e5e1d9] px-5 lg:hidden">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex h-11 shrink-0 items-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#615d56] transition hover:text-[var(--orange)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="hidden border-t border-[#e5e1d9] lg:block">
          <div className="mx-auto flex max-w-[1440px] items-center gap-7 px-8">
            <Link href="/shop" className="flex h-11 items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#282725]">
              Shop all<span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
            </Link>
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex h-11 items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#615d56] transition hover:text-[var(--orange)]"
              >
                {item.label}
                <span className="hidden text-[9px] font-normal normal-case tracking-normal text-[#aaa59c] xl:inline">{item.sublabel}</span>
              </Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}

function SiteFooter() {
  const settings = DEFAULT_SITE_SETTINGS;
  const socialLinks = SOCIAL_LINKS.map((social) => ({ ...social, href: settings[social.key] })).filter((social) => isSocialLink(social.href));

  return (
    <footer id="support" className="bg-[#151515] text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-display text-3xl">
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
                href={`mailto:${settings.contactEmail}`}
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
              <Link href="/shop" className="block transition hover:text-white">All departments</Link>
              <Link href="/collections/bmx-bikes" className="block transition hover:text-white">Complete BMX bikes</Link>
              <Link href={`${CATEGORY_LINK_BASE}${encodeURIComponent("Parts")}`} className="block transition hover:text-white">BMX parts</Link>
              <Link href={`${CATEGORY_LINK_BASE}${encodeURIComponent("Clothing")}`} className="block transition hover:text-white">Clothing &amp; softgoods</Link>
              <Link href={`${CATEGORY_LINK_BASE}${encodeURIComponent("Brands")}`} className="block transition hover:text-white">Brands we stock</Link>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-4 text-[#ff7950]">Help</p>
            <div className="space-y-3 text-sm text-[#aaa59d]">
              <a href={`mailto:${settings.contactEmail}`} className="block transition hover:text-white">Contact the crew</a>
              <a href="#support" className="block transition hover:text-white">Delivery information</a>
              <a href="#support" className="block transition hover:text-white">Returns</a>
              <a href="#support" className="block transition hover:text-white">Bike finder</a>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-4 text-[#ff7950]">Come say hi</p>
            <p className="flex items-start gap-2 text-sm leading-6 text-[#aaa59d]">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--orange)]" />
              <span>{settings.address}</span>
            </p>
            <div className="mt-3 space-y-2 text-sm text-[#aaa59d]">
              <a href={`mailto:${settings.contactEmail}`} className="flex items-center gap-2 transition hover:text-white">
                {settings.contactEmail}
              </a>
              {settings.phone ? (
                <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 transition hover:text-white">
                  {settings.phone}
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
  );
}

export default function ShopPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);

  const formatPrice = useMemo(() => {
    const formatter = createPriceFormatter(DEFAULT_SITE_SETTINGS.currency);
    return (price: number) => formatter.format(price);
  }, []);

  const retry = useCallback(() => {
    setStatus("loading");
    setErrorMessage("");
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const token = ++requestRef.current;

    fetch("/api/categories", { cache: "no-store" })
      .then((response) => response.json().then((body: unknown) => ({ ok: response.ok, body })))
      .then((result: { ok: boolean; body: unknown }) => {
        if (!active || requestRef.current !== token) return;
        if (!result.ok) {
          setCategories([]);
          setErrorMessage(readErrorMessage(result.body));
          setStatus("error");
          return;
        }
        setCategories(readCategories(result.body));
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active || requestRef.current !== token) return;
        setCategories([]);
        setErrorMessage(error instanceof Error && error.message ? error.message : "The department list could not be loaded.");
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const groups = useMemo<Group[]>(() => {
    const buckets: Record<GroupId, Department[]> = { bikes: [], gear: [], more: [] };
    for (const category of categories) {
      const key = category.name.toLowerCase();
      const groupId: GroupId = BIKE_DEPARTMENTS.includes(key) ? "bikes" : GEAR_DEPARTMENTS.includes(key) ? "gear" : "more";
      buckets[groupId].push(buildDepartment(category, groupId));
    }
    return GROUP_ORDER.map((groupId) => ({ id: groupId, departments: buckets[groupId] }));
  }, [categories]);

  const totals = useMemo(() => {
    let products = 0;
    for (const category of categories) products += category.product_count;
    return { departments: categories.length, products };
  }, [categories]);

  const departmentTotal = groups.reduce((total, group) => total + group.departments.length, 0);

  return (
    <>
      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden bg-[var(--ink)] text-white">
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="hero-glow pointer-events-none absolute -right-20 top-[-100px] h-[420px] w-[420px] rounded-full" />
          <div className="relative mx-auto max-w-[1440px] px-5 py-14 sm:py-16 lg:px-8 lg:py-20">
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-10 bg-[var(--orange)]" />
              <span className="eyebrow text-[#ff7950]">The department index / 2026</span>
            </div>
            <h1 className="font-display max-w-[720px] text-[clamp(3.2rem,8vw,6.5rem)] leading-[0.86] tracking-[-0.045em]">
              SHOP<span className="text-[var(--orange)]">.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#c4c0b9] sm:text-lg">
              Bikes, parts, and the gear in between. Pick a department and the catalog opens pre-filtered, ready to scroll.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-8 border-t border-[#3d3a36] pt-5">
              <div>
                <p className="font-display text-2xl">{status === "ready" ? totals.departments : "—"}</p>
                <p className="eyebrow mt-1 text-[#8d8981]">Departments</p>
              </div>
              <div>
                <p className="font-display text-2xl">{status === "ready" ? totals.products : "—"}</p>
                <p className="eyebrow mt-1 text-[#8d8981]">Products listed</p>
              </div>
              <div>
                <p className="font-display text-2xl">24h</p>
                <p className="eyebrow mt-1 text-[#8d8981]">Dispatch</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:py-16 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 border-b border-[#dedad2] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#96918a]">
                <Link href="/" className="transition hover:text-[var(--orange)]">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-[#494641]">Shop</span>
              </div>
              <p className="eyebrow text-[#8d887f]">Every department, one index</p>
            </div>
            <p className="text-xs font-semibold text-[#77726b]">
              {status === "ready" ? `${departmentTotal} department${departmentTotal === 1 ? "" : "s"} · ${totals.products} product${totals.products === 1 ? "" : "s"}` : "Loading the range"}
            </p>
          </div>

          {status === "loading" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <DepartmentSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {status === "error" ? (
            <div className="border border-[#e8c3b8] bg-[#fdf1ec] p-6 sm:p-8" role="alert">
              <p className="eyebrow text-[#a5372a]">Something went wrong</p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-[#1d1c1a]">We could not load the departments.</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#6b554a]">{errorMessage}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-5 inline-flex items-center gap-2 bg-[#151515] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--orange)]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          ) : null}

          {status === "ready" && departmentTotal === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center border border-dashed border-[#cfc9bf] bg-white px-6 text-center">
              <LayoutGrid className="h-8 w-8 text-[var(--orange)]" />
              <h2 className="mt-4 text-lg font-bold tracking-tight text-[#1d1c1a]">No departments are published yet.</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#77726b]">
                The crew is still building the index. The full catalog is open in the meantime.
              </p>
              <Link
                href="/#catalog"
                className="mt-5 inline-flex items-center gap-2 bg-[#151515] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--orange)]"
              >
                Browse everything<ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}

          {status === "ready" && departmentTotal > 0
            ? groups
                .filter((group) => group.departments.length > 0)
                .map((group) => <DepartmentGroup key={group.id} group={group} />)
            : null}
        </div>

        <section className="border-y border-[#dedad2] bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center lg:px-8">
            <div>
              <p className="eyebrow flex items-center gap-2 text-[var(--orange)]">
                <Sparkles className="h-3.5 w-3.5" /> Can’t decide?
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1d1c1a] sm:text-3xl">Take the lot, or read the bike guide first.</h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[#77726b]">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-[var(--orange)]" /> Free delivery over {formatPrice(FREE_SHIPPING_TARGET)}
                </span>
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-[var(--orange)]" /> 100-day returns
                </span>
                <span className="flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5 text-[var(--orange)]" /> Real riders on support
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/#catalog"
                className="inline-flex items-center gap-2 bg-[var(--orange)] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#151515]"
              >
                Browse everything<ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/collections/bmx-bikes"
                className="inline-flex items-center gap-2 border border-[#4a4742] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#282725] transition hover:border-[var(--orange)] hover:text-[var(--orange)]"
              >
                Complete bikes<ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
