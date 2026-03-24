import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Status = "DRAFT" | "ACTIVE" | "PAUSED";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<{ name: string; status: Status }>;

    const sets: string[] = [];
    const params: any[] = [];

    if (typeof body.name === "string" && body.name.trim()) {
      params.push(body.name.trim());
      sets.push(`name = $${params.length}`);
    }

    if (body.status === "DRAFT" || body.status === "ACTIVE" || body.status === "PAUSED") {
      params.push(body.status);
      sets.push(`status = $${params.length}`);
    }

    if (!sets.length) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    params.push(id);
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "AdCampaign" SET ${sets.join(", ")} WHERE id = $${params.length}`,
      ...params
    );

    if (!updated) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update campaign." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = await prisma.$executeRawUnsafe(`DELETE FROM "AdCampaign" WHERE id = $1`, id);
    if (!deleted) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete campaign." }, { status: 500 });
  }
}

