import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<{
      isShort: boolean;
      moderationStatus: ModerationStatus;
      title: string;
      description: string | null;
    }>;

    const data: {
      isShort?: boolean;
      moderationStatus?: ModerationStatus;
      title?: string;
      description?: string | null;
    } = {};

    if (typeof body.isShort === "boolean") data.isShort = body.isShort;

    if (
      body.moderationStatus === "PENDING" ||
      body.moderationStatus === "APPROVED" ||
      body.moderationStatus === "REJECTED"
    ) {
      data.moderationStatus = body.moderationStatus;
    }

    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (!t) {
        return NextResponse.json({ error: "title cannot be empty." }, { status: 400 });
      }
      data.title = t;
    }
    if (body.description !== undefined) {
      data.description =
        body.description === null ? null : String(body.description).trim() || null;
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    try {
      await prisma.video.update({ where: { id }, data });
    } catch {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update video." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    try {
      await prisma.video.delete({ where: { id } });
    } catch {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete video." }, { status: 500 });
  }
}

