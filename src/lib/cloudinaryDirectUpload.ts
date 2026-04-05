/**
 * Unsigned direct upload from the browser to Cloudinary (avoids Next.js body limits / truncation).
 * Uses multipart FormData; do not set Content-Type — the browser sets the boundary.
 */

type CloudinaryErrorJson = {
  secure_url?: string;
  error?: { message?: string };
  message?: string;
};

type CloudinarySuccessJson = CloudinaryErrorJson & {
  eager?: Array<{ secure_url?: string }>;
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

function parseCloudinarySuccess(raw: string, status: number): CloudinarySuccessJson {
  let data: CloudinarySuccessJson;
  try {
    data = JSON.parse(raw || "{}") as CloudinarySuccessJson;
  } catch {
    throw new Error(
      raw ? `Cloudinary returned non-JSON (${status}): ${raw.slice(0, 200)}` : "Empty response from Cloudinary"
    );
  }
  if (!data.secure_url) {
    const msg = data.error?.message || data.message || `Upload failed (${status})`;
    throw new Error(msg);
  }
  return data;
}

/** Max side 720px, WebP + automatic quality — small files, sharp on retina headers. SVG left as vector. */
const SITE_LOGO_EAGER = "f_webp,q_auto:good,w_720,c_limit,fl_strip_profile";

export function isCloudinarySiteLogoConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim()
  );
}

/**
 * Site header logo: raster images get a synchronous WebP derivative when the upload preset allows `eager`.
 * SVG uploads skip eager so the file stays scalable.
 */
export async function uploadSiteLogoToCloudinary(
  file: File,
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

  const mime = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  const isSvg = mime === "image/svg+xml" || name.endsWith(".svg");

  onProgress?.(0);

  const url = cloudinaryUploadUrl(cloudName, "image");

  const buildForm = (withEager: boolean) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);
    if (withEager && !isSvg) {
      fd.append("eager", SITE_LOGO_EAGER);
      fd.append("eager_async", "false");
    }
    return fd;
  };

  let res = await fetch(url, { method: "POST", body: buildForm(!isSvg) });
  let raw = await res.text();

  if (!res.ok && !isSvg) {
    res = await fetch(url, { method: "POST", body: buildForm(false) });
    raw = await res.text();
  }

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

  const data = parseCloudinarySuccess(raw, res.status);
  const eagerUrl = data.eager?.[0]?.secure_url;
  onProgress?.(100);
  return eagerUrl || data.secure_url!;
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
