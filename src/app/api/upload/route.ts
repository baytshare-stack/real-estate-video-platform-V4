import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { saveImageFile, saveVideoFile } from "@/lib/localMediaUpload";

export const runtime = "nodejs";

/**
 * Local multipart upload (no Cloudinary).
 * POST multipart/form-data:
 * - `video` (optional): .mp4
 * - `thumbnail` (optional): .jpg / .jpeg / .png
 * At least one file required. Both may be sent in one request.
 *
 * Response:
 * { url?: string, thumbnailUrl?: string }
 * - `url` = public path to saved video when a video was uploaded
 * - `thumbnailUrl` = public path to saved image when a thumbnail was uploaded
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
        const { publicPath } = await saveVideoFile(videoPart);
        payload.url = publicPath;
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Could not save video file";
        console.error("LOCAL UPLOAD (video):", err);
        return NextResponse.json({ error: "Video upload failed", detail }, { status: 400 });
      }
    }

    if (hasThumb) {
      try {
        const { publicPath } = await saveImageFile(thumbPart);
        payload.thumbnailUrl = publicPath;
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Could not save image file";
        console.error("LOCAL UPLOAD (thumbnail):", err);
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
