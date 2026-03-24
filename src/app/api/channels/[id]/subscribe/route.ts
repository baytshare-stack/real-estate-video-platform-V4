import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { toggleChannelSubscription } from "@/lib/channel-subscription";

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
