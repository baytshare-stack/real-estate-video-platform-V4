import { NextResponse } from "next/server";
import { PropertyType, VideoPropertyType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

function normalizeSlug(raw: string): string {
  return String(raw || "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  try {
    const items = await prisma.listingPropertyType.findMany({
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to load." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const slug = normalizeSlug(String(body.slug ?? ""));
    if (!slug || slug.length < 2) {
      return NextResponse.json({ error: "Invalid slug (use A–Z, 0–9, _)." }, { status: 400 });
    }

    const labelEn = String(body.labelEn ?? "").trim().slice(0, 120);
    const labelAr = String(body.labelAr ?? "").trim().slice(0, 120);
    if (!labelEn || !labelAr) {
      return NextResponse.json({ error: "labelEn and labelAr are required." }, { status: 400 });
    }

    const mapProperty = String(body.mapProperty ?? "").toUpperCase() as PropertyType;
    const mapVideo = String(body.mapVideo ?? "").toUpperCase() as VideoPropertyType;
    if (!Object.values(PropertyType).includes(mapProperty)) {
      return NextResponse.json({ error: "Invalid mapProperty." }, { status: 400 });
    }
    if (!Object.values(VideoPropertyType).includes(mapVideo)) {
      return NextResponse.json({ error: "Invalid mapVideo." }, { status: 400 });
    }

    const sortOrder =
      typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
        ? Math.trunc(body.sortOrder)
        : 0;

    const created = await prisma.listingPropertyType.create({
      data: {
        slug,
        labelEn,
        labelAr,
        mapProperty,
        mapVideo,
        sortOrder,
        active: body.active === false ? false : true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
    if (msg) return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    console.error("listing-property-types POST", e);
    return NextResponse.json({ error: "Create failed." }, { status: 500 });
  }
}
