import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStudioUser } from "@/lib/ads-platform/auth";
import { ensureWallet } from "@/lib/ads-platform/billing";

export async function GET() {
  const user = await requireStudioUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.advertiserProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const user = await requireStudioUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { businessName?: string };
  const businessName = String(body.businessName || "").trim();
  if (!businessName) return NextResponse.json({ error: "businessName is required" }, { status: 400 });

  const profile = await prisma.$transaction(async (tx) => {
    const p = await tx.advertiserProfile.upsert({
      where: { userId: user.id },
      update: { businessName },
      create: { userId: user.id, businessName, isVerified: false, balance: 0 },
    });
    await ensureWallet(tx, user.id);
    return p;
  });
  return NextResponse.json({ profile });
}

