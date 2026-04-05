import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

function normalizeKey(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

export async function POST(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const countryId = String(body.countryId ?? "").trim();
    if (!countryId) return NextResponse.json({ error: "countryId is required." }, { status: 400 });

    const country = await prisma.listingCountry.findUnique({ where: { id: countryId } });
    if (!country) return NextResponse.json({ error: "Country not found." }, { status: 404 });

    const key = normalizeKey(String(body.key ?? ""));
    if (!key || key.length < 1) {
      return NextResponse.json({ error: "Invalid key (city/governorate id for forms)." }, { status: 400 });
    }

    const labelEn = String(body.labelEn ?? "").trim().slice(0, 120);
    const labelAr = String(body.labelAr ?? "").trim().slice(0, 120);
    if (!labelEn || !labelAr) {
      return NextResponse.json({ error: "labelEn and labelAr are required." }, { status: 400 });
    }

    const sortOrder =
      typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
        ? Math.trunc(body.sortOrder)
        : 0;

    const created = await prisma.listingGovernorate.create({
      data: {
        countryId,
        key,
        labelEn,
        labelAr,
        sortOrder,
        active: body.active === false ? false : true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "This governorate key already exists for this country." }, { status: 409 });
    }
    console.error("listing-governorates POST", e);
    return NextResponse.json({ error: "Create failed." }, { status: 500 });
  }
}
