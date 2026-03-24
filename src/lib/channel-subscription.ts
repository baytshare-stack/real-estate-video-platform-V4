import prisma from "@/lib/prisma";
import { safeFindFirst, safeFindUnique } from "@/lib/safePrisma";

export type ToggleSubscriptionSuccess = {
  ok: true;
  subscribed: boolean;
  subscriberCount: number;
};

export type ToggleSubscriptionFailure = {
  ok: false;
  status: number;
  error: string;
};

export type ToggleSubscriptionResult = ToggleSubscriptionSuccess | ToggleSubscriptionFailure;

export async function toggleChannelSubscription(
  subscriberId: string,
  channelId: string
): Promise<ToggleSubscriptionResult> {
  const channel = await safeFindUnique(() =>
    prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true },
    })
  );

  if (!channel) {
    return { ok: false, status: 404, error: "Channel not found" };
  }

  const subscriber = await safeFindUnique(() =>
    prisma.user.findUnique({
      where: { id: subscriberId },
      select: { channel: { select: { id: true } } },
    })
  );

  const myChannelId = subscriber?.channel?.id;
  if (myChannelId && myChannelId === channelId) {
    return { ok: false, status: 400, error: "You cannot subscribe to your own channel" };
  }

  const existing = await safeFindFirst(() =>
    prisma.subscription.findFirst({
      where: { subscriberId, channelId },
      select: { id: true },
    })
  );

  const next = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.subscription.delete({ where: { id: existing.id } });
    } else {
      await tx.subscription.create({
        data: { subscriberId, channelId },
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

  return { ok: true, ...next };
}
