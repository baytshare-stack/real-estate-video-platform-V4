import type { CampaignStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

export const runtime = "nodejs";

const ALLOWED: CampaignStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "ENDED"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;
    if (!id?.trim()) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

    const body = (await req.json()) as { status?: unknown };
    const status = String(body.status || "").toUpperCase() as CampaignStatus;
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    if (existing.status === "DELETED") {
      return NextResponse.json({ error: "Cannot change a deleted campaign." }, { status: 400 });
    }

    await prisma.campaign.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin campaigns-control PATCH", e);
    return NextResponse.json({ error: "Failed to update campaign." }, { status: 500 });
  }
}
