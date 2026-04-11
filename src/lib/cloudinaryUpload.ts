import cloudinary, { uploadBufferToCloudinaryStream } from "@/lib/cloudinary";

export { formatCloudinaryError } from "@/lib/cloudinary";

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  resourceType: "video" | "image"
): Promise<{ secure_url: string; public_id: string }> {
  return uploadBufferToCloudinaryStream(buffer, resourceType);
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
