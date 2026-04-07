import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";
import { notifySubscribersNewVideo } from "@/lib/notifications";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { PropertyStatus } from "@prisma/client";
import { resolvePropertyTypesFromInput } from "@/lib/property-type-resolve";

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
  isTemplate?: boolean;
  templateId?: string;
  templateConfig?: unknown;
  images?: unknown;
  audio?: unknown;
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
      isTemplate,
      templateId,
      templateConfig,
      images: imagesField,
      audio: audioField,
    } = body;

    const missingFields: string[] = [];
    const isTemplateMode = Boolean(isTemplate);
    let templateRecord: { id: string; type: string; previewImage: string } | null = null;

    const imageList: string[] = Array.isArray(imagesField)
      ? imagesField
          .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
          .map((u) => u.trim())
      : [];
    const audioStr =
      typeof audioField === "string" && audioField.trim() ? audioField.trim() : "";

    if (isTemplateMode) {
      const templateKey = typeof templateId === "string" ? templateId.trim() : "";
      if (!templateKey) missingFields.push("templateId");
      if (templateKey) {
        templateRecord = await prisma.template.findUnique({
          where: { id: templateKey },
          select: { id: true, type: true, previewImage: true, config: true },
        });
        if (!templateRecord) {
          return NextResponse.json(
            { error: "Template not found. Run `npx prisma migrate deploy` and `npx prisma db seed`." },
            { status: 404 }
          );
        }
      }
      if (!imageList.length) missingFields.push("images");
    }

    if (!title?.trim()) missingFields.push("title");
    if (!isTemplateMode && !videoUrl?.trim()) missingFields.push("videoUrl");
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

    const resolvedTypes = await resolvePropertyTypesFromInput(String(propertyType));
    if (!resolvedTypes) {
      return NextResponse.json({ error: "Invalid propertyType" }, { status: 400 });
    }
    const { propertyType: propertyTypeValue, videoPropertyType: videoPropertyTypeValue } = resolvedTypes;

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

    const videoUrlStr = isTemplateMode ? null : String(videoUrl).trim();
    let thumbnailFinal = thumbnail?.trim() || "";
    if (isTemplateMode && !thumbnailFinal) {
      const firstImage = imageList.length ? imageList[0] : "";
      thumbnailFinal = firstImage || templateRecord?.previewImage || "";
    }
    if (!thumbnailFinal) {
      thumbnailFinal = FALLBACK_THUMBNAIL;
    }

    const newVideo = await prisma.video.create({
      data: ({
        title: String(title).trim(),
        description: description ? String(description) : undefined,
        videoUrl: videoUrlStr,
        thumbnail: thumbnailFinal,
        isShort: isTemplateMode
          ? String(templateRecord?.type ?? "").toLowerCase() === "short"
          : videoTypeValue === "short",
        isDemo: false,
        isTemplate: isTemplateMode,
        templateId: isTemplateMode ? templateRecord?.id : null,
        images: isTemplateMode ? imageList : [],
        audio: isTemplateMode && audioStr ? audioStr : null,
        channelId: channel.id,
        // Used for auto-generated playlists on the channel page.
        propertyType: videoPropertyTypeValue,
        category: String(videoPropertyTypeValue),
        location: `${String(city).trim()}, ${String(country).trim()}`,
        property: {
          create: {
            propertyType: propertyTypeValue,
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

    if (isTemplateMode && templateRecord && templateConfig && typeof templateConfig === "object") {
      await prisma.template.update({
        where: { id: templateRecord.id },
        data: { config: templateConfig as any },
      });
    }

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
