import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { safeFindFirst, safeFindUnique } from "@/lib/safePrisma";
import { authOptions } from "@/lib/auth-options";
import { buildWatchPageContact } from "@/lib/videoContact";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("id");

    if (!videoId) {
      return NextResponse.json({ error: "Missing video id" }, { status: 400 });
    }

    const video = await safeFindUnique(() =>
      prisma.video.findUnique({
        where: { id: videoId },
        include: {
          property: true,
          template: true,
          channel: {
            select: {
              id: true,
              ownerId: true,
              name: true,
              avatar: true,
              subscribersCount: true,
              phone: true,
              whatsapp: true,
              whatsappUrl: true,
              owner: {
                select: {
                  fullPhoneNumber: true,
                  whatsapp: true,
                  phone: true,
                  phoneCode: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      })
    );

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;

    let userReaction: "LIKE" | "DISLIKE" | null = null;
    let subscribedToChannel = false;
    let subscriptionNotificationPreference: "ALL" | "PERSONALIZED" | "NONE" | null = null;
    if (userId) {
      const [reactionRow, subRow] = await Promise.all([
        safeFindFirst(() =>
          prisma.videoReaction.findUnique({
            where: { userId_videoId: { userId, videoId } },
            select: { type: true },
          })
        ),
        safeFindFirst(() =>
          prisma.subscription.findFirst({
            where: { subscriberId: userId, channelId: video.channel.id },
            select: { id: true, notificationPreference: true },
          })
        ),
      ]);
      userReaction = reactionRow?.type ?? null;
      subscribedToChannel = Boolean(subRow);
      subscriptionNotificationPreference = subRow?.notificationPreference ?? null;
    }

    const contactInfo = buildWatchPageContact(video.channel?.owner ?? undefined, video.channel ?? undefined);

    const tpl = video.template;
    const templateDto = tpl
      ? {
          id: tpl.id,
          name: tpl.name,
          type: tpl.type,
          previewImage: tpl.previewImage,
          previewVideo: tpl.previewVideo,
          defaultAudio: tpl.defaultAudio,
          config: tpl.config,
        }
      : null;

    const watchData = {
      id: video.id,
      videoAds: [],
      smartAds: [],
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnail,
      isShort: video.isShort,
      isTemplate: video.isTemplate,
      templateId: video.templateId,
      images: video.images ?? [],
      audio: video.audio ?? null,
      template: templateDto,
      playbackId: "",
      title: video.title,
      description: video.description,
      price: video.property?.price ? Number(video.property.price) : 0,
      currency: video.property?.currency || "USD",
      bedrooms: video.property?.bedrooms,
      bathrooms: video.property?.bathrooms,
      sizeSqm: video.property?.sizeSqm,
      city: video.property?.city,
      country: video.property?.country,
      category: video.category ?? video.propertyType ?? null,
      location:
        video.location?.trim() ||
        `${video.property?.city ?? ""}, ${video.property?.country ?? ""}`.replace(/^,\s*|\s*,$/g, "").trim() ||
        null,
      views: video.viewsCount ?? 0,
      address: video.property?.address,
      latitude: 0,
      longitude: 0,
      status: video.property?.status,
      viewsCount: video.viewsCount ?? 0,
      createdAt: video.createdAt.toISOString(),
      likesCount: video.likesCount,
      userReaction,
      subscribedToChannel,
      subscriptionNotificationPreference,
      channel: {
        id: video.channel.id,
        channelName: video.channel.name,
        avatarUrl: video.channel.avatar,
        followersCount: video.channel.subscribersCount,
        subscribersCount: video.channel.subscribersCount,
      },
      channelId: video.channel.id,
      agentUserId: video.channel.ownerId,
      propertyId: video.property?.id ?? null,
      contact: contactInfo,
    };

    return NextResponse.json(watchData, { status: 200 });
  } catch (error) {
    console.error("Watch API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
