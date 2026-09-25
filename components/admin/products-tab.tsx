"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  Upload,
  X
} from "lucide-react";

export type NotifyFn = (kind: "success" | "error", text: string) => void;

export type AdminProduct = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  category: string;
  ridingStyle: string[];
  wheelSize: string;
  topTube: string;
  frameMaterial: string;
  skillLevel: string;
  rating: number;
  reviewCount: number;
  badge: string;
  image: string;
  gallery: string[];
  colors: string[];
  sizes: string[];
  description: string;
  specs: Record<string, string>;
  stock: number;
  active: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ProductListResponse = { products?: AdminProduct[]; error?: string };
type ProductWriteResponse = { ok?: boolean; product?: AdminProduct; error?: string };
type DeleteResponse = { ok?: boolean; error?: string };
type UploadResponse = {
  ok?: boolean;
  url?: string;
  bytes?: number;
  driver?: string;
  originalName?: string;
  error?: string;
};

type SpecRow = { id: string; key: string; value: string };

type ProductForm = {
  id: string | null;
  name: string;
  brand: string;
  model: string;
  badge: string;
  price: string;
  compareAtPrice: string;
  category: string;
  ridingStyle: string;
  colors: string;
  sizes: string;
  wheelSize: string;
  topTube: string;
  frameMaterial: string;
  skillLevel: string;
  rating: string;
  reviewCount: string;
  stock: string;
  description: string;
  image: string;
  gallery: string[];
  specs: SpecRow[];
  active: boolean;
  featured: boolean;
};

type ProductPayload = {
  name: string;
  brand: string;
  model: string;
  badge: string;
  price: number;
  compareAtPrice: number | null;
  category: string;
  ridingStyle: string[];
  colors: string[];
  sizes: string[];
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
  specs: Record<string, string>;
  active: boolean;
  featured: boolean;
};

const ALL_CATEGORIES = "all";
const INPUT_CLASS = "mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]";
const GHOST_BUTTON_CLASS =
  "flex h-10 items-center gap-2 border border-[#d8d3ca] px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#494641] transition hover:border-[var(--ink)] hover:text-[var(--ink)]";
const ICON_BUTTON_CLASS = "flex h-8 w-8 items-center justify-center border border-[#d8d3ca] bg-white text-[#494641] transition hover:border-[var(--ink)] hover:text-[var(--ink)]";

const PRICE_FORMATTER = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const formatPrice = (value: number) => PRICE_FORMATTER.format(Number.isFinite(value) ? value : 0);

let rowSeed = 0;

function nextRowId(): string {
  rowSeed += 1;
  return `row-${rowSeed}`;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toSpecRows(specs: Record<string, string> | undefined): SpecRow[] {
  return Object.entries(specs ?? {}).map(([key, value]) => ({ id: nextRowId(), key, value }));
}

function emptyForm(category: string): ProductForm {
  return {
    id: null,
    name: "",
    brand: "",
    model: "",
    badge: "",
    price: "",
    compareAtPrice: "",
    category,
    ridingStyle: "",
    colors: "",
    sizes: "",
    wheelSize: "",
    topTube: "",
    frameMaterial: "",
    skillLevel: "",
    rating: "",
    reviewCount: "0",
    stock: "0",
    description: "",
    image: "",
    gallery: [],
    specs: [],
    active: true,
    featured: false
  };
}

function toForm(product: AdminProduct): ProductForm {
  return {
    id: product.id,
    name: product.name ?? "",
    brand: product.brand ?? "",
    model: product.model ?? "",
    badge: product.badge ?? "",
    price: String(product.price ?? 0),
    compareAtPrice: product.compareAtPrice === null || product.compareAtPrice === undefined ? "" : String(product.compareAtPrice),
    category: product.category ?? "",
    ridingStyle: (product.ridingStyle ?? []).join(", "),
    colors: (product.colors ?? []).join(", "),
    sizes: (product.sizes ?? []).join(", "),
    wheelSize: product.wheelSize ?? "",
    topTube: product.topTube ?? "",
    frameMaterial: product.frameMaterial ?? "",
    skillLevel: product.skillLevel ?? "",
    rating: String(product.rating ?? 0),
    reviewCount: String(product.reviewCount ?? 0),
    stock: String(product.stock ?? 0),
    description: product.description ?? "",
    image: product.image ?? "",
    gallery: product.gallery ?? [],
    specs: toSpecRows(product.specs),
    active: Boolean(product.active),
    featured: Boolean(product.featured)
  };
}

function buildPayload(form: ProductForm): ProductPayload {
  const specs: Record<string, string> = {};
  for (const row of form.specs) {
    const key = row.key.trim();
    if (key) specs[key] = row.value.trim();
  }
  return {
    name: form.name.trim(),
    brand: form.brand.trim(),
    model: form.model.trim(),
    badge: form.badge.trim(),
    price: Number(form.price),
    compareAtPrice: form.compareAtPrice.trim() === "" ? null : Number(form.compareAtPrice),
    category: form.category,
    ridingStyle: parseList(form.ridingStyle),
    colors: parseList(form.colors),
    sizes: parseList(form.sizes),
    wheelSize: form.wheelSize.trim(),
    topTube: form.topTube.trim(),
    frameMaterial: form.frameMaterial.trim(),
    skillLevel: form.skillLevel.trim(),
    rating: Number(form.rating),
    reviewCount: Math.max(0, Math.trunc(Number(form.reviewCount) || 0)),
    stock: Math.max(0, Math.trunc(Number(form.stock) || 0)),
    description: form.description.trim(),
    image: form.image.trim(),
    gallery: [...form.gallery],
    specs,
    active: form.active,
    featured: form.featured
  };
}

export default function ProductsTab({ notify, categories }: { notify: NotifyFn; categories: string[] }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>(() => emptyForm(categories[0] ?? ""));
  const [imageUploading, setImageUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<string[]>([]);
  const [galleryUrls, setGalleryUrls] = useState("");

  const fieldId = useId();
  const mainInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const uploadsPending = imageUploading || pendingUploads.length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const data = (await response.json()) as ProductListResponse;
      if (!response.ok) {
        notify("error", data.error ?? "Could not load the products.");
        return;
      }
      setProducts(data.products ?? []);
    } catch {
      notify("error", "Network error while loading the products.");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const categoryOptions = useMemo(() => {
    const options: string[] = [];
    for (const value of [...categories, ...products.map((product) => product.category)]) {
      if (value && !options.includes(value)) options.push(value);
    }
    return options;
  }, [categories, products]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = categoryFilter === ALL_CATEGORIES || product.category === categoryFilter;
      const matchesQuery =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.brand.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, categoryFilter]);

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }) as ProductForm);
  }

  function openCreate() {
    setForm(emptyForm(categories[0] ?? categoryOptions[0] ?? ""));
    setGalleryUrls("");
    setEditing(true);
  }

  function openEdit(product: AdminProduct) {
    setForm(toForm(product));
    setGalleryUrls("");
    setEditing(true);
  }

  async function uploadOne(file: File): Promise<string | null> {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = (await response.json()) as UploadResponse;
    if (!response.ok || !data.ok || !data.url) {
      notify("error", data.error ?? `Could not upload ${file.name}.`);
      return null;
    }
    return data.url;
  }

  async function handleMainFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const url = await uploadOne(file);
      if (url) setForm((current) => ({ ...current, image: url }));
    } catch {
      notify("error", "Network error while uploading the main image.");
    } finally {
      setImageUploading(false);
    }
  }

  async function handleGalleryFiles(files: File[]) {
    const tokens = files.map((file) => `${file.name}-${file.size}-${nextRowId()}`);
    setPendingUploads((current) => [...current, ...tokens]);
    await Promise.all(
      files.map(async (file, index) => {
        const token = tokens[index];
        try {
          const url = await uploadOne(file);
          if (url) {
            setForm((current) =>
              current.gallery.includes(url) ? current : { ...current, gallery: [...current.gallery, url] }
            );
          }
        } catch {
          notify("error", `Network error while uploading ${file.name}.`);
        } finally {
          setPendingUploads((current) => current.filter((item) => item !== token));
        }
      })
    );
  }

  function moveGallery(index: number, direction: -1 | 1) {
    setForm((current) => {
      const gallery = [...current.gallery];
      const target = index + direction;
      if (index < 0 || index >= gallery.length || target < 0 || target >= gallery.length) return current;
      const moved = gallery[index];
      gallery[index] = gallery[target];
      gallery[target] = moved;
      return { ...current, gallery };
    });
  }

  function removeGallery(url: string) {
    setForm((current) => ({ ...current, gallery: current.gallery.filter((item) => item !== url) }));
  }

  function promoteGallery(url: string) {
    setForm((current) => ({ ...current, image: url, gallery: current.gallery.filter((item) => item !== url) }));
  }

  function appendGalleryUrls() {
    const urls = parseList(galleryUrls);
    if (urls.length === 0) {
      notify("error", "Paste at least one image URL first.");
      return;
    }
    setForm((current) => {
      const gallery = [...current.gallery];
      for (const url of urls) if (!gallery.includes(url)) gallery.push(url);
      return { ...current, gallery };
    });
    setGalleryUrls("");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadsPending) return;
    setSaving(true);
    const editingId = form.id;
    const payload = buildPayload(form);
    try {
      const response = await fetch(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as ProductWriteResponse;
      if (!response.ok || !data.ok) {
        notify("error", data.error ?? "Could not save the product.");
        return;
      }
      setEditing(false);
      notify("success", editingId ? `“${payload.name}” updated.` : `“${payload.name}” created.`);
      await load();
    } catch {
      notify("error", "Network error while saving the product.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: AdminProduct) {
    const active = !product.active;
    setBusyId(product.id);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active })
      });
      const data = (await response.json()) as ProductWriteResponse;
      if (!response.ok || !data.ok) {
        notify("error", data.error ?? "Could not update the product.");
        return;
      }
      setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, active } : item)));
      notify("success", `“${product.name}” is now ${active ? "live" : "hidden"}.`);
    } catch {
      notify("error", "Network error while updating the product.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeProduct(product: AdminProduct) {
    const confirmed = window.confirm(
      `Delete “${product.name}”? This removes the bike from the catalog and cannot be undone.`
    );
    if (!confirmed) return;
    setBusyId(product.id);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      const data = (await response.json()) as DeleteResponse;
      if (!response.ok || !data.ok) {
        notify("error", data.error ?? "Could not delete the product.");
        return;
      }
      setProducts((current) => current.filter((item) => item.id !== product.id));
      notify("success", `“${product.name}” deleted.`);
    } catch {
      notify("error", "Network error while deleting the product.");
    } finally {
      setBusyId(null);
    }
  }

  if (editing) {
    return (
      <form onSubmit={saveProduct} className="space-y-6">
        <Panel
          title={form.id ? `Edit ${form.name || "product"}` : "New product"}
          description="Everything here is written straight to the catalog. The slug is generated from the name."
          action={
            <button type="button" onClick={() => setEditing(false)} className={GHOST_BUTTON_CLASS}>
              <ArrowLeft className="h-4 w-4" /> Back to list
            </button>
          }
        />

        <section className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id={`${fieldId}-name`}
              label="Name"
              value={form.name}
              onChange={(value) => update("name", value)}
              placeholder="Airwalk AM950"
              required
            />
            <TextField
              id={`${fieldId}-brand`}
              label="Brand"
              value={form.brand}
              onChange={(value) => update("brand", value)}
              placeholder="Airwalk"
              required
            />
            <TextField
              id={`${fieldId}-model`}
              label="Model"
              value={form.model}
              onChange={(value) => update("model", value)}
              placeholder="AM950"
            />
            <TextField
              id={`${fieldId}-badge`}
              label="Badge"
              value={form.badge}
              onChange={(value) => update("badge", value)}
              placeholder="New drop"
            />
            <div>
              <label htmlFor={`${fieldId}-category`} className="eyebrow text-[#8d887f]">
                Category
              </label>
              <select
                id={`${fieldId}-category`}
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
                className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--ink)]"
              >
                {categoryOptions.length === 0 ? <option value="">No categories yet</option> : null}
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <TextField
              id={`${fieldId}-wheel`}
              label="Wheel size"
              value={form.wheelSize}
              onChange={(value) => update("wheelSize", value)}
              placeholder={'20"'}
            />
          </div>
        </section>

        <section className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              id={`${fieldId}-price`}
              label="Price"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(value) => update("price", value)}
              placeholder="549.00"
              required
            />
            <TextField
              id={`${fieldId}-compare`}
              label="Compare at price"
              type="number"
              min={0}
              step="0.01"
              value={form.compareAtPrice}
              onChange={(value) => update("compareAtPrice", value)}
              placeholder="Empty means no discount"
              hint="Leave blank to hide the crossed-out price."
            />
            <TextField
              id={`${fieldId}-stock`}
              label="Stock"
              type="number"
              min={0}
              step={1}
              value={form.stock}
              onChange={(value) => update("stock", value)}
              required
            />
            <TextField
              id={`${fieldId}-rating`}
              label="Rating"
              type="number"
              min={0}
              max={5}
              step="0.1"
              value={form.rating}
              onChange={(value) => update("rating", value)}
              placeholder="4.8"
            />
            <TextField
              id={`${fieldId}-reviews`}
              label="Review count"
              type="number"
              min={0}
              step={1}
              value={form.reviewCount}
              onChange={(value) => update("reviewCount", value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                id={`${fieldId}-active`}
                label="Active"
                checked={form.active}
                onChange={(value) => update("active", value)}
              />
              <Toggle
                id={`${fieldId}-featured`}
                label="Featured"
                checked={form.featured}
                onChange={(value) => update("featured", value)}
              />
            </div>
          </div>
        </section>

        <section className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id={`${fieldId}-toptube`}
              label="Top tube"
              value={form.topTube}
              onChange={(value) => update("topTube", value)}
              placeholder={'19.5"'}
            />
            <TextField
              id={`${fieldId}-material`}
              label="Frame material"
              value={form.frameMaterial}
              onChange={(value) => update("frameMaterial", value)}
              placeholder="Chromoly"
            />
            <TextField
              id={`${fieldId}-skill`}
              label="Skill level"
              value={form.skillLevel}
              onChange={(value) => update("skillLevel", value)}
              placeholder="Intermediate"
            />
            <TextField
              id={`${fieldId}-styles`}
              label="Riding style"
              value={form.ridingStyle}
              onChange={(value) => update("ridingStyle", value)}
              placeholder="Street, Park"
              hint="Comma separated."
            />
            <TextField
              id={`${fieldId}-colors`}
              label="Colors"
              value={form.colors}
              onChange={(value) => update("colors", value)}
              placeholder="Matte Black, Toxic"
              hint="Comma separated."
            />
            <TextField
              id={`${fieldId}-sizes`}
              label="Sizes"
              value={form.sizes}
              onChange={(value) => update("sizes", value)}
              placeholder="M, L"
              hint="Comma separated."
            />
          </div>
        </section>

        <section className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
          <div>
            <label htmlFor={`${fieldId}-description`} className="eyebrow text-[#8d887f]">
              Description
            </label>
            <textarea
              id={`${fieldId}-description`}
              rows={5}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="A full chromoly frame built for the park, ready for the concrete."
              className="mt-2 w-full border border-[#d8d3ca] bg-white p-3 text-sm leading-6 outline-none focus:border-[var(--ink)]"
            />
          </div>
        </section>

        <section className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
          <ImageDropzone
            label="Main image"
            hint="Drop the main image here or click to browse"
            inputRef={mainInputRef}
            disabled={imageUploading}
            onFiles={(files) => void handleMainFiles(files)}
          />

          {imageUploading ? (
            <p className="mt-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#77726b]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </p>
          ) : null}

          {form.image ? (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden border border-[#e4e0d8] bg-[#eceadf]">
                <Image
                  src={form.image}
                  alt="Main image preview"
                  width={128}
                  height={128}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => mainInputRef.current?.click()}
                  className={GHOST_BUTTON_CLASS}
                  disabled={imageUploading}
                >
                  <ImagePlus className="h-4 w-4" /> Replace
                </button>
                <button type="button" onClick={() => update("image", "")} className={GHOST_BUTTON_CLASS}>
                  <X className="h-4 w-4" /> Remove
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <TextField
              id={`${fieldId}-image-url`}
              label="Image URL"
              value={form.image}
              onChange={(value) => update("image", value)}
              placeholder="https://cdn.example.com/bike.jpg"
              hint="Paste a URL instead when uploads are not configured on this host."
            />
          </div>
        </section>

        <section className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
          <ImageDropzone
            label="Gallery"
            hint="Drop gallery images here or click to browse (multiple allowed)"
            multiple
            inputRef={galleryInputRef}
            onFiles={(files) => void handleGalleryFiles(files)}
          />

          {pendingUploads.length > 0 ? (
            <p className="mt-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#77726b]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading {pendingUploads.length} image
              {pendingUploads.length === 1 ? "" : "s"}…
            </p>
          ) : null}

          {form.gallery.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {form.gallery.map((url, index) => (
                <div key={url} className="relative">
                  <div className="relative h-24 w-full overflow-hidden border border-[#e4e0d8] bg-[#eceadf]">
                    <Image src={url} alt="" width={96} height={96} unoptimized className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGallery(url)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center border border-[#d8d3ca] bg-white text-[#a5372a] transition hover:border-[#a5372a]"
                    aria-label={`Remove gallery image ${index + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => moveGallery(index, -1)}
                      disabled={index === 0}
                      className={`${ICON_BUTTON_CLASS} disabled:opacity-40`}
                      aria-label={`Move gallery image ${index + 1} left`}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => promoteGallery(url)}
                      className={ICON_BUTTON_CLASS}
                      aria-label={`Set gallery image ${index + 1} as the main image`}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveGallery(index, 1)}
                      disabled={index === form.gallery.length - 1}
                      className={`${ICON_BUTTON_CLASS} disabled:opacity-40`}
                      aria-label={`Move gallery image ${index + 1} right`}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-[#77726b]">No gallery images yet.</p>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <TextField
              id={`${fieldId}-gallery-urls`}
              label="Or paste gallery URLs"
              value={galleryUrls}
              onChange={setGalleryUrls}
              placeholder="https://cdn.example.com/1.jpg, https://cdn.example.com/2.jpg"
              hint="Comma separated. They are appended to the gallery."
            />
            <button type="button" onClick={appendGalleryUrls} className={GHOST_BUTTON_CLASS}>
              <Plus className="h-4 w-4" /> Add URLs
            </button>
          </div>
        </section>

        <section className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
          <p className="eyebrow text-[#8d887f]">Specs</p>
          <div className="mt-3">
            <SpecRows rows={form.specs} onChange={(rows) => update("specs", rows)} />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border border-[#ddd9d1] bg-[var(--cream)] p-5">
          <p className="text-xs text-[#77726b]">
            {uploadsPending
              ? "Waiting for the image uploads to finish…"
              : form.id
                ? "Editing an existing bike."
                : "This bike goes live as soon as you save it."}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className={GHOST_BUTTON_CLASS}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadsPending}
              className="flex h-12 items-center justify-center gap-2 bg-[var(--orange)] px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--ink)] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save product
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Catalog"
        description="Every bike in the store, hidden ones included. Toggle visibility without opening the editor."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="flex h-10 items-center gap-2 bg-[var(--orange)] px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--ink)]"
          >
            <Plus className="h-4 w-4" /> Add product
          </button>
        }
      />

      <div className="flex flex-col gap-3 border border-[#ddd9d1] bg-[var(--cream)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(ALL_CATEGORIES)}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] transition ${
              categoryFilter === ALL_CATEGORIES
                ? "bg-[var(--ink)] text-white"
                : "border border-[#d8d3ca] text-[#625e57] hover:border-[var(--ink)] hover:text-[var(--ink)]"
            }`}
          >
            all
          </button>
          {categoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] transition ${
                categoryFilter === category
                  ? "bg-[var(--ink)] text-white"
                  : "border border-[#d8d3ca] text-[#625e57] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 border border-[#d8d3ca] bg-white px-3 lg:w-72">
          <Search className="h-4 w-4 text-[#8d887f]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="h-10 w-full bg-transparent text-sm outline-none"
            aria-label="Search products"
          />
        </label>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 border border-[#ddd9d1] bg-[var(--cream)] px-5 py-4 text-xs font-bold text-[#77726b]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading products…
        </p>
      ) : visible.length === 0 ? (
        <EmptyState
          label={
            products.length === 0
              ? "No products yet. Add your first bike to the catalog."
              : "No products match this search."
          }
        />
      ) : (
        <div className="space-y-2">
          {visible.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              busy={busyId === product.id}
              onEdit={() => openEdit(product)}
              onDelete={() => void removeProduct(product)}
              onToggle={() => void toggleActive(product)}
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
      <Package className="h-6 w-6 text-[#b6b1a8]" />
      <p className="text-sm text-[#77726b]">{label}</p>
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  hint?: string;
};

function TextField({ id, label, value, onChange, type = "text", placeholder, required, min, max, step, hint }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow text-[#8d887f]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        className={INPUT_CLASS}
      />
      {hint ? <span className="mt-1.5 block text-[11px] leading-4 text-[#8d887f]">{hint}</span> : null}
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 border border-[#d8d3ca] bg-white px-3 py-2.5 transition hover:border-[var(--ink)]"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--orange)]"
      />
      <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#494641]">{label}</span>
    </label>
  );
}

type ImageDropzoneProps = {
  label: string;
  hint: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
};

function ImageDropzone({ label, hint, inputRef, onFiles, multiple = false, disabled = false }: ImageDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  function handleFiles(list: FileList | null) {
    const picked = list ? Array.from(list).filter((file) => file.type.startsWith("image/")) : [];
    if (picked.length > 0) onFiles(picked);
  }

  return (
    <div>
      <p className="eyebrow text-[#8d887f]">{label}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer?.files ?? null);
        }}
        className={`mt-2 flex w-full flex-col items-center gap-2 border border-dashed px-4 py-8 text-center transition disabled:opacity-60 ${
          dragging
            ? "border-[var(--orange)] bg-[#fff5ef]"
            : "border-[#d8d3ca] hover:border-[var(--ink)]"
        }`}
      >
        {multiple ? <ImagePlus className="h-5 w-5 text-[var(--orange)]" /> : <Upload className="h-5 w-5 text-[var(--orange)]" />}
        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#494641]">{hint}</span>
        <span className="text-[11px] text-[#8d887f]">JPG, PNG or WEBP. Uploading starts the moment you drop.</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function SpecRows({ rows, onChange }: { rows: SpecRow[]; onChange: (rows: SpecRow[]) => void }) {
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-xs text-[#77726b]">No specs yet. Add the rows you want on the product page.</p>
      ) : (
        rows.map((row, index) => (
          <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-center">
            <input
              value={row.key}
              onChange={(event) =>
                onChange(rows.map((item) => (item.id === row.id ? { ...item, key: event.target.value } : item)))
              }
              placeholder="Weight"
              aria-label={`Spec ${index + 1} label`}
              className="h-10 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
            />
            <input
              value={row.value}
              onChange={(event) =>
                onChange(rows.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item)))
              }
              placeholder="11.2 kg"
              aria-label={`Spec ${index + 1} value`}
              className="h-10 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
              className="flex h-10 w-10 items-center justify-center border border-[#d8d3ca] text-[#a5372a] transition hover:border-[#a5372a]"
              aria-label={`Remove spec ${row.key.trim() || index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={() => onChange([...rows, { id: nextRowId(), key: "", value: "" }])}
        className="flex h-10 items-center gap-2 border border-[#d8d3ca] px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#625e57] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
      >
        <Plus className="h-4 w-4" /> Add spec
      </button>
    </div>
  );
}

type ProductRowProps = {
  product: AdminProduct;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
};

function ProductRow({ product, busy, onEdit, onDelete, onToggle }: ProductRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border border-[#ddd9d1] bg-[var(--cream)] p-4 sm:flex-nowrap">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-[#e4e0d8] bg-[#eceadf]">
        {product.image ? (
          <Image src={product.image} alt="" width={80} height={80} unoptimized className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[#b6b1a8]">
            <ImagePlus className="h-5 w-5" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
          <span className="truncate">{product.name}</span>
          <span
            className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${
              product.active ? "bg-[#e5f5e8] text-[#2c7a3f]" : "bg-[#f0ece5] text-[#77726b]"
            }`}
          >
            {product.active ? "active" : "hidden"}
          </span>
          {product.featured ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--orange)]">
              <Star className="h-3 w-3" /> featured
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-[#77726b]">
          {product.brand} · {product.category} · {product.wheelSize} wheel
        </p>
        <p className="mt-1 text-xs text-[#8d887f]">
          {product.stock} in stock · {product.gallery?.length ?? 0} gallery image
          {(product.gallery?.length ?? 0) === 1 ? "" : "s"}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-extrabold">{formatPrice(Number(product.price))}</p>
        {product.compareAtPrice ? (
          <p className="mt-1 text-xs text-[#8d887f] line-through">{formatPrice(Number(product.compareAtPrice))}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={`flex h-10 items-center gap-2 border px-3 text-[10px] font-extrabold uppercase tracking-[0.1em] transition disabled:opacity-60 ${
            product.active
              ? "border-[#d8d3ca] text-[#625e57] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              : "border-[#2c7a3f] text-[#2c7a3f] hover:bg-[#2c7a3f] hover:text-white"
          }`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {product.active ? "Hide" : "Show"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="h-10 border border-[#d8d3ca] px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#494641] transition hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-60"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="flex h-10 w-10 items-center justify-center border border-[#d8d3ca] text-[#a5372a] transition hover:border-[#a5372a] disabled:opacity-60"
          aria-label={`Delete ${product.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
