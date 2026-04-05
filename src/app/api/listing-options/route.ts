import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/** Public options for upload forms (property types, countries, governorates). */
export async function GET() {
  try {
    const [propertyTypes, countries] = await Promise.all([
      prisma.listingPropertyType.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
        select: { slug: true, labelAr: true, labelEn: true },
      }),
      prisma.listingCountry.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
        select: {
          key: true,
          labelAr: true,
          labelEn: true,
          currency: true,
          areaUnit: true,
          governorates: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
            select: { key: true, labelAr: true, labelEn: true },
          },
        },
      }),
    ]);

    return NextResponse.json({ propertyTypes, countries });
  } catch (e) {
    console.error("listing-options GET", e);
    return NextResponse.json({ error: "Failed to load listing options." }, { status: 500 });
  }
}
