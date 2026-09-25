import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { storageStatus, storeImage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ ok: true, storage: storageStatus() });
}

export async function POST(req: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  if (!env.databaseUrl) {
    return NextResponse.json(
      { ok: false, error: "Uploads are unavailable: the database is not configured." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Send the image as multipart/form-data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No image file was received." }, { status: 400 });
  }

  try {
    const stored = await storeImage(file, "products");
    return NextResponse.json({ ok: true, ...stored }, { status: 201 });
  } catch (err) {
    const error = err instanceof Error ? err.message : "The image could not be stored.";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
}
