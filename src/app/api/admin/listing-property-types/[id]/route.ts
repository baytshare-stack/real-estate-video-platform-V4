import { NextResponse } from "next/server";
import { PropertyType, VideoPropertyType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (typeof body.labelEn === "string") data.labelEn = body.labelEn.trim().slice(0, 120);
    if (typeof body.labelAr === "string") data.labelAr = body.labelAr.trim().slice(0, 120);
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      data.sortOrder = Math.trunc(body.sortOrder);
    }
    if (typeof body.active === "boolean") data.active = body.active;

    if (body.mapProperty !== undefined) {
      const p = String(body.mapProperty).toUpperCase() as PropertyType;
      if (!Object.values(PropertyType).includes(p)) {
        return NextResponse.json({ error: "Invalid mapProperty." }, { status: 400 });
      }
      data.mapProperty = p;
    }
    if (body.mapVideo !== undefined) {
      const v = String(body.mapVideo).toUpperCase() as VideoPropertyType;
      if (!Object.values(VideoPropertyType).includes(v)) {
        return NextResponse.json({ error: "Invalid mapVideo." }, { status: 400 });
      }
      data.mapVideo = v;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const updated = await prisma.listingPropertyType.update({
      where: { id },
      data: data as Parameters<typeof prisma.listingPropertyType.update>[0]["data"],
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    console.error("listing-property-types PATCH", e);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    await prisma.listingPropertyType.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    console.error("listing-property-types DELETE", e);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
