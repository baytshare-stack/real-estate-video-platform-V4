import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { toggleChannelSubscription } from "@/lib/channel-subscription";

/** Legacy JSON body `{ channelId }` — prefer POST /api/channels/[id]/subscribe */
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
      {
        subscribed: result.subscribed,
        subscriberCount: result.subscriberCount,
        notificationPreference: result.notificationPreference,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Channel subscribe error:", err);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
