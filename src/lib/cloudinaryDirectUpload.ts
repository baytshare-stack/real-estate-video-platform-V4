/**
 * Unsigned direct upload from the browser to Cloudinary (avoids Next.js body limits / truncation).
 * Uses multipart FormData; do not set Content-Type — the browser sets the boundary.
 */

type CloudinaryErrorJson = {
  secure_url?: string;
  error?: { message?: string };
  message?: string;
};

function cloudinaryUploadUrl(cloudName: string, resourceType: "video" | "image"): string {
  const base = `https://api.cloudinary.com/v1_1/${cloudName}`;
  return resourceType === "video" ? `${base}/video/upload` : `${base}/image/upload`;
}

function parseCloudinaryResponse(raw: string, status: number): string {
  let data: CloudinaryErrorJson;
  try {
    data = JSON.parse(raw || "{}") as CloudinaryErrorJson;
  } catch {
    throw new Error(
      raw ? `Cloudinary returned non-JSON (${status}): ${raw.slice(0, 200)}` : "Empty response from Cloudinary"
    );
  }
  if (!data.secure_url) {
    const msg = data.error?.message || data.message || `Upload failed (${status})`;
    throw new Error(msg);
  }
  return data.secure_url;
}

/**
 * POST file + upload_preset to Cloudinary. No JSON body; no Content-Type header (browser sets multipart).
 */
export async function uploadUnsignedToCloudinary(
  file: File,
  resourceType: "video" | "image",
  onProgress?: (pct: number) => void
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set");
  }
  if (!uploadPreset) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is not set");
  }

  console.log(file, file.size);

  onProgress?.(0);

  const url = cloudinaryUploadUrl(cloudName, resourceType);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const raw = await res.text();

  if (!res.ok) {
    let msg: string;
    try {
      const err = JSON.parse(raw || "{}") as CloudinaryErrorJson;
      msg = err.error?.message || err.message || `Cloudinary error (${res.status})`;
    } catch {
      msg = raw ? `${res.status}: ${raw.slice(0, 300)}` : `Upload failed (${res.status})`;
    }
    throw new Error(msg);
  }

  const secureUrl = parseCloudinaryResponse(raw, res.status);
  onProgress?.(100);
  return secureUrl;
}
