import type { SubscriptionNotifyPreference } from "@prisma/client";
import prisma from "@/lib/prisma";
import { safeFindFirst, safeFindUnique } from "@/lib/safePrisma";
import { recordCrmEvent } from "@/lib/crm-events";

export type ToggleSubscriptionSuccess = {
  ok: true;
  subscribed: boolean;
  subscriberCount: number;
  notificationPreference: SubscriptionNotifyPreference | null;
};

export type ToggleSubscriptionFailure = {
  ok: false;
  status: number;
  error: string;
};

export type ToggleSubscriptionResult = ToggleSubscriptionSuccess | ToggleSubscriptionFailure;

const PREF_VALUES = new Set<SubscriptionNotifyPreference>(["ALL", "PERSONALIZED", "NONE"]);

export function parseNotificationPreference(
  raw: unknown
): SubscriptionNotifyPreference | undefined {
  if (typeof raw !== "string") return undefined;
  const u = raw.toUpperCase() as SubscriptionNotifyPreference;
  return PREF_VALUES.has(u) ? u : undefined;
}

async function assertChannelAndNotSelf(subscriberId: string, channelId: string) {
  const channel = await safeFindUnique(() =>
    prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true },
    })
  );

  if (!channel) {
    return { ok: false as const, status: 404, error: "Channel not found" };
  }

  const subscriber = await safeFindUnique(() =>
    prisma.user.findUnique({
      where: { id: subscriberId },
      select: { channel: { select: { id: true } } },
    })
  );

  const myChannelId = subscriber?.channel?.id;
  if (myChannelId && myChannelId === channelId) {
    return { ok: false as const, status: 400, error: "You cannot subscribe to your own channel" };
  }

  return { ok: true as const };
}

export async function toggleChannelSubscription(
  subscriberId: string,
  channelId: string
): Promise<ToggleSubscriptionResult> {
  const gate = await assertChannelAndNotSelf(subscriberId, channelId);
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error };
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
        data: { subscriberId, channelId, notificationPreference: "ALL" },
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
      notificationPreference: (!existing ? "ALL" : null) as SubscriptionNotifyPreference | null,
    };
  });

  if (next.subscribed) {
    void recordCrmEvent({
      type: "CHANNEL_SUBSCRIBED",
      userId: subscriberId,
      channelId,
      metadata: { notificationPreference: "ALL" },
    });
  } else {
    void recordCrmEvent({
      type: "CHANNEL_UNSUBSCRIBED",
      userId: subscriberId,
      channelId,
    });
  }

  return {
    ok: true,
    subscribed: next.subscribed,
    subscriberCount: next.subscriberCount,
    notificationPreference: next.notificationPreference,
  };
}

export async function updateSubscriptionPreference(
  subscriberId: string,
  channelId: string,
  preference: SubscriptionNotifyPreference
): Promise<
  | { ok: true; notificationPreference: SubscriptionNotifyPreference }
  | { ok: false; status: number; error: string }
> {
  const gate = await assertChannelAndNotSelf(subscriberId, channelId);
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error };
  }

  const sub = await safeFindFirst(() =>
    prisma.subscription.findFirst({
      where: { subscriberId, channelId },
      select: { id: true },
    })
  );

  if (!sub) {
    return { ok: false, status: 404, error: "Not subscribed" };
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { notificationPreference: preference },
  });

  void recordCrmEvent({
    type: "SUBSCRIPTION_NOTIFY_PREF_CHANGED",
    userId: subscriberId,
    channelId,
    metadata: { notificationPreference: preference },
  });

  return { ok: true, notificationPreference: preference };
}

export async function ensureSubscribed(
  subscriberId: string,
  channelId: string
): Promise<ToggleSubscriptionResult> {
  const gate = await assertChannelAndNotSelf(subscriberId, channelId);
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error };
  }

  const existing = await safeFindFirst(() =>
    prisma.subscription.findFirst({
      where: { subscriberId, channelId },
      select: { id: true, notificationPreference: true },
    })
  );

  if (existing) {
    const subscriberCount = await prisma.subscription.count({ where: { channelId } });
    return {
      ok: true,
      subscribed: true,
      subscriberCount,
      notificationPreference: existing.notificationPreference,
    };
  }

  const next = await prisma.$transaction(async (tx) => {
    await tx.subscription.create({
      data: { subscriberId, channelId, notificationPreference: "ALL" },
    });
    const subscriberCount = await tx.subscription.count({ where: { channelId } });
    await tx.channel.update({
      where: { id: channelId },
      data: { subscribersCount: subscriberCount },
    });
    return { subscriberCount };
  });

  void recordCrmEvent({
    type: "CHANNEL_SUBSCRIBED",
    userId: subscriberId,
    channelId,
    metadata: { notificationPreference: "ALL", source: "ensureSubscribed" },
  });

  return {
    ok: true,
    subscribed: true,
    subscriberCount: next.subscriberCount,
    notificationPreference: "ALL",
  };
}

export async function ensureUnsubscribed(
  subscriberId: string,
  channelId: string
): Promise<ToggleSubscriptionResult> {
  const gate = await assertChannelAndNotSelf(subscriberId, channelId);
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error };
  }

  const existing = await safeFindFirst(() =>
    prisma.subscription.findFirst({
      where: { subscriberId, channelId },
      select: { id: true },
    })
  );

  if (!existing) {
    const subscriberCount = await prisma.subscription.count({ where: { channelId } });
    return {
      ok: true,
      subscribed: false,
      subscriberCount,
      notificationPreference: null,
    };
  }

  const next = await prisma.$transaction(async (tx) => {
    await tx.subscription.delete({ where: { id: existing.id } });
    const subscriberCount = await tx.subscription.count({ where: { channelId } });
    await tx.channel.update({
      where: { id: channelId },
      data: { subscribersCount: subscriberCount },
    });
    return { subscriberCount };
  });

  void recordCrmEvent({
    type: "CHANNEL_UNSUBSCRIBED",
    userId: subscriberId,
    channelId,
    metadata: { source: "ensureUnsubscribed" },
  });

  return {
    ok: true,
    subscribed: false,
    subscriberCount: next.subscriberCount,
    notificationPreference: null,
  };
}
