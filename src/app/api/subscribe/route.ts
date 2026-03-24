import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { safeCount, safeFindFirst } from "@/lib/safePrisma";
import { toggleChannelSubscription } from "@/lib/channel-subscription";

/** Legacy body `{ channelId }` — prefer POST /api/channels/[id]/subscribe */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const subscriberId = session?.user?.id as string | undefined;

    if (!subscriberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const channelId = body?.channelId as string | undefined;

    if (!channelId || typeof channelId !== "string") {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const result = await toggleChannelSubscription(subscriberId, channelId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      { subscribed: result.subscribed, subscriberCount: result.subscriberCount },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[api/subscribe]", err);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}

/** Read subscription status for current user + channel (used for UI hydration). */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const subscriberId = session?.user?.id as string | undefined;
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const subscriberCount = await safeCount(() =>
      prisma.subscription.count({ where: { channelId } })
    );

    if (!subscriberId) {
      return NextResponse.json({ subscribed: false, subscriberCount }, { status: 200 });
    }

    const existing = await safeFindFirst(() =>
      prisma.subscription.findFirst({
        where: { subscriberId, channelId },
        select: { id: true },
      })
    );

    return NextResponse.json(
      { subscribed: Boolean(existing), subscriberCount },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[api/subscribe:get]", err);
    return NextResponse.json({ error: "Failed to read subscription status" }, { status: 500 });
  }
}
