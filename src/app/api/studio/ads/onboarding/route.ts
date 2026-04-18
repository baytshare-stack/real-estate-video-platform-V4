import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStudioUser } from "@/lib/ads-platform/auth";
import { readRequestJson } from "@/lib/ads-client/safe-json";
import { ensureWallet, getOrCreateWallet } from "@/lib/ads-platform/billing";

export async function GET() {
  const user = await requireStudioUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.advertiserProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ profile: null });
  const wallet = await getOrCreateWallet(user.id);
  return NextResponse.json({ profile: { ...profile, balance: wallet.balance } });
}

export async function POST(req: Request) {
  const user = await requireStudioUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readRequestJson<{ businessName?: string }>(req);
  if (!body) return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
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

