import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeFindUnique } from "@/lib/safePrisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function digitsToPlus(d: string | null | undefined) {
  if (!d) return null;
  const x = d.replace(/\D/g, "");
  return x ? `+${x}` : null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "USER" || session.user.role === "ADMIN") {
      return NextResponse.json({ error: "Only agents or agencies can create channels" }, { status: 403 });
    }

    const body = await req.json();
    const { channelName, description, avatarUrl } = body;

    if (!channelName) {
      return NextResponse.json({ error: "Channel Name is required" }, { status: 400 });
    }

    const existingChannel = await safeFindUnique(() =>
      prisma.channel.findUnique({
        where: { ownerId: session.user.id },
      })
    );

    if (existingChannel) {
      return NextResponse.json({ error: "User already has a channel" }, { status: 409 });
    }

    const owner = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        country: true,
        fullPhoneNumber: true,
        phone: true,
        whatsapp: true,
      },
    });

    const phoneLine = owner?.fullPhoneNumber || digitsToPlus(owner?.phone);
    const waLine = digitsToPlus(owner?.whatsapp);

    const newChannel = await prisma.channel.create({
      data: {
        ownerId: session.user.id,
        name: channelName,
        description,
        avatar: avatarUrl,
        country: owner?.country ?? undefined,
        phone: phoneLine ?? undefined,
        whatsapp: waLine ?? phoneLine ?? undefined,
      },
    });

    return NextResponse.json(newChannel, { status: 201 });
  } catch (error) {
    console.error("Channel Creation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
