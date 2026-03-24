import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { isBlocked?: boolean };

    if (typeof body.isBlocked !== "boolean") {
      return NextResponse.json({ error: "isBlocked must be boolean." }, { status: 400 });
    }

    const updatedCount = await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "isBlocked" = $1 WHERE id = $2`,
      body.isBlocked,
      id
    );

    if (!updatedCount) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

