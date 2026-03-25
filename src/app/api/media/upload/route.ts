import { NextResponse } from "next/server";
import { assertImageFile, assertVideoFile } from "@/lib/localMediaUpload";
import { uploadBufferToCloudinaryStream } from "@/lib/cloudinary";

export const runtime = "nodejs";

/** Legacy/alternate upload endpoint — Cloudinary (same behavior as /api/upload). */
export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file");
    const kind = String(data.get("kind") || "image");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (kind === "video") {
      assertVideoFile(file);
      const { secure_url } = await uploadBufferToCloudinaryStream(buffer, "video");
      return NextResponse.json({ secureUrl: secure_url, url: secure_url }, { status: 200 });
    }

    assertImageFile(file);
    const { secure_url } = await uploadBufferToCloudinaryStream(buffer, "image");
    return NextResponse.json({ secureUrl: secure_url, url: secure_url }, { status: 200 });
  } catch (error) {
    console.error("Media upload error:", error);
    const detail = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: "Upload failed", detail }, { status: 400 });
  }
}
