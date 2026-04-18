function uploadPresetFromEnv(): string {
  return (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "real_estate_unsigned").trim();
}

function cloudNameFromEnv(): string {
  return (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim();
}

function classifyResource(file: File): "video" | "image" {
  const t = (file.type || "").toLowerCase();
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("image/")) return "image";
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (["mp4", "webm", "mov", "m4v", "mkv"].includes(ext)) return "video";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  throw new Error("Could not detect file type. Pick a clear video or image file.");
}

/**
 * Browser-only unsigned upload (preset must allow unsigned in Cloudinary dashboard).
 * Uses NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME only — never the API secret.
 */
export async function cloudinaryUnsignedUpload(file: File): Promise<{
  resourceType: "video" | "image";
  secure_url: string;
}> {
  const cloudName = cloudNameFromEnv();
  if (!cloudName) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME. Add it to your environment for client uploads."
    );
  }

  const resourceType = classifyResource(file);
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPresetFromEnv());

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`;
  const res = await fetch(endpoint, { method: "POST", body: fd });
  const raw = await res.text();
  let data: { secure_url?: string; error?: { message?: string } | string } = {};
  if (raw.trim()) {
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      throw new Error("Invalid response from Cloudinary.");
    }
  }
  if (!res.ok) {
    const msg =
      typeof data.error === "object" && data.error?.message
        ? data.error.message
        : typeof data.error === "string"
          ? data.error
          : `Upload failed (${res.status})`;
    throw new Error(msg);
  }
  const secure = (data as { secure_url?: string }).secure_url;
  if (!secure?.trim()) {
    throw new Error("Upload succeeded but no secure_url was returned.");
  }
  return { resourceType, secure_url: secure.trim() };
}
