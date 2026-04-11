import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

function cleanEnv(name: string): string {
  return (process.env[name] || "").trim().replace(/^['"]|['"]$/g, "");
}

/**
 * Parse `CLOUDINARY_URL` (format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME).
 * Many hosts (Heroku, etc.) expose a single URL instead of three separate vars.
 */
function tryParseCloudinaryUrl(raw: string): { cloudName: string; apiKey: string; apiSecret: string } | null {
  const s = raw.trim();
  if (!s || !s.startsWith("cloudinary://")) return null;
  try {
    const u = new URL(s);
    const apiKey = decodeURIComponent(u.username || "");
    const apiSecret = decodeURIComponent(u.password || "");
    const cloudName = (u.hostname || "").trim();
    if (!apiKey || !apiSecret || !cloudName) return null;
    return { cloudName, apiKey, apiSecret };
  } catch {
    return null;
  }
}

/**
 * Resolves credentials from the environment.
 * - Cloud name: `CLOUDINARY_CLOUD_NAME` or `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (dashboard often sets only the public name).
 * - Merges with `CLOUDINARY_URL` when individual keys are missing.
 * - `CLOUDINARY_SECRET` is accepted as an alias for `CLOUDINARY_API_SECRET`.
 */
export function resolveCloudinaryCredentials():
  | { cloudName: string; apiKey: string; apiSecret: string }
  | null {
  const fromUrl = tryParseCloudinaryUrl(cleanEnv("CLOUDINARY_URL"));
  const cloudName =
    cleanEnv("CLOUDINARY_CLOUD_NAME") ||
    cleanEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME") ||
    (fromUrl?.cloudName ?? "");
  const apiKey = cleanEnv("CLOUDINARY_API_KEY") || (fromUrl?.apiKey ?? "");
  const apiSecret =
    cleanEnv("CLOUDINARY_API_SECRET") ||
    cleanEnv("CLOUDINARY_SECRET") ||
    (fromUrl?.apiSecret ?? "");
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/**
 * Applies resolved env to the Cloudinary SDK. Call before upload or `cloudinary.url()`.
 * Returns false if configuration cannot be completed.
 */
export function applyCloudinaryConfigFromEnv(): boolean {
  const cfg = resolveCloudinaryCredentials();
  if (!cfg) return false;
  cloudinary.config({
    cloud_name: cfg.cloudName,
    api_key: cfg.apiKey,
    api_secret: cfg.apiSecret,
  });
  return true;
}

export function assertCloudinaryConfigured(): void {
  if (!applyCloudinaryConfigFromEnv()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET — or set CLOUDINARY_URL."
    );
  }
}

/**
 * Upload a buffer via Cloudinary's upload_stream (works on serverless — no local disk).
 * Returns the HTTPS URL to store in the database.
 */
export async function uploadBufferToCloudinaryStream(
  buffer: Buffer,
  resourceType: "video" | "image"
): Promise<{ secure_url: string; public_id: string }> {
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: "real-estate-platform/uploads",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error: Error | undefined, result?: UploadApiResponse) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url || !result.public_id) {
          reject(new Error("Cloudinary upload failed: missing secure_url or public_id"));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export default cloudinary;
