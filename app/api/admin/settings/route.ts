import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { env } from "@/lib/env";
import {
  getSettings,
  isValidCurrency,
  isValidEmail,
  isValidSocialUrl,
  isValidWhatsApp,
  saveSettings,
  type SiteSettings
} from "@/lib/settings";

export const dynamic = "force-dynamic";

const SOCIAL_FIELDS = ["instagram", "facebook", "tiktok", "youtube"] as const;

export async function GET() {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { error: "Settings are unavailable: the database is not configured." },
      { status: 503 }
    );
  }

  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    await initDb();
    const settings = await getSettings();
    return NextResponse.json({ settings, adminUsername: admin.username });
  } catch (err) {
    console.error("get settings error", err);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!env.databaseUrl) {
    return NextResponse.json(
      { error: "Settings are unavailable: the database is not configured." },
      { status: 503 }
    );
  }

  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    await initDb();

    const body = await req.json();
    const current = await getSettings();
    const next: SiteSettings = { ...current };

    for (const field of [
      "contactEmail",
      "phone",
      "address",
      "whatsapp",
      ...SOCIAL_FIELDS,
      "currency"
    ] as const) {
      const value = body?.[field];
      if (typeof value === "string") {
        next[field] = value;
      }
    }

    if (!next.contactEmail.trim() || !isValidEmail(next.contactEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid contact email." },
        { status: 400 }
      );
    }
    if (!isValidWhatsApp(next.whatsapp)) {
      return NextResponse.json(
        { error: "WhatsApp number must be 7-15 digits." },
        { status: 400 }
      );
    }
    if (!next.currency.trim() || !isValidCurrency(next.currency)) {
      return NextResponse.json(
        { error: "Currency must be a 3-letter code such as USD." },
        { status: 400 }
      );
    }
    for (const field of SOCIAL_FIELDS) {
      if (!isValidSocialUrl(next[field])) {
        return NextResponse.json(
          { error: `${field} must be a valid http(s) URL.` },
          { status: 400 }
        );
      }
    }

    const settings = await saveSettings(next);
    return NextResponse.json({ settings, adminUsername: admin.username });
  } catch (err) {
    console.error("update settings error", err);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
