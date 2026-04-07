import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { safeCount, safeFindFirst } from "@/lib/safePrisma";
import {
  ensureSubscribed,
  ensureUnsubscribed,
  parseNotificationPreference,
  updateSubscriptionPreference,
} from "@/lib/channel-subscription";

/** Subscribe only (idempotent). Body: `{ channelId }`. Prefer REST: POST subscribe, DELETE unsubscribe. */
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

    const result = await ensureSubscribed(subscriberId, channelId);
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
    console.error("[api/subscribe POST]", err);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

/** Unsubscribe only (idempotent). Body or query: `channelId`. */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const subscriberId = session?.user?.id as string | undefined;
    if (!subscriberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let channelId: string | undefined;
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      channelId = typeof body?.channelId === "string" ? body.channelId : undefined;
    }
    if (!channelId) {
      channelId = new URL(req.url).searchParams.get("channelId") ?? undefined;
    }
    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const result = await ensureUnsubscribed(subscriberId, channelId);
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
    console.error("[api/subscribe DELETE]", err);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
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
      return NextResponse.json(
        { subscribed: false, subscriberCount, notificationPreference: null },
        { status: 200 }
      );
    }

    const existing = await safeFindFirst(() =>
      prisma.subscription.findFirst({
        where: { subscriberId, channelId },
        select: { id: true, notificationPreference: true },
      })
    );

    return NextResponse.json(
      {
        subscribed: Boolean(existing),
        subscriberCount,
        notificationPreference: existing?.notificationPreference ?? null,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[api/subscribe GET]", err);
    return NextResponse.json({ error: "Failed to read subscription status" }, { status: 500 });
  }
}

/** Optional: update notification preference via legacy subscribe route. Body: `{ channelId, notificationPreference }`. */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const subscriberId = session?.user?.id as string | undefined;
    if (!subscriberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const channelId = typeof body?.channelId === "string" ? body.channelId : undefined;
    const pref = parseNotificationPreference(body?.notificationPreference);
    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }
    if (!pref) {
      return NextResponse.json(
        { error: "Invalid notificationPreference" },
        { status: 400 }
      );
    }

    const result = await updateSubscriptionPreference(subscriberId, channelId, pref);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ notificationPreference: result.notificationPreference }, { status: 200 });
  } catch (err: unknown) {
    console.error("[api/subscribe PUT]", err);
    return NextResponse.json({ error: "Failed to update preference" }, { status: 500 });
  }
}
