import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { recordCrmEvent } from "@/lib/crm-events";

const KINDS = new Set(["view", "whatsapp", "call", "email"]);

const CRM_TYPES: Record<string, string> = {
  view: "TEMPLATE_VIEW",
  whatsapp: "TEMPLATE_WHATSAPP_CLICK",
  call: "TEMPLATE_CALL_CLICK",
  email: "TEMPLATE_EMAIL_CLICK",
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;

    const body = await req.json().catch(() => ({}));
    const videoId = typeof body?.videoId === "string" ? body.videoId : "";
    const channelId = typeof body?.channelId === "string" ? body.channelId : "";
    const kind = typeof body?.kind === "string" ? body.kind : "";

    if (!videoId || !channelId || !KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const video = await prisma.video.findFirst({
      where: { id: videoId, channelId, isTemplate: true },
      select: { id: true, viewsCount: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (kind === "view") {
      await prisma.video.update({
        where: { id: videoId },
        data: { viewsCount: { increment: 1 } },
      });
    }

    void recordCrmEvent({
      type: CRM_TYPES[kind] ?? "TEMPLATE_INTERACTION",
      userId: userId ?? null,
      videoId,
      channelId,
      metadata: { kind },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[template-interaction]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
