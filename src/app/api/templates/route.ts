import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/** Public list for upload modal — real DB templates with motion preview metadata. */
export async function GET() {
  try {
    const rows = await prisma.template.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        previewImage: true,
        previewVideo: true,
        defaultAudio: true,
        config: true,
      },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error("[templates]", e);
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }
}
