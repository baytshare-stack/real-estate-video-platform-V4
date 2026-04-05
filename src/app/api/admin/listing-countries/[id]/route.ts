import { NextResponse } from "next/server";
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
    if (typeof body.currency === "string") data.currency = body.currency.trim().slice(0, 12) || "USD";
    if (typeof body.areaUnit === "string") {
      const u = body.areaUnit.toLowerCase();
      data.areaUnit = u === "sqft" ? "sqft" : "sqm";
    }
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      data.sortOrder = Math.trunc(body.sortOrder);
    }
    if (typeof body.active === "boolean") data.active = body.active;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const updated = await prisma.listingCountry.update({
      where: { id },
      data: data as Parameters<typeof prisma.listingCountry.update>[0]["data"],
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    console.error("listing-countries PATCH", e);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    await prisma.listingCountry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    console.error("listing-countries DELETE", e);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
