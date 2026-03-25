import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { assertImageFile, assertVideoFile } from "@/lib/localMediaUpload";
import { uploadBufferToCloudinaryStream } from "@/lib/cloudinary";

export const runtime = "nodejs";

/**
 * Multipart upload to Cloudinary (Vercel-safe).
 * POST multipart/form-data:
 * - `video` (optional): .mp4
 * - `thumbnail` (optional): .jpg / .jpeg / .png
 * At least one file required. Both may be sent in one request.
 *
 * Response:
 * { url?: string, thumbnailUrl?: string }
 * - `url` = Cloudinary secure_url for the video when a video was uploaded
 * - `thumbnailUrl` = Cloudinary secure_url when a thumbnail was uploaded
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "USER" || session.user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Only agents or agencies can upload media" },
        { status: 403 }
      );
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
        console.error("CLOUDINARY UPLOAD (video):", err);
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
        console.error("CLOUDINARY UPLOAD (thumbnail):", err);
        return NextResponse.json({ error: "Thumbnail upload failed", detail }, { status: 400 });
      }
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
