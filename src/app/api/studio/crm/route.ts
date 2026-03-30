import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { safeFindMany, safeFindUnique } from '@/lib/safePrisma';
import type { Prisma } from '@prisma/client';

const TEMPLATE_CRM_TYPES = [
  'TEMPLATE_VIEW',
  'TEMPLATE_WHATSAPP_CLICK',
  'TEMPLATE_CALL_CLICK',
  'TEMPLATE_EMAIL_CLICK',
] as const;

type UserWithChannel = Prisma.UserGetPayload<{ include: { channel: true } }>;

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  country: true,
  phoneNumber: true,
  phoneCode: true,
  phone: true,
  fullPhoneNumber: true,
  role: true,
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = (await safeFindUnique(() =>
    prisma.user.findUnique({
      where: { email },
      include: { channel: true },
    })
  )) as UserWithChannel | null;

  if (!user?.channel) {
    return NextResponse.json({ error: 'No channel found' }, { status: 404 });
  }

  const channelId = user.channel.id;

  const likers = await safeFindMany(() =>
    prisma.videoReaction.findMany({
      where: { video: { channelId }, type: "LIKE" },
      include: {
        user: { select: { ...userSelect } },
        video: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  );

  const commenters = await safeFindMany(() =>
    prisma.comment.findMany({
      where: { video: { channelId } },
      include: {
        user: { select: { ...userSelect } },
        video: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  );

  type TemplateEventRow = {
    type: string;
    videoTitle: string;
    createdAt: string;
  };

  type MapEntry = {
    user: {
      id: string;
      fullName: string;
      email: string;
      country: string | null;
      phoneNumber: string | null;
      phoneCode: string | null;
      phone: string | null;
      fullPhoneNumber: string | null;
      role: string;
    };
    likes: { videoTitle: string }[];
    comments: { videoTitle: string; content?: string }[];
    isSubscriber: boolean;
    templateEvents: TemplateEventRow[];
  };

  type CrmInteractorResponse = {
    user: MapEntry["user"];
    likes: MapEntry["likes"];
    comments: MapEntry["comments"];
    isSubscriber: boolean;
    templateEvents: TemplateEventRow[];
    totalInteractions: number;
    isAnonymousAggregate?: boolean;
  };

  const interactorMap = new Map<string, MapEntry>();

  for (const l of likers) {
    const existing = interactorMap.get(l.user.id);
    if (existing) {
      existing.likes.push({ videoTitle: l.video.title });
    } else {
      interactorMap.set(l.user.id, {
        user: l.user,
        likes: [{ videoTitle: l.video.title }],
        comments: [],
        isSubscriber: false,
        templateEvents: [],
      });
    }
  }

  for (const c of commenters) {
    const existing = interactorMap.get(c.user.id);
    if (existing) {
      existing.comments.push({ videoTitle: c.video.title });
    } else {
      interactorMap.set(c.user.id, {
        user: c.user,
        likes: [],
        comments: [{ videoTitle: c.video.title }],
        isSubscriber: false,
        templateEvents: [],
      });
    }
  }

  const channelSubs = await safeFindMany(() =>
    prisma.subscription.findMany({
      where: { channelId },
      include: {
        subscriber: { select: { ...userSelect } },
      },
    })
  );

  for (const s of channelSubs) {
    const existing = interactorMap.get(s.subscriberId);
    if (existing) {
      existing.isSubscriber = true;
    } else {
      interactorMap.set(s.subscriberId, {
        user: s.subscriber,
        likes: [],
        comments: [],
        isSubscriber: true,
        templateEvents: [],
      });
    }
  }

  for (const entry of interactorMap.values()) {
    if (!entry.templateEvents) entry.templateEvents = [];
  }

  const templateCrmRows = await safeFindMany(() =>
    prisma.crmEvent.findMany({
      where: {
        channelId,
        type: { in: [...TEMPLATE_CRM_TYPES] },
      },
      orderBy: { createdAt: 'desc' },
      take: 800,
      select: {
        type: true,
        userId: true,
        videoId: true,
        createdAt: true,
      },
    })
  );

  const tplVideoIds = [
    ...new Set(
      templateCrmRows.map((r) => r.videoId).filter((id): id is string => Boolean(id))
    ),
  ];
  const tplVideos =
    tplVideoIds.length === 0
      ? []
      : await safeFindMany(() =>
          prisma.video.findMany({
            where: { id: { in: tplVideoIds }, channelId },
            select: { id: true, title: true },
          })
        );
  const videoTitleById = new Map(tplVideos.map((v) => [v.id, v.title]));

  const templateUserIds = [
    ...new Set(
      templateCrmRows.map((r) => r.userId).filter((id): id is string => Boolean(id))
    ),
  ];
  const missingUserIds = templateUserIds.filter((id) => !interactorMap.has(id));
  const templateUsers =
    missingUserIds.length === 0
      ? []
      : await safeFindMany(() =>
          prisma.user.findMany({
            where: { id: { in: missingUserIds } },
            select: { ...userSelect },
          })
        );
  for (const u of templateUsers) {
    interactorMap.set(u.id, {
      user: u,
      likes: [],
      comments: [],
      isSubscriber: false,
      templateEvents: [],
    });
  }

  const anonymousTemplateEvents: TemplateEventRow[] = [];

  for (const row of templateCrmRows) {
    const videoTitle = row.videoId
      ? videoTitleById.get(row.videoId) ?? 'Template listing'
      : 'Template listing';
    const ev: TemplateEventRow = {
      type: row.type,
      videoTitle,
      createdAt: row.createdAt.toISOString(),
    };
    if (row.userId) {
      const existing = interactorMap.get(row.userId);
      if (existing) {
        existing.templateEvents.push(ev);
      }
    } else {
      anonymousTemplateEvents.push(ev);
    }
  }

  const interactors: CrmInteractorResponse[] = Array.from(interactorMap.values()).map((entry) => ({
    ...entry,
    templateEvents: entry.templateEvents ?? [],
    totalInteractions:
      entry.likes.length +
      entry.comments.length +
      (entry.isSubscriber ? 1 : 0) +
      (entry.templateEvents?.length ?? 0),
  }));

  if (anonymousTemplateEvents.length > 0) {
    interactors.push({
      user: {
        id: '__crm_anonymous_template__',
        fullName: 'Anonymous template visitors',
        email: '',
        country: null,
        phoneNumber: null,
        phoneCode: null,
        phone: null,
        fullPhoneNumber: null,
        role: 'VISITOR',
      },
      likes: [],
      comments: [],
      isSubscriber: false,
      templateEvents: anonymousTemplateEvents,
      totalInteractions: anonymousTemplateEvents.length,
      isAnonymousAggregate: true,
    });
  }

  interactors.sort((a, b) => b.totalInteractions - a.totalInteractions);

  return NextResponse.json({ interactors });
}
