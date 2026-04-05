import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

function normalizeKey(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 80);
}

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  try {
    const items = await prisma.listingCountry.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: {
        governorates: { orderBy: [{ sortOrder: "asc" }, { key: "asc" }] },
      },
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

    const key = normalizeKey(String(body.key ?? ""));
    if (!key || key.length < 2) {
      return NextResponse.json({ error: "Invalid key (short country id, e.g. Egypt)." }, { status: 400 });
    }

    const labelEn = String(body.labelEn ?? "").trim().slice(0, 120);
    const labelAr = String(body.labelAr ?? "").trim().slice(0, 120);
    if (!labelEn || !labelAr) {
      return NextResponse.json({ error: "labelEn and labelAr are required." }, { status: 400 });
    }

    const currency = String(body.currency ?? "USD").trim().slice(0, 12) || "USD";
    const areaUnitRaw = String(body.areaUnit ?? "sqm").toLowerCase();
    const areaUnit = areaUnitRaw === "sqft" ? "sqft" : "sqm";

    const sortOrder =
      typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
        ? Math.trunc(body.sortOrder)
        : 0;

    const created = await prisma.listingCountry.create({
      data: {
        key,
        labelEn,
        labelAr,
        currency,
        areaUnit,
        sortOrder,
        active: body.active === false ? false : true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Country key already exists." }, { status: 409 });
    }
    console.error("listing-countries POST", e);
    return NextResponse.json({ error: "Create failed." }, { status: 500 });
  }
}
