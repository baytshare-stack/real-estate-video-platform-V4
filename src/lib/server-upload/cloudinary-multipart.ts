import { NextResponse } from "next/server";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { assertImageFile, assertVideoFile } from "@/lib/localMediaUpload";
import {
  applyCloudinaryConfigFromEnv,
  cloudinaryEnvDiagnostics,
  formatCloudinaryError,
  uploadBufferToCloudinaryStream,
} from "@/lib/cloudinary";

export const uploadRuntime = "nodejs";

const VERCEL_BODY_LIMIT_BYTES = 4_500_000;

/**
 * Server-only multipart → Cloudinary. Used exclusively by POST /api/upload.
 * Ads APIs must only persist returned URLs (videoUrl / imageUrl).
 */
export async function postCloudinaryMultipartUpload(req: Request): Promise<Response> {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!auth.profile) {
    return NextResponse.json(
      { success: false, error: "Advertiser onboarding required" },
      { status: 400 }
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid content type",
        detail: 'Use multipart/form-data with fields "video", "image" (creative), and/or "thumbnail".',
      },
      { status: 400 }
    );
  }

  if (!applyCloudinaryConfigFromEnv()) {
    const d = cloudinaryEnvDiagnostics();
    console.error("[api/upload] Cloudinary not configured (server runtime). Env diagnostics:", d);
    return NextResponse.json(
      {
        success: false,
        error: "Upload provider not configured",
        detail:
          "Set CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server — or set CLOUDINARY_URL.",
      },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Upload failed",
        detail:
          "Could not read upload body. If the file is large, try a smaller MP4 (Vercel limits request size to about 4.5 MB).",
      },
      { status: 400 }
    );
  }

  const videoPart = form.get("video");
  const thumbPart = form.get("thumbnail");
  const imagePart = form.get("image");

  const hasVideo = videoPart instanceof File && videoPart.size > 0;
  const hasThumb = thumbPart instanceof File && thumbPart.size > 0;
  const hasImageCreative = imagePart instanceof File && imagePart.size > 0;

  if (process.env.VERCEL === "1") {
    if (hasVideo && videoPart.size > VERCEL_BODY_LIMIT_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Video upload failed",
          detail:
            "File exceeds Vercel upload limit (~4.5 MB). Compress or shorten the MP4, or use a URL instead of uploading.",
        },
        { status: 413 }
      );
    }
    if (hasThumb && thumbPart.size > VERCEL_BODY_LIMIT_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Thumbnail upload failed",
          detail: "Image exceeds Vercel upload limit (~4.5 MB). Use a smaller JPEG/PNG.",
        },
        { status: 413 }
      );
    }
    if (hasImageCreative && imagePart.size > VERCEL_BODY_LIMIT_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Image upload failed",
          detail: "Image exceeds Vercel upload limit (~4.5 MB). Use a smaller JPEG/PNG or paste a URL.",
        },
        { status: 413 }
      );
    }
  }

  if (!hasVideo && !hasThumb && !hasImageCreative) {
    return NextResponse.json(
      {
        success: false,
        error: "No file provided",
        detail: 'Attach at least one file as "video" (.mp4), "image" (.jpg/.png), or "thumbnail".',
      },
      { status: 400 }
    );
  }

  const payload: { success: true; url?: string; imageUrl?: string; thumbnailUrl?: string } = { success: true };

  if (hasVideo) {
    try {
      assertVideoFile(videoPart);
      const buffer = Buffer.from(await videoPart.arrayBuffer());
      const { secure_url } = await uploadBufferToCloudinaryStream(buffer, "video");
      payload.url = secure_url;
    } catch (err) {
      const detail = formatCloudinaryError(err);
      console.error("[api/upload] Video upload error:", detail);
      return NextResponse.json({ success: false, error: "Video upload failed", detail }, { status: 400 });
    }
  }

  if (hasImageCreative) {
    try {
      assertImageFile(imagePart);
      const buffer = Buffer.from(await imagePart.arrayBuffer());
      const { secure_url } = await uploadBufferToCloudinaryStream(buffer, "image");
      payload.imageUrl = secure_url;
    } catch (err) {
      const detail = formatCloudinaryError(err);
      console.error("[api/upload] Image upload error:", detail);
      return NextResponse.json({ success: false, error: "Image upload failed", detail }, { status: 400 });
    }
  }

  if (hasThumb) {
    try {
      assertImageFile(thumbPart);
      const buffer = Buffer.from(await thumbPart.arrayBuffer());
      const { secure_url } = await uploadBufferToCloudinaryStream(buffer, "image");
      payload.thumbnailUrl = secure_url;
    } catch (err) {
      const detail = formatCloudinaryError(err);
      console.error("[api/upload] Thumbnail upload error:", detail);
      return NextResponse.json({ success: false, error: "Thumbnail upload failed", detail }, { status: 400 });
    }
  }

  return NextResponse.json(payload, { status: 200 });
}
