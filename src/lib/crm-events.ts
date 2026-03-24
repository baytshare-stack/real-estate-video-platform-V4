import prisma from "@/lib/prisma";

export type CrmEventType =
  | "VIDEO_SHARED"
  | "VIDEO_ENGAGEMENT"
  | "COMMENT_CREATED"
  | "COMMENT_ENGAGEMENT";

export async function recordCrmEvent(input: {
  type: CrmEventType | string;
  userId?: string | null;
  videoId?: string | null;
  channelId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.crmEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? undefined,
        videoId: input.videoId ?? undefined,
        channelId: input.channelId ?? undefined,
        metadata: input.metadata as object | undefined,
      },
    });
  } catch (e) {
    console.error("[crm-events]", e);
  }
}
