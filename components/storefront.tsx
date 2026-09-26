"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Headphones,
  Heart,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  RotateCcw,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  UserRound,
  X
} from "lucide-react";
import bmxBikes from "@/data/bmx_bikes.json";
import {
  buildEmailUrl,
  buildPaymentRequestMessage,
  buildWhatsappUrl,
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  paymentDestination,
  type ContactChannel
} from "@/lib/payments";
import { DEFAULT_SITE_SETTINGS, isSocialLink, type SiteSettings } from "@/lib/site-settings";
import type { BmxBike } from "@/lib/types";
import ProductReviewSection from "@/components/product-review-section";

const fallbackProducts = bmxBikes as BmxBike[];

const createPriceFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD"
  });

const DEFAULT_CATEGORY_OPTIONS = [
  { label: "All products", value: "All" },
  { label: "Freestyle", value: "Freestyle" },
  { label: "Race", value: "Race" },
  { label: "Cruiser", value: "Cruiser" },
  { label: "Kids", value: "Kids" }
];

const CATEGORY_ORDER = [
  "Freestyle",
  "Race",
  "Cruiser",
  "Kids",
  "Parts",
  "Clothing",
  "Accessories",
  "Brands"
];

const BIKE_CATEGORIES = ["Freestyle", "Race", "Cruiser", "Kids"];
const GEAR_CATEGORIES = ["Parts", "Clothing", "Accessories", "Brands"];

const styleOptions = ["All styles", "Street", "Park", "Trails", "Big wheel"];
const wheelSizeOptions = ["All sizes", '12"', '16"', '18"', '20"', '22"', '24"', '26"', '29"'];
const topTubeOptions = ["All lengths", "Under 20\"", "20\"–20.5\"", "21\"+"];
const materialOptions = ["All materials", "Hi-Ten Steel", "Full Chromoly"];
const skillOptions = ["All levels", "Beginner", "Intermediate", "Pro"];
const brandOptions = [
  "All brands",
  "Sunday",
  "Kink",
  "Wethepeople",
  "Cult",
  "Fit Bike Co",
  "Subrosa",
  "Jet BMX",
  "Flybikes"
];

type CartItem = {
  productId: string;
  quantity: number;
  color: string;
  size: string;
};

type SortOption = "featured" | "price-low" | "price-high" | "rating" | "newest";

type FilterPanelProps = {
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  styleFilter: string;
  setStyleFilter: (value: string) => void;
  wheelSize: string;
  setWheelSize: (value: string) => void;
  topTubeFilter: string;
  setTopTubeFilter: (value: string) => void;
  frameMaterial: string;
  setFrameMaterial: (value: string) => void;
  skillLevel: string;
  setSkillLevel: (value: string) => void;
  brand: string;
  setBrand: (value: string) => void;
  priceMax: number;
  setPriceMax: (value: number) => void;
  categoryOptions?: ReadonlyArray<{ label: string; value: string }>;
  onClear: () => void;
};

function FilterPanel({
  activeCategory,
  setActiveCategory,
  styleFilter,
  setStyleFilter,
  wheelSize,
  setWheelSize,
  topTubeFilter,
  setTopTubeFilter,
  frameMaterial,
  setFrameMaterial,
  skillLevel,
  setSkillLevel,
  brand,
  setBrand,
  priceMax,
  setPriceMax,
  categoryOptions = DEFAULT_CATEGORY_OPTIONS,
  onClear
}: FilterPanelProps) {
  return (
    <div className="space-y-7">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow text-[#494641]">Riding style</p>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#96918a]">Shop by</span>
        </div>
        <div className="space-y-1">
          {categoryOptions.map((option) => {
            const active = activeCategory === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveCategory(option.value)}
                className={`flex w-full items-center justify-between border-b border-[#e4e0d8] py-2.5 text-left text-sm transition-colors ${
                  active ? "font-bold text-[var(--orange)]" : "text-[#494641] hover:text-[var(--ink)]"
                }`}
              >
                <span>{option.label}</span>
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#b2ada4]" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {styleOptions.slice(1).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setStyleFilter(styleFilter === style ? "All styles" : style)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                styleFilter === style
                  ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                  : "border-[#d8d3ca] bg-white text-[#67635d] hover:border-[#a9a39a]"
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[#e0dcd4] pt-6">
        <p className="eyebrow mb-4 text-[#494641]">Bike specs & sizing</p>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#77726b]">Wheel size</span>
            <span className="relative block">
              <select
                value={wheelSize}
                onChange={(event) => setWheelSize(event.target.value)}
                className="w-full appearance-none rounded-none border border-[#d8d3ca] bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-[#282725] outline-none transition focus:border-[var(--orange)]"
              >
                {wheelSizeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77726b]" />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#77726b]">Top tube length</span>
            <span className="relative block">
              <select
                value={topTubeFilter}
                onChange={(event) => setTopTubeFilter(event.target.value)}
                className="w-full appearance-none rounded-none border border-[#d8d3ca] bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-[#282725] outline-none transition focus:border-[var(--orange)]"
              >
                {topTubeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77726b]" />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#77726b]">Frame material</span>
            <span className="relative block">
              <select
                value={frameMaterial}
                onChange={(event) => setFrameMaterial(event.target.value)}
                className="w-full appearance-none rounded-none border border-[#d8d3ca] bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-[#282725] outline-none transition focus:border-[var(--orange)]"
              >
                {materialOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77726b]" />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#77726b]">Skill level</span>
            <span className="relative block">
              <select
                value={skillLevel}
                onChange={(event) => setSkillLevel(event.target.value)}
                className="w-full appearance-none rounded-none border border-[#d8d3ca] bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-[#282725] outline-none transition focus:border-[var(--orange)]"
              >
                {skillOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77726b]" />
            </span>
          </label>
        </div>
      </div>

      <div className="border-t border-[#e0dcd4] pt-6">
        <p className="eyebrow mb-4 text-[#494641]">Brand</p>
        <label className="block">
          <span className="relative block">
            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="w-full appearance-none rounded-none border border-[#d8d3ca] bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-[#282725] outline-none transition focus:border-[var(--orange)]"
            >
              {brandOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77726b]" />
          </span>
        </label>
      </div>

      <div className="border-t border-[#e0dcd4] pt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow text-[#494641]">Price range</p>
          <span className="text-xs font-bold text-[var(--orange)]">{priceMax === 600 ? "$600+" : `$${priceMax}`}</span>
        </div>
        <input
          aria-label="Maximum price"
          type="range"
          min="150"
          max="600"
          step="10"
          value={priceMax}
          onChange={(event) => setPriceMax(Number(event.target.value))}
          className="range-orange h-1.5 w-full cursor-pointer"
        />
        <div className="mt-2 flex justify-between text-[11px] font-semibold text-[#96918a]">
          <span>$150</span>
          <span>$600+</span>
        </div>
      </div>

      <button type="button" onClick={onClear} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#69645d] transition hover:text-[var(--orange)]">
        <RotateCcw className="h-3.5 w-3.5" />
        Clear all filters
      </button>
    </div>
  );
}

type ProductCardProps = {
  bike: BmxBike;
  wishlisted: boolean;
  viewMode: "grid" | "list";
  formatPrice: (price: number) => string;
  onToggleWishlist: (bike: BmxBike) => void;
  onQuickView: (bike: BmxBike) => void;
  onAdd: (bike: BmxBike) => void;
};

function ProductCard({ bike, wishlisted, viewMode, formatPrice, onToggleWishlist, onQuickView, onAdd }: ProductCardProps) {
  return (
    <article className={`product-card group overflow-hidden border border-[#dedad2] bg-white ${viewMode === "list" ? "product-card-list" : ""}`}>
      <div className="product-media relative aspect-[4/3] overflow-hidden bg-[#e8e4dc]">
        <Image
          src={bike.image}
          alt={`${bike.name} product image`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="product-image object-cover"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="bg-[var(--orange)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white">{bike.badge}</span>
          {bike.compareAtPrice ? <span className="bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#4c4944]">Sale</span> : null}
        </div>
        <button
          type="button"
          aria-label={wishlisted ? `Remove ${bike.name} from wishlist` : `Save ${bike.name} to wishlist`}
          onClick={() => onToggleWishlist(bike)}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition ${
            wishlisted ? "bg-[var(--orange)] text-white" : "bg-white/90 text-[#282725] hover:bg-[var(--orange)] hover:text-white"
          }`}
        >
          <Heart className="h-4 w-4" fill={wishlisted ? "currentColor" : "none"} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => onQuickView(bike)}
          className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 bg-[#151515] px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-white opacity-100 transition hover:bg-[var(--orange)] md:opacity-0 md:group-hover:opacity-100"
        >
          Quick view <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="product-info p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="eyebrow text-[#8d887f]">{bike.brand}</span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#5c5852]">
            <Star className="h-3 w-3 fill-[var(--orange)] text-[var(--orange)]" /> {bike.rating} <span className="font-normal text-[#9a958c]">({bike.reviewCount})</span>
          </span>
        </div>
        <h3 className="min-h-[42px] text-[15px] font-bold leading-snug text-[#1d1c1a] sm:text-base">{bike.name}</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="border border-[#dedad2] px-2 py-1 text-[10px] font-semibold text-[#6e6962]">{bike.wheelSize} wheels</span>
          <span className="border border-[#dedad2] px-2 py-1 text-[10px] font-semibold text-[#6e6962]">{bike.topTube} top tube</span>
          {bike.frameMaterial === "Full Chromoly" ? <span className="border border-[#dedad2] px-2 py-1 text-[10px] font-semibold text-[#6e6962]">Full chromoly</span> : null}
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-[#1d1c1a]">{formatPrice(bike.price)}</span>
              {bike.compareAtPrice ? <span className="text-xs text-[#9b968e] line-through">{formatPrice(bike.compareAtPrice)}</span> : null}
            </div>
            <span className="text-[10px] font-semibold text-[#8d887f]">or 4 interest-free payments</span>
          </div>
          <button
            type="button"
            onClick={() => onAdd(bike)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-white transition hover:bg-[#1d1c1a]"
            aria-label={`Add ${bike.name} to cart`}
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Storefront() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [styleFilter, setStyleFilter] = useState("All styles");
  const [wheelSize, setWheelSize] = useState("All sizes");
  const [topTubeFilter, setTopTubeFilter] = useState("All lengths");
  const [frameMaterial, setFrameMaterial] = useState("All materials");
  const [skillLevel, setSkillLevel] = useState("All levels");
  const [brand, setBrand] = useState("All brands");
  const [priceMax, setPriceMax] = useState(600);
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProduct, setSelectedProduct] = useState<BmxBike | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [sizingOpen, setSizingOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    notes: "",
    billingAddress: "",
    billingSameAsShipping: true
  });
  const [paymentMethod, setPaymentMethod] = useState<string>(DEFAULT_PAYMENT_METHOD);
  const [contactChannel, setContactChannel] = useState<ContactChannel>("whatsapp");
  const [paymentRequest, setPaymentRequest] = useState<{ reference: string; message: string; channel: ContactChannel } | null>(null);
  const [copied, setCopied] = useState(false);
  const [products, setProducts] = useState<BmxBike[]>(fallbackProducts);
  const [categoryOptions, setCategoryOptions] = useState<ReadonlyArray<{ label: string; value: string }>>(
    DEFAULT_CATEGORY_OPTIONS
  );

  const bikeCategories = useMemo(
    () => categoryOptions.filter((option) => BIKE_CATEGORIES.includes(option.value)),
    [categoryOptions]
  );

  const gearCategories = useMemo(
    () => categoryOptions.filter((option) => GEAR_CATEGORIES.includes(option.value)),
    [categoryOptions]
  );

  const formatPrice = useMemo(() => {
    const formatter = createPriceFormatter(siteSettings.currency);
    return (price: number) => formatter.format(price);
  }, [siteSettings.currency]);

  const whatsappReady = Boolean(siteSettings.whatsapp);
  const activeChannel: ContactChannel = contactChannel === "whatsapp" && !whatsappReady ? "email" : contactChannel;
  const channelLabel = activeChannel === "whatsapp" ? "WhatsApp" : "email";

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
    fetch("/api/products", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { products?: BmxBike[] } | null) => {
        if (active && data?.products && data.products.length > 0) setProducts(data.products);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/categories", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { categories?: Array<{ name?: string }> } | null) => {
        if (!active || !data?.categories) return;
        const names = data.categories
          .map((item) => String(item.name ?? "").trim())
          .filter((name) => name.length > 0);
        if (names.length === 0) return;

        const ordered = [
          ...CATEGORY_ORDER.filter((name) => names.some((value) => value.toLowerCase() === name.toLowerCase())),
          ...names.filter((name) => !CATEGORY_ORDER.includes(name))
        ];

        setCategoryOptions([
          { label: "All products", value: "All" },
          ...ordered.map((name) => ({ label: name, value: name }))
        ]);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const requested = new URLSearchParams(window.location.search).get("category");
      if (!requested) return;
      const match = categoryOptions.find(
        (option) => option.value.toLowerCase() === requested.trim().toLowerCase()
      );
      if (!match) return;
      setActiveCategory(match.value);
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    })();
  }, [categoryOptions]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const hasOverlay = Boolean(selectedProduct || cartOpen || filterOpen || navOpen || sizingOpen);
    document.body.style.overflow = hasOverlay ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProduct, cartOpen, filterOpen, navOpen, sizingOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedProduct(null);
      setCartOpen(false);
      setFilterOpen(false);
      setNavOpen(false);
      setSizingOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const result = products.filter((bike) => {
      const matchesSearch = !query || `${bike.brand} ${bike.model} ${bike.name} ${bike.ridingStyle.join(" ")}`.toLowerCase().includes(query);
      const matchesCategory = activeCategory === "All" || bike.category === activeCategory;
      const matchesStyle = styleFilter === "All styles" || bike.ridingStyle.includes(styleFilter) || (styleFilter === "Big wheel" && bike.category === "Cruiser");
      const matchesWheel = wheelSize === "All sizes" || bike.wheelSize === wheelSize;
      const topTube = Number.parseFloat(bike.topTube);
      const matchesTopTube =
        topTubeFilter === "All lengths" ||
        (topTubeFilter === "Under 20\"" && topTube < 20) ||
        (topTubeFilter === "20\"–20.5\"" && topTube >= 20 && topTube <= 20.5) ||
        (topTubeFilter === "21\"+" && topTube >= 21);
      const matchesMaterial = frameMaterial === "All materials" || bike.frameMaterial === frameMaterial;
      const matchesSkill = skillLevel === "All levels" || bike.skillLevel === skillLevel;
      const matchesBrand = brand === "All brands" || bike.brand === brand;
      return matchesSearch && matchesCategory && matchesStyle && matchesWheel && matchesTopTube && matchesMaterial && matchesSkill && matchesBrand && bike.price <= priceMax;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "newest") return b.id.localeCompare(a.id);
      return products.indexOf(a) - products.indexOf(b);
    });
  }, [activeCategory, brand, frameMaterial, priceMax, products, searchTerm, skillLevel, sortBy, styleFilter, topTubeFilter, wheelSize]);

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((total, item) => {
    const bike = products.find((product) => product.id === item.productId);
    return total + (bike ? bike.price * item.quantity : 0);
  }, 0);
  const freeShippingTarget = 99.99;
  const shippingRemaining = Math.max(0, freeShippingTarget - cartSubtotal);
  const shippingProgress = Math.min(100, (cartSubtotal / freeShippingTarget) * 100);
  const activeFilterCount =
    Number(activeCategory !== "All") +
    Number(styleFilter !== "All styles") +
    Number(wheelSize !== "All sizes") +
    Number(topTubeFilter !== "All lengths") +
    Number(frameMaterial !== "All materials") +
    Number(skillLevel !== "All levels") +
    Number(brand !== "All brands") +
    Number(priceMax < 600) +
    Number(Boolean(searchTerm));

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Complete BMX Bikes",
    numberOfItems: products.length,
    itemListElement: products.map((bike, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: bike.name,
        image: bike.image,
        description: bike.description,
        brand: { "@type": "Brand", name: bike.brand },
        aggregateRating: { "@type": "AggregateRating", ratingValue: bike.rating, reviewCount: bike.reviewCount },
          offers: { "@type": "Offer", priceCurrency: siteSettings.currency || "USD", price: bike.price, availability: "https://schema.org/InStock" }
      }
    }))
  };

  const clearFilters = () => {
    setSearchTerm("");
    setActiveCategory("All");
    setStyleFilter("All styles");
    setWheelSize("All sizes");
    setTopTubeFilter("All lengths");
    setFrameMaterial("All materials");
    setSkillLevel("All levels");
    setBrand("All brands");
    setPriceMax(600);
  };

  const openProduct = (bike: BmxBike) => {
    setSelectedProduct(bike);
    setSelectedImage(0);
    setSelectedColor(bike.colors[0]);
    setSelectedSize(bike.sizes[0]);
  };

  const toggleWishlist = (bike: BmxBike) => {
    setWishlist((current) => {
      const isSaved = current.includes(bike.id);
      setNotice(isSaved ? `${bike.model} removed from wishlist` : `${bike.model} saved for later`);
      return isSaved ? current.filter((id) => id !== bike.id) : [...current, bike.id];
    });
  };

  const addToCart = (bike: BmxBike, options?: { color?: string; size?: string }) => {
    const color = options?.color ?? bike.colors[0];
    const size = options?.size ?? bike.sizes[0];
    setCartItems((current) => {
      const existing = current.find((item) => item.productId === bike.id && item.color === color && item.size === size);
      if (existing) {
        return current.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { productId: bike.id, color, size, quantity: 1 }];
    });
    setNotice(`${bike.model} added to your bag`);
    setCartOpen(true);
  };

  const updateQuantity = (item: CartItem, direction: "increase" | "decrease") => {
    setCartItems((current) =>
      current
        .map((cartItem) => (cartItem === item ? { ...cartItem, quantity: cartItem.quantity + (direction === "increase" ? 1 : -1) } : cartItem))
        .filter((cartItem) => cartItem.quantity > 0)
    );
  };

  const removeFromCart = (item: CartItem) => {
    setCartItems((current) => current.filter((cartItem) => cartItem !== item));
  };

  const placeOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutError("");
    setCheckoutPending(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          country: customer.country,
          notes: customer.notes,
          billingAddress: customer.billingSameAsShipping ? "" : customer.billingAddress,
          paymentMethod,
          contactChannel,
          items: cartItems.map((item) => ({
            productId: item.productId,
            color: item.color,
            size: item.size,
            quantity: item.quantity
          }))
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setCheckoutError(typeof data.error === "string" ? data.error : "We could not place that order.");
        return;
      }

      const order = data.order as { reference: string; total: string; paymentMethod: string };
      const items = (Array.isArray(data.items) ? data.items : []) as Array<{ name: string; quantity: number; price: number }>;
      const message = buildPaymentRequestMessage({
        storeName: siteSettings.storeName,
        orderReference: order.reference,
        paymentMethod: order.paymentMethod,
        currency: siteSettings.currency || "USD",
        total: Number(order.total),
        items,
        customerName: customer.name,
        email: customer.email,
        phone: customer.phone,
        shippingAddress: [customer.address, customer.city, customer.country].filter(Boolean).join(", "),
        billingAddress: customer.billingSameAsShipping
          ? [customer.address, customer.city, customer.country].filter(Boolean).join(", ")
          : customer.billingAddress
      });

      const destination = paymentDestination({
        requested: activeChannel,
        whatsappNumber: siteSettings.whatsapp,
        contactEmail: siteSettings.contactEmail,
        orderReference: order.reference,
        message
      });

      setPaymentRequest({ reference: order.reference, message, channel: destination.channel });
      setCartItems([]);
      setCartOpen(false);
      setCopied(false);
      setNotice(`Order ${order.reference} reserved`);

      window.location.href = destination.url;
    } catch {
      setCheckoutError("Network error. Please try again.");
    } finally {
      setCheckoutPending(false);
    }
  };

  const copyPaymentRequest = async () => {
    if (!paymentRequest) return;
    try {
      await navigator.clipboard.writeText(paymentRequest.message);
      setCopied(true);
    } catch {
      setCheckoutError("Could not copy automatically. Select the message above and copy it.");
    }
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutError("");
    setPaymentRequest(null);
    setCopied(false);
    setCustomer({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      notes: "",
      billingAddress: "",
      billingSameAsShipping: true
    });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className="bg-[#151515] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] lg:px-8">
          <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
            <span className="text-[#ff7950]">Free UK delivery over $99</span>
            <span className="hidden text-[#8d8a84] sm:inline">100-day returns</span>
            <span className="hidden text-[#8d8a84] md:inline">Rider-owned support</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" className="hidden items-center gap-1.5 text-[#c7c3bc] transition hover:text-white sm:flex">
              <MapPin className="h-3 w-3" /> USD / US <ChevronDown className="h-3 w-3" />
            </button>
            <a href="#support" className="text-[#c7c3bc] transition hover:text-white">Support</a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-[#dedad2] bg-[#fffdf8]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-4 lg:px-8">
          <button type="button" onClick={() => setNavOpen(true)} className="flex h-10 w-10 items-center justify-center border border-[#dedad2] bg-white lg:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <a href="#top" className="shrink-0 font-display text-[27px] leading-none tracking-[-0.04em] text-[#151515] sm:text-[31px]">
            RIDE<span className="text-[var(--orange)]">{"//"}</span>BMX
          </a>
          <form onSubmit={submitSearch} className="relative ml-auto hidden max-w-[460px] flex-1 md:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d887f]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search bikes, parts, brands..."
              className="h-11 w-full border border-[#d8d3ca] bg-[#f7f5f0] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#99948b] focus:border-[var(--orange)]"
              aria-label="Search products"
            />
          </form>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button type="button" className="hidden h-10 items-center gap-2 px-2 text-xs font-bold text-[#4e4a45] transition hover:text-[var(--orange)] lg:flex">
              <UserRound className="h-4 w-4" /> Account
            </button>
            <button type="button" onClick={() => setFilterOpen(true)} className="flex h-10 w-10 items-center justify-center border border-transparent text-[#282725] transition hover:border-[#dedad2] lg:hidden" aria-label="Open filters">
              <SlidersHorizontal className="h-[18px] w-[18px]" />
            </button>
            <button type="button" onClick={() => setCartOpen(true)} className="relative flex h-10 items-center gap-2 px-2 text-xs font-bold text-[#282725] transition hover:text-[var(--orange)]">
              <ShoppingBag className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Bag</span>
              {cartCount > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--orange)] px-1 text-[10px] text-white">{cartCount}</span> : null}
            </button>
          </div>
        </div>
        <form onSubmit={submitSearch} className="relative mx-5 mb-3 md:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d887f]" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search bikes, parts, brands..."
            className="h-10 w-full border border-[#d8d3ca] bg-[#f7f5f0] pl-10 pr-3 text-sm outline-none focus:border-[var(--orange)]"
            aria-label="Search products"
          />
        </form>
        <nav className="hidden border-t border-[#e5e1d9] lg:block">
          <div className="mx-auto flex max-w-[1440px] items-center gap-7 px-8">
            <div className="group relative flex h-11 items-center">
              <a href="#catalog" className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#282725]">
                Complete BMX Bikes <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180" />
              </a>
              <div className="pointer-events-none absolute left-0 top-full z-20 w-56 translate-y-2 border border-[#dedad2] bg-white p-2 opacity-0 shadow-xl transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                {bikeCategories.map((option) => (
                  <a key={option.value} href="#catalog" className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-[#5d5952] transition hover:bg-[#f7f5f0] hover:text-[var(--orange)]">
                    {option.label}<ChevronRight className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
            {gearCategories.length > 0 ? (
              <div className="group relative">
                <Link href="/shop" className="flex h-11 items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#615d56] transition hover:text-[var(--orange)]">
                  Shop<ChevronDown className="h-3 w-3" />
                </Link>
                <div className="pointer-events-none absolute left-0 top-full z-20 w-56 translate-y-2 border border-[#dedad2] bg-white p-2 opacity-0 shadow-xl transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                  {gearCategories.map((option) => (
                    <Link
                      key={option.value}
                      href={`/#catalog?category=${encodeURIComponent(option.value)}`}
                      className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-[#5d5952] transition hover:bg-[#f7f5f0] hover:text-[var(--orange)]"
                    >
                      {option.label}<ChevronRight className="h-3 w-3" />
                    </Link>
                  ))}
                  <Link href="/shop" className="mt-1 flex items-center justify-between border-t border-[#e0dcd4] px-3 py-2.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--orange)]">
                    All departments<ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <Link href="/shop" className="flex h-11 items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#615d56] transition hover:text-[var(--orange)]">
                Shop
              </Link>
            )}
            <Link href="/reviews" className="flex h-11 items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#615d56] transition hover:text-[var(--orange)]">
              Reviews<span className="hidden text-[9px] font-normal normal-case tracking-normal text-[#aaa59c] xl:inline">Rider stories</span>
            </Link>
            {[
              ["Outlet / Sale", "Good deals"]
            ].map(([label, sublabel]) => (
              <a key={label} href="#catalog" className="flex h-11 items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#615d56] transition hover:text-[var(--orange)]">
                {label}<span className="hidden text-[9px] font-normal normal-case tracking-normal text-[#aaa59c] xl:inline">{sublabel}</span>
              </a>
            ))}
          </div>
        </nav>
      </header>

      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-[#151515]/55" onClick={() => setNavOpen(false)} aria-label="Close navigation" />
          <aside className="absolute left-0 top-0 h-full w-[min(88vw,360px)] overflow-y-auto bg-[#fffdf8] p-5 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-display text-2xl">RIDE<span className="text-[var(--orange)]">{"//"}</span>BMX</span>
              <button type="button" onClick={() => setNavOpen(false)} className="flex h-9 w-9 items-center justify-center border border-[#dedad2]" aria-label="Close navigation"><X className="h-4 w-4" /></button>
            </div>
            <p className="eyebrow mb-3 text-[#8d887f]">Shop</p>
            <a href="#catalog" onClick={() => setNavOpen(false)} className="flex items-center justify-between border-b border-[#e0dcd4] py-4 text-lg font-bold">Complete BMX Bikes <ChevronRight className="h-4 w-4 text-[var(--orange)]" /></a>
            {bikeCategories.map((option) => (
              <a key={option.value} href="#catalog" onClick={() => { setActiveCategory(option.value); setNavOpen(false); }} className="flex items-center justify-between border-b border-[#e0dcd4] py-3 text-sm font-semibold text-[#615d56]">
                {option.label}<ChevronRight className="h-3.5 w-3.5" />
              </a>
            ))}
            {gearCategories.length > 0 ? (
              <>
                <p className="eyebrow mb-2 mt-6 text-[#8d887f]">Parts &amp; apparel</p>
                {gearCategories.map((option) => (
                  <Link
                    key={option.value}
                    href={`/#catalog?category=${encodeURIComponent(option.value)}`}
                    onClick={() => setNavOpen(false)}
                    className="flex items-center justify-between border-b border-[#e0dcd4] py-3 text-sm font-semibold text-[#615d56]"
                  >
                    {option.label}<ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </>
            ) : null}
            <Link href="/shop" onClick={() => setNavOpen(false)} className="mt-4 flex items-center justify-between border-2 border-[var(--ink)] px-4 py-3.5 text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">
              Shop<ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/reviews" onClick={() => setNavOpen(false)} className="flex items-center justify-between border-b border-[#e0dcd4] py-4 text-sm font-bold text-[#282725]">
              Reviews<ChevronRight className="h-4 w-4 text-[#aaa59c]" />
            </Link>
            <a href="#catalog" onClick={() => { setActiveCategory("All"); setNavOpen(false); }} className="flex items-center justify-between border-b border-[#e0dcd4] py-4 text-sm font-bold text-[#282725]">
              Outlet / Sale<ChevronRight className="h-4 w-4 text-[#aaa59c]" />
            </a>
            <div className="mt-8 bg-[#151515] p-5 text-white">
              <p className="eyebrow text-[#ff7950]">Need a hand?</p>
              <p className="mt-2 text-sm font-semibold">Our crew knows BMX. Talk to a real rider.</p>
              <a href="#support" onClick={() => setNavOpen(false)} className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#ff7950]">Get support <ArrowRight className="h-3.5 w-3.5" /></a>
            </div>
          </aside>
        </div>
      ) : null}

      <main id="top">
        <section className="relative isolate overflow-hidden bg-[#151515] text-white">
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="hero-glow pointer-events-none absolute -right-20 top-[-100px] h-[520px] w-[520px] rounded-full" />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
            <div className="relative z-10 max-w-xl">
              <div className="mb-7 flex items-center gap-3">
                <span className="h-px w-10 bg-[var(--orange)]" />
                <span className="eyebrow text-[#ff7950]">The complete BMX edit / 2026</span>
              </div>
              <h1 className="font-display max-w-[650px] text-[clamp(4rem,10vw,8.7rem)] leading-[0.84] tracking-[-0.045em]">BUILT TO<br /><span className="text-[var(--orange)]">STAND OUT.</span></h1>
              <p className="mt-7 max-w-md text-base leading-7 text-[#c4c0b9] sm:text-lg">Complete bikes and parts for riders who choose their own line. Street, park, race, or whatever comes next.</p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a href="#catalog" className="inline-flex items-center gap-3 bg-[var(--orange)] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-[#151515]">Shop complete bikes <ArrowRight className="h-4 w-4" /></a>
                <a href="#story" className="inline-flex items-center gap-2 border border-[#4a4742] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:border-white">Our story <ArrowUpRight className="h-4 w-4" /></a>
              </div>
              <div className="mt-12 flex items-center gap-7 border-t border-[#3d3a36] pt-5">
                <div><p className="font-display text-2xl text-white">10</p><p className="eyebrow mt-1 text-[#8d8981]">Bikes in stock</p></div>
                <div><p className="font-display text-2xl text-white">4.8/5</p><p className="eyebrow mt-1 text-[#8d8981]">Rider rating</p></div>
                <div><p className="font-display text-2xl text-white">24h</p><p className="eyebrow mt-1 text-[#8d8981]">Dispatch</p></div>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[690px] lg:justify-self-end">
              <div className="absolute -right-3 -top-7 z-10 hidden h-24 w-24 rotate-6 items-center justify-center bg-[var(--orange)] text-center text-[#151515] sm:flex">
                <span className="font-display text-2xl leading-[0.85]">RIDE<br />YOUR<br />LINE</span>
              </div>
              <div className="relative aspect-[1.08/1] overflow-hidden bg-[#282723]">
                <Image src={products[0].image} alt="BMX rider in action" fill priority sizes="(max-width: 1024px) 90vw, 55vw" className="object-cover opacity-90 mix-blend-screen" />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#151515]/80 via-transparent to-[#ff5a1f]/10" />
                <div className="absolute bottom-5 left-5 flex items-center gap-3 border-l-2 border-[var(--orange)] pl-3">
                  <span className="eyebrow text-white/60">01 / 10</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-white">Kink Gap / Full Chromoly</span>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden border border-[#4a4742] bg-[#151515] px-4 py-3 sm:block">
                <p className="eyebrow text-[#8d8981]">Featured build</p>
                <p className="mt-1 text-sm font-bold text-white">Street-ready. Session-tested.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="catalog" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 py-12 sm:py-16 lg:px-8">
          <div className="mb-9 flex flex-col gap-5 border-b border-[#dedad2] pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#96918a]"><a href="#top" className="transition hover:text-[var(--orange)]">Home</a><ChevronRight className="h-3 w-3" /><span className="text-[#494641]">Complete BMX bikes</span></div>
              <h2 className="font-display text-5xl leading-[0.9] sm:text-6xl">FIND YOUR LINE<span className="text-[var(--orange)]">.</span></h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#77726b]">From your first session to the next podium. Filter the range and find the setup that moves like you do.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#77726b]"><span className="flex h-2 w-2 rounded-full bg-[var(--orange)]" /> Showing {filteredProducts.length} of {products.length} bikes</div>
          </div>

          <div className="no-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
            {categoryOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => setActiveCategory(option.value)} className={`shrink-0 border px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.1em] transition ${activeCategory === option.value ? "border-[#151515] bg-[#151515] text-white" : "border-[#d8d3ca] bg-white text-[#68635c] hover:border-[#151515] hover:text-[#151515]"}`}>
                {option.label}<span className={`ml-2 text-[10px] ${activeCategory === option.value ? "text-[#ff7950]" : "text-[#a8a39a]"}`}>{option.value === "All" ? products.length : products.filter((bike) => bike.category === option.value).length}</span>
              </button>
            ))}
          </div>

          <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
            <button type="button" onClick={() => setFilterOpen(true)} className="flex items-center gap-2 border border-[#d8d3ca] bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.1em]"><SlidersHorizontal className="h-4 w-4" /> Filters {activeFilterCount ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--orange)] px-1 text-[10px] text-white">{activeFilterCount}</span> : null}</button>
            <div className="flex items-center gap-2">
              <label className="relative">
                <span className="sr-only">Sort products</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="h-10 appearance-none border border-[#d8d3ca] bg-white py-2 pl-3 pr-8 text-xs font-bold outline-none">
                  <option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Best rated</option><option value="newest">Newest</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              </label>
              <div className="hidden border border-[#d8d3ca] bg-white sm:flex">
                <button type="button" onClick={() => setViewMode("grid")} className={`flex h-10 w-10 items-center justify-center ${viewMode === "grid" ? "bg-[#151515] text-white" : "text-[#77726b]"}`} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></button>
                <button type="button" onClick={() => setViewMode("list")} className={`flex h-10 w-10 items-center justify-center ${viewMode === "list" ? "bg-[#151515] text-white" : "text-[#77726b]"}`} aria-label="List view"><List className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[236px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <FilterPanel activeCategory={activeCategory} setActiveCategory={setActiveCategory} styleFilter={styleFilter} setStyleFilter={setStyleFilter} wheelSize={wheelSize} setWheelSize={setWheelSize} topTubeFilter={topTubeFilter} setTopTubeFilter={setTopTubeFilter} frameMaterial={frameMaterial} setFrameMaterial={setFrameMaterial} skillLevel={skillLevel} setSkillLevel={setSkillLevel} brand={brand} setBrand={setBrand} priceMax={priceMax} setPriceMax={setPriceMax} categoryOptions={categoryOptions} onClear={clearFilters} />
              </div>
            </aside>
            <div>
              <div className="mb-5 hidden items-center justify-between gap-4 lg:flex">
                <p className="text-sm font-semibold text-[#77726b]">{activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied` : "All complete bikes"}</p>
                <div className="flex items-center gap-4">
                  <label className="relative">
                    <span className="sr-only">Sort products</span>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="h-10 appearance-none border border-[#d8d3ca] bg-white py-2 pl-3 pr-9 text-xs font-bold outline-none transition focus:border-[var(--orange)]">
                      <option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Best selling</option><option value="newest">Newest</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#77726b]" />
                  </label>
                  <div className="flex border border-[#d8d3ca] bg-white">
                    <button type="button" onClick={() => setViewMode("grid")} className={`flex h-10 w-10 items-center justify-center ${viewMode === "grid" ? "bg-[#151515] text-white" : "text-[#77726b]"}`} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setViewMode("list")} className={`flex h-10 w-10 items-center justify-center ${viewMode === "list" ? "bg-[#151515] text-white" : "text-[#77726b]"}`} aria-label="List view"><List className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
              {filteredProducts.length ? (
                <div className={`grid gap-4 ${viewMode === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
                  {filteredProducts.map((bike) => <ProductCard key={bike.id} bike={bike} wishlisted={wishlist.includes(bike.id)} viewMode={viewMode} formatPrice={formatPrice} onToggleWishlist={toggleWishlist} onQuickView={openProduct} onAdd={addToCart} />)}
                </div>
              ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center border border-dashed border-[#cfc9bf] bg-white px-6 text-center">
                  <SlidersHorizontal className="h-8 w-8 text-[var(--orange)]" />
                  <h3 className="mt-4 text-lg font-bold">No bikes match that setup.</h3>
                  <p className="mt-2 max-w-sm text-sm text-[#77726b]">Try widening your filters or clear them to see every bike in the range.</p>
                  <button type="button" onClick={clearFilters} className="mt-5 bg-[#151515] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.1em] text-white">Clear filters</button>
                </div>
              )}
            </div>
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
                  <div><p className="text-xs font-extrabold uppercase tracking-[0.08em]">{title as string}</p><p className="mt-1 text-xs leading-5 text-[#858078]">{description as string}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="story" className="bg-[#e9e5dc]">
          <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div className="relative aspect-[1.35/1] overflow-hidden bg-[#252421]">
              <Image src={products[2].image} alt="BMX bike detail" fill sizes="(max-width: 1024px) 90vw, 55vw" className="object-cover opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151515]/65 to-transparent" />
              <div className="absolute bottom-5 left-5 text-white"><p className="eyebrow text-[#ff7950]">The rider-owned edit</p><p className="mt-2 max-w-xs text-2xl font-bold leading-tight">Good gear should get out of the way.</p></div>
            </div>
            <div className="px-1 sm:px-8 lg:px-16">
              <Sparkles className="h-7 w-7 text-[var(--orange)]" />
              <h2 className="mt-5 font-display text-5xl leading-[0.9] sm:text-6xl">BUILT FOR<br /><span className="text-[var(--orange)]">THE SESSION.</span></h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#625e57]">We obsess over the details that make a ride better: the right fit, the right weight, the right feel. No endless scrolling. Just bikes and parts that are ready when you are.</p>
              <a href="#catalog" className="mt-7 inline-flex items-center gap-2 border-b-2 border-[#151515] pb-2 text-xs font-extrabold uppercase tracking-[0.12em]">Shop the full range <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <section className="bg-[var(--blue)] text-white">
          <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 px-5 py-12 sm:flex-row sm:items-center lg:px-8">
            <div><p className="eyebrow text-[#bfc9ff]">The good stuff, occasionally</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">New drops, rider stories, zero spam.</h2></div>
            <form className="flex w-full max-w-md gap-2" onSubmit={(event) => { event.preventDefault(); setNotice("You’re on the list — welcome to the crew"); }}>
              <input type="email" required placeholder="Your email address" className="h-12 min-w-0 flex-1 border border-white/30 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/60 focus:border-white" aria-label="Email address" />
              <button type="submit" className="flex h-12 items-center gap-2 bg-white px-4 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--blue)] transition hover:bg-[var(--orange)] hover:text-white">Sign me up <ArrowRight className="h-4 w-4" /></button>
            </form>
          </div>
        </section>
      </main>

      <footer id="support" className="bg-[#151515] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div><a href="#top" className="font-display text-3xl">RIDE<span className="text-[var(--orange)]">{"//"}</span>BMX</a><p className="mt-4 max-w-xs text-sm leading-6 text-[#96918a]">The complete BMX edit for riders who keep moving.</p><div className="mt-6 flex flex-wrap gap-2">{socialLinks.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} className="flex h-9 w-9 items-center justify-center border border-[#3c3934] text-xs font-bold uppercase transition hover:border-[var(--orange)] hover:text-[var(--orange)]">{social.short}</a>)}<a href={`mailto:${siteSettings.contactEmail}`} aria-label="Email" className="flex h-9 w-9 items-center justify-center border border-[#3c3934] text-xs font-bold transition hover:border-[var(--orange)] hover:text-[var(--orange)]">@</a></div></div>
            <div><p className="eyebrow mb-4 text-[#ff7950]">Shop</p><div className="space-y-3 text-sm text-[#aaa59d]"><a href="#catalog" className="block transition hover:text-white">Complete BMX bikes</a><a href="#catalog" className="block transition hover:text-white">BMX parts</a><a href="#catalog" className="block transition hover:text-white">Clothing & softgoods</a><a href="#catalog" className="block transition hover:text-white">Brands we stock</a></div></div>
            <div><p className="eyebrow mb-4 text-[#ff7950]">Help</p><div className="space-y-3 text-sm text-[#aaa59d]"><a href={`mailto:${siteSettings.contactEmail}`} className="block transition hover:text-white">Contact the crew</a><a href="#support" className="block transition hover:text-white">Delivery information</a><a href="#support" className="block transition hover:text-white">Returns</a><a href="#support" className="block transition hover:text-white">Bike finder</a></div></div>
            <div><p className="eyebrow mb-4 text-[#ff7950]">Come say hi</p><p className="flex items-start gap-2 text-sm leading-6 text-[#aaa59d]"><MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--orange)]" /><span>{siteSettings.address}</span></p><div className="mt-3 space-y-2 text-sm text-[#aaa59d]"><a href={`mailto:${siteSettings.contactEmail}`} className="flex items-center gap-2 transition hover:text-white"><Mail className="h-4 w-4 text-[var(--orange)]" /> {siteSettings.contactEmail}</a>{siteSettings.phone ? <a href={`tel:${siteSettings.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 transition hover:text-white"><Phone className="h-4 w-4 text-[var(--orange)]" /> {siteSettings.phone}</a> : null}{siteSettings.whatsapp ? <a href={`https://wa.me/${siteSettings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition hover:text-white"><MessageCircle className="h-4 w-4 text-[var(--orange)]" /> WhatsApp orders</a> : null}</div><p className="mt-4 flex items-center gap-2 text-sm text-white"><Headphones className="h-4 w-4 text-[var(--orange)]" /> Mon–Fri, 9–5</p></div>
          </div>
          <div className="mt-12 flex flex-col justify-between gap-3 border-t border-[#34312d] pt-5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#77736c] sm:flex-row"><span>© 2026 RIDE{"//"}BMX</span><span>Made for the next line · All rights reserved</span></div>
        </div>
      </footer>

      {filterOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-[#151515]/55" onClick={() => setFilterOpen(false)} aria-label="Close filters" />
          <aside className="absolute right-0 top-0 flex h-full w-[min(92vw,390px)] flex-col bg-[#fffdf8] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dedad2] px-5 py-4"><div><p className="eyebrow text-[#8d887f]">Refine the range</p><h2 className="mt-1 text-lg font-bold">Filters {activeFilterCount ? `(${activeFilterCount})` : ""}</h2></div><button type="button" onClick={() => setFilterOpen(false)} className="flex h-9 w-9 items-center justify-center border border-[#dedad2]" aria-label="Close filters"><X className="h-4 w-4" /></button></div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-6"><FilterPanel activeCategory={activeCategory} setActiveCategory={setActiveCategory} styleFilter={styleFilter} setStyleFilter={setStyleFilter} wheelSize={wheelSize} setWheelSize={setWheelSize} topTubeFilter={topTubeFilter} setTopTubeFilter={setTopTubeFilter} frameMaterial={frameMaterial} setFrameMaterial={setFrameMaterial} skillLevel={skillLevel} setSkillLevel={setSkillLevel} brand={brand} setBrand={setBrand} priceMax={priceMax} setPriceMax={setPriceMax} categoryOptions={categoryOptions} onClear={clearFilters} /></div>
            <div className="safe-bottom border-t border-[#dedad2] p-5"><button type="button" onClick={() => setFilterOpen(false)} className="flex h-12 w-full items-center justify-center gap-2 bg-[var(--orange)] text-xs font-extrabold uppercase tracking-[0.12em] text-white">Show {filteredProducts.length} bikes <ArrowRight className="h-4 w-4" /></button></div>
          </aside>
        </div>
      ) : null}

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`${selectedProduct.name} details`}>
          <button type="button" className="fixed inset-0 bg-[#151515]/70" onClick={() => setSelectedProduct(null)} aria-label="Close product details" />
          <div className="modal-shadow relative z-10 mx-auto my-4 max-w-6xl overflow-hidden bg-[#fffdf8] sm:my-8">
            <div className="flex items-center justify-between border-b border-[#dedad2] px-4 py-3 sm:px-6"><span className="eyebrow text-[#8d887f]">Product quick view</span><button type="button" onClick={() => setSelectedProduct(null)} className="flex h-9 w-9 items-center justify-center border border-[#dedad2] transition hover:border-[#151515]" aria-label="Close product details"><X className="h-4 w-4" /></button></div>
            <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-[#dedad2] bg-[#e8e4dc] p-4 sm:p-7 lg:border-b-0 lg:border-r">
                <div className="relative aspect-square overflow-hidden bg-[#dcd7cd]"><Image src={selectedProduct.gallery[selectedImage] ?? selectedProduct.image} alt={`${selectedProduct.name} view ${selectedImage + 1}`} fill sizes="(max-width: 1024px) 90vw, 45vw" className="object-cover" /></div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {selectedProduct.gallery.map((image, index) => <button key={image} type="button" onClick={() => setSelectedImage(index)} className={`relative aspect-square overflow-hidden border-2 ${selectedImage === index ? "border-[var(--orange)]" : "border-transparent opacity-70 hover:opacity-100"}`}><Image src={image} alt={`${selectedProduct.name} thumbnail ${index + 1}`} fill sizes="120px" className="object-cover" /></button>)}
                </div>
              </div>
              <div className="p-5 sm:p-8 lg:p-10">
                <div className="flex items-start justify-between gap-5"><div><p className="eyebrow text-[var(--orange)]">{selectedProduct.brand} / {selectedProduct.category}</p><h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{selectedProduct.name}</h2></div><button type="button" onClick={() => toggleWishlist(selectedProduct)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${wishlist.includes(selectedProduct.id) ? "border-[var(--orange)] bg-[var(--orange)] text-white" : "border-[#d8d3ca] text-[#494641]"}`} aria-label="Save product"><Heart className="h-4 w-4" fill={wishlist.includes(selectedProduct.id) ? "currentColor" : "none"} /></button></div>
                <div className="mt-4 flex flex-wrap items-center gap-3"><span className="flex items-center gap-1 text-sm font-bold"><Star className="h-4 w-4 fill-[var(--orange)] text-[var(--orange)]" /> {selectedProduct.rating}</span><span className="text-xs text-[#858078]">{selectedProduct.reviewCount} rider reviews</span><span className="h-1 w-1 rounded-full bg-[#c1bcb3]" /><span className="text-xs font-bold text-[#4e8a57]">In stock</span></div>
                <div className="mt-6 flex items-end gap-3"><span className="text-3xl font-extrabold tracking-tight">{formatPrice(selectedProduct.price)}</span>{selectedProduct.compareAtPrice ? <span className="pb-1 text-sm text-[#9b968e] line-through">{formatPrice(selectedProduct.compareAtPrice)}</span> : null}</div>
                <p className="mt-5 text-sm leading-7 text-[#68635c]">{selectedProduct.description}</p>
                <div className="mt-7 grid gap-5 border-y border-[#dedad2] py-5 sm:grid-cols-2">
                  <div><p className="eyebrow mb-2 text-[#8d887f]">Colorway</p><div className="flex flex-wrap gap-2">{selectedProduct.colors.map((color) => <button key={color} type="button" onClick={() => setSelectedColor(color)} className={`flex items-center gap-2 border px-2.5 py-2 text-xs font-semibold transition ${selectedColor === color ? "border-[var(--orange)] bg-[#fff5ef] text-[#bd3d12]" : "border-[#d8d3ca] text-[#68635c]"}`}><span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color === "Raw" || color === "Raw Metal" ? "#a6a29a" : color === "Matte Black" || color === "Black" ? "#252525" : color === "Toxic" || color === "Lime" ? "#b7dc39" : color === "Blue" || color === "Candy Blue" || color === "Ocean Blue" ? "#2c78b8" : color === "Red" || color === "Team Red" ? "#c83b2d" : color === "White" || color === "Pearl White" ? "#f3f0e8" : "#85817a" }} />{color}</button>)}</div></div>
                  <div><div className="mb-2 flex items-center justify-between"><p className="eyebrow text-[#8d887f]">Frame size</p><button type="button" onClick={() => setSizingOpen(true)} className="flex items-center gap-1 text-[11px] font-bold text-[var(--orange)] underline underline-offset-2"><Ruler className="h-3 w-3" /> Size guide</button></div><div className="flex flex-wrap gap-2">{selectedProduct.sizes.map((size) => <button key={size} type="button" onClick={() => setSelectedSize(size)} className={`border px-2.5 py-2 text-xs font-semibold transition ${selectedSize === size ? "border-[#151515] bg-[#151515] text-white" : "border-[#d8d3ca] text-[#68635c]"}`}>{size}</button>)}</div></div>
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => { addToCart(selectedProduct, { color: selectedColor, size: selectedSize }); setSelectedProduct(null); }} className="flex h-13 flex-1 items-center justify-center gap-2 bg-[var(--orange)] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#151515]"><ShoppingBag className="h-4 w-4" /> Add to bag</button><button type="button" onClick={() => toggleWishlist(selectedProduct)} className="flex h-13 items-center justify-center gap-2 border border-[#d8d3ca] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#494641] transition hover:border-[#151515]"><Heart className="h-4 w-4" fill={wishlist.includes(selectedProduct.id) ? "currentColor" : "none"} /> {wishlist.includes(selectedProduct.id) ? "Saved" : "Save for later"}</button></div>
                <div className="mt-8 grid gap-4 border-t border-[#dedad2] pt-6 sm:grid-cols-3"><div className="flex gap-2"><Truck className="h-4 w-4 shrink-0 text-[var(--orange)]" /><p className="text-[11px] font-semibold leading-4 text-[#77726b]">Free delivery over $99</p></div><div className="flex gap-2"><RotateCcw className="h-4 w-4 shrink-0 text-[var(--orange)]" /><p className="text-[11px] font-semibold leading-4 text-[#77726b]">100-day returns</p></div><div className="flex gap-2"><Headphones className="h-4 w-4 shrink-0 text-[var(--orange)]" /><p className="text-[11px] font-semibold leading-4 text-[#77726b]">Rider support</p></div></div>
              </div>
            </div>
            <div className="border-t border-[#dedad2] px-5 py-6 sm:px-8 lg:px-10"><div className="flex items-center justify-between gap-4"><div><p className="eyebrow text-[var(--orange)]">The details</p><h3 className="mt-1 text-xl font-bold">Full specification</h3></div><span className="hidden text-xs font-semibold text-[#858078] sm:block">Built for {selectedProduct.ridingStyle.join(" + ").toLowerCase()}</span></div><div className="mt-5 grid gap-x-8 gap-y-0 border-t border-[#dedad2] sm:grid-cols-2">{Object.entries(selectedProduct.specs).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 border-b border-[#dedad2] py-3 text-sm"><span className="text-[#858078]">{label}</span><span className="text-right font-bold text-[#3c3935]">{value}</span></div>)}</div></div>
            <div className="border-t border-[#dedad2] px-5 py-6 sm:px-8 lg:px-10">
              <ProductReviewSection slug={selectedProduct.id} productName={selectedProduct.name} compact />
            </div>
          </div>
        </div>
      ) : null}

      {sizingOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="BMX sizing guide">
          <button type="button" className="absolute inset-0 bg-[#151515]/75" onClick={() => setSizingOpen(false)} aria-label="Close sizing guide" />
          <div className="modal-shadow relative z-10 max-w-lg bg-[#fffdf8] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-[var(--orange)]">Get the right fit</p><h2 className="mt-2 text-2xl font-extrabold">BMX sizing guide</h2></div><button type="button" onClick={() => setSizingOpen(false)} className="flex h-9 w-9 items-center justify-center border border-[#dedad2]" aria-label="Close sizing guide"><X className="h-4 w-4" /></button></div>
            <p className="mt-4 text-sm leading-6 text-[#68635c]">Top tube length is the most useful starting point. Measure your rider from the floor to the top of the hip, then use the guide below.</p>
            <div className="mt-6 overflow-hidden border border-[#dedad2]"><div className="grid grid-cols-3 bg-[#151515] px-3 py-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white"><span>Rider height</span><span>Wheel size</span><span>Top tube</span></div>{[["4'0\"–4'6\"", "12\"", "17–19\""], ["4'6\"–5'0\"", "16\"", "18–19\""], ["5'0\"–5'5\"", "18\"", "19–20\""], ["5'5\"–5'10\"", "20\"", "20–21\""], ["5'10\"+", "20\" / 24\"", "21–22.5\""]].map((row) => <div key={row[0]} className="grid grid-cols-3 border-t border-[#dedad2] px-3 py-3 text-xs font-semibold text-[#55514b]"><span>{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span></div>)}</div>
            <div className="mt-5 flex items-start gap-3 bg-[#fff0e8] p-3 text-xs leading-5 text-[#6b554a]"><Ruler className="mt-0.5 h-4 w-4 shrink-0 text-[var(--orange)]" />Still deciding? Our crew can help you dial in the right size based on your riding style.</div>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true" aria-label="Shopping bag">
          <button type="button" className="absolute inset-0 bg-[#151515]/55" onClick={() => setCartOpen(false)} aria-label="Close shopping bag" />
          <aside className="drawer-shadow absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-[#fffdf8]">
            <div className="flex items-center justify-between border-b border-[#dedad2] px-5 py-5 sm:px-7"><div><p className="eyebrow text-[#8d887f]">Your ride</p><h2 className="mt-1 text-xl font-extrabold">Shopping bag <span className="text-[var(--orange)]">({cartCount})</span></h2></div><button type="button" onClick={() => setCartOpen(false)} className="flex h-9 w-9 items-center justify-center border border-[#dedad2] transition hover:border-[#151515]" aria-label="Close shopping bag"><X className="h-4 w-4" /></button></div>
            <div className="border-b border-[#dedad2] px-5 py-4 sm:px-7"><div className="mb-2 flex items-center justify-between text-xs font-bold"><span>{shippingRemaining > 0 ? `You're ${formatPrice(shippingRemaining)} from free delivery` : "Free delivery unlocked"}</span><Truck className="h-4 w-4 text-[var(--orange)]" /></div><div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e5e0d8]"><div className="h-full rounded-full bg-[var(--orange)] transition-all" style={{ width: `${shippingProgress}%` }} /></div></div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              {cartItems.length ? <div className="space-y-5">{cartItems.map((item) => { const bike = products.find((product) => product.id === item.productId); if (!bike) return null; return <div key={`${item.productId}-${item.color}-${item.size}`} className="flex gap-3 border-b border-[#dedad2] pb-5"><div className="relative h-24 w-24 shrink-0 overflow-hidden bg-[#e8e4dc]"><Image src={bike.image} alt={bike.name} fill sizes="96px" className="object-cover" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow text-[#8d887f]">{bike.brand}</p><h3 className="mt-1 text-sm font-bold leading-snug">{bike.name}</h3><p className="mt-1 text-[11px] text-[#858078]">{item.color} · {item.size}</p></div><button type="button" onClick={() => removeFromCart(item)} className="text-[#9a958c] transition hover:text-[var(--orange)]" aria-label={`Remove ${bike.name}`}><X className="h-4 w-4" /></button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center border border-[#d8d3ca] bg-white"><button type="button" onClick={() => updateQuantity(item, "decrease")} className="flex h-7 w-7 items-center justify-center text-[#77726b] hover:text-[var(--orange)]" aria-label="Decrease quantity"><Minus className="h-3 w-3" /></button><span className="w-7 text-center text-xs font-bold">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item, "increase")} className="flex h-7 w-7 items-center justify-center text-[#77726b] hover:text-[var(--orange)]" aria-label="Increase quantity"><Plus className="h-3 w-3" /></button></div><span className="text-sm font-extrabold">{formatPrice(bike.price * item.quantity)}</span></div></div></div>; })}</div> : <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0ece5] text-[#9b968e]"><ShoppingBag className="h-7 w-7" /></div><h3 className="mt-5 text-lg font-bold">Your bag is empty</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#77726b]">Good things happen when you add a little more ride.</p><button type="button" onClick={() => setCartOpen(false)} className="mt-5 bg-[#151515] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.1em] text-white">Keep shopping</button></div>}
            </div>
            <div className="safe-bottom border-t border-[#dedad2] bg-white px-5 py-5 sm:px-7">
              {checkoutOpen ? (
                <>
              {paymentRequest ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="eyebrow text-[#8d887f]">Order {paymentRequest.reference}</p>
                    <button type="button" onClick={closeCheckout} className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#77726b] hover:text-[var(--orange)]">Close</button>                  </div>
                  <p className="text-xs leading-5 text-[#77726b]">
                    Order {paymentRequest.reference} is reserved and your{" "}
                    {paymentRequest.channel === "whatsapp" ? "WhatsApp" : "email"} should have opened with the message ready to send. We reply with the instructions for{" "}
                    {PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.label}. If it did not open, use the buttons below.
                  </p>
                  <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap border border-[#d8d3ca] bg-[#f7f5f1] p-3 text-[11px] leading-5 text-[#3f3b35]">{paymentRequest.message}</pre>
                  {checkoutError ? <p className="border border-[#e8c3b8] bg-[#fdf1ec] px-3 py-2 text-xs font-semibold text-[#a5372a]" role="alert">{checkoutError}</p> : null}
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={buildWhatsappUrl(siteSettings.whatsapp, paymentRequest.message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!whatsappReady}
                      onClick={(event) => { if (!whatsappReady) event.preventDefault(); }}
                      className={`flex h-12 items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition ${whatsappReady ? "bg-[var(--orange)] hover:bg-[#151515]" : "cursor-not-allowed bg-[#cfcac1]"}`}
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                    <a
                      href={buildEmailUrl(siteSettings.contactEmail, `Payment for order ${paymentRequest.reference}`, paymentRequest.message)}
                      className="flex h-12 items-center justify-center gap-2 bg-[#151515] text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--orange)]"
                    >
                      <Mail className="h-4 w-4" /> Email
                    </a>
                  </div>
                  <button type="button" onClick={copyPaymentRequest} className="flex h-11 w-full items-center justify-center gap-2 border border-[#d8d3ca] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#77726b] transition hover:border-[var(--orange)] hover:text-[var(--orange)]">
                    <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy message"}
                  </button>
                  {!whatsappReady ? (
                    <p className="text-[11px] leading-5 text-[#96918a]">
                      WhatsApp is not set up yet, so use email. The store owner can add a WhatsApp number in Settings to enable the WhatsApp button.
                    </p>
                  ) : null}
                </div>
              ) : (
                <form onSubmit={placeOrder} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="eyebrow text-[#8d887f]">Checkout</p>
                    <button type="button" onClick={closeCheckout} className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#77726b] hover:text-[var(--orange)]">Back to bag</button>
                  </div>
                  <input required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Full name" autoComplete="name" className="h-11 w-full border border-[#d8d3ca] px-3 text-sm outline-none focus:border-[var(--orange)]" />
                  <input required type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} placeholder="Email" autoComplete="email" className="h-11 w-full border border-[#d8d3ca] px-3 text-sm outline-none focus:border-[var(--orange)]" />
                  <input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="Phone (optional)" autoComplete="tel" className="h-11 w-full border border-[#d8d3ca] px-3 text-sm outline-none focus:border-[var(--orange)]" />
                  <input required value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} placeholder="Street address" autoComplete="street-address" className="h-11 w-full border border-[#d8d3ca] px-3 text-sm outline-none focus:border-[var(--orange)]" />
                  <div className="grid grid-cols-2 gap-3">
                    <input required value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} placeholder="City" autoComplete="address-level2" className="h-11 w-full border border-[#d8d3ca] px-3 text-sm outline-none focus:border-[var(--orange)]" />
                    <input required value={customer.country} onChange={(event) => setCustomer({ ...customer, country: event.target.value })} placeholder="Country" autoComplete="country-name" className="h-11 w-full border border-[#d8d3ca] px-3 text-sm outline-none focus:border-[var(--orange)]" />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#77726b]">
                    <input
                      type="checkbox"
                      checked={customer.billingSameAsShipping}
                      onChange={(event) => setCustomer({ ...customer, billingSameAsShipping: event.target.checked })}
                      className="h-4 w-4 accent-[var(--orange)]"
                    />
                    Billing address is the same as shipping
                  </label>
                  {!customer.billingSameAsShipping ? (
                    <input required value={customer.billingAddress} onChange={(event) => setCustomer({ ...customer, billingAddress: event.target.value })} placeholder="Billing address" className="h-11 w-full border border-[#d8d3ca] px-3 text-sm outline-none focus:border-[var(--orange)]" />
                  ) : null}
                  <fieldset>
                    <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#77726b]">Payment method</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((method) => {
                        const active = paymentMethod === method.id;
                        return (
                          <label
                            key={method.id}
                            className={`flex cursor-pointer items-start gap-2 border p-2 transition ${active ? "border-[var(--orange)] bg-[#fdf1ec]" : "border-[#d8d3ca] hover:border-[#b9b3a8]"}`}
                          >
                            <input
                              type="radio"
                              name="payment-method"
                              value={method.id}
                              checked={active}
                              onChange={() => setPaymentMethod(method.id)}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--orange)]"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-bold text-[#3f3b35]">{method.label}</span>
                              <span className="block truncate text-[10px] text-[#96918a]">{method.hint}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#77726b]">Send my payment request via</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {(["whatsapp", "email"] as const).map((channel) => {
                        const active = activeChannel === channel;
                        const unavailable = channel === "whatsapp" && !whatsappReady;
                        return (
                          <label
                            key={channel}
                            className={`flex cursor-pointer items-center gap-2 border p-2 text-xs font-bold capitalize transition ${active ? "border-[var(--orange)] bg-[#fdf1ec] text-[#3f3b35]" : "border-[#d8d3ca] text-[#77726b] hover:border-[#b9b3a8]"}`}
                          >
                            <input
                              type="radio"
                              name="contact-channel"
                              value={channel}
                              checked={active}
                              disabled={unavailable}
                              onChange={() => setContactChannel(channel)}
                              className="h-3.5 w-3.5 accent-[var(--orange)]"
                            />
                            {channel === "whatsapp" ? "WhatsApp" : "Email"}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <textarea value={customer.notes} onChange={(event) => setCustomer({ ...customer, notes: event.target.value })} placeholder="Delivery notes (optional)" rows={2} className="w-full resize-none border border-[#d8d3ca] px-3 py-2 text-sm outline-none focus:border-[var(--orange)]" />
                  {checkoutError ? <p className="border border-[#e8c3b8] bg-[#fdf1ec] px-3 py-2 text-xs font-semibold text-[#a5372a]" role="alert">{checkoutError}</p> : null}
                  <div className="flex items-center justify-between border-t border-[#dedad2] pt-3"><span className="text-sm font-semibold text-[#77726b]">Total</span><span className="text-xl font-extrabold">{formatPrice(cartSubtotal)}</span></div>
                  <button type="submit" disabled={checkoutPending} className="flex h-12 w-full items-center justify-center gap-2 bg-[var(--orange)] text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#151515] disabled:opacity-60">
                    {checkoutPending
                      ? "Reserving order…"
                      : `Place order & open ${channelLabel}`}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-[11px] leading-5 text-[#96918a]">
                    Your order is saved first, then {activeChannel === "whatsapp" ? "WhatsApp" : "your email app"} opens with the payment request. No card is charged here.
                  </p>
                </form>
              )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#77726b]">Subtotal</span><span className="text-2xl font-extrabold">{formatPrice(cartSubtotal)}</span></div>
                  <p className="mt-1 text-[11px] text-[#96918a]">Shipping, taxes and discounts calculated at checkout.</p>
                  <button type="button" onClick={() => { if (cartItems.length) { setCheckoutError(""); setPaymentRequest(null); setCheckoutOpen(true); } else { setNotice("Your bag is waiting for a bike"); } }} className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-[var(--orange)] text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#151515]">Checkout <ArrowRight className="h-4 w-4" /></button>
                  <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-semibold text-[#858078]"><ShieldCheck className="h-3.5 w-3.5 text-[var(--orange)]" /> Secure checkout · 100-day returns</div>
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {notice ? <div className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 bg-[#151515] px-4 py-3 text-xs font-bold text-white shadow-2xl" role="status"><Check className="h-4 w-4 text-[#ff7950]" />{notice}</div> : null}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}
