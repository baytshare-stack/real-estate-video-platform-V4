import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeFindUnique } from "@/lib/safePrisma";

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
          channel: {
            select: {
              id: true,
              name: true,
              avatar: true,
              owner: {
                select: {
                  phoneNumber: true,
                  phoneCode: true,
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

    const contactPhoneCode = video.channel?.owner?.phoneCode || "";
    const contactPhoneNumber = video.channel?.owner?.phoneNumber || "";

    let contactInfo = null;
    if (contactPhoneNumber) {
      const waLink = `https://wa.me/${contactPhoneCode.replace('+', '')}${contactPhoneNumber}?text=I%20am%20interested%20in%20this%20property%20and%20would%20like%20more%20information.`;
      contactInfo = {
        rawPhone: `+${contactPhoneCode.replace('+', '')} ${contactPhoneNumber}`,
        whatsappLink: waLink,
      };
    }

    const watchData = {
      id: video.id,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnail,
      isShort: video.isShort,
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
      location: `${video.property?.city}, ${video.property?.country}`,
      address: video.property?.address,
      latitude: 0,
      longitude: 0,
      status: video.property?.status,
      viewsCount: 0,
      likesCount: video.likesCount,
      channel: {
        id: video.channel.id,
        channelName: video.channel.name,
        avatarUrl: video.channel.avatar,
        followersCount: 0,
      },
      channelId: video.channel.id,
      contact: contactInfo,
    };

    return NextResponse.json(watchData, { status: 200 });
  } catch (error) {
    console.error("Watch API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
