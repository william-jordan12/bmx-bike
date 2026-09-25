export interface SiteSettings {
  contactEmail: string;
  phone: string;
  address: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  currency: string;
}

export const SITE_SETTING_FIELDS: ReadonlyArray<keyof SiteSettings> = [
  "contactEmail",
  "phone",
  "address",
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "currency"
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  contactEmail: "support@ridebmx.com",
  phone: "+1 (555) 019-2669",
  address: "1420 Ironline Ave, Austin, TX 78702",
  whatsapp: "",
  instagram: "https://instagram.com/ridebmx",
  facebook: "",
  tiktok: "",
  youtube: "",
  currency: "USD"
};

export function isSocialLink(value: string): boolean {
  return /^(https?:\/\/|\/)/i.test(value.trim());
}
