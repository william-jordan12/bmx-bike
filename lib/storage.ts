import { createHash, randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 8 * 1024 * 1024;

const SIGNATURES: ReadonlyArray<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    ext: "png",
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a
  },
  { mime: "image/gif", ext: "gif", test: (b) => b.length > 6 && b.subarray(0, 4).toString("latin1") === "GIF8" },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) =>
      b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP"
  },
  {
    mime: "image/avif",
    ext: "avif",
    test: (b) => b.length > 12 && b.subarray(4, 8).toString("latin1") === "ftyp" && b.subarray(8, 12).toString("latin1").includes("avif")
  }
];

export type StoredImage = {
  url: string;
  bytes: number;
  driver: "cloudinary" | "local";
  originalName: string;
};

export type StorageStatus = {
  driver: "cloudinary" | "local";
  persistent: boolean;
  detail: string;
};

function cloudinaryConfig() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();
  if (cloud && preset) return { cloud, preset };
  return null;
}

export function storageStatus(): StorageStatus {
  const cloud = cloudinaryConfig();
  if (cloud) {
    return {
      driver: "cloudinary",
      persistent: true,
      detail: `Cloudinary cloud "${cloud}"`
    };
  }
  return {
    driver: "local",
    persistent: process.env.NODE_ENV !== "production",
    detail:
      process.env.NODE_ENV === "production"
        ? "Local disk: uploads disappear on redeploy. Add CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET to make them permanent."
        : "Local disk in public/uploads. Fine for development."
  };
}

export function sniffImageType(buffer: Buffer): { mime: string; ext: string } | null {
  return SIGNATURES.find((signature) => signature.test(buffer)) ?? null;
}

function safeBaseName(originalName: string) {
  const withoutExt = originalName.replace(/\.[^.]+$/, "");
  const slug = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "image";
}

async function saveLocally(file: File, buffer: Buffer, ext: string, folder: string): Promise<string> {
  const targetDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(targetDir, { recursive: true });

  const digest = createHash("sha1").update(buffer).digest("hex").slice(0, 8);
  const name = `${safeBaseName(file.name)}-${digest}.${ext}`;
  await writeFile(path.join(targetDir, name), buffer);

  return `/uploads/${folder}/${name}`;
}

async function saveToCloudinary(file: File, buffer: Buffer, folder: string): Promise<string> {
  const cloud = cloudinaryConfig();
  if (!cloud) throw new Error("Cloudinary is not configured.");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: file.type || "application/octet-stream" }), file.name);
  form.append("upload_preset", cloud.preset);
  form.append("folder", `ride-bmx/${folder}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloud}/image/upload`, {
    method: "POST",
    body: form
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${response.status}). ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as { secure_url?: string };
  if (!payload.secure_url) throw new Error("Cloudinary did not return an image URL.");
  return payload.secure_url;
}

export async function storeImage(file: File, folder = "products"): Promise<StoredImage> {
  if (file.size === 0) throw new Error("That file is empty.");
  if (file.size > MAX_BYTES) throw new Error("Images must be 8MB or smaller.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(buffer);
  if (!type) throw new Error("Unsupported image. Use JPG, PNG, WebP, GIF or AVIF.");

  const useCloudinary = Boolean(cloudinaryConfig());
  const url = useCloudinary
    ? await saveToCloudinary(file, buffer, folder)
    : await saveLocally(file, buffer, type.ext, folder);

  return {
    url,
    bytes: file.size,
    driver: useCloudinary ? "cloudinary" : "local",
    originalName: file.name.slice(0, 120)
  };
}

export async function removeStoredImage(url: string): Promise<boolean> {
  if (!url.startsWith("/uploads/")) return false;
  const relative = url.replace(/^\/uploads\//, "");
  const target = path.join(process.cwd(), "public", "uploads", relative);
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  if (!target.startsWith(uploadsRoot)) return false;
  try {
    await unlink(target);
    return true;
  } catch {
    return false;
  }
}

export function randomSlugSuffix() {
  return randomBytes(3).toString("hex");
}
