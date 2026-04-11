import { NextResponse } from "next/server";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { assertImageFile, assertVideoFile } from "@/lib/localMediaUpload";
import { applyCloudinaryConfigFromEnv, uploadBufferToCloudinaryStream } from "@/lib/cloudinary";

export const runtime = "nodejs";

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

  // Same resolver as `uploadBufferToCloudinaryStream` — supports NEXT_PUBLIC_* cloud name and CLOUDINARY_URL.
  if (!applyCloudinaryConfigFromEnv()) {
    return NextResponse.json(
      {
        error: "Upload provider not configured",
        detail:
          "Set CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET — or set CLOUDINARY_URL.",
      },
      { status: 500 }
    );
  }

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

