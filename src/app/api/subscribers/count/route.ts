import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeCount } from "@/lib/safePrisma";

/** GET /api/subscribers/count?channelId=… — public subscriber count for a channel. */
export async function GET(req: Request) {
  try {
    const channelId = new URL(req.url).searchParams.get("channelId");
    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, subscribersCount: true },
    });
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const fromRows = await safeCount(() =>
      prisma.subscription.count({ where: { channelId } })
    );

    return NextResponse.json({
      channelId,
      subscriberCount: fromRows,
      subscribersCountDenormalized: channel.subscribersCount,
    });
  } catch (e) {
    console.error("[GET /api/subscribers/count]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
