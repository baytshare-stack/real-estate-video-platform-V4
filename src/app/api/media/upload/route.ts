import { NextResponse } from "next/server";
import { saveImageFile, saveVideoFile } from "@/lib/localMediaUpload";

export const runtime = "nodejs";

/** Legacy/alternate upload endpoint — uses local disk (same as /api/upload). */
export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file");
    const kind = String(data.get("kind") || "image");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (kind === "video") {
      const { publicPath } = await saveVideoFile(file);
      return NextResponse.json({ secureUrl: publicPath, url: publicPath }, { status: 200 });
    }

    const { publicPath } = await saveImageFile(file);
    return NextResponse.json({ secureUrl: publicPath, url: publicPath }, { status: 200 });
  } catch (error) {
    console.error("Media upload error:", error);
    const detail = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: "Upload failed", detail }, { status: 400 });
  }
}
