import type { AdAdminReviewStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

export const runtime = "nodejs";

function parseReview(v: unknown): AdAdminReviewStatus | undefined {
  const s = String(v || "").toUpperCase();
  if (s === "PENDING" || s === "APPROVED" || s === "REJECTED") return s;
  return undefined;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;
    if (!id?.trim()) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

    const body = (await req.json()) as { adminReviewStatus?: unknown; active?: unknown };
    const review = parseReview(body.adminReviewStatus);
    const active = typeof body.active === "boolean" ? body.active : undefined;

    if (review === undefined && active === undefined) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Ad not found." }, { status: 404 });

    await prisma.ad.update({
      where: { id },
      data: {
        ...(review !== undefined ? { adminReviewStatus: review } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin ads-control PATCH", e);
    return NextResponse.json({ error: "Failed to update ad." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;
    if (!id?.trim()) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Ad not found." }, { status: 404 });

    await prisma.ad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin ads-control DELETE", e);
    return NextResponse.json({ error: "Failed to delete ad." }, { status: 500 });
  }
}
