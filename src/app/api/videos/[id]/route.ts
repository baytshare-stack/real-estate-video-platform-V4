import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PropertyStatus } from "@prisma/client";
import { cleanAddressForForm, videoPropertyTypeToFormPropertyType } from "@/lib/video-listing-maps";
import { resolvePropertyTypesFromInput } from "@/lib/property-type-resolve";

export const runtime = "nodejs";

const FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450";

type Body = {
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
  templateId?: string;
  templateConfig?: unknown;
  images?: unknown;
  audio?: unknown;
};

async function assertOwnerVideo(id: string, userId: string) {
  const video = await prisma.video.findFirst({
    where: { id },
    include: {
      property: true,
      template: true,
      channel: { select: { ownerId: true } },
    },
  });
  if (!video || video.channel.ownerId !== userId) {
    return null;
  }
  return video;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const video = await assertOwnerVideo(id, session.user.id);
    if (!video) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!video.property) {
      return NextResponse.json({ error: "Video has no property data" }, { status: 500 });
    }

    const p = video.property;
    const formPropertyType = videoPropertyTypeToFormPropertyType(video.propertyType, p.propertyType);
    const addressClean = cleanAddressForForm(p.address);

    const priceRaw = p.price;
    const priceStr =
      priceRaw !== null && priceRaw !== undefined
        ? String(priceRaw)
        : "";

    return NextResponse.json({
      id: video.id,
      title: video.title,
      description: video.description ?? "",
      videoUrl: video.videoUrl ?? "",
      thumbnail: video.thumbnail ?? "",
      videoType: video.isShort ? "short" : "long",
      propertyType: formPropertyType,
      status: p.status,
      price: priceStr,
      bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
      bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
      sizeSqm: p.sizeSqm != null ? String(p.sizeSqm) : "",
      currency: p.currency,
      country: p.country,
      city: p.city,
      address: addressClean,
      latitude: p.latitude != null ? String(p.latitude) : "",
      longitude: p.longitude != null ? String(p.longitude) : "",
      createdAt: video.createdAt.toISOString(),
      isTemplate: video.isTemplate,
      templateId: video.templateId,
      images: video.images ?? [],
      audio: video.audio ?? null,
      template: video.template
        ? {
            id: video.template.id,
            name: video.template.name,
            type: video.template.type,
            previewImage: video.template.previewImage,
            previewVideo: video.template.previewVideo,
            defaultAudio: video.template.defaultAudio,
            config: video.template.config,
          }
        : null,
    });
  } catch (e) {
    console.error("VIDEO GET ERROR:", e);
    return NextResponse.json(
      { error: "Failed to load video", detail: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uploadRoles = ["AGENT", "AGENCY", "ADMIN", "SUPER_ADMIN"] as const;
    if (!uploadRoles.includes(session.user.role as (typeof uploadRoles)[number])) {
      return NextResponse.json(
        { error: "Only agents, agencies, or admins can update properties" },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 400 });
    }

    const { id } = await params;
    const existing = await assertOwnerVideo(id, session.user.id);
    if (!existing || !existing.property) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
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
      templateId: bodyTemplateId,
      templateConfig: bodyTemplateConfig,
      images: bodyImages,
      audio: bodyAudio,
    } = body;

    const missingFields: string[] = [];
    if (!title?.trim()) missingFields.push("title");
    const videoTypeValue = String(videoType ?? "").toLowerCase();
    if (!videoType || (videoTypeValue !== "short" && videoTypeValue !== "long")) {
      return NextResponse.json({ error: "Invalid videoType. Use 'short' or 'long'." }, { status: 400 });
    }
    if (!propertyType) missingFields.push("propertyType");
    if (!status) missingFields.push("status");
    if (price === undefined || price === null || price === "") missingFields.push("price");
    if (!country?.trim()) missingFields.push("country");
    if (!city?.trim()) missingFields.push("city");

    const incomingUrl = typeof videoUrl === "string" ? videoUrl.trim() : "";
    const mergedVideoUrl = incomingUrl || (existing.videoUrl?.trim() ?? "");
    if (!existing.isTemplate && !mergedVideoUrl) missingFields.push("videoUrl");

    if (missingFields.length > 0) {
      return NextResponse.json({ error: "Missing required fields", missingFields }, { status: 400 });
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

    const thumbIncoming = typeof thumbnail === "string" ? thumbnail.trim() : "";
    let thumbnailFinal = thumbIncoming || (existing.thumbnail?.trim() ?? "");
    if (!thumbnailFinal) {
      thumbnailFinal = FALLBACK_THUMBNAIL;
    }

    const rawAddress = address !== undefined && address !== null ? String(address).trim() : "";
    const hasCoords =
      latitudeNumber !== undefined &&
      longitudeNumber !== undefined &&
      Number.isFinite(latitudeNumber) &&
      Number.isFinite(longitudeNumber);
    const addressFinal = hasCoords
      ? `${rawAddress} (lat:${latitudeNumber}, lng:${longitudeNumber})`
      : rawAddress || undefined;

    let templateIdFinal: string | null = existing.templateId;
    if (existing.isTemplate && typeof bodyTemplateId === "string" && bodyTemplateId.trim()) {
      const tpl = await prisma.template.findUnique({
        where: { id: bodyTemplateId.trim() },
        select: { id: true, type: true },
      });
      if (!tpl) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      templateIdFinal = tpl.id;
    }

    let imagesFinal = existing.images ?? [];
    if (existing.isTemplate && Array.isArray(bodyImages)) {
      imagesFinal = bodyImages
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .map((u) => u.trim());
      if (!imagesFinal.length) {
        return NextResponse.json({ error: "Template listings require at least one image URL", missingFields: ["images"] }, { status: 400 });
      }
    }

    let audioFinal: string | null = existing.audio ?? null;
    if (existing.isTemplate && bodyAudio !== undefined) {
      audioFinal =
        typeof bodyAudio === "string" && bodyAudio.trim() ? bodyAudio.trim() : null;
    }

    let templateTypeForShort: string | undefined;
    if (existing.isTemplate && templateIdFinal) {
      const t = await prisma.template.findUnique({
        where: { id: templateIdFinal },
        select: { type: true },
      });
      templateTypeForShort = t?.type;
    }
    const isShortFinal = existing.isTemplate
      ? String(templateTypeForShort ?? "").toLowerCase() === "short"
      : videoTypeValue === "short";

    if (existing.isTemplate && imagesFinal.length && (!thumbIncoming || !thumbIncoming.length)) {
      thumbnailFinal = imagesFinal[0] || thumbnailFinal;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (existing.isTemplate && templateIdFinal && bodyTemplateConfig && typeof bodyTemplateConfig === "object") {
        await tx.template.update({
          where: { id: templateIdFinal },
          data: { config: bodyTemplateConfig as any },
        });
      }
      const v = await tx.video.update({
        where: { id },
        data: {
          title: String(title).trim(),
          description: description ? String(description).trim() : null,
          videoUrl: existing.isTemplate ? existing.videoUrl : mergedVideoUrl,
          thumbnail: thumbnailFinal,
          isShort: isShortFinal,
          propertyType: videoPropertyTypeValue,
          ...(existing.isTemplate
            ? {
                images: imagesFinal,
                audio: audioFinal,
                templateId: templateIdFinal,
              }
            : {}),
        },
      });
      await tx.property.update({
        where: { videoId: id },
        data: {
          propertyType: propertyTypeValue,
          status: statusValue as PropertyStatus,
          price: priceNumber,
          bedrooms: bedroomsNumber,
          bathrooms: bathroomsNumber,
          sizeSqm: sizeSqmNumber,
          currency: currency ? String(currency) : "USD",
          country: String(country).trim(),
          city: String(city).trim(),
          address: addressFinal ?? undefined,
          latitude: latitudeNumber,
          longitude: longitudeNumber,
        },
      });
      return v;
    });

    return NextResponse.json({
      ...updated,
      thumbnailUrl: updated.thumbnail,
    });
  } catch (error) {
    console.error("VIDEO PUT ERROR:", error);
    return NextResponse.json(
      {
        error: "Failed to update video",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
