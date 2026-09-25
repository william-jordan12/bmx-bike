"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BadgeCheck,
  Boxes,
  ChevronDown,
  ExternalLink,
  Hash,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShoppingBag,
  Trash2,
  UserRound,
  Wallet,
  X
} from "lucide-react";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import PasswordField from "@/components/admin/password-field";

type Admin = { id: string; username: string };
type Tab = "overview" | "categories" | "orders" | "account" | "settings";
type Notice = { kind: "success" | "error"; text: string } | null;

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
};

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

type Order = {
  id: string;
  reference: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  delivery_method: string;
  status: OrderStatus;
  subtotal: string | number;
  total: string | number;
  item_count: number;
  created_at: string;
};

type OrderItem = {
  id: string;
  product_slug: string;
  product_name: string;
  price: string | number;
  qty: number;
};

const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const TABS: ReadonlyArray<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "categories", label: "Categories", icon: Boxes },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "account", label: "Admin account", icon: UserRound },
  { id: "settings", label: "Contact & social", icon: Settings2 }
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-[#fff3e0] text-[#a35d10]",
  confirmed: "bg-[#e6f0ff] text-[#1f4fa8]",
  shipped: "bg-[#efe9ff] text-[#5735b8]",
  delivered: "bg-[#e5f5e8] text-[#2c7a3f]",
  cancelled: "bg-[#fbe6e3] text-[#a5372a]"
};

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loadingPanel, setLoadingPanel] = useState(false);

  const notify = useCallback((kind: "success" | "error", text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await response.json();
      setAdmin(data.authenticated ? (data.admin as Admin) : null);
      return Boolean(data.authenticated);
    } catch {
      setAdmin(null);
      return false;
    } finally {
      setReady(true);
    }
  }, []);

  const loadPanel = useCallback(
    async (target: Tab) => {
      setLoadingPanel(true);
      try {
        if (target === "categories") {
          const response = await fetch("/api/admin/categories", { cache: "no-store" });
          const data = await response.json();
          if (response.ok) setCategories(data.categories ?? []);
        }
        if (target === "orders" || target === "overview") {
          const response = await fetch("/api/admin/orders", { cache: "no-store" });
          const data = await response.json();
          if (response.ok) setOrders(data.orders ?? []);
        }
        if (target === "settings" || target === "overview") {
          const response = await fetch("/api/admin/settings", { cache: "no-store" });
          const data = await response.json();
          if (response.ok && data.settings) setSettings(data.settings);
        }
      } catch {
        notify("error", "Could not load this section. Is the database reachable?");
      } finally {
        setLoadingPanel(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    void (async () => {
      const authed = await loadSession();
      if (authed) await loadPanel("overview");
    })();
  }, [loadPanel, loadSession]);

  function selectTab(next: Tab) {
    setTab(next);
    if (admin) void loadPanel(next);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/admin/login");
    router.refresh();
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 text-sm font-bold text-[#77726b]">
        <Loader2 className="h-5 w-5 animate-spin" /> Checking your session…
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-5 text-center">
        <p className="eyebrow text-[var(--orange)]">Staff area</p>
        <h1 className="text-3xl font-extrabold tracking-tight">You need to sign in</h1>
        <p className="max-w-sm text-sm leading-6 text-[#625e57]">
          Sessions expire for security. Head back to the sign-in screen to manage the shop.
        </p>
        <Link
          href="/admin/login"
          className="flex h-12 items-center gap-2 bg-[var(--orange)] px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white"
        >
          Go to sign in
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] lg:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[var(--ink)] text-white transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#2c2a26] px-5 py-5">
          <Link href="/" className="font-display text-2xl">
            RIDE<span className="text-[var(--orange)]">{"//"}</span>BMX
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center border border-[#3c3934] lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  selectTab(item.id);
                }}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-bold transition ${
                  tab === item.id
                    ? "bg-[var(--orange)] text-white"
                    : "text-[#a8a39b] hover:bg-[#232120] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#2c2a26] p-4">
          <div className="flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2c2a26] text-xs font-extrabold uppercase">
              {admin.username.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{admin.username}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#77736c]">Administrator</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              href="/"
              className="flex h-10 flex-1 items-center justify-center gap-2 border border-[#3c3934] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8a39b] hover:border-white hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Store
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex h-10 flex-1 items-center justify-center gap-2 border border-[#3c3934] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a8a39b] hover:border-[var(--orange)] hover:text-[var(--orange)]"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#151515]/55 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-4 border-b border-[#ddd9d1] bg-[var(--cream)] px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center border border-[#ddd9d1] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="eyebrow text-[#8d887f]">RIDE{"//"}BMX control room</p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight">
                {TABS.find((item) => item.id === tab)?.label}
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadPanel(tab)}
            className="flex h-10 items-center gap-2 border border-[#ddd9d1] px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#625e57] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
          >
            {loadingPanel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <main className="px-5 py-6 lg:px-8 lg:py-8">
          {tab === "overview" ? <OverviewTab orders={orders} categories={categories} currency={settings.currency} /> : null}
          {tab === "categories" ? (
            <CategoriesTab categories={categories} onChange={setCategories} notify={notify} />
          ) : null}
          {tab === "orders" ? <OrdersTab orders={orders} setOrders={setOrders} notify={notify} currency={settings.currency} /> : null}
          {tab === "account" ? <AccountTab admin={admin} setAdmin={setAdmin} notify={notify} /> : null}
          {tab === "settings" ? <SettingsTab settings={settings} setSettings={setSettings} notify={notify} /> : null}
        </main>
      </div>

      {notice ? (
        <div
          className={`fixed bottom-5 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 px-4 py-3 text-xs font-bold text-white shadow-2xl ${
            notice.kind === "success" ? "bg-[#2c7a3f]" : "bg-[#a5372a]"
          }`}
          role="status"
        >
          {notice.kind === "success" ? <BadgeCheck className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {notice.text}
        </div>
      ) : null}
    </div>
  );
}

type NotifyFn = (kind: "success" | "error", text: string) => void;

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

function OverviewTab({ orders, categories, currency }: { orders: Order[]; categories: Category[]; currency: string }) {
  const formatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }),
    [currency]
  );
  const revenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total), 0);
  const pending = orders.filter((order) => order.status === "pending").length;
  const stats = [
    { label: "Orders", value: String(orders.length), icon: ShoppingBag },
    { label: "Needs action", value: String(pending), icon: Package },
    { label: "Revenue", value: formatter.format(revenue), icon: Wallet },
    { label: "Categories", value: String(categories.length), icon: Boxes }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-[#8d887f]">{stat.label}</p>
                <Icon className="h-4 w-4 text-[var(--orange)]" />
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <Panel title="Latest orders" description="The five most recent orders across every status." />
      <div className="space-y-2">
        {orders.length === 0 ? (
          <EmptyState label="No orders yet. They will show up here as soon as customers check out." />
        ) : (
          orders.slice(0, 5).map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-[#ddd9d1] bg-[var(--cream)] px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-extrabold">
                  {order.reference} <span className="font-semibold text-[#77726b]">· {order.customer_name}</span>
                </p>
                <p className="mt-1 text-xs text-[#8d887f]">
                  {new Date(order.created_at).toLocaleString()} · {order.item_count} item{order.item_count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${STATUS_STYLES[order.status]}`}>
                  {order.status}
                </span>
                <span className="text-sm font-extrabold">{formatter.format(Number(order.total))}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CategoriesTab({
  categories,
  onChange,
  notify
}: {
  categories: Category[];
  onChange: (next: Category[]) => void;
  notify: NotifyFn;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description })
      });
      const data = await response.json();
      if (!response.ok) {
        notify("error", data.error ?? "Could not create the category.");
        return;
      }
      onChange([...categories, data.category as Category].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setDescription("");
      notify("success", `“${data.category.name}” added.`);
    } catch {
      notify("error", "Network error while creating the category.");
    } finally {
      setPending(false);
    }
  }

  function startEdit(category: Category) {
    setEditing(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
  }

  async function saveEdit(id: string) {
    const response = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDescription })
    });
    const data = await response.json();
    if (!response.ok) {
      notify("error", data.error ?? "Could not update the category.");
      return;
    }
    onChange(
      categories
        .map((category) => (category.id === id ? (data.category as Category) : category))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditing(null);
    notify("success", "Category updated.");
  }

  async function removeCategory(category: Category) {
    const confirmed = window.confirm(
      `Delete “${category.name}”? Products keep their catalog names, but this category disappears from the admin list.`
    );
    if (!confirmed) return;
    const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      notify("error", data.error ?? "Could not delete the category.");
      return;
    }
    onChange(categories.filter((item) => item.id !== category.id));
    notify("success", `“${category.name}” deleted.`);
  }

  return (
    <div className="space-y-6">
      <Panel title="Add a category" description="Categories power the catalog filters and the storefront navigation." />
      <form onSubmit={createCategory} className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_1.6fr_auto] md:items-end">
          <label className="block">
            <span className="eyebrow text-[#8d887f]">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="BMX Park"
              className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
            />
          </label>
          <label className="block">
            <span className="eyebrow text-[#8d887f]">Description</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Complete bikes built for the park"
              className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 items-center justify-center gap-2 bg-[var(--orange)] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--ink)] disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </div>
      </form>

      <Panel
        title={`${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
        description="Edit names and blurbs inline, or remove a category entirely."
      />
      <div className="space-y-2">
        {categories.length === 0 ? (
          <EmptyState label="No categories yet. Add your first one above." />
        ) : (
          categories.map((category) => (
            <div key={category.id} className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
              {editing === category.id ? (
                <div className="grid gap-3 md:grid-cols-[1fr_1.6fr_auto] md:items-end">
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
                    aria-label="Category name"
                  />
                  <input
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    className="h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
                    aria-label="Category description"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEdit(category.id)}
                      className="flex h-11 items-center gap-2 bg-[var(--ink)] px-4 text-xs font-extrabold uppercase tracking-[0.1em] text-white"
                    >
                      <Save className="h-4 w-4" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="flex h-11 items-center border border-[#d8d3ca] px-4 text-xs font-extrabold uppercase tracking-[0.1em] text-[#625e57]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-extrabold">
                      {category.name}
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8d887f]">
                        <Hash className="h-3 w-3" />
                        {category.slug}
                      </span>
                    </p>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-[#77726b]">
                      {category.description || "No description yet."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      className="h-10 border border-[#d8d3ca] px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#494641] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeCategory(category)}
                      className="flex h-10 w-10 items-center justify-center border border-[#d8d3ca] text-[#a5372a] transition hover:border-[#a5372a]"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OrdersTab({
  orders,
  setOrders,
  notify,
  currency
}: {
  orders: Order[];
  setOrders: (next: Order[]) => void;
  notify: NotifyFn;
  currency: string;
}) {
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const formatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }),
    [currency]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = filter === "all" || order.status === filter;
      const matchesQuery =
        !needle ||
        order.reference.toLowerCase().includes(needle) ||
        order.customer_name.toLowerCase().includes(needle) ||
        order.email.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [orders, filter, query]);

  async function openOrder(order: Order) {
    if (openId === order.id) {
      setOpenId(null);
      setItems([]);
      return;
    }
    setOpenId(order.id);
    setItems([]);
    setLoadingItems(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setItems(data.order?.items ?? []);
    } catch {
      notify("error", "Could not load the order details.");
    } finally {
      setLoadingItems(false);
    }
  }

  async function changeStatus(order: Order, status: OrderStatus) {
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) {
      notify("error", data.error ?? "Could not update the order.");
      return;
    }
    setOrders(orders.map((item) => (item.id === order.id ? { ...item, status } : item)));
    notify("success", `${order.reference} marked ${status}.`);
  }

  return (
    <div className="space-y-6">
      <Panel title="Orders" description="Filter by status or search by reference, name or email." />
      <div className="flex flex-col gap-3 border border-[#ddd9d1] bg-[var(--cream)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", ...ORDER_STATUSES] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] transition ${
                filter === status
                  ? "bg-[var(--ink)] text-white"
                  : "border border-[#d8d3ca] text-[#625e57] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 border border-[#d8d3ca] bg-white px-3 lg:w-72">
          <Search className="h-4 w-4 text-[#8d887f]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search orders"
            className="h-10 w-full bg-transparent text-sm outline-none"
            aria-label="Search orders"
          />
        </label>
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <EmptyState label="No orders match this filter." />
        ) : (
          visible.map((order) => (
            <div key={order.id} className="border border-[#ddd9d1] bg-[var(--cream)]">
              <button
                type="button"
                onClick={() => void openOrder(order)}
                className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">{order.reference}</p>
                  <p className="mt-1 text-xs text-[#77726b]">
                    {order.customer_name} · {order.email}
                  </p>
                  <p className="mt-1 text-[11px] text-[#8d887f]">
                    {new Date(order.created_at).toLocaleString()} · {order.item_count} item
                    {order.item_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </span>
                  <span className="text-sm font-extrabold">{formatter.format(Number(order.total))}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#8d887f] transition-transform ${openId === order.id ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {openId === order.id ? (
                <div className="border-t border-[#e4e0d8] px-5 py-5">
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                    <div>
                      <p className="eyebrow text-[#8d887f]">Items</p>
                      {loadingItems ? (
                        <p className="mt-3 flex items-center gap-2 text-xs text-[#77726b]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading items…
                        </p>
                      ) : items.length === 0 ? (
                        <p className="mt-3 text-xs text-[#77726b]">No line items recorded.</p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-3 border-b border-[#eeeae2] pb-2 text-sm"
                            >
                              <span>
                                {item.qty}× {item.product_name}
                              </span>
                              <span className="font-bold">{formatter.format(Number(item.price) * item.qty)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="eyebrow text-[#8d887f]">Customer</p>
                        <p className="mt-2 space-y-1 text-xs text-[#4e4a44]">
                          <span className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-[var(--orange)]" /> {order.email}
                          </span>
                          {order.phone ? (
                            <span className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-[var(--orange)]" /> {order.phone}
                            </span>
                          ) : null}
                          <span className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--orange)]" />
                            <span>
                              {order.address}
                              {order.city ? `, ${order.city}` : ""}
                              {order.country ? `, ${order.country}` : ""}
                            </span>
                          </span>
                        </p>
                      </div>
                      {order.notes ? (
                        <div>
                          <p className="eyebrow text-[#8d887f]">Notes</p>
                          <p className="mt-2 text-xs leading-5 text-[#4e4a44]">{order.notes}</p>
                        </div>
                      ) : null}
                      <div>
                        <p className="eyebrow text-[#8d887f]">Status</p>
                        <select
                          value={order.status}
                          onChange={(event) => void changeStatus(order, event.target.value as OrderStatus)}
                          className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--ink)]"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AccountTab({
  admin,
  setAdmin,
  notify
}: {
  admin: Admin;
  setAdmin: (next: Admin) => void;
  notify: NotifyFn;
}) {
  const [username, setUsername] = useState(admin.username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await response.json();
      if (!response.ok) {
        notify("error", data.error ?? "Could not update the username.");
        return;
      }
      setAdmin(data.admin as Admin);
      notify("success", `Signed in as ${data.admin.username}.`);
    } catch {
      notify("error", "Network error while updating the username.");
    } finally {
      setPending(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      notify("error", "The new passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        notify("error", data.error ?? "Could not change the password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("success", "Password changed. Other sessions were signed out.");
    } catch {
      notify("error", "Network error while changing the password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Admin username"
        description="Used to sign in. Letters, numbers, dots, dashes and underscores, 3 to 40 characters."
      />
      <form onSubmit={saveUsername} className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="eyebrow text-[#8d887f]">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 items-center justify-center gap-2 bg-[var(--ink)] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--orange)] disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> Save username
          </button>
        </div>
      </form>

      <Panel
        title="Admin password"
        description="Minimum 10 characters. Changing it signs out every other device immediately."
      />
      <form onSubmit={savePassword} className="border border-[#ddd9d1] bg-[var(--cream)] p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            required
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            minLength={10}
            required
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            minLength={10}
            required
            invalid={Boolean(confirmPassword) && confirmPassword !== newPassword}
            hint={
              confirmPassword && confirmPassword !== newPassword ? "Passwords do not match yet." : undefined
            }
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-4 flex h-11 items-center justify-center gap-2 bg-[var(--ink)] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--orange)] disabled:opacity-60"
        >
          <UserRound className="h-4 w-4" /> Change password
        </button>
      </form>
    </div>
  );
}

function SettingsTab({
  settings,
  setSettings,
  notify
}: {
  settings: SiteSettings;
  setSettings: (next: SiteSettings) => void;
  notify: NotifyFn;
}) {
  const [form, setForm] = useState<SiteSettings>(settings);
  const [pending, setPending] = useState(false);

  const socialFields: ReadonlyArray<{ key: keyof SiteSettings; label: string; placeholder: string }> = [
    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbrand" },
    { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourbrand" },
    { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourbrand" },
    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourbrand" }
  ];

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) {
        notify("error", data.error ?? "Could not save the settings.");
        return;
      }
      setSettings(data.settings as SiteSettings);
      setForm(data.settings as SiteSettings);
      notify("success", "Contact details and social links updated.");
    } catch {
      notify("error", "Network error while saving settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Panel
        title="Contact details"
        description="Shown in the storefront footer and used for order notifications."
      />
      <div className="grid gap-4 border border-[#ddd9d1] bg-[var(--cream)] p-5 md:grid-cols-2">
        <label className="block">
          <span className="eyebrow text-[#8d887f]">Contact email</span>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
            required
            className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
          />
        </label>
        <label className="block">
          <span className="eyebrow text-[#8d887f]">Phone</span>
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
          />
        </label>
        <label className="block">
          <span className="eyebrow text-[#8d887f]">Store address</span>
          <input
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
          />
        </label>
        <label className="block">
          <span className="eyebrow text-[#8d887f]">WhatsApp (digits only)</span>
          <input
            value={form.whatsapp}
            onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
            placeholder="15550192669"
            className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
          />
        </label>
        <label className="block">
          <span className="eyebrow text-[#8d887f]">Currency</span>
          <input
            value={form.currency}
            onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })}
            maxLength={3}
            required
            className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm uppercase outline-none focus:border-[var(--ink)]"
          />
        </label>
      </div>

      <Panel title="Social links" description="Full https:// URLs. Leave a field blank to hide that icon in the footer." />
      <div className="grid gap-4 border border-[#ddd9d1] bg-[var(--cream)] p-5 md:grid-cols-2">
        {socialFields.map((field) => (
          <label key={field.key} className="block">
            <span className="eyebrow text-[#8d887f]">{field.label}</span>
            <input
              value={String(form[field.key])}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
              placeholder={field.placeholder}
              className="mt-2 h-11 w-full border border-[#d8d3ca] bg-white px-3 text-sm outline-none focus:border-[var(--ink)]"
            />
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 items-center justify-center gap-2 bg-[var(--orange)] px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--ink)] disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </button>
      </div>
    </form>
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
