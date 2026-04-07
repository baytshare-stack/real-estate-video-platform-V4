import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });

  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    status?: "ACTIVE" | "PAUSED" | "ENDED";
    budget?: number;
    dailyBudget?: number;
  };

  const existing = await prisma.campaign.findFirst({
    where: { id, advertiserId: auth.profile.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(typeof body.budget === "number" ? { budget: body.budget } : {}),
      ...(typeof body.dailyBudget === "number" ? { dailyBudget: body.dailyBudget } : {}),
    },
  });
  return NextResponse.json({ campaign });
}

