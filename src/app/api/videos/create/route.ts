import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PropertyStatus, PropertyType } from "@prisma/client";

export async function POST(req: Request) {
  console.log("API WORKING");
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only AGENT and AGENCY roles can create videos
    if (session.user.role === "USER" || session.user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Only agents or agencies can upload properties" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      title,
      description,
      videoUrl,
      thumbnail,
      propertyType,
      status,
      price,
      bedrooms,
      bathrooms,
      sizeSqm,
      country,
      city,
      address,
    } = body as Record<string, unknown>;

    const missingFields: string[] = [];
    if (!title) missingFields.push("title");
    if (!videoUrl) missingFields.push("videoUrl");
    if (!propertyType) missingFields.push("propertyType");
    if (!status) missingFields.push("status");
    if (price === undefined || price === null || price === "") missingFields.push("price");
    if (!country) missingFields.push("country");
    if (!city) missingFields.push("city");

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "Missing required fields", missingFields },
        { status: 400 }
      );
    }

    const priceNumber = typeof price === "number" ? price : Number(price);
    if (!Number.isFinite(priceNumber)) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const propertyTypeValue = String(propertyType);
    if (!Object.values(PropertyType).includes(propertyTypeValue as PropertyType)) {
      return NextResponse.json({ error: "Invalid propertyType" }, { status: 400 });
    }

    const statusValue = String(status);
    if (!Object.values(PropertyStatus).includes(statusValue as PropertyStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const bedroomsNumber =
      bedrooms === undefined || bedrooms === null || bedrooms === ""
        ? undefined
        : typeof bedrooms === "number"
          ? Math.trunc(bedrooms)
          : Number.parseInt(String(bedrooms), 10);

    if (bedroomsNumber !== undefined && !Number.isFinite(bedroomsNumber)) {
      return NextResponse.json({ error: "Invalid bedrooms" }, { status: 400 });
    }

    const bathroomsNumber =
      bathrooms === undefined || bathrooms === null || bathrooms === ""
        ? undefined
        : typeof bathrooms === "number"
          ? bathrooms
          : Number(String(bathrooms));

    if (bathroomsNumber !== undefined && !Number.isFinite(bathroomsNumber)) {
      return NextResponse.json({ error: "Invalid bathrooms" }, { status: 400 });
    }

    const sizeSqmNumber =
      sizeSqm === undefined || sizeSqm === null || sizeSqm === ""
        ? undefined
        : typeof sizeSqm === "number"
          ? sizeSqm
          : Number(String(sizeSqm));

    if (sizeSqmNumber !== undefined && !Number.isFinite(sizeSqmNumber)) {
      return NextResponse.json({ error: "Invalid sizeSqm" }, { status: 400 });
    }

    const channel = await prisma.channel.findUnique({
      where: { ownerId: session.user.id },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "You must create a channel first to upload properties." },
        { status: 403 }
      );
    }

    const newVideo = await prisma.video.create({
      data: {
        title: String(title),
        description: description ? String(description) : undefined,
        videoUrl: String(videoUrl),
        thumbnail: thumbnail ? String(thumbnail) : undefined,
        channelId: channel.id,
        property: {
          create: {
            propertyType: propertyTypeValue as PropertyType,
            status: statusValue as PropertyStatus,
            price: priceNumber,
            bedrooms: bedroomsNumber,
            bathrooms: bathroomsNumber,
            sizeSqm: sizeSqmNumber,
            country: String(country),
            city: String(city),
            address: address ? String(address) : undefined,
          },
        },
      },
      include: { property: true },
    });

    return NextResponse.json(newVideo, { status: 201 });
  } catch (error) {
    console.error("Video Upload Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
