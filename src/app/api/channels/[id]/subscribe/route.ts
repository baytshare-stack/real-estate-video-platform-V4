import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { safeCount, safeFindFirst } from "@/lib/safePrisma";
import { toggleChannelSubscription } from "@/lib/channel-subscription";

/** Current user's subscription status for this channel (for client hydration). */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const subscriberId = session?.user?.id as string | undefined;
    const { id: channelId } = await context.params;
    if (!channelId) {
      return NextResponse.json({ error: "Missing channel id" }, { status: 400 });
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
    console.error("[GET /api/channels/[id]/subscribe]", err);
    return NextResponse.json({ error: "Failed to read subscription status" }, { status: 500 });
  }
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const subscriberId = session?.user?.id as string | undefined;

    if (!subscriberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: channelId } = await context.params;
    if (!channelId) {
      return NextResponse.json({ error: "Missing channel id" }, { status: 400 });
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
    console.error("[POST /api/channels/[id]/subscribe]", err);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
