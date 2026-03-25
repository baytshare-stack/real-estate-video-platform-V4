import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { safeFindFirst, safeFindUnique } from "@/lib/safePrisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const subscriberId = (session?.user?.id as string | undefined) || "test-user-id";

    if (!subscriberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const channelId = body?.channelId as string | undefined;

    if (!channelId || typeof channelId !== "string") {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const channel = await safeFindUnique(() =>
      prisma.channel.findUnique({
        where: { id: channelId },
        select: { id: true },
      })
    );

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // A user can't subscribe to their own channel.
    const subscriber = await safeFindUnique(() =>
      prisma.user.findUnique({
        where: { id: subscriberId },
        select: { channel: { select: { id: true } } },
      })
    );

    const myChannelId = subscriber?.channel?.id;
    if (myChannelId && myChannelId === channelId) {
      return NextResponse.json({ error: "You cannot subscribe to your own channel" }, { status: 400 });
    }

    const existing = await safeFindFirst(() =>
      prisma.subscription.findFirst({
        where: {
          subscriberId,
          channelId,
        },
        select: { id: true },
      })
    );

    const next = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.subscription.delete({ where: { id: existing.id } });
      } else {
        await tx.subscription.create({
          data: {
            subscriberId,
            channelId,
          },
        });
      }

      const subscriberCount = await tx.subscription.count({ where: { channelId } });

      await tx.channel.update({
        where: { id: channelId },
        data: { subscribersCount: subscriberCount },
      });

      return {
        subscribed: !existing,
        subscriberCount,
      };
    });

    return NextResponse.json(next, { status: 200 });
  } catch (err: any) {
    console.error("Channel subscribe error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to update subscription" },
      { status: 500 }
    );
  }
}

