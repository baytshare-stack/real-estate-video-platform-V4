import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { creativeId?: string };
    const creativeId = (body.creativeId || "").trim();
    if (!creativeId) {
      return NextResponse.json({ error: "creativeId is required." }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "AdCreative" SET clicks = clicks + 1 WHERE id = $1`,
      creativeId
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to track click." }, { status: 500 });
  }
}

