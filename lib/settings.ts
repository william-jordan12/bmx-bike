import { getPool, initDb, SETTING_KEYS, type SettingKey } from "./db";
import { env } from "./env";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "./site-settings";

export type { SiteSettings };

type SettingField = keyof SiteSettings;

const SETTING_ENTRIES: ReadonlyArray<{ key: SettingKey; field: SettingField }> = [
  { key: "contact_email", field: "contactEmail" },
  { key: "phone", field: "phone" },
  { key: "address", field: "address" },
  { key: "whatsapp", field: "whatsapp" },
  { key: "instagram", field: "instagram" },
  { key: "facebook", field: "facebook" },
  { key: "tiktok", field: "tiktok" },
  { key: "youtube", field: "youtube" },
  { key: "currency", field: "currency" }
];

export function sanitizeWhatsApp(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidSocialUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidCurrency(value: string): boolean {
  return /^[A-Z]{3}$/.test(value.trim().toUpperCase());
}

export function isValidWhatsApp(value: string): boolean {
  const digits = sanitizeWhatsApp(value);
  return digits.length === 0 || /^\d{7,15}$/.test(digits);
}

export function settingsFallback(): SiteSettings {
  return {
    contactEmail: env.contactEmail || DEFAULT_SITE_SETTINGS.contactEmail,
    phone: env.phone || DEFAULT_SITE_SETTINGS.phone,
    address: env.address || DEFAULT_SITE_SETTINGS.address,
    whatsapp: sanitizeWhatsApp(env.whatsapp),
    instagram: env.instagram,
    facebook: env.facebook,
    tiktok: env.tiktok,
    youtube: env.youtube,
    currency: env.currency
  };
}

function normalizeSettings(values: SiteSettings): SiteSettings {
  return {
    contactEmail: values.contactEmail.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
    whatsapp: sanitizeWhatsApp(values.whatsapp),
    instagram: values.instagram.trim(),
    facebook: values.facebook.trim(),
    tiktok: values.tiktok.trim(),
    youtube: values.youtube.trim(),
    currency: values.currency.trim().toUpperCase()
  };
}

export async function getSettings(): Promise<SiteSettings> {
  if (!env.databaseUrl) return settingsFallback();

  try {
    await initDb();
    const result = await getPool().query(
      `SELECT key, value FROM bmx_settings WHERE key = ANY($1::text[])`,
      [[...SETTING_KEYS]]
    );

    const stored = new Map<string, string>();
    for (const row of result.rows) {
      stored.set(String(row.key), String(row.value));
    }

    const fallback = settingsFallback();
    const resolved = {} as SiteSettings;
    for (const entry of SETTING_ENTRIES) {
      resolved[entry.field] = stored.get(entry.key) || fallback[entry.field];
    }
    return normalizeSettings(resolved);
  } catch (err) {
    console.error("getSettings error", err);
    return settingsFallback();
  }
}

export async function saveSettings(settings: SiteSettings): Promise<SiteSettings> {
  await initDb();

  const next = normalizeSettings(settings);
  const values = SETTING_ENTRIES.map((entry) => [entry.key, next[entry.field]] as const);
  const tuples = values.map((_value, index) => `($${index * 2 + 1}, $${index * 2 + 2})`);

  await getPool().query(
    `INSERT INTO bmx_settings (key, value) VALUES ${tuples.join(", ")}
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    values.flatMap(([key, value]) => [key, value])
  );

  return next;
}
