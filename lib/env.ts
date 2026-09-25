const DEV_ADMIN_PASSWORD = "ChangeMe123!";

export function getAdminInitialPassword(): string {
  const value = process.env.ADMIN_INITIAL_PASSWORD;
  if (value && value.trim()) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_INITIAL_PASSWORD must be set in production before the database is initialized."
    );
  }
  return DEV_ADMIN_PASSWORD;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL || "",
  databaseCa: process.env.DATABASE_CA || "",
  adminUsername: (process.env.ADMIN_USERNAME || "admin").trim(),
  contactEmail: process.env.CONTACT_EMAIL || "support@ridebmx.com",
  phone: process.env.STORE_PHONE || "+1 (555) 019-2669",
  address: process.env.STORE_ADDRESS || "1420 Ironline Ave, Austin, TX 78702",
  whatsapp: process.env.STORE_WHATSAPP || "",
  instagram: process.env.INSTAGRAM_URL || "https://instagram.com/ridebmx",
  facebook: process.env.FACEBOOK_URL || "",
  tiktok: process.env.TIKTOK_URL || "",
  youtube: process.env.YOUTUBE_URL || "",
  currency: (process.env.STORE_CURRENCY || "USD").toUpperCase(),
  isProduction: process.env.NODE_ENV === "production"
};

export const isDatabaseConfigured = (): boolean => Boolean(env.databaseUrl);
