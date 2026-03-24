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
    }>;

    const sets: string[] = [];
    const params: any[] = [];

    if (typeof body.isShort === "boolean") {
      params.push(body.isShort);
      sets.push(`"isShort" = $${params.length}`);
    }

    if (
      body.moderationStatus === "PENDING" ||
      body.moderationStatus === "APPROVED" ||
      body.moderationStatus === "REJECTED"
    ) {
      params.push(body.moderationStatus);
      sets.push(`"moderationStatus" = $${params.length}`);
    }

    if (!sets.length) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    params.push(id);
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "Video" SET ${sets.join(", ")} WHERE id = $${params.length}`,
      ...params
    );

    if (!updated) {
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
    const deleted = await prisma.$executeRawUnsafe(`DELETE FROM "Video" WHERE id = $1`, id);
    if (!deleted) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete video." }, { status: 500 });
  }
}

