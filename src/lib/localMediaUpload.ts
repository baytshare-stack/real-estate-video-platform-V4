import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export const PUBLIC_UPLOADS = path.join(process.cwd(), "public", "uploads");
export const LOCAL_VIDEOS_DIR = path.join(PUBLIC_UPLOADS, "videos");
export const LOCAL_IMAGES_DIR = path.join(PUBLIC_UPLOADS, "images");

const VIDEO_MIMES = new Set(["video/mp4"]);
const IMAGE_MIMES = new Set(["image/jpeg", "image/png"]);

const VIDEO_EXT = new Set([".mp4"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png"]);

export function publicUrlForVideo(filename: string): string {
  return `/uploads/videos/${filename}`;
}

export function publicUrlForImage(filename: string): string {
  return `/uploads/images/${filename}`;
}

export function makeUniqueFilename(originalName: string, allowedExt: Set<string>): string {
  const ext = path.extname(originalName).toLowerCase();
  if (!allowedExt.has(ext)) {
    throw new Error(`Invalid file extension: ${ext || "(none)"}`);
  }
  const stamp = `${Date.now()}-${randomBytes(8).toString("hex")}`;
  return `${stamp}${ext}`;
}

export function assertVideoFile(file: File): void {
  const ext = path.extname(file.name).toLowerCase();
  if (!VIDEO_EXT.has(ext)) {
    throw new Error("Video must be .mp4");
  }
  if (file.type && file.type !== "" && !VIDEO_MIMES.has(file.type)) {
    throw new Error("Video must be MP4 (video/mp4)");
  }
}

export function assertImageFile(file: File): void {
  const ext = path.extname(file.name).toLowerCase();
  if (!IMAGE_EXT.has(ext)) {
    throw new Error("Image must be .jpg, .jpeg, or .png");
  }
  if (file.type && file.type !== "" && !IMAGE_MIMES.has(file.type)) {
    throw new Error("Image must be JPEG or PNG");
  }
}

export async function ensureLocalUploadDirs(): Promise<void> {
  await mkdir(LOCAL_VIDEOS_DIR, { recursive: true });
  await mkdir(LOCAL_IMAGES_DIR, { recursive: true });
}

export async function saveVideoFile(file: File): Promise<{ filename: string; publicPath: string }> {
  assertVideoFile(file);
  await ensureLocalUploadDirs();
  const filename = makeUniqueFilename(file.name, VIDEO_EXT);
  const diskPath = path.join(LOCAL_VIDEOS_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);
  return { filename, publicPath: publicUrlForVideo(filename) };
}

export async function saveImageFile(file: File): Promise<{ filename: string; publicPath: string }> {
  assertImageFile(file);
  await ensureLocalUploadDirs();
  const filename = makeUniqueFilename(file.name, IMAGE_EXT);
  const diskPath = path.join(LOCAL_IMAGES_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);
  return { filename, publicPath: publicUrlForImage(filename) };
}
