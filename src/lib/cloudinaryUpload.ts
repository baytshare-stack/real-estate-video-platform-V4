import cloudinary from "@/lib/cloudinary";

export function formatCloudinaryError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (o.error && typeof o.error === "object" && o.error !== null) {
      const e = o.error as Record<string, unknown>;
      if (typeof e.message === "string") return e.message;
    }
  }
  return "Storage upload failed";
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  resourceType: "video" | "image"
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: "real-estate-platform/uploads",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result?.secure_url || !result.public_id) {
          reject(error || new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/** Poster image URL (first frame) for a Cloudinary-hosted video by public_id */
export function cloudinaryVideoPosterJpgUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: "video",
    format: "jpg",
    transformation: [{ width: 1280, height: 720, crop: "limit", start_offset: "0" }],
  });
}

/** Parse public_id from a Cloudinary video secure_url */
export function extractCloudinaryVideoPublicId(secureUrl: string): string | null {
  try {
    const u = new URL(secureUrl);
    const marker = "/video/upload/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    let rest = u.pathname.slice(idx + marker.length);
    rest = rest.replace(/^v\d+\//, "");
    rest = rest.replace(/\.[^/.]+$/, "");
    return rest || null;
  } catch {
    return null;
  }
}
