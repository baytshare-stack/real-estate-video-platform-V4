import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * @deprecated Uploads live at POST /api/upload (server-only Cloudinary).
 * Same multipart fields: video | image | thumbnail.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Endpoint moved",
      detail: "Use POST /api/upload with the same multipart body (video, image, thumbnail).",
    },
    { status: 410 }
  );
}
