import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { safeFindMany } from "@/lib/safePrisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const city = searchParams.get("city") || "";
    const type = searchParams.get("type") || "";
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const bedrooms = searchParams.get("bedrooms");

    const whereClause: Prisma.VideoWhereInput = {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { property: { city: { contains: query } } },
        { property: { country: { contains: query } } },
      ],
    };

    const propertyFilter: Prisma.PropertyWhereInput = {};

    if (city) {
      propertyFilter.city = { contains: city };
    }

    if (type) {
      propertyFilter.propertyType = type as any;
    }

    if (minPrice || maxPrice) {
      propertyFilter.price = {};
      if (minPrice) propertyFilter.price.gte = parseFloat(minPrice);
      if (maxPrice) propertyFilter.price.lte = parseFloat(maxPrice);
    }

    if (bedrooms) {
      propertyFilter.bedrooms = { gte: parseInt(bedrooms, 10) };
    }

    if (Object.keys(propertyFilter).length > 0) {
      whereClause.property = propertyFilter;
    }

    const results = await safeFindMany(() =>
      prisma.video.findMany({
        where: whereClause,
        include: {
          channel: {
            select: { name: true, avatar: true },
          },
          property: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      })
    );

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
