import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeFindMany } from "@/lib/safePrisma";

/** Public catalog for template picker (active only). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const where =
      type === "short"
        ? { isActive: true, type: "SHORT" as const }
        : type === "long"
          ? { isActive: true, type: "LONG" as const }
          : { isActive: true };

    const rows = await safeFindMany(() =>
      prisma.videoTemplate.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
          previewImage: true,
          config: true,
        },
      })
    );

    return NextResponse.json({ templates: rows });
  } catch (e) {
    console.error("[GET /api/video-templates]", e);
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }
}
