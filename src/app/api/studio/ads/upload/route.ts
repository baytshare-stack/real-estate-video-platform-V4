import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { assertImageFile, assertVideoFile } from "@/lib/localMediaUpload";
import { uploadBufferToCloudinaryStream } from "@/lib/cloudinary";

export const runtime = "nodejs";

function cleanEnv(name: string): string {
  return (process.env[name] || "").trim().replace(/^['"]|['"]$/g, "");
}

function ensureAdsCloudinaryConfigured(): { cloudName: string; apiKey: string; apiSecret: string } {
  const cloudName = cleanEnv("CLOUDINARY_CLOUD_NAME") || cleanEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  const apiKey = cleanEnv("CLOUDINARY_API_KEY");
  const apiSecret = cleanEnv("CLOUDINARY_API_SECRET");
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("ADS_CLOUDINARY_NOT_CONFIGURED");
  }
  return { cloudName, apiKey, apiSecret };
}

export async function POST(req: Request) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) {
    return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        error: "Invalid content type",
        detail: 'Use multipart/form-data with fields "video" and/or "thumbnail".',
      },
      { status: 400 }
    );
  }

  let cfg: { cloudName: string; apiKey: string; apiSecret: string };
  try {
    cfg = ensureAdsCloudinaryConfigured();
  } catch {
    return NextResponse.json(
      {
        error: "Upload provider not configured",
        detail: "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      },
      { status: 500 }
    );
  }

  // Ensure Cloudinary is configured at request-time before any upload call.
  cloudinary.config({
    cloud_name: cfg.cloudName,
    api_key: cfg.apiKey,
    api_secret: cfg.apiSecret,
  });

  const form = await req.formData();
  const videoPart = form.get("video");
  const thumbPart = form.get("thumbnail");

  const hasVideo = videoPart instanceof File && videoPart.size > 0;
  const hasThumb = thumbPart instanceof File && thumbPart.size > 0;
  if (!hasVideo && !hasThumb) {
    return NextResponse.json(
      {
        error: "No file provided",
        detail: 'Attach at least one file as "video" (.mp4) or "thumbnail" (.jpg/.png).',
      },
      { status: 400 }
    );
  }

  const payload: { url?: string; thumbnailUrl?: string } = {};

  if (hasVideo) {
    try {
      assertVideoFile(videoPart);
      const buffer = Buffer.from(await videoPart.arrayBuffer());
      const { secure_url } = await uploadBufferToCloudinaryStream(buffer, "video");
      payload.url = secure_url;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Could not upload video";
      return NextResponse.json({ error: "Video upload failed", detail }, { status: 400 });
    }
  }

  if (hasThumb) {
    try {
      assertImageFile(thumbPart);
      const buffer = Buffer.from(await thumbPart.arrayBuffer());
      const { secure_url } = await uploadBufferToCloudinaryStream(buffer, "image");
      payload.thumbnailUrl = secure_url;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Could not upload thumbnail";
      return NextResponse.json({ error: "Thumbnail upload failed", detail }, { status: 400 });
    }
  }

  return NextResponse.json(payload, { status: 200 });
}

