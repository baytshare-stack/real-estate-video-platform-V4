import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";
import { notifySubscribersNewVideo } from "@/lib/notifications";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PropertyStatus, PropertyType } from "@prisma/client";

export const runtime = "nodejs";

const FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450";

type CreateBody = {
  title?: string;
  description?: string;
  videoUrl?: string;
  thumbnail?: string;
  videoType?: string;
  propertyType?: string;
  status?: string;
  price?: unknown;
  bedrooms?: unknown;
  bathrooms?: unknown;
  sizeSqm?: unknown;
  currency?: unknown;
  country?: string;
  city?: string;
  address?: string;
  latitude?: unknown;
  longitude?: unknown;
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uploadRoles = ["AGENT", "AGENCY", "ADMIN", "SUPER_ADMIN"] as const;
    if (!uploadRoles.includes(session.user.role as (typeof uploadRoles)[number])) {
      return NextResponse.json(
        { error: "Only agents, agencies, or admins can upload properties" },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => null)) as CreateBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      title,
      description,
      videoUrl,
      thumbnail,
      videoType,
      propertyType,
      status,
      price,
      bedrooms,
      bathrooms,
      sizeSqm,
      currency,
      country,
      city,
      address,
      latitude,
      longitude,
    } = body;

    type VideoPropertyType =
      | "APARTMENT"
      | "VILLA"
      | "TOWNHOUSE"
      | "STUDIO"
      | "DUPLEX"
      | "LAND"
      | "OTHER";

    const VIDEO_PROPERTY_TYPES: VideoPropertyType[] = [
      "APARTMENT",
      "VILLA",
      "TOWNHOUSE",
      "STUDIO",
      "DUPLEX",
      "LAND",
      "OTHER",
    ];

    const isVideoPropertyType = (v: string): v is VideoPropertyType =>
      VIDEO_PROPERTY_TYPES.includes(v as VideoPropertyType);

    const mapVideoPropertyTypeToPropertyType = (v: VideoPropertyType): PropertyType => {
      switch (v) {
        case "APARTMENT":
          return "APARTMENT";
        case "VILLA":
          return "VILLA";
        case "TOWNHOUSE":
          return "HOUSE";
        case "STUDIO":
          // Studio is a type of apartment for the existing Property model.
          return "APARTMENT";
        case "DUPLEX":
          return "HOUSE";
        case "LAND":
          return "LAND";
        case "OTHER":
          // No exact OTHER in legacy PropertyType enum; COMMERCIAL is the closest catch-all.
          return "COMMERCIAL";
        default:
          return "COMMERCIAL";
      }
    };

    const mapPropertyTypeToVideoPropertyType = (p: PropertyType): VideoPropertyType => {
      switch (p) {
        case "APARTMENT":
          return "APARTMENT";
        case "VILLA":
          return "VILLA";
        case "LAND":
          return "LAND";
        case "HOUSE":
          return "TOWNHOUSE";
        case "OFFICE":
          return "OTHER";
        case "SHOP":
          return "OTHER";
        case "COMMERCIAL":
          return "OTHER";
        default:
          return "OTHER";
      }
    };

    const missingFields: string[] = [];
    if (!title?.trim()) missingFields.push("title");
    if (!videoUrl?.trim()) missingFields.push("videoUrl");
    if (!videoType) missingFields.push("videoType");
    const videoTypeValue = String(videoType).toLowerCase();
    if (videoTypeValue !== "short" && videoTypeValue !== "long") {
      return NextResponse.json({ error: "Invalid videoType. Use 'short' or 'long'." }, { status: 400 });
    }
    if (!propertyType) missingFields.push("propertyType");
    if (!status) missingFields.push("status");
    if (price === undefined || price === null || price === "") missingFields.push("price");
    if (!country?.trim()) missingFields.push("country");
    if (!city?.trim()) missingFields.push("city");

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

    const inputPropertyType = String(propertyType).toUpperCase();
    let videoPropertyTypeValue: VideoPropertyType | null = null;
    let propertyTypeValue: PropertyType | null = null;

    if (isVideoPropertyType(inputPropertyType)) {
      videoPropertyTypeValue = inputPropertyType;
      propertyTypeValue = mapVideoPropertyTypeToPropertyType(videoPropertyTypeValue);
    } else if (Object.values(PropertyType).includes(inputPropertyType as PropertyType)) {
      propertyTypeValue = inputPropertyType as PropertyType;
      videoPropertyTypeValue = mapPropertyTypeToVideoPropertyType(propertyTypeValue);
    } else {
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

    const latitudeNumber =
      latitude === undefined || latitude === null || latitude === ""
        ? undefined
        : typeof latitude === "number"
          ? latitude
          : Number(String(latitude));
    if (latitudeNumber !== undefined && !Number.isFinite(latitudeNumber)) {
      return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
    }

    const longitudeNumber =
      longitude === undefined || longitude === null || longitude === ""
        ? undefined
        : typeof longitude === "number"
          ? longitude
          : Number(String(longitude));
    if (longitudeNumber !== undefined && !Number.isFinite(longitudeNumber)) {
      return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
    }

    const channel = await safeFindFirst(() =>
      prisma.channel.findUnique({
        where: { ownerId: session.user.id },
        select: { id: true, name: true },
      })
    );

    if (!channel) {
      return NextResponse.json(
        { error: "You must create a channel first to upload properties." },
        { status: 403 }
      );
    }

    const videoUrlStr = String(videoUrl).trim();
    let thumbnailFinal = thumbnail?.trim() || "";
    if (!thumbnailFinal) {
      thumbnailFinal = FALLBACK_THUMBNAIL;
    }

    const newVideo = await prisma.video.create({
      data: ({
        title: String(title).trim(),
        description: description ? String(description) : undefined,
        videoUrl: videoUrlStr,
        thumbnail: thumbnailFinal,
        isShort: videoTypeValue === "short",
        isDemo: false,
        channelId: channel.id,
        // Used for auto-generated playlists on the channel page.
        propertyType: videoPropertyTypeValue,
        property: {
          create: {
            propertyType: propertyTypeValue as PropertyType,
            status: statusValue as PropertyStatus,
            price: priceNumber,
            bedrooms: bedroomsNumber,
            bathrooms: bathroomsNumber,
            sizeSqm: sizeSqmNumber,
            currency: currency ? String(currency) : "USD",
            country: String(country).trim(),
            city: String(city).trim(),
            address: address ? String(address) : undefined,
            latitude: latitudeNumber,
            longitude: longitudeNumber,
          },
        },
      } as any),
      include: { property: true },
    });

    void notifySubscribersNewVideo({
      videoId: newVideo.id,
      channelId: channel.id,
      channelName: channel.name,
      title: String(title).trim(),
    });

    return NextResponse.json(
      {
        ...newVideo,
        thumbnailUrl: newVideo.thumbnail,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("VIDEO CREATE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create video", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
