import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";
import { notifySubscribersNewVideo } from "@/lib/notifications";
import { PropertyType, VideoPropertyType, PropertyStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      propertyType,
      status,
      bedrooms,
      bathrooms,
      sizeSqm,
      price,
      country,
      city,
      area,
      currency,
      latitude,
      longitude,
      videoFormat,
      videoUrl,
      thumbnailUrl,
      thumbnail,
      videoType,
    } = body;
    const videoTypeValue = String(videoType || "").toLowerCase();
    const isShort = videoTypeValue === "short";

    if (!title || !propertyType || !status || !price) {
      return NextResponse.json({ error: "Missing required property fields" }, { status: 400 });
    }

    const inputPropertyType = String(propertyType).toUpperCase();
    const inputStatus = String(status) as PropertyStatus;

    const mapVideoPropertyTypeToPropertyType = (v: VideoPropertyType): PropertyType => {
      switch (v) {
        case "APARTMENT":
          return "APARTMENT";
        case "VILLA":
          return "VILLA";
        case "TOWNHOUSE":
          return "HOUSE";
        case "STUDIO":
          return "APARTMENT";
        case "DUPLEX":
          return "HOUSE";
        case "LAND":
          return "LAND";
        case "OTHER":
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
      }
    };

    let videoPropertyType: VideoPropertyType | null = null;
    let propertyTypeValue: PropertyType | null = null;

    if (Object.values(VideoPropertyType).includes(inputPropertyType as VideoPropertyType)) {
      videoPropertyType = inputPropertyType as VideoPropertyType;
      propertyTypeValue = mapVideoPropertyTypeToPropertyType(videoPropertyType);
    } else if (Object.values(PropertyType).includes(inputPropertyType as PropertyType)) {
      propertyTypeValue = inputPropertyType as PropertyType;
      videoPropertyType = mapPropertyTypeToVideoPropertyType(propertyTypeValue);
    } else {
      return NextResponse.json({ error: "Invalid propertyType" }, { status: 400 });
    }

    if (!Object.values(PropertyStatus).includes(inputStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let channel = await safeFindFirst(() => prisma.channel.findFirst());
    if (!channel) {
      const user = await safeFindFirst(() => prisma.user.findFirst());
      if (user) {
        channel = await prisma.channel.create({
          data: {
            ownerId: user.id,
            name: "Demo Creator",
            description: "Demo channel for testing uploads",
          },
        });
      } else {
        return NextResponse.json({ error: "No users exist in DB to own a channel." }, { status: 400 });
      }
    }

    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        channelId: channel.id,
        videoUrl:
          videoUrl ||
          "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
        thumbnail: (thumbnailUrl || thumbnail)
          ? String(thumbnailUrl || thumbnail)
          : "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450",
        isShort,
        isDemo: true,
        // Used for auto-generated property playlists.
        propertyType: videoPropertyType,
        property: {
          create: {
            propertyType: propertyTypeValue!,
            status: inputStatus,
            bedrooms: bedrooms ? parseFloat(bedrooms) : undefined,
            bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
            sizeSqm: sizeSqm ? parseFloat(sizeSqm) : undefined,
            price: parseFloat(price),
            currency: currency ? String(currency) : "USD",
            country: country,
            city: city,
            address: typeof area === "string" ? area : undefined,
            latitude: latitude ? Number(latitude) : undefined,
            longitude: longitude ? Number(longitude) : undefined,
          },
        },
      },
    });

    void notifySubscribersNewVideo({
      videoId: video.id,
      channelId: channel.id,
      channelName: channel.name,
      title: String(title).trim(),
    });

    return NextResponse.json({ success: true, videoId: video.id });
  } catch (error: unknown) {
    console.error("UPLOAD ERROR:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
